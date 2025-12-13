import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const BACKEND_BASE = 'https://green-route-backend.onrender.com';
const GOOGLE_MAPS_API_KEY = 'AIzaSyA6NOYNehpIXFNVrLoPLloZ6fcajBb9kns'; 

export default function GreenRoute({ navigation }) {
  const [pointA, setPointA] = useState('');
  const [pointB, setPointB] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [originCoord, setOriginCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);

  const [cityOutline, setCityOutline] = useState([]);

  // Google directions (panel only)
  const [directions, setDirections] = useState(null);
  const [steps, setSteps] = useState([]);
  const [showDirections, setShowDirections] = useState(false);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');

  // tracking
  const [isTracking, setIsTracking] = useState(false);
  const watchRef = useRef(null);

  const mapRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchOutline = async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/city_outline`);
        const j = await res.json();
        if (j && j.status === 'ok' && Array.isArray(j.outline)) {
          const coords = j.outline.map(([lat, lon]) => ({
            latitude: lat,
            longitude: lon,
          }));
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

  // parse "lat, lon" text
  const parseLatLng = (s) => {
    if (!s) return null;
    const parts = s.split(',').map((p) => p.trim());
    if (parts.length !== 2) return null;
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { latitude: a, longitude: b };
    }
    return null;
  };

  // raycasting point-in-polygon
  const isPointInPolygon = (lat, lon, polygon) => {
    if (!polygon || polygon.length === 0) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude;
      const yi = polygon[i].longitude;
      const xj = polygon[j].latitude;
      const yj = polygon[j].longitude;
      const intersect =
        yi > lon !== yj > lon &&
        lat <
          ((xj - xi) * (lon - yi)) / (yj - yi + Number.EPSILON) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // backend geocode
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

  const backendReverse = async (lat, lon) => {
    try {
      const url = `${BACKEND_BASE}/reverse?lat=${lat}&lon=${lon}`;
      const resp = await fetch(url);
      const j = await resp.json();
      if (j && j.status === 'ok' && j.display_name) return j.display_name;
    } catch (e) {
      console.warn('backendReverse failed', e);
    }

    try {
      const url2 = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
      const r2 = await fetch(url2, {
        headers: { 'User-Agent': 'GreenRouteApp' },
      });
      const j2 = await r2.json();
      if (j2 && j2.display_name) return j2.display_name;
    } catch (e) {
      console.warn('fallback reverse failed', e);
    }
    return `${lat.toFixed(6)},${lon.toFixed(6)}`;
  };

  const nominatimSearchFallback = async (query) => {
    if (!query) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=jsonv2&limit=3`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'GreenRouteApp' },
      });
      const j = await resp.json();
      if (!Array.isArray(j)) return [];
      return j.map((it) => ({
        display_name: it.display_name,
        lat: it.lat,
        lon: it.lon,
      }));
    } catch (e) {
      console.warn('nominatimSearchFallback error', e);
      return [];
    }
  };

  /* =========================================================================
   * E-BIKE BACKEND ROUTE (forbidden roads logic)
   * ========================================================================= */
  const fetchEbikeRouteFromBackend = async (origin, destination) => {
    try {
      const url =
        `${BACKEND_BASE}/route` +
        `?origin_lat=${origin.latitude}&origin_lon=${origin.longitude}` +
        `&dest_lat=${destination.latitude}&dest_lon=${destination.longitude}`;

      const resp = await fetch(url);
      const json = await resp.json();

      // Expected backend response:
      // { status: 'ok', route: [[lat, lon], ...], distance_m: 9000, duration_s: 1500 }
      if (!json || json.status !== 'ok' || !Array.isArray(json.route)) {
        console.warn('backend route error', json);
        Alert.alert(
          'Route Error',
          json?.message || 'Unable to compute e-bike route on the server.'
        );
        return null;
      }

      const coords = json.route.map(([lat, lon]) => ({
        latitude: lat,
        longitude: lon,
      }));

      const distanceMeters = json.distance_m ?? 0;
      const durationSeconds = json.duration_s ?? 0;

      return {
        coords,
        distanceText: distanceMeters
          ? (distanceMeters / 1000).toFixed(2) + ' km'
          : '',
        durationText: durationSeconds ? formatDuration(durationSeconds) : '',
      };
    } catch (e) {
      console.warn('fetchEbikeRouteFromBackend error', e);
      Alert.alert('Route Error', 'Failed to contact routing server.');
      return null;
    }
  };

  /* =========================================================================
   * Google Directions: ONLY for steps (optional, no alerts)
   * ========================================================================= */
  const fetchGoogleDirections = async (origin, destination) => {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destStr = `${destination.latitude},${destination.longitude}`;

      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${originStr}` +
        `&destination=${destStr}` +
        `&mode=bicycling` +   // e-bike friendly
        `&avoid=highways` +   // avoid national highways
        `&key=${GOOGLE_MAPS_API_KEY}`;

      const resp = await fetch(url);
      const json = await resp.json();

      if (json.status === 'OK' && json.routes && json.routes.length > 0) {
        const route = json.routes[0];

        // Only steps; we do NOT touch route polyline or summary distance/duration here
        const allSteps = [];
        route.legs.forEach((leg) => {
          leg.steps.forEach((step) => {
            allSteps.push({
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
              distance: step.distance.text,
              duration: step.duration.text,
            });
          });
        });

        setDirections(json);
        setSteps(allSteps);
        setShowDirections(true);

        return { steps: allSteps };
      } else {
        console.warn('Directions error (ignored):', json);
        return null;
      }
    } catch (e) {
      console.warn('fetchGoogleDirections error (ignored):', e);
      // No alert here – backend route already works
      return null;
    }
  };

  // Polyline decoder (kept for future use if needed)
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let b;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
      lat += dlat;

      result = 0;
      shift = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        lat: lat / 1e5,
        lng: lng / 1e5,
      });
    }

    return points;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const onChangePointA = (text) => {
    setPointA(text);
    setOriginCoord(null);
  };

  const onChangePointB = (text) => {
    setPointB(text);
    setDestCoord(null);
  };

  const locateMe = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setUserLocation(coords);
      setOriginCoord(coords);

      const label = await backendReverse(coords.latitude, coords.longitude);
      setPointA(label);

      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      );

      if (!isTracking) setIsTracking(true);
    } catch (err) {
      console.warn('locateMe err', err);
      Alert.alert('Error', 'Unable to get location.');
    }
  };

  const startTracking = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        setIsTracking(false);
        return;
      }
      if (watchRef.current) return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 3,
          timeInterval: 2000,
        },
        async (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coords);
          setOriginCoord(coords);

          try {
            const label = await backendReverse(
              coords.latitude,
              coords.longitude
            );
            setPointA(label);
          } catch (e) {
            // ignore
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
        } else if (
          typeof watchRef.current.removeEventListener === 'function'
        ) {
          watchRef.current.removeEventListener();
        }
        watchRef.current = null;
      }
    } catch (e) {
      watchRef.current = null;
    }
  };

  useEffect(() => {
    if (isTracking) startTracking();
    else stopTracking();
    return () => {
      stopTracking();
    };
  }, [isTracking]);

  const resolveInputToCoord = async (text) => {
    const parsed = parseLatLng(text);
    if (parsed) {
      const havePolygon = cityOutline && cityOutline.length > 2;
      if (havePolygon) {
        if (isPointInPolygon(parsed.latitude, parsed.longitude, cityOutline))
          return parsed;
        return null;
      }
      return parsed;
    }

    try {
      const backendResults = await backendGeocode(text);
      if (backendResults && backendResults.length > 0) {
        const first = backendResults[0];
        return {
          latitude: parseFloat(first.lat),
          longitude: parseFloat(first.lon),
          display_name: first.display_name,
        };
      }
    } catch (e) {
      console.warn('resolveInputToCoord backendGeocode error', e);
    }

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
              return {
                latitude: lat,
                longitude: lon,
                display_name: it.display_name,
              };
            }
          } else {
            return {
              latitude: lat,
              longitude: lon,
              display_name: it.display_name,
            };
          }
        }
      }
    } catch (e) {
      console.warn('resolveInputToCoord nominatim fallback error', e);
    }

    return null;
  };

  const onGo = async () => {
    setLoading(true);
    setShowDirections(false);
    try {
      let origin = originCoord;
      if (!origin) {
        const r = await resolveInputToCoord(pointA);
        if (r) {
          origin = { latitude: r.latitude, longitude: r.longitude };
          if (r.display_name) setPointA(r.display_name);
        }
      }
      if (!origin) {
        Alert.alert('Missing origin', 'Enter Point A (or tap Locate me).');
        setLoading(false);
        return;
      }

      let dest = destCoord;
      if (!dest) {
        const r = await resolveInputToCoord(pointB);
        if (r) {
          dest = { latitude: r.latitude, longitude: r.longitude };
          if (r.display_name) setPointB(r.display_name);
        }
      }
      if (!dest) {
        Alert.alert('Missing destination', 'Enter Point B (or tap map).');
        setLoading(false);
        return;
      }

      const havePolygon = cityOutline && cityOutline.length > 2;
      if (havePolygon) {
        if (!isPointInPolygon(origin.latitude, origin.longitude, cityOutline)) {
          Alert.alert('Origin outside Biñan', 'Point A is outside Biñan city.');
          setLoading(false);
          return;
        }
        if (!isPointInPolygon(dest.latitude, dest.longitude, cityOutline)) {
          Alert.alert(
            'Destination outside Biñan',
            'Point B is outside Biñan city.'
          );
          setLoading(false);
          return;
        }
      }

      setOriginCoord(origin);
      setDestCoord(dest);

      // 1) E-bike safe route from backend (forbidden roads logic)
      const ebikeResult = await fetchEbikeRouteFromBackend(origin, dest);

      if (!ebikeResult) {
        setLoading(false);
        return;
      }

      // draw backend route
      setRouteCoords(ebikeResult.coords);

      // use backend distance/duration in summary
      if (ebikeResult.distanceText) setDistance(ebikeResult.distanceText);
      if (ebikeResult.durationText) setDuration(ebikeResult.durationText);

      // zoom to backend route
      setTimeout(() => {
        if (!mapRef.current || ebikeResult.coords.length === 0) return;
        mapRef.current.fitToCoordinates(ebikeResult.coords, {
          edgePadding: { top: 60, left: 40, right: 40, bottom: 140 },
          animated: true,
        });
      }, 250);

      // 2) Optional: Google only for turn-by-turn steps
      await fetchGoogleDirections(origin, dest);

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
    setDirections(null);
    setSteps([]);
    setShowDirections(false);
    setIsTracking(false);
  };

  const onMapPress = async (evt) => {
    const { coordinate } = evt.nativeEvent;
    if (
      cityOutline &&
      cityOutline.length > 2 &&
      !isPointInPolygon(
        coordinate.latitude,
        coordinate.longitude,
        cityOutline
      )
    ) {
      Alert.alert('Outside Biñan', 'Please tap a location inside Biñan city.');
      return;
    }
    setDestCoord(coordinate);
    setRouteCoords([]);
    setShowDirections(false);
    const label = await backendReverse(
      coordinate.latitude,
      coordinate.longitude
    );
    setPointB(label);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* TOP BACK BUTTON */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={() => {
                if (navigation && navigation.goBack) {
                  navigation.goBack();
                }
              }}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>

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
              <Polyline
                coordinates={cityOutline}
                strokeColor="#FF8800"
                strokeWidth={3}
                lineJoin="round"
              />
            )}

            {routeCoords && routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#28a745"
                strokeWidth={5}
              />
            )}

            {originCoord && (
              <Marker coordinate={originCoord} title="A" pinColor="blue" />
            )}
            {destCoord && (
              <Marker coordinate={destCoord} title="B" pinColor="red" />
            )}
            {userLocation && (
              <Marker coordinate={userLocation} title="You" pinColor="blue" />
            )}
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

              <TouchableOpacity
                style={[
                  styles.trackBtn,
                  isTracking
                    ? { backgroundColor: '#d9534f' }
                    : { backgroundColor: '#28a745' },
                ]}
                onPress={() => setIsTracking((s) => !s)}
              >
                <Text style={styles.btnText}>
                  {isTracking ? 'Stop' : 'Track'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="Point B (Destination) or Tap the map"
                value={pointB}
                onChangeText={onChangePointB}
              />
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#28a745' }]}
                onPress={onGo}
              >
                <Text style={styles.btnText}>Go</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#ccc', marginLeft: 6 }]}
                onPress={onClear}
              >
                <Text style={[styles.btnText, { color: '#222' }]}>Clear</Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" />
                <Text style={{ marginLeft: 8 }}>Loading...</Text>
              </View>
            )}

            {/* Google Directions Panel */}
            {showDirections && steps.length > 0 && (
              <View style={styles.directionsPanel}>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryLabel}>Distance</Text>
                    <Text style={styles.summaryValue}>{distance}</Text>
                  </View>
                  <View style={{ marginLeft: 16 }}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryValue}>{duration}</Text>
                  </View>
                </View>

                <Text style={styles.stepsTitle}>Turn-by-Turn Directions</Text>
                <ScrollView
                  ref={scrollRef}
                  style={styles.stepsScroll}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {steps.map((step, idx) => (
                    <View key={idx} style={styles.stepItem}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stepInstruction}>
                          {step.instruction}
                        </Text>
                        <Text style={styles.stepDetails}>
                          {step.distance} • {step.duration}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },

  // NEW: Header with back button
  headerBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007bff',
  },

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
    maxHeight: '60%',
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
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    justifyContent: 'center',
  },
  directionsPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#28a745',
    marginTop: 4,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  stepsScroll: {
    maxHeight: 150,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingRight: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  stepInstruction: {
    fontSize: 13,
    fontWeight: '500',
    color: '#222',
    lineHeight: 18,
  },
  stepDetails: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
});