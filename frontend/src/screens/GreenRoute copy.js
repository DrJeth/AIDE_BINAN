import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const BACKEND_BASE = 'https://web-production-868ee.up.railway.app';

export default function GreenRoute() {
  const [pointA, setPointA] = useState('');
  const [pointB, setPointB] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [originCoord, setOriginCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);

  const [cityOutline, setCityOutline] = useState([]);

  // tracking
  const [isTracking, setIsTracking] = useState(false);
  const watchRef = useRef(null);

  const mapRef = useRef(null);

  useEffect(() => {
    const fetchOutline = async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/city_outline`);
        const j = await res.json();
        if (j && j.status === 'ok' && Array.isArray(j.outline)) {
          const coords = j.outline.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
          setCityOutline(coords);
        } else {
          console.warn('city_outline error', j);
        }
      } catch (e) {
        console.warn('fetchOutline error', e);
      }
    };
    fetchOutline();
  }, []);

  // helpers
  const parseLatLng = (s) => {
    if (!s) return null;
    const parts = s.split(',').map(p => p.trim());
    if (parts.length !== 2) return null;
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return { latitude: a, longitude: b };
    return null;
  };

  const computeBBoxFromOutline = (outline) => {
    if (!outline || outline.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const p of outline) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLon) minLon = p.longitude;
      if (p.longitude > maxLon) maxLon = p.longitude;
    }
    return { minLat, maxLat, minLon, maxLon };
  };

  // point-in-polygon (raycasting) — polygon expects objects {latitude,longitude}
  const isPointInPolygon = (lat, lon, polygon) => {
    if (!polygon || polygon.length === 0) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude, yi = polygon[i].longitude;
      const xj = polygon[j].latitude, yj = polygon[j].longitude;
      const intersect = ((yi > lon) !== (yj > lon)) &&
        (lat < (xj - xi) * (lon - yi) / (yj - yi + Number.EPSILON) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // ---------- geocoding: call your backend /geocode (used on Go) ----------
  const backendGeocode = async (query) => {
    if (!query) return [];
    try {
      const url = `${BACKEND_BASE}/geocode?q=${encodeURIComponent(query)}`;
      const resp = await fetch(url);
      const j = await resp.json();
      if (j && j.status === 'ok' && Array.isArray(j.results)) return j.results;
      return [];
    } catch (e) {
      console.warn('backendGeocode error', e);
      return [];
    }
  };

  // backendReverse with fallback to public nominatim if needed
  const backendReverse = async (lat, lon) => {
    try {
      const url = `${BACKEND_BASE}/reverse?lat=${lat}&lon=${lon}`;
      const resp = await fetch(url);
      const j = await resp.json();
      if (j && j.status === 'ok' && j.display_name) return j.display_name;
    } catch (e) {
      console.warn('backendReverse failed', e);
    }

    // fallback to public nominatim (client-side)
    try {
      const url2 = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
      const r2 = await fetch(url2, { headers: { 'User-Agent': 'GreenRouteApp (you@domain)' }});
      const j2 = await r2.json();
      if (j2 && j2.display_name) return j2.display_name;
    } catch (e) {
      console.warn('fallback reverse failed', e);
    }
    return `${lat.toFixed(6)},${lon.toFixed(6)}`;
  };

  // ---------- NEW: client-side Nominatim search fallback ----------
  const nominatimSearchFallback = async (query) => {
    if (!query) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=3`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'GreenRouteApp (you@domain)' }});
      const j = await resp.json();
      if (!Array.isArray(j)) return [];
      return j.map(it => ({
        display_name: it.display_name,
        lat: it.lat,
        lon: it.lon
      }));
    } catch (e) {
      console.warn('nominatimSearchFallback error', e);
      return [];
    }
  };

  // Simple onChange handlers (no autocomplete UI)
  const onChangePointA = (text) => {
    setPointA(text);
    setOriginCoord(null);
  };

  const onChangePointB = (text) => {
    setPointB(text);
    setDestCoord(null);
  };

  // locateMe uses device GPS and sets origin; after success start tracking automatically
  const locateMe = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to locate you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserLocation(coords);
      setOriginCoord(coords);

      // ask backend reverse for friendly label (fallback included)
      const label = await backendReverse(coords.latitude, coords.longitude);
      setPointA(label);

      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);

      // automatically start tracking after locateMe success
      if (!isTracking) setIsTracking(true);
    } catch (err) {
      console.warn('locateMe err', err);
      Alert.alert('Error', 'Unable to get location.');
    }
  };

  // Start continuous tracking (watchPositionAsync). Updates userLocation and origin label.
  const startTracking = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to track you.');
        setIsTracking(false);
        return;
      }
      // if already watching, do nothing
      if (watchRef.current) return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 3, // meters
          timeInterval: 2000,
        },
        async (loc) => {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(coords);

          // update originCoord when tracking is on (so A follows user)
          setOriginCoord(coords);

          // update friendly label but don't spam backend: only set label (fast)
          try {
            const label = await backendReverse(coords.latitude, coords.longitude);
            setPointA(label);
          } catch (e) {
            // ignore reverse errors
          }
        }
      );

      watchRef.current = sub;
    } catch (e) {
      console.warn('startTracking error', e);
      Alert.alert('Error', 'Unable to start tracking.');
      setIsTracking(false);
    }
  };

  const stopTracking = async () => {
    try {
      if (watchRef.current) {
        if (typeof watchRef.current.remove === 'function') {
          watchRef.current.remove();
        } else if (typeof watchRef.current.removeSubscription === 'function') {
          watchRef.current.removeSubscription();
        } else if (typeof watchRef.current.removeEventListener === 'function') {
          watchRef.current.removeEventListener();
        }
        watchRef.current = null;
      }
    } catch (e) {
      // ignore cleanup errors
      watchRef.current = null;
    }
  };

  // Toggle tracking
  useEffect(() => {
    if (isTracking) startTracking();
    else stopTracking();
    // cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [isTracking]);

  // ---------- UPDATED: resolveInputToCoord uses backend first, then nominatim fallback ----------
  const resolveInputToCoord = async (text) => {
    // 1) if user typed lat,lng directly
    const parsed = parseLatLng(text);
    if (parsed) {
      const havePolygon = cityOutline && cityOutline.length > 2;
      if (havePolygon) {
        if (isPointInPolygon(parsed.latitude, parsed.longitude, cityOutline)) return parsed;
        return null; // typed coords outside city
      }
      return parsed;
    }

    // 2) Try backend geocode proxy first
    try {
      const backendResults = await backendGeocode(text);
      if (backendResults && backendResults.length > 0) {
        const first = backendResults[0];
        return { latitude: parseFloat(first.lat), longitude: parseFloat(first.lon), display_name: first.display_name };
      }
    } catch (e) {
      console.warn('resolveInputToCoord backendGeocode error', e);
    }

    // 3) If backend found nothing, try client-side nominatim fallback and validate against polygon (if available)
    try {
      const fallback = await nominatimSearchFallback(text);
      if (fallback && fallback.length > 0) {
        const havePolygon = cityOutline && cityOutline.length > 2;
        for (const it of fallback) {
          const lat = parseFloat(it.lat);
          const lon = parseFloat(it.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          if (havePolygon) {
            if (isPointInPolygon(lat, lon, cityOutline)) {
              return { latitude: lat, longitude: lon, display_name: it.display_name };
            } else {
              continue;
            }
          } else {
            // no polygon loaded yet: accept first fallback
            return { latitude: lat, longitude: lon, display_name: it.display_name };
          }
        }
      }
    } catch (e) {
      console.warn('resolveInputToCoord nominatim fallback error', e);
    }

    // nothing found inside Biñan
    return null;
  };

  const onGo = async () => {
    setLoading(true);
    try {
      // resolve origin
      let origin = originCoord;
      if (!origin) {
        const r = await resolveInputToCoord(pointA);
        if (r) {
          origin = { latitude: r.latitude, longitude: r.longitude };
          if (r.display_name) setPointA(r.display_name);
        }
      }
      if (!origin) { Alert.alert('Missing origin', 'Enter Point A (or tap Locate me).'); setLoading(false); return; }

      // resolve dest
      let dest = destCoord;
      if (!dest) {
        const r = await resolveInputToCoord(pointB);
        if (r) {
          dest = { latitude: r.latitude, longitude: r.longitude };
          if (r.display_name) setPointB(r.display_name);
        }
      }
      if (!dest) { Alert.alert('Missing destination', 'Enter Point B (or tap map).'); setLoading(false); return; }

      // final double-check: ensure both origin and dest are inside city 
      const havePolygon = cityOutline && cityOutline.length > 2;
      if (havePolygon) {
        if (!isPointInPolygon(origin.latitude, origin.longitude, cityOutline)) {
          Alert.alert('Origin outside Biñan', 'Point A is outside Biñan city. Please choose a location inside Biñan.');
          setLoading(false);
          return;
        }
        if (!isPointInPolygon(dest.latitude, dest.longitude, cityOutline)) {
          Alert.alert('Destination outside Biñan', 'Point B is outside Biñan city. Please choose a location inside Biñan.');
          setLoading(false);
          return;
        }
      }

      setOriginCoord(origin);
      setDestCoord(dest);

      const url = `${BACKEND_BASE}/route?origin_lat=${origin.latitude}&origin_lon=${origin.longitude}&dest_lat=${dest.latitude}&dest_lon=${dest.longitude}`;
      const resp = await fetch(url);
      const json = await resp.json();

      if (!json || json.status !== 'ok' || !Array.isArray(json.route)) {
        console.warn('route error', json);
        Alert.alert('Routing error', (json && json.message) || 'Failed to get route from server.');
        setRouteCoords([]);
        setLoading(false);
        return;
      }

      const coords = json.route.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
      setRouteCoords(coords);

      setTimeout(() => {
        if (!mapRef.current || coords.length === 0) return;
        mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, left: 40, right: 40, bottom: 140 }, animated: true });
      }, 250);

      // ensure the inputs show user-friendly labels if we couldn't get display_name earlier
      if (origin && (!pointA || parseLatLng(pointA))) {
        const label = await backendReverse(origin.latitude, origin.longitude);
        setPointA(label);
      }
      if (dest && (!pointB || parseLatLng(pointB))) {
        const dlabel = await backendReverse(dest.latitude, dest.longitude);
        setPointB(dlabel);
      }
    } catch (e) {
      console.warn('onGo', e);
      Alert.alert('Error', 'Failed to compute route.');
      setRouteCoords([]);
    } finally {
      setLoading(false);
    }
  };

  const onClear = () => {
    setPointA('');
    setPointB('');
    setRouteCoords([]);
    setUserLocation(null);
    setOriginCoord(null);
    setDestCoord(null);
    // stop tracking when clearing
    setIsTracking(false);
  };

  const onMapPress = async (evt) => {
    const { coordinate } = evt.nativeEvent;
    if (cityOutline && cityOutline.length > 2 && !isPointInPolygon(coordinate.latitude, coordinate.longitude, cityOutline)) {
      Alert.alert('Outside Biñan', 'Please tap a location inside Biñan city.');
      return;
    }
    setDestCoord(coordinate);
    setRouteCoords([]);
    // try backend reverse (with fallback) to fill Point B
    const label = await backendReverse(coordinate.latitude, coordinate.longitude);
    setPointB(label);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userLocation?.latitude ?? 14.3166,
          longitude: userLocation?.longitude ?? 121.075,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        onPress={onMapPress}
      >
        {cityOutline && cityOutline.length > 1 && (
          <Polyline coordinates={cityOutline} strokeColor="#FF8800" strokeWidth={3} lineJoin="round" />
        )}

        {routeCoords && routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#28a745" strokeWidth={5} />
        )}

        {originCoord && <Marker coordinate={originCoord} title="A" pinColor="blue" />}
        {destCoord && <Marker coordinate={destCoord} title="B" pinColor="red" />}
        {userLocation && <Marker coordinate={userLocation} title="You" pinColor="blue" />}
      </MapView>

      <View style={styles.controls}>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Point A (Your Location)"
            value={pointA}
            onChangeText={onChangePointA}
          />
          <TouchableOpacity style={styles.btn} onPress={locateMe}>
            <Text style={styles.btnText}>Locate me</Text>
          </TouchableOpacity>

          {/* Track toggle (tracking auto-starts after Locate Me) */}
          <TouchableOpacity
            style={[styles.trackBtn, isTracking ? { backgroundColor: '#d9534f' } : { backgroundColor: '#28a745' }]}
            onPress={() => setIsTracking(s => !s)}
          >
            <Text style={styles.btnText}>{isTracking ? 'Stop' : 'Track'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Point B (Destination) or Tap the map"
            value={pointB}
            onChangeText={onChangePointB}
          />
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#28a745' }]} onPress={onGo}>
            <Text style={styles.btnText}>Go</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#ccc', marginLeft: 6 }]} onPress={onClear}>
            <Text style={[styles.btnText, { color: '#222' }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" />
            <Text style={{ marginLeft: 8 }}>Loading...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  controls: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  trackBtn: {
    marginLeft: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: 'center' },
});