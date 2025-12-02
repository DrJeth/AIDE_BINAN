import React, { useState } from 'react';
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
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Linking } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 68;

const COLORS = {
  PRIMARY_GREEN: '#2D8E5F',
  BACKGROUND_WHITE: '#FFFFFF',
  TEXT_DARK: '#2C3E50',
  TEXT_LIGHT: '#7F8C8D',
  ICON_GREEN: '#2D8E5F',
  BOTTOM_BAR_GREEN: '#2D8E5F'
};

// Google Cloud Vision API - AUTOMATIC PLATE DETECTION
const detectPlateFromImage = async (imageUri) => {
  try {
    console.log('🔍 Starting Cloud Vision OCR...');
    
  
    const API_KEY = 'AQ.Ab8RN6JxnW8S0jxnTtb9bfsJW8ekSLwBjGRsYnDi_vcP0z6Sbw';
    
    // Read image as base64
    console.log('📖 Reading image file...');
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    console.log('✅ Image read, size:', base64.length, 'bytes');

    console.log('📤 Sending to Cloud Vision API...');

    const requestBody = {
      requests: [
        {
          image: {
            content: base64
          },
          features: [
            {
              type: 'TEXT_DETECTION'
            }
          ]
        }
      ]
    };

    console.log('📨 Request payload size:', JSON.stringify(requestBody).length);

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotateRequest?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    console.log('📥 Response status:', response.status);
    const responseText = await response.text();
    console.log('📥 Response body:', responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON Parse error:', parseError.message);
      console.error('Response was:', responseText);
      return null;
    }

    if (result.error) {
      console.error('❌ Vision API error:', result.error.code, result.error.message);
      console.error('Full error:', result.error);
      return null;
    }

    if (!result.responses || !result.responses[0]) {
      console.error('❌ No responses from API');
      return null;
    }

    const response0 = result.responses[0];
    
    let fullText = '';
    
    // Try fullTextAnnotation first (more reliable)
    if (response0.fullTextAnnotation && response0.fullTextAnnotation.text) {
      fullText = response0.fullTextAnnotation.text;
      console.log('✅ Got text from fullTextAnnotation');
    } 
    // Fallback to textAnnotations
    else if (response0.textAnnotations && response0.textAnnotations.length > 0) {
      fullText = response0.textAnnotations[0].description;
      console.log('✅ Got text from textAnnotations');
    }

    console.log('📝 Detected text:', fullText);

    if (!fullText || fullText.trim() === '') {
      console.log('❌ No text detected in image');
      return null;
    }

    // Extract plate number - Philippine plate patterns
    // Examples: 123YBC, J1233, ABC123, J 1233, ABC-123, AB1234
    const platePatterns = [
      /\d{1,4}[A-Z]{1,3}/gi,           // 123YBC or 1234ABC (numbers first)
      /[A-Z]{1,3}\s*-?\s*\d{1,4}/gi,  // ABC-123 or ABC 123 (letters first)
      /[A-Z]{1,3}\d{1,4}/gi            // ABC123
    ];

    for (const pattern of platePatterns) {
      const matches = fullText.match(pattern);
      if (matches && matches.length > 0) {
        let plateNumber = matches[0]
          .replace(/\s/g, '')  // Remove spaces
          .replace(/-/g, '')   // Remove dashes
          .toUpperCase()
          .trim();
          
        // Validate plate format
        // Accept: 123YBC, YABCD, etc.
        if (/^[A-Z0-9]{4,7}$/.test(plateNumber)) {
          console.log('✅ Extracted plate:', plateNumber);
          return plateNumber;
        }
      }
    }

    console.log('❌ No valid plate pattern found in text');
    return null;

  } catch (error) {
    console.error('❌ Detection error:', error.message);
    console.error('Stack:', error);
    return null;
  }
};

export default function HomeAdmin({ navigation }) {
  const [plateNumber, setPlateNumber] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedEbike, setSelectedEbike] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentFullScreenVisible, setDocumentFullScreenVisible] = useState(false);

  const handleQuestionMarkPress = () => {
    Alert.alert(
      'How to Search',
      'AUTOMATIC: Tap "Capture Photo" or "Choose Photo" - AI will read the plate and show rider info automatically!\n\nOR: Enter plate number manually and tap Search'
    );
  };

  const searchEbike = async (plate) => {
    if (!plate || plate.trim() === '') {
      Alert.alert('Error', 'Please enter a plate number');
      return;
    }

    setSearchLoading(true);
    try {
      console.log('🔎 Searching for plate:', plate);
      
      const q = query(
        collection(db, 'users'),
        where('plateNumber', '==', plate.toUpperCase())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Not Found', `No e-bike found with plate: ${plate}`);
        setSearchLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      let registrationData = {};
      let riderDocuments = [];

      try {
        const registrationRef = doc(db, 'riderRegistrations', userDoc.id);
        const registrationSnap = await getDoc(registrationRef);
        if (registrationSnap.exists()) {
          registrationData = registrationSnap.data();
        }

        const documentsQuery = query(
          collection(db, 'riderRegistrations', userDoc.id, 'images'),
          where('type', '==', 'original')
        );
        const docsSnapshot = await getDocs(documentsQuery);
        riderDocuments = docsSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        console.log('📄 Documents found:', riderDocuments.length);

      } catch (err) {
        console.log('No registration data');
      }

      const ebikeData = {
        id: userDoc.id,
        ...userData,
        ...registrationData,
        documents: riderDocuments
      };

      console.log('✅ E-bike found:', ebikeData.firstName);
      setSelectedEbike(ebikeData);
      setDetailsModalVisible(true);
      setPlateNumber('');
      
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
        
        // AUTO DETECT - NO PROMPT!
        console.log('🎥 Photo captured, auto-detecting plate...');
        setDetectionLoading(true);
        
        const detectedPlate = await detectPlateFromImage(imageUri);
        setDetectionLoading(false);

        if (detectedPlate) {
          console.log('✨ Plate detected! Searching...');
          // Auto-close and search
          setTimeout(() => {
            setImageModalVisible(false);
            setCapturedImage(null);
            searchEbike(detectedPlate);
          }, 500);
        } else {
          console.log('⚠️ Detection failed');
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
        
        // AUTO DETECT - NO PROMPT!
        console.log('📸 Photo selected, auto-detecting plate...');
        setDetectionLoading(true);
        
        const detectedPlate = await detectPlateFromImage(imageUri);
        setDetectionLoading(false);

        if (detectedPlate) {
          console.log('✨ Plate detected! Searching...');
          // Auto-close and search
          setTimeout(() => {
            setImageModalVisible(false);
            setCapturedImage(null);
            searchEbike(detectedPlate);
          }, 500);
        } else {
          console.log('⚠️ Detection failed');
          Alert.alert('Detection Failed', 'Could not read plate. Try another photo.');
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Could not pick image');
    }
  };

  // ... (Rest of the render methods stay the same - Modal, Details, Documents, etc.)
  // [Keeping all the rendering logic from before]

  const renderDetailsModal = () => (
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
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>E-Bike Information</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plate:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike.plateNumber || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike.ebikeType || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Model:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike.ebikeModel || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Color:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike.ebikeColor || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Chassis:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike.chassisNumber || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Status</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Verification:</Text>
                    <Text style={[
                      styles.detailValue,
                      { 
                        color: selectedEbike.status === 'Verified' ? '#4CAF50' : '#FF9800',
                        fontWeight: '600'
                      }
                    ]}>
                      {selectedEbike.status || 'Pending'}
                    </Text>
                  </View>
                </View>

                {selectedEbike.documents && selectedEbike.documents.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Documents ({selectedEbike.documents.length})
                    </Text>

                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.documentsScroll}
                    >
                      {selectedEbike.documents.slice(0, 3).map((doc, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            setSelectedDocument(doc);
                            setDocumentFullScreenVisible(true);
                          }}
                          style={styles.documentThumbnail}
                        >
                          <Image
                            source={{ uri: doc.url }}
                            style={styles.documentThumb}
                          />
                          <Text style={styles.documentIndex}>
                            {index + 1}
                          </Text>
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
          <Image 
            source={{ uri: selectedDocument.url }} 
            style={styles.fullImage}
            resizeMode="contain"
          />
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
        width="100%" height="100%" style="border:0;" 
        allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade">
      </iframe>
    </body>
  </html>
  `;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        > 
          <Text style={styles.greeting}>Hi, Juan</Text>

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

          <TouchableOpacity style={styles.greenRouteCard}>
            <View style={styles.mapPreviewContainer}>
              <View style={styles.mapPreviewHeader}>
                <Text style={styles.mapPreviewTitle}>Green Routes in Binan</Text>
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
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.openMapButton}
            onPress={() => navigation.navigate('AdminMap')}
          >
            <Text style={styles.openMapText}>Open Full Map</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <View style={[styles.bottomBar, { height: BOTTOM_BAR_HEIGHT }]}>
        <SafeAreaView style={styles.bottomSafe}>
          <View style={[styles.bottomInner, { height: BOTTOM_BAR_HEIGHT }]}>
            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate("HomeAdmin")}>
              <Feather name="home" size={24} color="white" />
              <Text style={styles.bottomBarText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate("NewsScreen")}>
              <Feather name="file-text" size={24} color="white" />
              <Text style={styles.bottomBarText}>News</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate("RiderScreen")}>
              <Feather name="users" size={24} color="white" />
              <Text style={styles.bottomBarText}>Rider</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate("AdminAppointment")}>
              <Feather name="calendar" size={24} color="white" />
              <Text style={styles.bottomBarText}>Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomBarItem} onPress={() => navigation.navigate("Me")}>
              <Feather name="user" size={24} color="white" />
              <Text style={styles.bottomBarText}>Profile</Text>
            </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_WHITE
  },
  safeArea: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 100
  },
  greeting: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 20
  },
  searchContainer: {
    marginBottom: 20
  },
  searchLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.TEXT_DARK,
    fontWeight: '600'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
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
  cameraButtonContainer: {
    flexDirection: 'row',
    gap: 10
  },
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
  cameraButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600'
  },
  greenRouteCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  mapPreviewContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    overflow: 'hidden'
  },
  mapPreviewHeader: {
    padding: 15,
    paddingBottom: 0
  },
  mapPreviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32'
  },
  mapWrapper: {
    height: 400,
    width: '100%'
  },
  webview: {
    flex: 1
  },
  openMapButton: {
    backgroundColor: '#0ea548ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  openMapText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  bottomSafe: {
    flex: 1
  },
  bottomInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomBarText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden'
  },
  modalCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 50,
    padding: 8
  },
  modalScroll: {
    padding: 20,
    paddingTop: 50
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 20
  },
  detailSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_LIGHT,
    flex: 1
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    flex: 1,
    textAlign: 'right'
  },
  documentsScroll: {
    marginHorizontal: -15,
    paddingHorizontal: 15
  },
  documentThumbnail: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative'
  },
  documentThumb: {
    width: 100,
    height: 100,
    borderRadius: 8
  },
  documentIndex: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1
  },
  loadingText: {
    color: 'white',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600'
  },
  imageCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
    padding: 10
  },
  fullImage: {
    width: '100%',
    height: '100%'
  }
});