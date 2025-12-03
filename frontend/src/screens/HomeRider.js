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
  Linking,
  Modal,
  ActivityIndicator
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
  orderBy,
  where
} from "firebase/firestore";

// Static Assets
const MenuIcon = require("../../assets/ic_menu.png");
const BellIcon = require("../../assets/bell.png");

// NEW ICONS
const HomeIcon = require("../../assets/home.png");
const ScheduleIcon = require("../../assets/schedule.png");
const UserIcon = require("../../assets/user.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Same categories
const EBIKE_CATEGORIES = [
  { label: 'Category L1 (e-Moped 2w)', value: 'L1' },
  { label: 'Category L2 (e-Moped 3w)', value: 'L2' },
  { label: 'Category L3 (e-Motorcycle)', value: 'L3' },
  { label: 'Category L4 and L5 (e-Tricycle/e-Three Wheeled Vehicle)', value: 'L4L5' },
  { label: 'Category L6 and L7 (e-Quad)', value: 'L6L7' },
  { label: 'Category M1 (e-Car, 6-SUV)', value: 'M1' },
  { label: 'Category M2 (e-Utility Vehicle, e-jeepney)', value: 'M2' },
  { label: 'Category M3 (e-bus)', value: 'M3' },
  { label: 'Category N1 (e-truck)', value: 'N1' },
  { label: 'Category N2 (e-truck)', value: 'N2' },
  { label: 'Category N3 (e-truck)', value: 'N3' }
];

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  try {
    const date = new Date(dateValue?.toDate?.() || dateValue);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

const getRegistrationStatus = (rider) => {
  if (!rider?.renewalDate) return null;
  
  const today = new Date();
  const renewalDate = new Date(rider.renewalDate?.toDate?.() || rider.renewalDate);
  const daysUntilExpiry = Math.floor((renewalDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return { status: 'Expired', daysLeft: 0, color: '#F44336' };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'Expiring Soon', daysLeft: daysUntilExpiry, color: '#FF9800' };
  } else {
    return { status: 'Active', daysLeft: daysUntilExpiry, color: '#4CAF50' };
  }
};

const getCategoryLabel = (value) => {
  if (!value) return 'N/A';
  const found = EBIKE_CATEGORIES.find(c => c.value === value);
  return found ? found.label : value;
};

export default function HomeRider({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [userDocId, setUserDocId] = useState(null);
  const [riderDocs, setRiderDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false); // 🔔 NEW

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

  const BINAN_MAPS_EMBED = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html { margin: 0; padding: 0; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
      </style>
    </head>
    <body>
      <iframe 
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d61856.07421696857!2d121.03201051994674!3d14.311163205767722!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d70cc905e489%3A0xdbb7938dd87f5563!2zQmnDsWFuLCBMYWd1bmE!5e0!3m2!1sen!2sph!4v1764121213329!5m2!1sen!2sph"
        width="100%" 
        height="100%" 
        style="border:0;" 
        allowfullscreen="" 
        loading="lazy">
      </iframe>
    </body>
  </html>
  `;

  const loadRiderDocuments = async (docId) => {
    try {
      setDocsLoading(true);
      const imagesRef = collection(db, 'riderRegistrations', docId, 'images');
      const docsSnap = await getDocs(imagesRef);
      const docs = docsSnap.docs.map(d => {
        const data = d.data();
        const url = data.url || data.imageUrl || data.downloadUrl || data.downloadURL || data.image;
        return {
          id: d.id,
          url,
          type: data.type || 'original'
        };
      });
      setRiderDocs(docs);
    } catch (err) {
      console.error('Error loading rider documents:', err);
      setRiderDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // 1) Try doc id = uid
          let foundDocId = null;
          let data = null;

          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            foundDocId = userDocSnap.id;
            data = userDocSnap.data();
            console.log("User data loaded by UID:", data);
          } else {
            console.log("No user doc by UID, trying uid field...");
            const usersRef = collection(db, "users");

            // 2) try uid field
            let q = query(usersRef, where("uid", "==", currentUser.uid));
            let querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              foundDocId = querySnapshot.docs[0].id;
              data = querySnapshot.docs[0].data();
              console.log("User data loaded by uid field:", data);
            } else {
              console.log("No user doc by uid field, trying email...");

              // 3) try email
              q = query(usersRef, where("email", "==", currentUser.email));
              querySnapshot = await getDocs(q);

              if (!querySnapshot.empty) {
                foundDocId = querySnapshot.docs[0].id;
                data = querySnapshot.docs[0].data();
                console.log("User data loaded by email:", data);
              } else {
                console.log("No user document found for this account.");
              }
            }
          }

          if (data && foundDocId) {
            setUserDocId(foundDocId);
            setUserData({ ...data, _id: foundDocId });
            await loadRiderDocuments(foundDocId);
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
        
        if (newsList.length > 0) {
          setNewsUpdates(newsList);
        }
      } catch (error) {
        console.error("Error fetching news updates:", error);
      }
    };

    fetchUserData();
    fetchNewsUpdates();

    const newsRotationTimer = setInterval(() => {
      setCurrentNewsIndex((prevIndex) => 
        newsUpdates.length > 1 
          ? (prevIndex + 1) % newsUpdates.length 
          : 0
      );
    }, 5000);

    return () => clearInterval(newsRotationTimer);
  }, []);

  const getCurrentNews = () => {
    return newsUpdates[currentNewsIndex] || {
      headline: "Welcome to AIDE",
      details: "Stay tuned for latest updates",
      type: "System",
      createdAt: new Date().toLocaleDateString()
    };
  };

  // E-bike Details button
  const handleWhatsNew = () => {
    if (!userData) {
      Alert.alert(
        "E-bike Details",
        "No registration record was found for your account yet. " +
        "Please complete your e-bike registration or try logging in again."
      );
      return;
    }
    setDetailsVisible(true);
  };

  // display name
  const getDisplayName = () => {
    if (userData?.firstName) return userData.firstName;

    const currentUser = auth.currentUser;
    if (currentUser?.displayName) return currentUser.displayName;

    if (currentUser?.email) {
      return currentUser.email.split("@")[0];
    }

    return "Rider";
  };

  const renderDetailsModal = () => {
    if (!userData) return null;

    const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "N/A";
    const regStatusObj = getRegistrationStatus(userData);
    const regStatusText = regStatusObj
      ? `${regStatusObj.status}${
          regStatusObj.status !== 'Expired' ? ` (${regStatusObj.daysLeft} days)` : ''
        }`
      : (userData.registrationStatus || 'N/A');

    return (
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setDetailsVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>E-bike Details</Text>

              {/* Personal Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{fullName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Birthday</Text>
                  <Text style={styles.detailValue}>{formatDate(userData.birthday)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={styles.detailValue}>{userData.contactNumber || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{userData.address || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{userData.email || "N/A"}</Text>
                </View>
              </View>

              {/* E-bike Information */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>E-Bike Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plate Number</Text>
                  <Text style={styles.detailValue}>{userData.plateNumber || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Brand</Text>
                  <Text style={styles.detailValue}>{userData.ebikeBrand || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Model</Text>
                  <Text style={styles.detailValue}>{userData.ebikeModel || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Color</Text>
                  <Text style={styles.detailValue}>{userData.ebikeColor || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chassis/Motor No.</Text>
                  <Text style={styles.detailValue}>
                    {userData.chassisMotorNumber || userData.chassisNumber || "N/A"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Branch</Text>
                  <Text style={styles.detailValue}>{userData.branch || "N/A"}</Text>
                </View>
              </View>

              {/* Registration Details */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Registration Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{userData.status || "Pending"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registration Status</Text>
                  <Text style={styles.detailValue}>{regStatusText}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>
                    {getCategoryLabel(userData.ebikeCategorySelected)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registered Date</Text>
                  <Text style={styles.detailValue}>{formatDate(userData.registeredDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Renewal Date</Text>
                  <Text style={styles.detailValue}>{formatDate(userData.renewalDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Amount</Text>
                  <Text style={styles.detailValue}>
                    ₱{userData.paymentDetails?.amount?.toFixed?.(2) || "0.00"}
                  </Text>
                </View>
              </View>

              {/* Uploaded Documents */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Uploaded Documents</Text>

                {docsLoading ? (
                  <View style={styles.docsLoading}>
                    <ActivityIndicator size="small" color="#2E7D32" />
                    <Text style={styles.docsLoadingText}>Loading documents...</Text>
                  </View>
                ) : null}

                {/* Walang kahit anong docs */}
                {!docsLoading &&
                  riderDocs.length === 0 &&
                  (!userData.adminVerificationImages ||
                    userData.adminVerificationImages.length === 0) && (
                    <Text style={styles.emptyDocsText}>
                      No uploaded documents found.
                    </Text>
                  )}

                {/* Rider uploaded documents (riderRegistrations/.../images) */}
                {!docsLoading && riderDocs.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 6 }]}>
                      Rider Uploaded Documents
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.docsScroll}
                    >
                      {riderDocs.map((doc) => (
                        <View key={doc.id} style={styles.docThumbContainer}>
                          {doc.url ? (
                            <Image
                              source={{ uri: doc.url }}
                              style={styles.docThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={[styles.docThumb, styles.docThumbPlaceholder]}
                            >
                              <Text style={styles.docThumbPlaceholderText}>
                                No Image
                              </Text>
                            </View>
                          )}
                          <View style={styles.docTypeBadge}>
                            <Text style={styles.docTypeBadgeText}>
                              {doc.type === "original" ? "📝" : "✅"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* Admin verification documents (adminVerificationImages array) */}
                {!docsLoading &&
                  userData.adminVerificationImages &&
                  userData.adminVerificationImages.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 6 }]}>
                        Admin Verification Documents
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.docsScroll}
                      >
                        {userData.adminVerificationImages.map((url, index) => (
                          <View
                            key={index.toString()}
                            style={styles.docThumbContainer}
                          >
                            <Image
                              source={{ uri: url }}
                              style={styles.docThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.docTypeBadge}>
                              <Text style={styles.docTypeBadgeText}>✅</Text>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </>
                  )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // 🔔 Notifications modal
  const renderNotificationsModal = () => {
    return (
      <Modal
        visible={notifVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notifCard}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setNotifVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { marginBottom: 10 }]}>
              Announcements & Updates
            </Text>

            {newsUpdates.length === 0 ? (
              <Text style={styles.emptyDocsText}>
                No announcements yet.
              </Text>
            ) : (
              <ScrollView
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {newsUpdates.map((item) => (
                  <View key={item.id || item.headline} style={styles.notifItem}>
                    <Text style={styles.notifHeadline}>{item.headline}</Text>
                    <Text style={styles.notifDetails}>{item.details}</Text>
                    <Text style={styles.notifDate}>{item.createdAt}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>AIDE</Text>
        <Pressable onPress={() => setNotifVisible(true)}>
          <Image 
            source={BellIcon} 
            style={styles.headerIcon} 
            resizeMode="contain" 
          />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeText}>
            Welcome, {getDisplayName()}
          </Text>
          <Text style={styles.subtitleText}>Your journey starts here</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleWhatsNew}>
            <Text style={styles.quickActionText}>E-bike Details</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Ordinance')}
          >
            <Text style={styles.quickActionText}>Ordinance</Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapPreviewContainer}>
          <View style={styles.mapPreviewHeader}>
            <Text style={styles.mapPreviewTitle}>Green Routes in Binan</Text>

            <TouchableOpacity 
              style={styles.openMapButton}
              onPress={() => navigation.navigate('GreenRouteMap')}
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

        {/* News (preview only) */}
        <View style={styles.newsContainer}>
          <Text style={styles.newsSectionTitle}>Latest Updates</Text>
          <View style={styles.newsCard}>
            <Text style={styles.newsHeadline}>{getCurrentNews().headline}</Text>
            <Text style={styles.newsDetails}>{getCurrentNews().details}</Text>
            <Text style={styles.newsDate}>{getCurrentNews().createdAt}</Text>
          </View>
        </View>

      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNavigation}>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('HomeRider')}
        >
          <Image source={HomeIcon} style={styles.navIconImg} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Appointment')}
        >
          <Image source={ScheduleIcon} style={styles.navIconImg} />
          <Text style={styles.navLabel}>Appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Me')}
        >
          <Image source={UserIcon} style={styles.navIconImg} />
          <Text style={styles.navLabel}>Me</Text>
        </TouchableOpacity>

      </View>

      {renderDetailsModal()}
      {renderNotificationsModal()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  scrollContainer: {
    flex: 1,
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
  headerIcon: { width: 24, height: 24, tintColor: '#2E7D32' },

  greetingSection: { paddingHorizontal: 20, paddingVertical: 15 },
  welcomeText: { fontSize: 22, fontWeight: '600', color: '#2E7D32' },
  subtitleText: { color: 'gray', marginTop: 5 },

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
  quickActionText: { color: 'white' },

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
  mapWrapper: { height: 250, width: '100%' },
  webview: { flex: 1 },

  newsContainer: { paddingHorizontal: 20, marginVertical: 15 },
  newsSectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 10, 
    color: '#2E7D32' 
  },
  newsCard: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 15 },
  newsHeadline: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  newsDetails: { color: '#757575', marginBottom: 10 },
  newsDate: { color: '#9E9E9E', fontSize: 12, alignSelf: 'flex-end' },

  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2E7D32',
    paddingVertical: 10
  },
  navItem: { alignItems: 'center' },
  navIconImg: { width: 24, height: 24, tintColor: "white" },
  navLabel: { color: 'white', fontSize: 12, marginTop: 5 },

  /* MODAL STYLES (shared) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCard: {
    width: '90%',
    height: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 16
  },
  notifCard: {       // 🔔 for notifications modal
    width: '90%',
    height: '70%',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 16
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#EEEEEE'
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333'
  },
  modalScrollContent: {
    paddingBottom: 24
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#2E7D32'
  },

  detailSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2C3E50'
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  detailLabel: {
    width: '40%',
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D'
  },
  detailValue: {
    width: '60%',
    fontSize: 13,
    color: '#2C3E50',
    flexWrap: 'wrap'
  },

  docsLoading: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  docsLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#555'
  },
  emptyDocsText: {
    fontSize: 13,
    color: '#7F8C8D'
  },
  docsScroll: {
    marginTop: 6
  },
  docThumbContainer: {
    marginRight: 8,
    position: 'relative'
  },
  docThumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#DDD'
  },
  docThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  docThumbPlaceholderText: {
    fontSize: 11,
    color: '#777'
  },
  docTypeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  docTypeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700'
  },

  // 🔔 Notification item styles
  notifItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  notifHeadline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4
  },
  notifDetails: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6
  },
  notifDate: {
    fontSize: 11,
    color: '#888',
    textAlign: 'right'
  }
});
