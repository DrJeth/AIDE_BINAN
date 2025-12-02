import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking
} from "react-native";
import { WebView } from 'react-native-webview';
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection,
  query,
  getDocs,
  orderBy
} from "firebase/firestore";

// Static Assets
const MenuIcon = require("../../assets/ic_menu.png");
const BellIcon = require("../../assets/bell.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeRider({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [newsUpdates, setNewsUpdates] = useState([
    {
      headline: "Welcome to AIDE",
      details: "Stay tuned for latest updates",
      type: "System",
      createdAt: new Date().toLocaleDateString()
    }
  ]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  const auth = getAuth();
  const db = getFirestore();

  // Google Maps Embed HTML
  const BINAN_MAPS_EMBED = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <iframe 
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d61856.07421696857!2d121.03201051994674!3d14.311163205767722!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d70cc905e489%3A0xdbb7938dd87f5563!2zQmnDsWFuLCBMYWd1bmE!5e0!3m2!1sen!2sph!4v1764121213329!5m2!1sen!2sph" 
        width="100%" 
        height="100%" 
        style="border:0;" 
        allowfullscreen="" 
        loading="lazy" 
        referrerpolicy="no-referrer-when-downgrade">
      </iframe>
    </body>
  </html>
  `;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            console.log("User data loaded:", userDoc.data());
            setUserData(userDoc.data());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchNewsUpdates = async () => {
      try {
        const newsQuery = query(
          collection(db, "announcements"), 
          orderBy('createdAt', 'desc')
        );
        const newsSnapshot = await getDocs(newsQuery);
        const newsList = newsSnapshot.docs.map(doc => ({
          id: doc.id,
          headline: doc.data().title || "AIDE Update",
          details: doc.data().description || "No additional details",
          type: doc.data().type || "Announcement",
          createdAt: doc.data().createdAt 
            ? new Date(doc.data().createdAt.seconds * 1000).toLocaleDateString() 
            : new Date().toLocaleDateString()
        }));
        
        // If no news found, keep the default welcome message
        if (newsList.length > 0) {
          setNewsUpdates(newsList);
        }
      } catch (error) {
        console.error("Error fetching news updates:", error);
      }
    };

    fetchUserData();
    fetchNewsUpdates();

    // News rotation timer
    const newsRotationTimer = setInterval(() => {
      setCurrentNewsIndex((prevIndex) => 
        newsUpdates.length > 1 
          ? (prevIndex + 1) % newsUpdates.length 
          : 0
      );
    }, 5000); // Change news every 5 seconds

    return () => clearInterval(newsRotationTimer);
  }, []);

  // Add a safe method to get current news
  const getCurrentNews = () => {
    return newsUpdates[currentNewsIndex] || {
      headline: "Welcome to AIDE",
      details: "Stay tuned for latest updates",
      type: "System",
      createdAt: new Date().toLocaleDateString()
    };
  };

  const handleWhatsNew = () => {
    const currentNews = getCurrentNews();
    Alert.alert(
      currentNews.headline, 
      currentNews.details
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>AIDE</Text>
        <Pressable onPress={() => navigation.navigate('Notifications')}>
          <Image 
            source={BellIcon} 
            style={styles.headerIcon} 
            resizeMode="contain" 
          />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeText}>
            Welcome, {userData?.firstName || 'Rider'}
          </Text>
          <Text style={styles.subtitleText}>
            Your journey starts here
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton} 
            onPress={handleWhatsNew}
          >
            <Text style={styles.quickActionText}>What's New</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Ordinance')}
          >
            <Text style={styles.quickActionText}>Ordinance</Text>
          </TouchableOpacity>
        </View>

        {/* Map Preview Section */}
        <View style={styles.mapPreviewContainer}>
          <View style={styles.mapPreviewHeader}>
            <Text style={styles.mapPreviewTitle}>Green Routes in Binan</Text>
            <TouchableOpacity 
              style={styles.openMapButton}
              onPress={() => {
                console.log("Attempting to navigate to GreenRouteMap");
                navigation.navigate('GreenRouteMap');
              }}
            >
              <Text style={styles.openMapText}>Open Full Map</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.mapWrapper}>
            <WebView
              source={{ html: BINAN_MAPS_EMBED }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
            />
          </View>
        </View>

        {/* News Updates */}
        <View style={styles.newsContainer}>
          <Text style={styles.newsSectionTitle}>Latest Updates</Text>
          <View style={styles.newsCard}>
            <Text style={styles.newsHeadline}>
              {getCurrentNews().headline}
            </Text>
            <Text style={styles.newsDetails}>
              {getCurrentNews().details}
            </Text>
            <Text style={styles.newsDate}>
              {getCurrentNews().createdAt}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('HomeRider')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Appointment')}
        >
          <Text style={styles.navIcon}>📅</Text>
          <Text style={styles.navLabel}>Appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Me')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Me</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32'
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: '#2E7D32'
  },
  mapPreviewContainer: {
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden'
  },
  mapPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingBottom: 0
  },
  mapPreviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32'
  },
  mapPreviewLink: {
    color: '#2E7D32',
    fontWeight: '600'
  },
  mapWrapper: {
    height: 250,
    width: '100%'
  },
  webview: {
    flex: 1
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingVertical: 15
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E7D32'
  },
  subtitleText: {
    color: 'gray',
    marginTop: 5
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 10
  },
  quickActionButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  quickActionText: {
    color: 'white'
  },
  newsContainer: {
    paddingHorizontal: 20,
    marginVertical: 15
  },
  newsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#2E7D32'
  },
  newsCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15
  },
  newsHeadline: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5
  },
  newsDetails: {
    color: '#757575',
    marginBottom: 10
  },
  newsDate: {
    color: '#9E9E9E',
    fontSize: 12,
    alignSelf: 'flex-end'
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2E7D32',
    paddingVertical: 10
  },
  navItem: {
    alignItems: 'center'
  },
  navIcon: {
    fontSize: 20
  },
  navLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 5
  }
});