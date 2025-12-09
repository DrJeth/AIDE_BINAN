import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { 
  getDoc,
  setDoc,
  runTransaction,
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { ref, uploadBytesResumable, getDownloadURL  } from 'firebase/storage';
import { db, auth, storage } from '../config/firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const RESPONSIVE = {
  width: SCREEN_WIDTH / 375,
  height: SCREEN_HEIGHT / 812,
  normalize: (size, based = 'width') => {
    const scale = based === 'height' 
      ? SCREEN_HEIGHT / 812 
      : SCREEN_WIDTH / 375;
    return size * scale;
  }
};

// 2 big letters + 4 numbers (e.g., AB1234)
const PLATE_REGEX = /^[A-Z]{2}[0-9]{4}$/;

const RiderScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Pending');
  const [riders, setRiders] = useState([]);
  const [filteredRiders, setFilteredRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [adminUploadImages, setAdminUploadImages] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [registeredDateInput, setRegisteredDateInput] = useState('');
  const [renewalDateInput, setRenewalDateInput] = useState('');
  const [showRegisteredPicker, setShowRegisteredPicker] = useState(false);
  const [showRenewalPicker, setShowRenewalPicker] = useState(false);

  // manual plate number input (for riders with no plate)
  const [manualPlateNumber, setManualPlateNumber] = useState('');
  const [manualPlateError, setManualPlateError] = useState('');

  // Calculate registration status
  const getRegistrationStatus = (rider) => {
    if (!rider.renewalDate) return null;
    
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

  // Format date for display
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

  const fetchRiders = async () => {
    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'Rider'),
        where('status', '==', activeTab)
      );

      const snapshot = await getDocs(q);
      
      const riderData = await Promise.all(snapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        
        let imagesData = [];
        
        try {
          const imagesQuerySnapshot = await getDocs(
            query(
              collection(db, 'riderRegistrations', userDoc.id, 'images'),
              where('type', '==', 'original')
            )
          );

          imagesData = await Promise.all(
            imagesQuerySnapshot.docs.map(async (imageDoc) => {
              const imageData = imageDoc.data();
              return imageData.url;
            })
          );
        } catch (registrationError) {
          console.log('No registration images found for rider:', userDoc.id);
        }

        return {
          id: userDoc.id,
          userId: userDoc.id,
          uid: userData.uid || userDoc.id,
          personalInfo: {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            contactNumber: userData.contactNumber || '',
            birthday: userData.birthday || '',
            address: userData.address || ''
          },
          ebikeInfo: {
            brand: userData.ebikeBrand || '',
            model: userData.ebikeModel || '',
            color: userData.ebikeColor || '',
            plateNumber: userData.plateNumber || ''
          },
          ebikeCategorySelected: userData.ebikeCategorySelected || '',
          chassisNumber: userData.chassisMotorNumber || userData.chassisNumber || '',
          branch: userData.branch || '',
          email: userData.email || '',
          images: imagesData,
          status: userData.status || activeTab,
          createdAt: userData.createdAt,
          registeredDate: userData.registeredDate,
          renewalDate: userData.renewalDate,
          registrationStatus: userData.registrationStatus,
          verifiedAt: userData.verifiedAt,
          approvedAt: userData.approvedAt,
          rejectedAt: userData.rejectedAt,
          paymentDetails: userData.paymentDetails,
          adminVerificationImages: userData.adminVerificationImages || []
        };
      }));

      console.log(`Fetched ${activeTab} Riders:`, riderData);
      
      setRiders(riderData);
      setFilteredRiders(riderData);
    } catch (error) {
      console.error('Error fetching riders:', error);
      Alert.alert('Error', 'Could not fetch rider data');
    }
  };

  const uploadAdminImagesToFirebase = async () => {
    try {
      console.log('Starting image upload');
      console.log('Images to upload:', adminUploadImages);
      console.log('Selected rider:', selectedRider?.id);

      if (!adminUploadImages || adminUploadImages.length === 0) {
        Alert.alert('Error', 'No verification documents uploaded');
        return [];
      }

      if (!selectedRider || !selectedRider.id) {
        Alert.alert('Error', 'No rider selected');
        return [];
      }

      setUploading(true);
      const imageUrls = [];

      for (let index = 0; index < adminUploadImages.length; index++) {
        const imageUri = adminUploadImages[index];
        console.log(`[Image ${index}] Starting upload from URI:`, imageUri);

        try {
          console.log(`[Image ${index}] Fetching image from URI...`);
          const response = await fetch(imageUri);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          
          const blob = await response.blob();
          console.log(`[Image ${index}] Blob created, size: ${blob.size} bytes`);

          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const filename = `rider_verification/${selectedRider.id}/${timestamp}_${index}_${random}.jpg`;
          
          console.log(`[Image ${index}] Storage path: ${filename}`);
          const storageRef = ref(storage, filename);

          console.log(`[Image ${index}] Starting upload...`);
          
          const uploadTask = uploadBytesResumable(
            storageRef,
            blob,
            {
              contentType: 'image/jpeg',
              customMetadata: {
                uploadedBy: 'admin',
                riderId: selectedRider.id
              }
            }
          );

          const uploadResult = await new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`[Image ${index}] Upload progress: ${progress.toFixed(2)}%`);
              },
              (error) => {
                console.error(`[Image ${index}] Upload error during transfer:`, error);
                reject(error);
              },
              () => {
                console.log(`[Image ${index}] Upload completed successfully`);
                resolve(uploadTask.snapshot);
              }
            );
          });

          console.log(`[Image ${index}] Upload result:`, {
            fullPath: uploadResult.metadata?.fullPath,
            name: uploadResult.metadata?.name,
            size: uploadResult.metadata?.size,
          });

          console.log(`[Image ${index}] Getting download URL...`);
          const downloadURL = await getDownloadURL(storageRef);
          
          console.log(`[Image ${index}] Download URL:`, downloadURL);
          imageUrls.push(downloadURL);

        } catch (error) {
          console.error(`[Image ${index}] Upload failed:`, error);
          console.error(`[Image ${index}] Error code:`, error.code);
          console.error(`[Image ${index}] Error message:`, error.message);
          
          Alert.alert(
            'Upload Warning', 
            `Could not upload image ${index + 1}. Continuing with remaining images.`,
            [{ text: 'OK' }]
          );
        }
      }

      setUploading(false);

      console.log('Upload complete. URLs:', imageUrls);

      if (imageUrls.length === 0) {
        Alert.alert('Upload Failed', 'Could not upload any verification documents');
        return [];
      }

      Alert.alert('Success', `Uploaded ${imageUrls.length} of ${adminUploadImages.length} images`);
      return imageUrls;

    } catch (error) {
      setUploading(false);
      console.error('Complete image upload process failed:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      Alert.alert('Upload Error', `Could not upload images: ${error.message}`);
      return [];
    }
  };

  const pickAdminImages = async () => {
    try {
      console.log('Picking admin images');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permissions required');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: false
      });

      console.log('Image picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map(asset => {
          console.log('Individual asset:', JSON.stringify(asset, null, 2));
          return asset.uri;
        });
        
        console.log('Selected image URIs:', newImages);

        setAdminUploadImages(prevImages => {
          const updatedImages = [...prevImages, ...newImages].slice(0, 5);
          console.log('Updated admin images:', updatedImages);
          return updatedImages;
        });
      } else {
        console.log('No images selected or picker was canceled');
      }
    } catch (error) {
      console.error('Error in image picker:', error);
      Alert.alert('Error', 'Could not pick images');
    }
  };

  const removeAdminImage = (imageToRemove) => {
    setAdminUploadImages(prevImages => 
      prevImages.filter(image => image !== imageToRemove)
    );
  };

  const completeVerification = async (verificationImageUrls) => {
    try {
      console.log('Complete Verification called with:');
      console.log('Selected Rider:', selectedRider);
      
      if (!selectedCategory) {
        Alert.alert('Error', 'Please select an E-Bike Category');
        return;
      }

      if (!registeredDateInput) {
        Alert.alert('Error', 'Please enter Registration Date');
        return;
      }

      if (!renewalDateInput) {
        Alert.alert('Error', 'Please enter Renewal Date');
        return;
      }

      // Plate number validation logic
      let finalPlateNumber = selectedRider.ebikeInfo?.plateNumber || '';

      if (!finalPlateNumber) {
        if (!manualPlateNumber.trim()) {
          setManualPlateError('Plate number is required');
          Alert.alert('Error', 'Please enter plate number for this rider');
          return;
        }
        const trimmedPlate = manualPlateNumber.trim().toUpperCase();
        if (!PLATE_REGEX.test(trimmedPlate)) {
          setManualPlateError('Format must be 2 letters + 4 numbers (e.g., AB1234)');
          Alert.alert('Invalid Plate Number', 'Plate must be 2 letters followed by 4 numbers (e.g., AB1234)');
          return;
        }
        finalPlateNumber = trimmedPlate;
      } else {
        // Optional: also validate existing plate format
        if (!PLATE_REGEX.test(finalPlateNumber.toUpperCase())) {
          Alert.alert(
            'Invalid Plate Number',
            'Current plate number has invalid format. Please correct it first.'
          );
          return;
        }
      }
      
      const docId = selectedRider.id;
      const authUid = selectedRider.uid;
      
      console.log('Using docId:', docId);
      console.log('Auth UID:', authUid);
      
      const userRef = doc(db, 'users', docId);

      console.log('Attempting to update user at:', userRef.path);

      const verifiedAt = new Date();

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        console.log('User doc exists:', userDoc.exists());
        console.log('User doc data:', userDoc.data());
        
        if (!userDoc.exists()) {
          throw new Error(`User document does not exist at path: ${userRef.path}`);
        }

        const updateData = {
          status: 'Verified',
          role: 'Rider',
          verifiedAt: verifiedAt,
          ebikeCategorySelected: selectedCategory,
          registeredDate: new Date(registeredDateInput),
          renewalDate: new Date(renewalDateInput),
          registrationStatus: 'Active',
          plateNumber: finalPlateNumber,
          paymentDetails: {
            amount: parseFloat(paymentAmount),
            verifiedBy: auth.currentUser.uid,
            verifiedAt: verifiedAt
          }
        };

        if (verificationImageUrls && verificationImageUrls.length > 0) {
          updateData.adminVerificationImages = verificationImageUrls;
        }

        transaction.update(userRef, updateData);
      });

      setAdminUploadImages([]);
      setPaymentAmount('');
      setSelectedCategory('');
      setRegisteredDateInput('');
      setRenewalDateInput('');
      setManualPlateNumber('');
      setManualPlateError('');
      setDetailModalVisible(false);
      setActiveTab('Verified');
      fetchRiders();

      Alert.alert('Success', 'Rider has been verified successfully');
    } catch (error) {
      console.error('Verification error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Verification Failed', error.message || 'Could not verify rider');
    }
  };

  const handleVerifyRider = async () => {
    try {
      console.log('Verify Rider - Selected Rider:', JSON.stringify(selectedRider, null, 2));
      console.log('Admin Upload Images:', adminUploadImages);
      console.log('Payment Amount:', paymentAmount);
      console.log('Selected Category:', selectedCategory);

      if (!selectedRider) {
        Alert.alert('Error', 'No rider selected');
        return;
      }

      if (!selectedCategory) {
        Alert.alert('Error', 'Please select an E-Bike Category');
        return;
      }

      if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
        Alert.alert('Invalid Payment', 'Please enter a valid payment amount');
        return;
      }

      if (adminUploadImages.length === 0) {
        Alert.alert(
          'No Documents',
          'You have not uploaded any verification documents. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => completeVerification([]) }
          ]
        );
        return;
      }

      const verificationImageUrls = await uploadAdminImagesToFirebase();

      if (verificationImageUrls.length === 0) {
        Alert.alert(
          'Upload Warning',
          'Could not upload verification documents. Do you want to continue without them?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => completeVerification([]) }
          ]
        );
        return;
      }

      completeVerification(verificationImageUrls);
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Could not verify rider');
    }
  };

  const handleRejectRider = async () => {
    try {
      if (!selectedRider) {
        Alert.alert('Error', 'No rider selected');
        return;
      }

      const userRef = doc(db, 'users', selectedRider.id);
      
      await updateDoc(userRef, {
        status: 'Rejected',
        rejectedAt: new Date(),
        rejectedBy: auth.currentUser.uid
      });

      setDetailModalVisible(false);
      fetchRiders();

      Alert.alert('Notice', 'Rider registration has been rejected');
    } catch (error) {
      console.error('Error rejecting rider:', error);
      Alert.alert('Error', `Could not reject rider: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, [activeTab]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    const queryText = text.toLowerCase();
    
    const filtered = riders.filter(rider => 
      rider.personalInfo.firstName.toLowerCase().includes(queryText) ||
      rider.personalInfo.lastName.toLowerCase().includes(queryText) ||
      rider.ebikeInfo.plateNumber.toLowerCase().includes(queryText)
    );

    setFilteredRiders(filtered);
  };

  const showRiderDetails = (rider) => {
    setSelectedRider(rider);
    setAdminUploadImages([]);
    setPaymentAmount('');
    setSelectedCategory(rider.ebikeCategorySelected || '');
    setRegisteredDateInput('');
    setRenewalDateInput('');
    setManualPlateNumber(rider.ebikeInfo?.plateNumber || '');
    setManualPlateError('');
    setDetailModalVisible(true);
  };

  const renderRiderDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={detailModalVisible}
      onRequestClose={() => setDetailModalVisible(false)}
    >
      {selectedRider && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton} 
              onPress={() => {
                setDetailModalVisible(false);
                setManualPlateNumber('');
                setManualPlateError('');
              }}
            >
              <Feather name="x" size={24} color="#2C3E50" />
            </TouchableOpacity>

            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>
                {activeTab === 'Pending' ? 'Rider Verification' : 
                 activeTab === 'Verified' ? 'Verified Rider Details' : 'Rejected Rider Details'}
              </Text>

              {activeTab === 'Verified' && getRegistrationStatus(selectedRider) && (
                <View style={[styles.statusBadge, { backgroundColor: getRegistrationStatus(selectedRider).color + '20', borderColor: getRegistrationStatus(selectedRider).color }]}>
                  <Text style={[styles.statusText, { color: getRegistrationStatus(selectedRider).color }]}>
                    Status: {getRegistrationStatus(selectedRider).status}
                    {getRegistrationStatus(selectedRider).status !== 'Expired' && ` (${getRegistrationStatus(selectedRider).daysLeft} days)`}
                  </Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.personalInfo.firstName} {selectedRider.personalInfo.lastName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Birthday:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.personalInfo.birthday}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Contact:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.personalInfo.contactNumber}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.personalInfo.address}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.email}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>E-Bike Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Brand:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.ebikeInfo.brand}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Model:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.ebikeInfo.model}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Color:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.ebikeInfo.color}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plate Number:</Text>
                  {selectedRider.ebikeInfo?.plateNumber ? (
                    <Text style={styles.detailValue}>
                      {selectedRider.ebikeInfo.plateNumber}
                    </Text>
                  ) : (
                    <View style={{ width: '60%' }}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter Plate Number (e.g., AB1234)"
                        placeholderTextColor="#999"
                        value={manualPlateNumber}
                        onChangeText={(text) => {
                          const upper = text.toUpperCase();
                          setManualPlateNumber(upper);
                          if (manualPlateError) setManualPlateError('');
                        }}
                        autoCapitalize="characters"
                        maxLength={6}
                      />
                      {manualPlateError ? (
                        <Text
                          style={{
                            color: '#F44336',
                            fontSize: 12,
                            marginTop: 4
                          }}
                        >
                          {manualPlateError}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chassis/Motor Number:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.chassisNumber}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Branch:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRider.branch}
                  </Text>
                </View>
              </View>

              {selectedRider.images && selectedRider.images.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Rider Uploaded Documents</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedRider.images.map((imageUrl, index) => (
                      <TouchableOpacity 
                        key={index} 
                        onPress={() => {
                          Alert.alert('Image', 'Tap to view full image', [
                            {
                              text: 'Open',
                              onPress: () => Linking.openURL(imageUrl)
                            },
                            { text: 'Cancel', style: 'cancel' }
                          ]);
                        }}
                      >
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={styles.documentImage} 
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {activeTab === 'Pending' && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>E-Bike Category</Text>
                    <TouchableOpacity 
                      style={[styles.categoryButton, uploading && styles.categoryButtonDisabled]}
                      onPress={() => {
                        if (!uploading) {
                          Alert.alert(
                            'Select E-Bike Category',
                            '',
                            EBIKE_CATEGORIES.map(cat => ({
                              text: cat.label,
                              onPress: () => setSelectedCategory(cat.value)
                            })).concat([
                              { text: 'Cancel', style: 'cancel' }
                            ])
                          );
                        }
                      }}
                      disabled={uploading}
                    >
                      <Text style={styles.categoryButtonText}>
                        {selectedCategory 
                          ? EBIKE_CATEGORIES.find(c => c.value === selectedCategory)?.label 
                          : 'Select E-Bike Category'}
                      </Text>
                      <Feather name="chevron-down" size={20} color="#2D8E5F" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Payment Verification</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter Payment Amount"
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      editable={!uploading}
                    />

                    <Text style={styles.sectionTitle}>Registration Dates</Text>
                    <TouchableOpacity 
                      style={[styles.dateButton, uploading && styles.dateButtonDisabled]}
                      onPress={() => setShowRegisteredPicker(true)}
                      disabled={uploading}
                    >
                      <Feather name="calendar" size={20} color="#2D8E5F" />
                      <Text style={styles.dateButtonText}>
                        {registeredDateInput ? new Date(registeredDateInput).toLocaleDateString() : 'Select Registered Date'}
                      </Text>
                    </TouchableOpacity>

                    {showRegisteredPicker && (
                      <DateTimePicker
                        value={registeredDateInput ? new Date(registeredDateInput) : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          if (Platform.OS === 'android') {
                            setShowRegisteredPicker(false);
                          }
                          if (selectedDate) {
                            setRegisteredDateInput(selectedDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}

                    {Platform.OS === 'ios' && showRegisteredPicker && (
                      <TouchableOpacity 
                        style={styles.datePickerDoneButton}
                        onPress={() => setShowRegisteredPicker(false)}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={[styles.dateButton, uploading && styles.dateButtonDisabled]}
                      onPress={() => setShowRenewalPicker(true)}
                      disabled={uploading}
                    >
                      <Feather name="calendar" size={20} color="#2D8E5F" />
                      <Text style={styles.dateButtonText}>
                        {renewalDateInput ? new Date(renewalDateInput).toLocaleDateString() : 'Select Renewal Date'}
                      </Text>
                    </TouchableOpacity>

                    {showRenewalPicker && (
                      <DateTimePicker
                        value={renewalDateInput ? new Date(renewalDateInput) : new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          if (Platform.OS === 'android') {
                            setShowRenewalPicker(false);
                          }
                          if (selectedDate) {
                            setRenewalDateInput(selectedDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}

                    {Platform.OS === 'ios' && showRenewalPicker && (
                      <TouchableOpacity 
                        style={styles.datePickerDoneButton}
                        onPress={() => setShowRenewalPicker(false)}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]} 
                      onPress={() => {
                        console.log('Upload button pressed');
                        pickAdminImages();
                      }}
                      disabled={uploading}
                    >
                      <Feather name="upload" size={24} color={uploading ? '#999' : '#2D8E5F'} />
                      <Text style={[styles.uploadButtonText, uploading && styles.uploadButtonTextDisabled]}>
                        {uploading ? 'Uploading...' : 'Upload Verification Docs'}
                      </Text>
                    </TouchableOpacity>

                    {adminUploadImages.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {adminUploadImages.map((image, index) => (
                          <View key={index} style={styles.imageContainer}>
                            <Image source={{ uri: image }} style={styles.uploadedImage} />
                            <TouchableOpacity 
                              style={styles.removeImageButton} 
                              onPress={() => removeAdminImage(image)}
                              disabled={uploading}
                            >
                              <Feather name="x" size={16} color="white" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.rejectButton, uploading && styles.buttonDisabled]}
                      onPress={handleRejectRider}
                      disabled={uploading}
                    >
                      <Text style={styles.modalButtonText}>{uploading ? 'Uploading...' : 'Reject'}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.verifyButton, uploading && styles.buttonDisabled]}
                      onPress={handleVerifyRider}
                      disabled={uploading}
                    >
                      <Text style={styles.modalButtonText}>{uploading ? 'Uploading...' : 'Verify'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {(activeTab === 'Verified' || activeTab === 'Rejected') && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Registration Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>E-Bike Category:</Text>
                    <Text style={styles.detailValue}>
                      {EBIKE_CATEGORIES.find(c => c.value === selectedRider.ebikeCategorySelected)?.label || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {activeTab === 'Verified' ? 'Verified' : 'Rejected'} At:
                    </Text>
                    <Text style={styles.detailValue}>
                      {activeTab === 'Verified' 
                        ? (selectedRider.verifiedAt ? formatDate(selectedRider.verifiedAt) : 'N/A')
                        : (selectedRider.rejectedAt ? formatDate(selectedRider.rejectedAt) : 'N/A')}
                    </Text>
                  </View>

                  {activeTab === 'Verified' && selectedRider.registeredDate && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Registered Date:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedRider.registeredDate)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Renewal Date:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedRider.renewalDate)}
                        </Text>
                      </View>
                    </>
                  )}
                  
                  {activeTab === 'Verified' && selectedRider.paymentDetails && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Amount:</Text>
                        <Text style={styles.detailValue}>
                          ₱{selectedRider.paymentDetails.amount?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Verified At:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedRider.paymentDetails.verifiedAt)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {(activeTab === 'Verified' && selectedRider.adminVerificationImages && selectedRider.adminVerificationImages.length > 0) && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Admin Verification Documents</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedRider.adminVerificationImages.map((imageUrl, index) => (
                      <TouchableOpacity 
                        key={index} 
                        onPress={() => {
                          Alert.alert('Image', 'Tap to view full image', [
                            {
                              text: 'Open',
                              onPress: () => Linking.openURL(imageUrl)
                            },
                            { text: 'Cancel', style: 'cancel' }
                          ]);
                        }}
                      >
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={styles.documentImage} 
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  ); 

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>◂</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riders Management</Text>
      </View>

      <View style={styles.tabContainer}>
        {['Pending', 'Verified', 'Rejected'].map(tab => (
          <TouchableOpacity 
            key={tab}
            style={[
              styles.tab, 
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText, 
              activeTab === tab && styles.activeTabText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#2D8E5F" />
        <TextInput 
          placeholder="Search name or plate number" 
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={filteredRiders}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.tableRow}
            onPress={() => showRiderDetails(item)}
          >
            <View style={styles.rowContent}>
              <View style={styles.rowInfo}>
                <Text style={styles.tableCell}>
                  {item.personalInfo?.firstName} {item.personalInfo?.lastName}
                </Text>
                <Text style={styles.tableCell}>
                  {item.ebikeInfo?.plateNumber || 'N/A'}
                </Text>
              </View>
              {activeTab === 'Verified' && getRegistrationStatus(item) && (
                <View style={[styles.statusIndicator, { backgroundColor: getRegistrationStatus(item).color }]}>
                  <Text style={styles.statusIndicatorText}>
                    {getRegistrationStatus(item).status === 'Active' ? '✓' :
                     getRegistrationStatus(item).status === 'Expiring Soon' ? '⚠' : '✕'}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                onPress={() => showRiderDetails(item)}
                style={styles.actionButton}
              >
                <Feather name="info" size={20} color="#2D8E5F" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No riders found</Text>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />

      {renderRiderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15 * RESPONSIVE.width,
    paddingVertical: 10 * RESPONSIVE.height,
    borderBottomWidth: 1,
    borderBottomColor: '#2D8E5F',
    backgroundColor: '#2D8E5F'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10 * RESPONSIVE.width
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 4
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 20 * RESPONSIVE.width,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 15 * RESPONSIVE.height,
    marginHorizontal: 15 * RESPONSIVE.width
  },
  tab: {
    flex: 1,
    padding: 10 * RESPONSIVE.height,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: '#2D8E5F'
  },
  tabText: {
    color: '#7F8C8D',
    fontWeight: '600'
  },
  activeTabText: {
    color: '#2D8E5F'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 10 * RESPONSIVE.height,
    margin: 15 * RESPONSIVE.width,
    marginTop: 10 * RESPONSIVE.height
  },
  searchInput: {
    flex: 1,
    marginLeft: 10 * RESPONSIVE.width,
    fontSize: 16 * RESPONSIVE.width
  },
  listContainer: {
    paddingHorizontal: 15 * RESPONSIVE.width,
    paddingBottom: 20 * RESPONSIVE.height
  },
  closeModalButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 5
  },
  tableRow: {
    paddingVertical: 15 * RESPONSIVE.height,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rowInfo: {
    flex: 1
  },
  tableCell: {
    fontSize: 16 * RESPONSIVE.width,
    color: '#2C3E50',
    marginBottom: 4
  },
  statusIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  statusIndicatorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  },
  actionButton: {
    marginLeft: 10 * RESPONSIVE.width
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50 * RESPONSIVE.height
  },
  emptyText: {
    fontSize: 18 * RESPONSIVE.width,
    color: '#7F8C8D'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '90%',
    height: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden'
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 40
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#2C3E50'
  },
  statusBadge: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 15
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#2C3E50'
  },
  detailSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10
  },
  detailRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 10
  },
  detailLabel: {
    fontWeight: '600',
    width: '40%',
    color: '#7F8C8D'
  },
  detailValue: {
    width: '60%',
    color: '#2C3E50',
    flexWrap: 'wrap'
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  categoryButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5'
  },
  categoryButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    flex: 1
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  },
  verifyButton: {
    backgroundColor: '#4CAF50'
  },
  rejectButton: {
    backgroundColor: '#F44336'
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  documentImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    color: '#2C3E50'
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F3EC',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  uploadButtonDisabled: {
    backgroundColor: '#F0F0F0',
    opacity: 0.6
  },
  uploadButtonText: {
    marginLeft: 10,
    color: '#2D8E5F',
    fontWeight: '600'
  },
  uploadButtonTextDisabled: {
    color: '#999'
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 8
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    padding: 2
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    gap: 10
  },
  dateButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5'
  },
  dateButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    flex: 1
  },
  datePickerDoneButton: {
    backgroundColor: '#2D8E5F',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  datePickerDoneText: {
    color: 'white',
    fontWeight: '600'
  }
});

export default RiderScreen;