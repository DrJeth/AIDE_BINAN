import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  Modal,
  Image,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, app } from '../config/firebaseConfig';
import { useRoute } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 68;

const COLORS = {
  PRIMARY_GREEN: '#2E7D32',
  BACKGROUND_WHITE: '#FFFFFF',
  TEXT_DARK: '#2C3E50',
  TEXT_LIGHT: '#7F8C8D',
  ICON_GREEN: '#2E7D32',
  BOTTOM_BAR_GREEN: '#2E7D32'
};

// (Optional) — you used in admin modal. Keep.
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

const formatDateTime = (dateValue) => {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue?.toDate?.() || dateValue);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
};

const normalizePlate = (v = '') =>
  v
    .toString()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .trim();

const getEbikeStatus = (ebike, userStatus) => {
  return ebike?.status || userStatus || 'Pending';
};

const computeOverallUserStatus = (ebikes = []) => {
  const statuses = ebikes.map(e => e?.status).filter(Boolean);
  if (statuses.includes('Pending')) return 'Pending';
  if (statuses.length > 0 && statuses.every(s => s === 'Rejected')) return 'Rejected';
  return 'Verified';
};

// ✅ SAME normalize logic as RiderScreen (supports multi-ebike + legacy)
const normalizeUserEbikes = (userData) => {
  if (Array.isArray(userData?.ebikes) && userData.ebikes.length > 0) {
    return userData.ebikes.map((e, idx) => ({
      id: e?.id || String(idx),
      ebikeBrand: e?.ebikeBrand || '',
      ebikeModel: e?.ebikeModel || '',
      ebikeColor: e?.ebikeColor || '',
      chassisMotorNumber: e?.chassisMotorNumber || '',
      branch: e?.branch || '',
      plateNumber: e?.plateNumber || '',
      hasPlate: typeof e?.hasPlate === 'boolean' ? e.hasPlate : !!e?.plateNumber,

      status: e?.status || userData.status || 'Pending',
      ebikeCategorySelected: e?.ebikeCategorySelected || '',
      registeredDate: e?.registeredDate || null,
      renewalDate: e?.renewalDate || null,
      registrationStatus: e?.registrationStatus || null,
      verifiedAt: e?.verifiedAt || null,
      rejectedAt: e?.rejectedAt || null,
      rejectedBy: e?.rejectedBy || null,

      adminVerificationDocs: e?.adminVerificationDocs || null,
      transactionHistory: Array.isArray(e?.transactionHistory) ? e.transactionHistory : [],

      // legacy docs (if any)
      adminVerificationImages: Array.isArray(e?.adminVerificationImages) ? e.adminVerificationImages : [],

      paymentDetails: e?.paymentDetails || null,
      createdAt: e?.createdAt || null,
    }));
  }

  // legacy single ebike
  return [{
    id: 'legacy',
    ebikeBrand: userData?.ebikeBrand || '',
    ebikeModel: userData?.ebikeModel || '',
    ebikeColor: userData?.ebikeColor || '',
    chassisMotorNumber: userData?.chassisMotorNumber || userData?.chassisNumber || '',
    branch: userData?.branch || '',
    plateNumber: userData?.plateNumber || '',
    hasPlate: !!userData?.plateNumber,

    status: userData?.status || 'Pending',
    ebikeCategorySelected: userData?.ebikeCategorySelected || '',
    registeredDate: userData?.registeredDate || null,
    renewalDate: userData?.renewalDate || null,
    registrationStatus: userData?.registrationStatus || null,
    verifiedAt: userData?.verifiedAt || null,
    rejectedAt: userData?.rejectedAt || null,
    rejectedBy: userData?.rejectedBy || null,

    adminVerificationDocs: userData?.adminVerificationDocs || null,
    transactionHistory: Array.isArray(userData?.transactionHistory) ? userData.transactionHistory : [],
    adminVerificationImages: Array.isArray(userData?.adminVerificationImages) ? userData.adminVerificationImages : [],

    paymentDetails: userData?.paymentDetails || null,
    createdAt: userData?.createdAt || null,
  }];
};

const getRegistrationStatusFromEbike = (ebike) => {
  if (!ebike?.renewalDate) return null;

  const today = new Date();
  const renewalDate = new Date(ebike.renewalDate?.toDate?.() || ebike.renewalDate);
  const daysUntilExpiry = Math.floor((renewalDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return { status: 'Expired', daysLeft: 0, color: '#F44336' };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'Expiring Soon', daysLeft: daysUntilExpiry, color: '#FF9800' };
  } else {
    return { status: 'Active', daysLeft: daysUntilExpiry, color: '#4CAF50' };
  }
};

const getCategoryLabel = (categoryValue) => {
  if (!categoryValue) return 'N/A';
  const category = EBIKE_CATEGORIES.find(c => c.value === categoryValue);
  return category ? category.label : categoryValue;
};

// ✅ FIX: ADMIN ROLE NORMALIZER (role-first; ignores "adminTask" like "for inspection" unless role is missing)
const normalizeAdminTask = (position = "", adminTaskRole = "", adminTask = "") => {
  const roleText = [adminTaskRole, position]
    .filter(Boolean)
    .join(" ")
    .toString()
    .toLowerCase()
    .trim();

  const taskText = (adminTask || "")
    .toString()
    .toLowerCase()
    .trim();

  if (roleText) {
    if (/\bprocess/.test(roleText)) return "processing";
    if (/\bvalidat/.test(roleText)) return "validator";
    if (/\binspect/.test(roleText)) return "inspector";
    return "unknown";
  }

  if (/\bprocess/.test(taskText)) return "processing";
  if (/\bvalidat/.test(taskText)) return "validator";
  if (/\binspect/.test(taskText)) return "inspector";

  return "unknown";
};

// ✅ Route param resolver (supports many param names from other screens/login)
const resolveAdminTaskFromParams = (params = {}) => {
  return normalizeAdminTask(
    params?.position || params?.adminPosition || params?.jobTitle || "",
    params?.adminTaskRole || params?.adminRole || params?.role || params?.userRole || "",
    params?.adminTask || params?.task || params?.adminTaskType || params?.type || ""
  );
};

const VALID_ADMIN_TASKS = ["processing", "validator", "inspector"];
const isValidAdminTask = (t) => VALID_ADMIN_TASKS.includes((t || "").toString().toLowerCase());

const ADMIN_TABS = {
  processing: [
    { key: "home", label: "Home", icon: "home", screen: "HomeAdmin" },
    { key: "rider", label: "Rider", icon: "users", screen: "RiderScreen", params: { view: "normal" } },
    { key: "profile", label: "Profile", icon: "user", screen: "Me" },
  ],
  validator: [
    { key: "home", label: "Home", icon: "home", screen: "HomeAdmin" },
    { key: "news", label: "News", icon: "file-text", screen: "NewsScreen" },
    { key: "rider", label: "Rider", icon: "users", screen: "RiderScreen", params: { view: "normal" } },
    { key: "profile", label: "Profile", icon: "user", screen: "Me" },
  ],
  inspector: [
    { key: "home", label: "Home", icon: "home", screen: "HomeAdmin" },
    { key: "appt", label: "Appointment", icon: "calendar", screen: "AdminAppointment" },
    { key: "inspect", label: "Rider", icon: "search", screen: "RiderScreen", params: { view: "inspect" } },
    { key: "profile", label: "Profile", icon: "user", screen: "Me" },
  ],
  unknown: [
    { key: "home", label: "Home", icon: "home", screen: "HomeAdmin" },
    { key: "profile", label: "Profile", icon: "user", screen: "Me" },
  ],
};

// Google Cloud Vision API - AUTOMATIC PLATE DETECTION
const detectPlateFromImage = async (imageUri) => {
  try {
    console.log('🔍 Starting Cloud Vision OCR...');
    const API_KEY = 'AIzaSyDzd_KY3Lb1_U8QjkonSQsT9NXoyB6mulw';

    console.log('📖 Reading image file...');
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    console.log('✅ Image read, size:', base64.length, 'bytes');

    console.log('📤 Sending to Cloud Vision API...');
    const requestBody = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION' }]
        }
      ]
    };

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    console.log('📥 Response status:', response.status);
    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON Parse error:', parseError.message);
      return null;
    }

    if (result.error) {
      console.error('❌ Vision API error:', result.error.code, result.error.message);
      return null;
    }

    if (!result.responses || !result.responses[0]) return null;

    const response0 = result.responses[0];
    let fullText = '';

    if (response0.fullTextAnnotation && response0.fullTextAnnotation.text) {
      fullText = response0.fullTextAnnotation.text;
    } else if (response0.textAnnotations && response0.textAnnotations.length > 0) {
      fullText = response0.textAnnotations[0].description;
    }

    console.log('📝 Detected text:', fullText);
    if (!fullText || fullText.trim() === '') return null;

    const platePatterns = [
      /\d{1,4}[A-Z]{1,3}/gi,
      /[A-Z]{1,3}\s*-?\s*\d{1,4}/gi,
      /[A-Z]{1,3}\d{1,4}/gi
    ];

    for (const pattern of platePatterns) {
      const matches = fullText.match(pattern);
      if (matches && matches.length > 0) {
        let plateNumber = matches[0]
          .replace(/\s/g, '')
          .replace(/-/g, '')
          .toUpperCase()
          .trim();

        if (/^[A-Z0-9]{4,7}$/.test(plateNumber)) {
          console.log('✅ Extracted plate:', plateNumber);
          return plateNumber;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Detection error:', error.message);
    return null;
  }
};

export default function HomeAdmin({ navigation }) {
  const route = useRoute();
  const initialRouteTask = resolveAdminTaskFromParams(route?.params || {});

  const [plateNumber, setPlateNumber] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedEbike, setSelectedEbike] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [documentFullScreenVisible, setDocumentFullScreenVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [userFirstName, setUserFirstName] = useState('Admin');

  // ✅ NEW: Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  const [adminTask, setAdminTask] = useState(() => {
    return isValidAdminTask(initialRouteTask) ? initialRouteTask : "unknown";
  });

  useEffect(() => {
    const rt = resolveAdminTaskFromParams(route?.params || {});
    if (isValidAdminTask(rt)) setAdminTask(rt);
  }, [
    route?.params?.adminTask,
    route?.params?.adminTaskRole,
    route?.params?.adminRole,
    route?.params?.role,
    route?.params?.position,
    route?.params?.task,
    route?.params?.type
  ]);

  // ✅ NEW: realtime announcements listener
  useEffect(() => {
    setAnnouncementsLoading(true);

    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAnnouncements(rows);
        setAnnouncementsLoading(false);
      },
      (err) => {
        console.error('❌ announcements listen error:', err);
        setAnnouncementsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          let userData = null;

          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            userData = userDocSnap.data();
          } else {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              userData = querySnapshot.docs[0].data();
            }
          }

          if (userData) {
            setUserFirstName(userData.firstName || 'Admin');

            const taskFromDb = normalizeAdminTask(
              userData.position || "",
              userData.adminTaskRole || userData.adminRole || userData.role || userData.userRole || "",
              userData.adminTask || userData.task || ""
            );

            setAdminTask((prev) => {
              const prevNorm = (prev || "").toString().toLowerCase();
              if (isValidAdminTask(taskFromDb)) return taskFromDb;
              if (isValidAdminTask(prevNorm)) return prevNorm;
              return "unknown";
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const allowedTabs = ADMIN_TABS[adminTask] || ADMIN_TABS.unknown;

  const handleQuestionMarkPress = () => {
    Alert.alert(
      'How to Search',
      'AUTOMATIC: Tap "Capture Photo" or "Choose Photo" - AI will read the plate and show rider info automatically!\n\nOR: Enter plate number manually and tap Search'
    );
  };

  const fetchRiderDocuments = async (userId) => {
    try {
      const allDocumentsQuery = query(
        collection(db, 'riderRegistrations', userId, 'images')
      );
      const docsSnapshot = await getDocs(allDocumentsQuery);

      return docsSnapshot.docs.map(docSnap => {
        const docData = docSnap.data();
        const imageUrl = docData.url || docData.imageUrl || docData.downloadUrl || docData.image;
        return {
          id: docSnap.id,
          type: docData.type,
          url: imageUrl,
          timestamp: docData.timestamp,
          ...docData
        };
      });
    } catch (e) {
      console.error('❌ Error fetching rider documents:', e?.message || e);
      return [];
    }
  };

  const openDetails = async ({ userId, userData, matchedEbike = null }) => {
    const riderDocuments = await fetchRiderDocuments(userId);

    const ebikes = normalizeUserEbikes(userData);

    let ebike = matchedEbike;
    if (!ebike && userData?.plateNumber) {
      const p = normalizePlate(userData.plateNumber);
      ebike = ebikes.find(e => normalizePlate(e?.plateNumber) === p) || null;
    }

    const ebikeStatus = getEbikeStatus(ebike, userData?.status);

    setSelectedEbike({
      id: userId,
      userId,

      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      contactNumber: userData?.contactNumber || 'N/A',
      email: userData?.email || 'N/A',
      address: userData?.address || 'N/A',
      birthday: userData?.birthday || 'N/A',

      status: ebikeStatus,
      userStatus: userData?.status || 'Pending',

      documents: riderDocuments,
      matchedEbike: ebike
    });

    setDetailsModalVisible(true);
    setPlateNumber('');
  };

  const searchEbike = async (plateRaw) => {
    const plate = normalizePlate(plateRaw);

    if (!plate) {
      Alert.alert('Error', 'Please enter a plate number');
      return;
    }

    setSearchLoading(true);
    try {
      console.log('🔎 Searching plate:', plate);

      const q1 = query(collection(db, 'users'), where('plateNumber', '==', plate));
      const s1 = await getDocs(q1);
      if (!s1.empty) {
        const userDoc = s1.docs[0];
        const userData = userDoc.data();

        const ebikes = normalizeUserEbikes(userData);
        const matched = ebikes.find(e => normalizePlate(e?.plateNumber) === plate) || null;

        await openDetails({ userId: userDoc.id, userData, matchedEbike: matched });
        return;
      }

      const q2 = query(collection(db, 'users'), where('plateNumbers', 'array-contains', plate));
      const s2 = await getDocs(q2);
      if (!s2.empty) {
        const userDoc = s2.docs[0];
        const userData = userDoc.data();

        const ebikes = normalizeUserEbikes(userData);
        const matched = ebikes.find(e => normalizePlate(e?.plateNumber) === plate) || null;

        await openDetails({ userId: userDoc.id, userData, matchedEbike: matched });
        return;
      }

      const q3 = query(collection(db, 'users'), where('role', '==', 'Rider'));
      const s3 = await getDocs(q3);

      let found = null;
      for (const userDoc of s3.docs) {
        const userData = userDoc.data();
        const ebikes = normalizeUserEbikes(userData);
        const matched = ebikes.find(e => normalizePlate(e?.plateNumber) === plate);
        if (matched) {
          found = { userId: userDoc.id, userData, matchedEbike: matched };
          break;
        }
      }

      if (found) {
        await openDetails(found);
        return;
      }

      Alert.alert('Not Found', `No e-bike found with plate: ${plate}`);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', `Could not search: ${error.message}`);
    } finally {
      setSearchLoading(false);
    }
  };

  const capturePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permissions required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        setImageModalVisible(true);

        console.log('🎥 Photo captured, auto-detecting plate...');
        setDetectionLoading(true);
        const detectedPlate = await detectPlateFromImage(imageUri);
        setDetectionLoading(false);

        if (detectedPlate) {
          console.log('✨ Plate detected! Searching...');
          setTimeout(() => {
            setImageModalVisible(false);
            setCapturedImage(null);
            searchEbike(detectedPlate);
          }, 500);
        } else {
          Alert.alert('Detection Failed', 'Could not read plate. Try another photo.');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Could not capture image');
    }
  };

  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permissions required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setCapturedImage(imageUri);
        setImageModalVisible(true);

        console.log('📸 Photo selected, auto-detecting plate...');
        setDetectionLoading(true);
        const detectedPlate = await detectPlateFromImage(imageUri);
        setDetectionLoading(false);

        if (detectedPlate) {
          console.log('✨ Plate detected! Searching...');
          setTimeout(() => {
            setImageModalVisible(false);
            setCapturedImage(null);
            searchEbike(detectedPlate);
          }, 500);
        } else {
          Alert.alert('Detection Failed', 'Could not read plate. Try another photo.');
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const renderDetailsModal = () => {
    const eb = selectedEbike?.matchedEbike || null;
    const regStatus = eb ? getRegistrationStatusFromEbike(eb) : null;

    const adminVerificationImages = Array.isArray(eb?.adminVerificationImages)
      ? eb.adminVerificationImages
      : [];

    const adminReceipt = Array.isArray(eb?.adminVerificationDocs?.receipt)
      ? eb.adminVerificationDocs.receipt
      : [];
    const adminEbikePhotos = Array.isArray(eb?.adminVerificationDocs?.ebikePhotos)
      ? eb.adminVerificationDocs.ebikePhotos
      : [];

    const combinedAdminDocs = [
      ...adminReceipt.map(url => ({ url, type: 'admin_receipt' })),
      ...adminEbikePhotos.map(url => ({ url, type: 'admin_ebike' })),
      ...adminVerificationImages.map(url => ({ url, type: 'verification' })),
    ].filter(x => !!x.url);

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Feather name="x" size={28} color={COLORS.TEXT_DARK} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>E-Bike Details</Text>

              {selectedEbike && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Rider Information</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name:</Text>
                      <Text style={styles.detailValue}>
                        {selectedEbike.firstName} {selectedEbike.lastName}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact:</Text>
                      <Text style={styles.detailValue}>
                        {selectedEbike.contactNumber || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>
                        {selectedEbike.email || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValue}>
                        {selectedEbike.address || 'N/A'}
                      </Text>
                    </View>

                    <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                      <Text style={styles.detailLabel}>Birthday:</Text>
                      <Text style={styles.detailValue}>
                        {selectedEbike.birthday || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>E-Bike Information</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Plate:</Text>
                      <Text style={styles.detailValue}>
                        {eb?.plateNumber ? normalizePlate(eb.plateNumber) : 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Brand:</Text>
                      <Text style={styles.detailValue}>
                        {eb?.ebikeBrand || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Model:</Text>
                      <Text style={styles.detailValue}>
                        {eb?.ebikeModel || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Color:</Text>
                      <Text style={styles.detailValue}>
                        {eb?.ebikeColor || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Chassis/Motor:</Text>
                      <Text style={styles.detailValue}>
                        {eb?.chassisMotorNumber || 'N/A'}
                      </Text>
                    </View>

                    <View style={[styles.detailRow, { paddingBottom: 0, borderBottomWidth: 0 }]}>
                      <Text style={styles.detailLabel}>Branch:</Text>
                      <Text style={styles.detailValue}>
                        {eb?.branch || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Verification Status</Text>

                    <View style={[styles.detailRow, { paddingBottom: 0, borderBottomWidth: 0 }]}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[
                        styles.detailValue,
                        {
                          color: selectedEbike.status === 'Verified'
                            ? '#4CAF50'
                            : selectedEbike.status === 'Rejected'
                              ? '#F44336'
                              : '#FF9800',
                          fontWeight: '600'
                        }
                      ]}>
                        {selectedEbike.status || 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {selectedEbike.status === 'Verified' && eb && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Registration Information</Text>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>E-Bike Category:</Text>
                        <Text style={styles.detailValue}>
                          {getCategoryLabel(eb.ebikeCategorySelected)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Registered:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(eb.registeredDate)}
                        </Text>
                      </View>

                      <View style={[styles.detailRow, { paddingBottom: 0, borderBottomWidth: 0 }]}>
                        <Text style={styles.detailLabel}>Renewal Date:</Text>
                        <Text style={[
                          styles.detailValue,
                          regStatus && { color: regStatus.color, fontWeight: '600' }
                        ]}>
                          {formatDate(eb.renewalDate)}
                        </Text>
                      </View>

                      {regStatus && (
                        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                          <Text style={styles.detailLabel}>Status:</Text>
                          <Text style={[
                            styles.detailValue,
                            { color: regStatus.color, fontWeight: '600' }
                          ]}>
                            {regStatus.status}
                            {regStatus.status !== 'Expired' ? ` (${regStatus.daysLeft} days)` : ''}
                          </Text>
                        </View>
                      )}

                      {eb.paymentDetails && (
                        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                          <Text style={styles.detailLabel}>Payment:</Text>
                          <Text style={styles.detailValue}>
                            ₱{Number(eb.paymentDetails.amount || 0).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {selectedEbike.documents && selectedEbike.documents.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        📄 Rider Documents ({selectedEbike.documents.length})
                      </Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.documentsScroll}
                      >
                        {selectedEbike.documents.map((d, index) => (
                          <TouchableOpacity
                            key={d.id || index}
                            onPress={() => {
                              if (d.url) {
                                setSelectedDocument(d);
                                setDocumentFullScreenVisible(true);
                              }
                            }}
                            style={styles.documentThumbnail}
                          >
                            {d.url ? (
                              <>
                                <Image source={{ uri: d.url }} style={styles.documentThumb} />
                                <View style={styles.documentTypeLabel}>
                                  <Text style={styles.documentTypeText}>
                                    {d.type === 'original' ? '📝' : '📄'}
                                  </Text>
                                </View>
                              </>
                            ) : (
                              <View style={[styles.documentThumb, styles.documentPlaceholder]}>
                                <Text style={styles.placeholderText}>No Image</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {combinedAdminDocs.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        ✅ Admin Verification ({combinedAdminDocs.length})
                      </Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.documentsScroll}
                      >
                        {combinedAdminDocs.map((d, index) => (
                          <TouchableOpacity
                            key={`${d.type}_${index}`}
                            onPress={() => {
                              setSelectedDocument({ url: d.url, type: d.type });
                              setDocumentFullScreenVisible(true);
                            }}
                            style={styles.documentThumbnail}
                          >
                            <Image source={{ uri: d.url }} style={styles.documentThumb} />
                            <View style={styles.documentTypeLabel}>
                              <Text style={styles.documentTypeText}>
                                {d.type === 'admin_receipt' ? '🧾' : '✅'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDocumentFullScreen = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={documentFullScreenVisible}
      onRequestClose={() => setDocumentFullScreenVisible(false)}
    >
      <View style={styles.imageModalContainer}>
        <TouchableOpacity
          style={styles.imageCloseButton}
          onPress={() => setDocumentFullScreenVisible(false)}
        >
          <Feather name="x" size={28} color="white" />
        </TouchableOpacity>

        {selectedDocument && (
          <>
            <Image
              source={{ uri: selectedDocument.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <View style={styles.documentInfoOverlay}>
              <Text style={styles.documentInfoText}>
                {selectedDocument.type === 'original'
                  ? '📝 Original Document'
                  : selectedDocument.type === 'admin_receipt'
                    ? '🧾 Admin Receipt'
                    : selectedDocument.type === 'admin_ebike'
                      ? '✅ Admin E-bike Photo'
                      : '✅ Verification Document'}
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );

  const renderImageModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={imageModalVisible}
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.imageModalContainer}>
        {detectionLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY_GREEN} />
            <Text style={styles.loadingText}>🔍 Reading plate number...</Text>
          </View>
        ) : (
          <>
            {capturedImage && (
              <Image
                source={{ uri: capturedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.imageCloseButton}
              onPress={() => {
                setImageModalVisible(false);
                setCapturedImage(null);
              }}
            >
              <Feather name="x" size={28} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.greeting}>Hi, {userFirstName}</Text>

          <View style={styles.searchContainer}>
            <Text style={styles.searchLabel}>Search E-bike</Text>

            <View style={styles.searchInputContainer}>
              <TextInput
                placeholder="Enter Plate Number"
                placeholderTextColor={COLORS.TEXT_LIGHT}
                style={styles.searchInput}
                value={plateNumber}
                onChangeText={(text) => setPlateNumber(text.toUpperCase())}
                editable={!searchLoading}
              />
              <TouchableOpacity
                style={styles.helpButton}
                onPress={handleQuestionMarkPress}
              >
                <Feather name="help-circle" size={24} color={COLORS.ICON_GREEN} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchButton, searchLoading && { opacity: 0.6 }]}
                onPress={() => searchEbike(plateNumber)}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Feather name="search" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.cameraButtonContainer}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={capturePhoto}
                disabled={detectionLoading}
              >
                <Feather name="camera" size={18} color="white" />
                <Text style={styles.cameraButtonText}>Capture Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cameraButton, { backgroundColor: '#2196F3' }]}
                onPress={pickPhoto}
                disabled={detectionLoading}
              >
                <Feather name="image" size={18} color="white" />
                <Text style={styles.cameraButtonText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ✅ REPLACEMENT: Posted Announcements */}
          <View style={styles.announcementsWrap}>
            <View style={styles.annHeaderRow}>
              <Text style={styles.annTitle}>Posted Announcements</Text>
              <View style={styles.annBadge}>
                <Text style={styles.annBadgeText}>{announcements.length}</Text>
              </View>
            </View>

            {announcementsLoading ? (
              <View style={styles.annLoading}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY_GREEN} />
                <Text style={styles.annLoadingText}>Loading announcements...</Text>
              </View>
            ) : announcements.length === 0 ? (
              <View style={styles.emptyAnnCard}>
                <Text style={styles.emptyAnnText}>No announcements posted yet.</Text>
              </View>
            ) : (
              announcements.map((a) => {
                const title = a?.title || a?.subject || a?.announcementTitle || 'Announcement';
                const body =
                  a?.message ||
                  a?.content ||
                  a?.body ||
                  a?.description ||
                  a?.text ||
                  '';

                const dateText =
                  formatDateTime(a?.createdAt || a?.timestamp || a?.datePosted) || '';

                const imageUrl = a?.imageUrl || a?.image || a?.photoUrl || a?.coverUrl || null;

                return (
                  <View key={a.id} style={styles.annCard}>
                    <View style={styles.annCardTop}>
                      <Text style={styles.annCardTitle} numberOfLines={2}>{title}</Text>
                      {!!dateText && <Text style={styles.annCardDate}>{dateText}</Text>}
                    </View>

                    {!!body && (
                      <Text style={styles.annCardBody}>
                        {body}
                      </Text>
                    )}

                    {!!imageUrl && (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.annImage}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ✅ DYNAMIC BOTTOM BAR based on adminTask */}
      <View style={[styles.bottomBar, { height: BOTTOM_BAR_HEIGHT }]}>
        <SafeAreaView style={styles.bottomSafe}>
          <View style={[styles.bottomInner, { height: BOTTOM_BAR_HEIGHT }]}>
            {allowedTabs.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={styles.bottomBarItem}
                onPress={() =>
                  navigation.navigate({
                    name: t.screen,
                    params: {
                      adminTask,
                      adminTaskRole: adminTask,
                      ...(t.params || {})
                    },
                    merge: false
                  })
                }
              >
                <Feather name={t.icon} size={24} color="white" />
                <Text style={styles.bottomBarText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </View>

      {renderDetailsModal()}
      {renderDocumentFullScreen()}
      {renderImageModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND_WHITE },
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 110 },

  greeting: { fontSize: 40, fontWeight: '700', color: COLORS.TEXT_DARK, marginBottom: 20 },

  searchContainer: { marginBottom: 18 },
  searchLabel: { fontSize: 16, marginBottom: 10, color: COLORS.TEXT_DARK, fontWeight: '600' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.TEXT_DARK
  },
  helpButton: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchButton: {
    backgroundColor: COLORS.PRIMARY_GREEN,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cameraButtonContainer: { flexDirection: 'row', gap: 10 },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY_GREEN,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6
  },
  cameraButtonText: { color: 'white', fontSize: 13, fontWeight: '600' },

  // ✅ Announcements UI
  announcementsWrap: {
    marginTop: 6,
    paddingTop: 4
  },
  annHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  annTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_DARK
  },
  annBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  annBadgeText: {
    color: COLORS.PRIMARY_GREEN,
    fontWeight: '800'
  },
  annLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14
  },
  annLoadingText: {
    color: COLORS.TEXT_LIGHT,
    fontWeight: '600'
  },
  emptyAnnCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  emptyAnnText: {
    color: COLORS.TEXT_LIGHT,
    fontWeight: '600'
  },
  annCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12
  },
  annCardTop: {
    marginBottom: 8
  },
  annCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.TEXT_DARK
  },
  annCardDate: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.TEXT_LIGHT,
    fontWeight: '600'
  },
  annCardBody: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    lineHeight: 20
  },
  annImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#F2F2F2'
  },

  bottomBar: {
    backgroundColor: COLORS.BOTTOM_BAR_GREEN,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  bottomSafe: { flex: 1 },
  bottomInner: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bottomBarItem: { alignItems: 'center', justifyContent: 'center' },
  bottomBarText: { color: 'white', fontSize: 12, marginTop: 5 },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '90%', maxHeight: '90%', backgroundColor: 'white', borderRadius: 15, overflow: 'hidden' },
  modalCloseButton: { position: 'absolute', top: 15, right: 15, zIndex: 10, backgroundColor: '#F0F0F0', borderRadius: 50, padding: 8 },
  modalScroll: { padding: 20, paddingTop: 50 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: COLORS.TEXT_DARK, marginBottom: 20 },

  detailSection: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 15, marginBottom: 15 },
  detailSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.TEXT_DARK, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  detailLabel: { fontSize: 14, fontWeight: '600', color: COLORS.TEXT_LIGHT, flex: 1 },
  detailValue: { fontSize: 14, color: COLORS.TEXT_DARK, flex: 1, textAlign: 'right' },

  documentsScroll: { marginHorizontal: -15, paddingHorizontal: 15, marginTop: 10 },
  documentThumbnail: { marginRight: 10, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  documentThumb: { width: 100, height: 100, borderRadius: 8 },
  documentPlaceholder: { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 12, color: '#999', fontWeight: '600', textAlign: 'center' },
  documentTypeLabel: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  documentTypeText: { color: 'white', fontSize: 14, fontWeight: '600' },

  imageModalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { color: 'white', marginTop: 15, fontSize: 16, fontWeight: '600' },
  imageCloseButton: { position: 'absolute', top: 40, right: 20, zIndex: 10, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 50, padding: 10 },
  fullImage: { width: '100%', height: '100%' },
  documentInfoOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0, 0, 0, 0.8)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  documentInfoText: { color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'center' }
});
