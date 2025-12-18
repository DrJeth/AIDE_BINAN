import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Modal,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  SafeAreaView
} from 'react-native';
import {
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  doc
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../config/firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 👉 Updated categories: L1A, L1B, L2A, L2B in order
const EBIKE_CATEGORIES = [
  { label: 'CATEGORY L1A', value: 'L1A' },
  { label: 'CATEGORY L1B', value: 'L1B' },
  { label: 'CATEGORY L2A', value: 'L2A' },
  { label: 'CATEGORY L2B', value: 'L2B' },
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

const toJSDate = (v) => {
  if (!v) return null;
  try {
    if (typeof v?.toDate === 'function') return v.toDate();
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const toISODate = (v) => {
  const d = toJSDate(v);
  if (!d) return '';
  return d.toISOString().split('T')[0];
};

const RiderScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Pending');

  // list shows 1 row per Rider (user), NOT per ebike
  const [riders, setRiders] = useState([]);
  const [filteredRiders, setFilteredRiders] = useState([]);

  const [selectedRider, setSelectedRider] = useState(null);
  const [selectedEbikeId, setSelectedEbikeId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // ✅ split uploads
  const [receiptImages, setReceiptImages] = useState([]);
  const [ebikePhotoImages, setEbikePhotoImages] = useState([]);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [registeredDateInput, setRegisteredDateInput] = useState('');
  const [renewalDateInput, setRenewalDateInput] = useState('');
  const [showRegisteredPicker, setShowRegisteredPicker] = useState(false);
  const [showRenewalPicker, setShowRenewalPicker] = useState(false);

  // manual plate number input (for ebike with no plate)
  const [manualPlateNumber, setManualPlateNumber] = useState('');
  const [manualPlateError, setManualPlateError] = useState('');

  // 👉 mini sheets
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEbikeModal, setShowEbikeModal] = useState(false);

  // ✅ RENEWAL (Expired) UI toggle
  const [showRenewForm, setShowRenewForm] = useState(false);

  // ✅ dynamic width of left header content
  const DEFAULT_SIDE_W = 90 * RESPONSIVE.width;
  const [headerLeftW, setHeaderLeftW] = useState(DEFAULT_SIDE_W);

  const getEbikeStatus = (ebike, userDataStatus) => {
    return ebike?.status || userDataStatus || 'Pending';
  };

  const computeOverallUserStatus = (ebikes = []) => {
    const statuses = ebikes.map(e => e?.status).filter(Boolean);
    if (statuses.includes('Pending')) return 'Pending';
    if (statuses.length > 0 && statuses.every(s => s === 'Rejected')) return 'Rejected';
    return 'Verified';
  };

  const getRegistrationStatusFromEbike = (ebike) => {
    if (!ebike?.renewalDate) return null;

    const today = new Date();
    const renewalDate = toJSDate(ebike.renewalDate);
    if (!renewalDate) return null;

    const daysUntilExpiry = Math.floor((renewalDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'Expired', daysLeft: 0, color: '#F44336' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'Expiring Soon', daysLeft: daysUntilExpiry, color: '#FF9800' };
    } else {
      return { status: 'Active', daysLeft: daysUntilExpiry, color: '#4CAF50' };
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      const date = toJSDate(dateValue);
      if (!date) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const normalizeUserEbikes = (userData) => {
    // ✅ if new schema exists
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

        // ✅ new docs schema
        adminVerificationDocs: e?.adminVerificationDocs || null,

        // ✅ audit trail per ebike
        transactionHistory: Array.isArray(e?.transactionHistory) ? e.transactionHistory : [],

        // legacy (keep compatibility)
        adminVerificationImages: Array.isArray(e?.adminVerificationImages) ? e.adminVerificationImages : [],

        paymentDetails: e?.paymentDetails || null,
        createdAt: e?.createdAt || null,
      }));
    }

    // ✅ fallback legacy single ebike
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

  // ✅ audit helper: latest -> oldest
  const getEbikeTransactions = (ebike) => {
    const tx = Array.isArray(ebike?.transactionHistory) ? [...ebike.transactionHistory] : [];

    // fallback if verified but history missing
    if (tx.length === 0 && (ebike?.paymentDetails || ebike?.verifiedAt)) {
      tx.push({
        type: ebike?.paymentDetails?.type || 'Registration',
        registeredDate: ebike?.registeredDate || null,
        renewalDate: ebike?.renewalDate || null,
        paymentDetails: ebike?.paymentDetails || null,
        adminVerificationDocs: ebike?.adminVerificationDocs || null,
        createdAt: ebike?.paymentDetails?.verifiedAt || ebike?.verifiedAt || null,
        createdBy: ebike?.paymentDetails?.verifiedBy || ''
      });
    }

    tx.sort((a, b) => {
      const da = toJSDate(a?.createdAt || a?.paymentDetails?.verifiedAt) || new Date(0);
      const db = toJSDate(b?.createdAt || b?.paymentDetails?.verifiedAt) || new Date(0);
      return db - da; // ✅ DESC: latest -> oldest
    });

    return tx;
  };

  const fetchRiders = async () => {
    try {
      // ✅ fetch all riders, then filter in-app per ebike.status
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'Rider')
      );

      const snapshot = await getDocs(q);

      const riderData = await Promise.all(snapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();

        // keep this (existing) - rider uploaded docs
        let imagesData = [];
        try {
          const imagesQuerySnapshot = await getDocs(
            query(
              collection(db, 'riderRegistrations', userDoc.id, 'images'),
              where('type', '==', 'original')
            )
          );
          imagesData = imagesQuerySnapshot.docs.map(d => d.data()?.url).filter(Boolean);
        } catch (e) {
          // ok lang kung wala
        }

        const ebikes = normalizeUserEbikes(userData);

        const pendingCount = ebikes.filter(e => getEbikeStatus(e, userData.status) === 'Pending').length;
        const verifiedCount = ebikes.filter(e => getEbikeStatus(e, userData.status) === 'Verified').length;
        const rejectedCount = ebikes.filter(e => getEbikeStatus(e, userData.status) === 'Rejected').length;

        return {
          id: userDoc.id,
          userId: userDoc.id,
          uid: userData.uid || userDoc.id,
          status: userData.status || 'Pending',
          email: userData.email || '',
          createdAt: userData.createdAt,

          personalInfo: {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            contactNumber: userData.contactNumber || '',
            birthday: userData.birthday || '',
            address: userData.address || ''
          },

          images: imagesData,

          ebikes,
          counts: { pendingCount, verifiedCount, rejectedCount },
        };
      }));

      const ridersForTab = riderData.filter(r => {
        const list = r.ebikes || [];
        return list.some(e => getEbikeStatus(e, r.status) === activeTab);
      });

      setRiders(ridersForTab);
      setFilteredRiders(ridersForTab);
    } catch (error) {
      console.error('Error fetching riders:', error);
      Alert.alert('Error', 'Could not fetch rider data');
    }
  };

  useEffect(() => {
    fetchRiders();
  }, [activeTab]);

  const ebikesForTab = useMemo(() => {
    if (!selectedRider) return [];
    return (selectedRider.ebikes || []).filter(e => getEbikeStatus(e, selectedRider.status) === activeTab);
  }, [selectedRider, activeTab]);

  const selectedEbike = useMemo(() => {
    if (!selectedRider) return null;
    const list = selectedRider.ebikes || [];
    return list.find(e => String(e.id) === String(selectedEbikeId)) || null;
  }, [selectedRider, selectedEbikeId]);

  const getEbikeLabel = (e, idx) => {
    const plate = e?.plateNumber ? String(e.plateNumber).toUpperCase() : 'NO PLATE';
    const brand = e?.ebikeBrand ? ` • ${e.ebikeBrand}` : '';
    return `E-bike ${idx + 1}: ${plate}${brand}`;
  };

  const prefillFormFromEbike = (ebike) => {
    setReceiptImages([]);
    setEbikePhotoImages([]);
    setManualPlateError('');
    setShowRenewForm(false);

    setSelectedCategory(ebike?.ebikeCategorySelected || '');

    const amt = ebike?.paymentDetails?.amount;
    setPaymentAmount(typeof amt === 'number' ? String(amt) : '');

    setRegisteredDateInput(toISODate(ebike?.registeredDate));
    setRenewalDateInput(toISODate(ebike?.renewalDate));

    setManualPlateNumber(ebike?.plateNumber ? String(ebike.plateNumber).toUpperCase() : '');

    setShowRegisteredPicker(false);
    setShowRenewalPicker(false);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const queryText = text.toLowerCase();

    const filtered = riders.filter(r => {
      const fn = (r.personalInfo?.firstName || '').toLowerCase();
      const ln = (r.personalInfo?.lastName || '').toLowerCase();

      const tabEbikes = (r.ebikes || []).filter(e => getEbikeStatus(e, r.status) === activeTab);
      const anyPlateMatch = tabEbikes.some(e => (e?.plateNumber || '').toString().toLowerCase().includes(queryText));

      return fn.includes(queryText) || ln.includes(queryText) || anyPlateMatch;
    });

    setFilteredRiders(filtered);
  };

  const showRiderDetails = (rider) => {
    setSelectedRider(rider);

    const list = (rider.ebikes || []).filter(e => getEbikeStatus(e, rider.status) === activeTab);
    const first = list[0] || (rider.ebikes || [])[0] || null;

    setSelectedEbikeId(first ? first.id : null);
    prefillFormFromEbike(first);

    setDetailModalVisible(true);
  };

  const pickImagesGeneric = async (setter) => {
    try {
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map(asset => asset.uri);

        setter(prev => {
          const updated = [...prev, ...newImages].slice(0, 5);
          return updated;
        });
      }
    } catch (error) {
      console.error('Error in image picker:', error);
      Alert.alert('Error', 'Could not pick images');
    }
  };

  const removeImageGeneric = (setter, imageToRemove) => {
    setter(prev => prev.filter(img => img !== imageToRemove));
  };

  const uploadImagesToFirebase = async (imageUris, folderType) => {
    try {
      if (!imageUris || imageUris.length === 0) return [];

      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return [];
      }

      setUploading(true);
      const imageUrls = [];

      for (let index = 0; index < imageUris.length; index++) {
        const imageUri = imageUris[index];

        try {
          const response = await fetch(imageUri);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
          const blob = await response.blob();

          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);

          const filename =
            `rider_verification/${selectedRider.userId}/${selectedEbikeId}/${folderType}/${timestamp}_${index}_${random}.jpg`;
          const storageRef = ref(storage, filename);

          const uploadTask = uploadBytesResumable(
            storageRef,
            blob,
            {
              contentType: 'image/jpeg',
              customMetadata: {
                uploadedBy: 'admin',
                riderId: selectedRider.userId,
                ebikeId: String(selectedEbikeId),
                docType: folderType
              }
            }
          );

          await new Promise((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              () => { },
              (error) => reject(error),
              () => resolve(uploadTask.snapshot)
            );
          });

          const downloadURL = await getDownloadURL(storageRef);
          imageUrls.push(downloadURL);

        } catch (error) {
          console.error(`[${folderType} ${index}] Upload failed:`, error);
          Alert.alert(
            'Upload Warning',
            `Could not upload ${folderType} image ${index + 1}. Continuing with remaining images.`,
            [{ text: 'OK' }]
          );
        }
      }

      setUploading(false);
      return imageUrls;

    } catch (error) {
      setUploading(false);
      console.error('Upload Error:', error);
      Alert.alert('Upload Error', `Could not upload images: ${error.message}`);
      return [];
    }
  };

  const completeVerification = async (receiptUrls = [], ebikeUrls = []) => {
    try {
      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
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

      if (!registeredDateInput) {
        Alert.alert('Error', 'Please enter Registration Date');
        return;
      }

      if (!renewalDateInput) {
        Alert.alert('Error', 'Please enter Renewal Date');
        return;
      }

      // Plate number validation logic (per ebike)
      let finalPlateNumber = selectedEbike?.plateNumber ? String(selectedEbike.plateNumber).toUpperCase() : '';

      if (!finalPlateNumber) {
        if (!manualPlateNumber.trim()) {
          setManualPlateError('Plate number is required');
          Alert.alert('Error', 'Please enter plate number for this e-bike');
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
        if (!PLATE_REGEX.test(finalPlateNumber)) {
          Alert.alert('Invalid Plate Number', 'Current plate number has invalid format. Please correct it first.');
          return;
        }
      }

      const userRef = doc(db, 'users', selectedRider.userId);
      const verifiedAt = new Date();

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User document does not exist');

        const data = userDoc.data();
        const ebikes = Array.isArray(data?.ebikes) ? [...data.ebikes] : [];
        const normalized = ebikes.length > 0 ? ebikes : normalizeUserEbikes(data);

        const idx = normalized.findIndex(e => String(e?.id) === String(selectedEbikeId));
        if (idx === -1) throw new Error('Selected e-bike not found');

        const old = normalized[idx] || {};

        const regD = new Date(registeredDateInput);
        const renD = new Date(renewalDateInput);

        const docsObj = {
          receipt: receiptUrls || [],
          ebikePhotos: ebikeUrls || []
        };

        const newPayment = {
          amount: parseFloat(paymentAmount),
          verifiedBy: auth.currentUser.uid,
          verifiedAt,
          type: 'Registration'
        };

        // ✅ append transaction history (audit)
        let txHistory = Array.isArray(old?.transactionHistory) ? [...old.transactionHistory] : [];
        txHistory.push({
          type: 'Registration',
          registeredDate: regD,
          renewalDate: renD,
          paymentDetails: newPayment,
          adminVerificationDocs: docsObj,
          createdAt: verifiedAt,
          createdBy: auth.currentUser.uid
        });

        normalized[idx] = {
          ...old,
          status: 'Verified',
          ebikeCategorySelected: selectedCategory,
          registeredDate: regD,
          renewalDate: renD,
          registrationStatus: 'Active',
          plateNumber: finalPlateNumber,
          verifiedAt,
          paymentDetails: newPayment,

          // ✅ current cycle docs
          adminVerificationDocs: docsObj,

          // ✅ audit list
          transactionHistory: txHistory,
        };

        // ✅ update plateNumbers array (for uniqueness checks elsewhere)
        const plateUpper = finalPlateNumber ? finalPlateNumber.toUpperCase() : null;
        const existingPlates = Array.isArray(data?.plateNumbers) ? [...data.plateNumbers] : [];
        const newPlates = plateUpper
          ? Array.from(new Set([...existingPlates, plateUpper]))
          : existingPlates;

        const overallStatus = computeOverallUserStatus(normalized);

        transaction.update(userRef, {
          ebikes: normalized,
          plateNumbers: newPlates,
          status: overallStatus,
        });
      });

      setReceiptImages([]);
      setEbikePhotoImages([]);
      setPaymentAmount('');
      setSelectedCategory('');
      setRegisteredDateInput('');
      setRenewalDateInput('');
      setManualPlateNumber('');
      setManualPlateError('');
      setDetailModalVisible(false);
      setShowCategoryModal(false);
      setShowEbikeModal(false);
      setShowRenewForm(false);

      fetchRiders();
      Alert.alert('Success', 'E-bike registration has been verified successfully');
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Could not verify');
    }
  };

  const handleVerifyRider = async () => {
    try {
      if (!selectedRider || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
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

      // allow continue without docs (both empty)
      if (receiptImages.length === 0 && ebikePhotoImages.length === 0) {
        Alert.alert(
          'No Documents',
          'Wala kang in-upload. Continue pa rin?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => completeVerification([], []) }
          ]
        );
        return;
      }

      const receiptUrls = receiptImages.length > 0 ? await uploadImagesToFirebase(receiptImages, 'receipt') : [];
      const ebikeUrls = ebikePhotoImages.length > 0 ? await uploadImagesToFirebase(ebikePhotoImages, 'ebike_photo') : [];

      if (receiptUrls.length === 0 && ebikeUrls.length === 0) {
        Alert.alert(
          'Upload Warning',
          'Hindi na-upload ang images. Continue without them?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => completeVerification([], []) }
          ]
        );
        return;
      }

      completeVerification(receiptUrls, ebikeUrls);
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Could not verify');
    }
  };

  // ✅ RENEWAL (Expired) - update ONLY that ebike, new payment + new dates + new docs
  const completeRenewal = async (receiptUrls = [], ebikeUrls = []) => {
    try {
      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      const reg = getRegistrationStatusFromEbike(selectedEbike);
      if (!reg || reg.status !== 'Expired') {
        Alert.alert('Not Allowed', 'Renew is only available for Expired registrations.');
        return;
      }

      if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
        Alert.alert('Invalid Payment', 'Please enter a valid payment amount');
        return;
      }

      if (!registeredDateInput) {
        Alert.alert('Error', 'Please select Registration Date');
        return;
      }

      if (!renewalDateInput) {
        Alert.alert('Error', 'Please select Renewal Date');
        return;
      }

      const regD = new Date(registeredDateInput);
      const renD = new Date(renewalDateInput);

      if (isNaN(regD.getTime()) || isNaN(renD.getTime())) {
        Alert.alert('Invalid Dates', 'Please select valid dates.');
        return;
      }
      if (renD <= regD) {
        Alert.alert('Invalid Dates', 'Renewal Date must be after Registration Date.');
        return;
      }

      // ✅ DO NOT change plate number here (bawal palitan)
      const userRef = doc(db, 'users', selectedRider.userId);
      const renewedAt = new Date();

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User document does not exist');

        const data = userDoc.data();
        const ebikes = Array.isArray(data?.ebikes) ? [...data.ebikes] : [];
        const normalized = ebikes.length > 0 ? ebikes : normalizeUserEbikes(data);

        const idx = normalized.findIndex(e => String(e?.id) === String(selectedEbikeId));
        if (idx === -1) throw new Error('Selected e-bike not found');

        const old = normalized[idx] || {};

        const docsObj = {
          receipt: receiptUrls || [],
          ebikePhotos: ebikeUrls || []
        };

        const newPayment = {
          amount: parseFloat(paymentAmount),
          verifiedBy: auth.currentUser?.uid || '',
          verifiedAt: renewedAt,
          type: 'Renewal'
        };

        // ✅ ensure tx history has baseline if missing (for old data)
        let txHistory = Array.isArray(old?.transactionHistory) ? [...old.transactionHistory] : [];
        if (txHistory.length === 0 && (old?.paymentDetails || old?.verifiedAt)) {
          txHistory.push({
            type: old?.paymentDetails?.type || 'Registration',
            registeredDate: old?.registeredDate || null,
            renewalDate: old?.renewalDate || null,
            paymentDetails: old?.paymentDetails || null,
            adminVerificationDocs: old?.adminVerificationDocs || null,
            createdAt: old?.paymentDetails?.verifiedAt || old?.verifiedAt || null,
            createdBy: old?.paymentDetails?.verifiedBy || ''
          });
        }

        // ✅ append new renewal cycle
        txHistory.push({
          type: 'Renewal',
          registeredDate: regD,
          renewalDate: renD,
          paymentDetails: newPayment,
          adminVerificationDocs: docsObj,
          createdAt: renewedAt,
          createdBy: auth.currentUser?.uid || ''
        });

        normalized[idx] = {
          ...old,
          status: 'Verified',
          registeredDate: regD,
          renewalDate: renD,
          registrationStatus: 'Active',
          paymentDetails: newPayment,

          // ✅ current cycle docs replaced
          adminVerificationDocs: docsObj,

          renewedAt,
          renewedBy: auth.currentUser?.uid || '',

          transactionHistory: txHistory
        };

        const overallStatus = computeOverallUserStatus(normalized);

        transaction.update(userRef, {
          ebikes: normalized,
          status: overallStatus
        });
      });

      // reset local
      setReceiptImages([]);
      setEbikePhotoImages([]);
      setPaymentAmount('');
      setRegisteredDateInput('');
      setRenewalDateInput('');
      setShowRegisteredPicker(false);
      setShowRenewalPicker(false);
      setShowRenewForm(false);
      setDetailModalVisible(false);

      fetchRiders();
      Alert.alert('Success', 'E-bike renewal has been processed successfully');
    } catch (error) {
      console.error('Renewal error:', error);
      Alert.alert('Renewal Failed', error.message || 'Could not process renewal');
    }
  };

  const handleRenewEbike = async () => {
    try {
      if (!selectedRider || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      // ✅ require at least 1 doc (either resibo or ebike photo)
      if (receiptImages.length === 0 && ebikePhotoImages.length === 0) {
        Alert.alert('Required', 'Please upload Photo of the Receipt and/or E-bike Photo.');
        return;
      }

      const receiptUrls = receiptImages.length > 0 ? await uploadImagesToFirebase(receiptImages, 'receipt') : [];
      const ebikeUrls = ebikePhotoImages.length > 0 ? await uploadImagesToFirebase(ebikePhotoImages, 'ebike_photo') : [];

      if (receiptUrls.length === 0 && ebikeUrls.length === 0) {
        Alert.alert('Upload Failed', 'Could not upload renewal documents.');
        return;
      }

      completeRenewal(receiptUrls, ebikeUrls);
    } catch (error) {
      console.error('Renewal error:', error);
      Alert.alert('Renewal Failed', error.message || 'Could not process renewal');
    }
  };

  const handleRejectRider = async () => {
    try {
      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      const userRef = doc(db, 'users', selectedRider.userId);
      const rejectedAt = new Date();

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User document does not exist');

        const data = userDoc.data();
        const ebikes = Array.isArray(data?.ebikes) ? [...data.ebikes] : [];
        const normalized = ebikes.length > 0 ? ebikes : normalizeUserEbikes(data);

        const idx = normalized.findIndex(e => String(e?.id) === String(selectedEbikeId));
        if (idx === -1) throw new Error('Selected e-bike not found');

        normalized[idx] = {
          ...normalized[idx],
          status: 'Rejected',
          rejectedAt,
          rejectedBy: auth.currentUser.uid
        };

        const overallStatus = computeOverallUserStatus(normalized);

        transaction.update(userRef, {
          ebikes: normalized,
          status: overallStatus,
        });
      });

      setDetailModalVisible(false);
      setShowCategoryModal(false);
      setShowEbikeModal(false);
      setShowRenewForm(false);

      fetchRiders();
      Alert.alert('Notice', 'E-bike registration has been rejected');
    } catch (error) {
      console.error('Error rejecting:', error);
      Alert.alert('Error', `Could not reject: ${error.message}`);
    }
  };

  // ✅ COMBINED DOCS PREVIEW: Old(Saved) + New(Selected/Renewal)
  const renderCombinedDocsPreview = (mode = 'pending') => {
    const savedReceipt = Array.isArray(selectedEbike?.adminVerificationDocs?.receipt)
      ? selectedEbike.adminVerificationDocs.receipt
      : [];
    const savedEbike = Array.isArray(selectedEbike?.adminVerificationDocs?.ebikePhotos)
      ? selectedEbike.adminVerificationDocs.ebikePhotos
      : [];

    const hasSaved = savedReceipt.length > 0 || savedEbike.length > 0;
    const hasNew = receiptImages.length > 0 || ebikePhotoImages.length > 0;

    if (!hasSaved && !hasNew) return null;

    const savedTitle = mode === 'renewal' ? 'Old Photos (Saved)' : 'Current (Saved)';
    const newTitle = mode === 'renewal' ? 'New Photos (Renewal)' : 'New Photos (Selected)';

    return (
      <View style={{ marginTop: 12 }}>
        {hasSaved && (
          <>
            <Text style={styles.auditSubTitle}>{savedTitle}</Text>

            {savedReceipt.length > 0 && (
              <>
                <Text style={styles.docsMiniLabel}>Photo of the Receipt</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {savedReceipt.map((url, i) => (
                    <TouchableOpacity key={`saved_rec_${i}`} onPress={() => Linking.openURL(url)}>
                      <Image source={{ uri: url }} style={styles.documentImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {savedEbike.length > 0 && (
              <>
                <Text style={[styles.docsMiniLabel, { marginTop: 10 }]}>E-bike Photo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {savedEbike.map((url, i) => (
                    <TouchableOpacity key={`saved_eb_${i}`} onPress={() => Linking.openURL(url)}>
                      <Image source={{ uri: url }} style={styles.documentImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        {hasNew && (
          <>
            <Text style={styles.auditSubTitle}>{newTitle}</Text>

            {receiptImages.length > 0 && (
              <>
                <Text style={styles.docsMiniLabel}>Upload Photo of the Receipt</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {receiptImages.map((image, i) => (
                    <View key={`new_rec_${i}`} style={styles.imageContainer}>
                      <Image source={{ uri: image }} style={styles.uploadedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImageGeneric(setReceiptImages, image)}
                        disabled={uploading}
                      >
                        <Feather name="x" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {ebikePhotoImages.length > 0 && (
              <>
                <Text style={[styles.docsMiniLabel, { marginTop: 10 }]}>Upload E-bike Photo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {ebikePhotoImages.map((image, i) => (
                    <View key={`new_eb_${i}`} style={styles.imageContainer}>
                      <Image source={{ uri: image }} style={styles.uploadedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImageGeneric(setEbikePhotoImages, image)}
                        disabled={uploading}
                      >
                        <Feather name="x" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}
      </View>
    );
  };

  // ✅ NEW: OUTSIDE HISTORY (after Registration History) show ALL receipt + ALL ebike photos (new+old across all transactions)
  const renderAllDocsAfterHistory = () => {
    if (activeTab !== 'Verified' || !selectedEbike) return null;
    if (showRenewForm) return null; // keep clean habang nagre-renew (may preview na sa renew form)

    const txs = getEbikeTransactions(selectedEbike);

    const allReceipt = Array.from(
      new Set(
        txs
          .flatMap(tx =>
            Array.isArray(tx?.adminVerificationDocs?.receipt)
              ? tx.adminVerificationDocs.receipt
              : []
          )
          .filter(Boolean)
      )
    );

    const allEbike = Array.from(
      new Set(
        txs
          .flatMap(tx =>
            Array.isArray(tx?.adminVerificationDocs?.ebikePhotos)
              ? tx.adminVerificationDocs.ebikePhotos
              : []
          )
          .filter(Boolean)
      )
    );

    if (allReceipt.length === 0 && allEbike.length === 0) return null;

    return (
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Photo of the Receipt</Text>
        <Text style={styles.auditHint}>New and old photo</Text>

        {allReceipt.length === 0 ? (
          <Text style={{ color: '#7F8C8D', fontSize: 12 }}>No receipt photos.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allReceipt.map((url, idx) => (
              <TouchableOpacity key={`all_r_${idx}`} onPress={() => Linking.openURL(url)}>
                <Image source={{ uri: url }} style={styles.documentImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>E-Bike Photo</Text>
        <Text style={styles.auditHint}>New and old photo</Text>

        {allEbike.length === 0 ? (
          <Text style={{ color: '#7F8C8D', fontSize: 12 }}>No e-bike photos.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allEbike.map((url, idx) => (
              <TouchableOpacity key={`all_e_${idx}`} onPress={() => Linking.openURL(url)}>
                <Image source={{ uri: url }} style={styles.documentImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
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
                setShowCategoryModal(false);
                setShowEbikeModal(false);
                setShowRenewForm(false);
                setShowRegisteredPicker(false);
                setShowRenewalPicker(false);
                setReceiptImages([]);
                setEbikePhotoImages([]);
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

              {/* ✅ Ebike selector */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Select E-Bike Registration</Text>

                <TouchableOpacity
                  style={styles.categoryButton}
                  onPress={() => setShowEbikeModal(true)}
                >
                  <Text style={styles.categoryButtonText}>
                    {selectedEbike
                      ? (selectedEbike?.plateNumber ? String(selectedEbike.plateNumber).toUpperCase() : 'NO PLATE')
                      : 'Select E-Bike'}
                  </Text>
                  <Feather name="chevron-down" size={20} color="#2E7D32" />
                </TouchableOpacity>

                <Text style={{ color: '#7F8C8D', fontSize: 12 }}>
                  Showing {activeTab} registrations only. If you want other status, switch tab.
                </Text>
              </View>

              {/* Status badge for Verified */}
              {activeTab === 'Verified' && selectedEbike && getRegistrationStatusFromEbike(selectedEbike) && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getRegistrationStatusFromEbike(selectedEbike).color + '20',
                      borderColor: getRegistrationStatusFromEbike(selectedEbike).color
                    }
                  ]}
                >
                  <Text style={[styles.statusText, { color: getRegistrationStatusFromEbike(selectedEbike).color }]}>
                    Status: {getRegistrationStatusFromEbike(selectedEbike).status}
                    {getRegistrationStatusFromEbike(selectedEbike).status !== 'Expired' &&
                      ` (${getRegistrationStatusFromEbike(selectedEbike).daysLeft} days)`}
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

              {/* ✅ E-bike info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>E-Bike Information</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Brand:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.ebikeBrand || ''}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Model:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.ebikeModel || ''}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Color:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.ebikeColor || ''}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plate Number:</Text>
                  {selectedEbike?.plateNumber ? (
                    <Text style={styles.detailValue}>
                      {String(selectedEbike.plateNumber).toUpperCase()}
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
                        <Text style={{ color: '#F44336', fontSize: 12, marginTop: 4 }}>
                          {manualPlateError}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chassis/Motor Number:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.chassisMotorNumber || ''}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Branch:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.branch || ''}
                  </Text>
                </View>
              </View>

              {/* Rider uploaded documents */}
              {selectedRider.images && selectedRider.images.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Rider Uploaded Documents</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedRider.images.map((imageUrl, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          Alert.alert('Image', 'Tap to view full image', [
                            { text: 'Open', onPress: () => LinkingiLinking.openURL(imageUrl) },
                            { text: 'Cancel', style: 'cancel' }
                          ]);
                        }}
                      >
                        <Image source={{ uri: imageUrl }} style={styles.documentImage} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ✅ Pending tab actions */}
              {activeTab === 'Pending' && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>E-Bike Category</Text>

                    <TouchableOpacity
                      style={[styles.categoryButton, uploading && styles.categoryButtonDisabled]}
                      onPress={() => {
                        if (!uploading) setShowCategoryModal(true);
                      }}
                      disabled={uploading}
                    >
                      <Text style={styles.categoryButtonText}>
                        {selectedCategory
                          ? (EBIKE_CATEGORIES.find(c => c.value === selectedCategory)?.label || 'Select E-Bike Category')
                          : 'Select E-Bike Category'}
                      </Text>
                      <Feather name="chevron-down" size={20} color="#2E7D32" />
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
                      <Feather name="calendar" size={20} color="#2E7D32" />
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
                          if (Platform.OS === 'android') setShowRegisteredPicker(false);
                          if (selectedDate) setRegisteredDateInput(selectedDate.toISOString().split('T')[0]);
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
                      <Feather name="calendar" size={20} color="#2E7D32" />
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
                          if (Platform.OS === 'android') setShowRenewalPicker(false);
                          if (selectedDate) setRenewalDateInput(selectedDate.toISOString().split('T')[0]);
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

                    {/* ✅ Upload Photo of the Receipt */}
                    <TouchableOpacity
                      style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                      onPress={() => pickImagesGeneric(setReceiptImages)}
                      disabled={uploading}
                    >
                      <Feather name="upload" size={24} color={uploading ? '#999' : '#2E7D32'} />
                      <Text style={[styles.uploadButtonText, uploading && styles.uploadButtonTextDisabled]}>
                        {uploading ? 'Uploading...' : 'Upload Photo of the Receipt'}
                      </Text>
                    </TouchableOpacity>

                    {/* ✅ Upload E-bike Photo */}
                    <TouchableOpacity
                      style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                      onPress={() => pickImagesGeneric(setEbikePhotoImages)}
                      disabled={uploading}
                    >
                      <Feather name="upload" size={24} color={uploading ? '#999' : '#2E7D32'} />
                      <Text style={[styles.uploadButtonText, uploading && styles.uploadButtonTextDisabled]}>
                        {uploading ? 'Uploading...' : 'Upload E-bike Photo'}
                      </Text>
                    </TouchableOpacity>

                    {/* ✅ COMBINED PREVIEW (Saved + New) */}
                    {renderCombinedDocsPreview('pending')}
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

              {/* Verified / Rejected details */}
              {(activeTab === 'Verified' || activeTab === 'Rejected') && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Registration Details</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>E-Bike Category:</Text>
                    <Text style={styles.detailValue}>
                      {EBIKE_CATEGORIES.find(c => c.value === selectedEbike?.ebikeCategorySelected)?.label || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {activeTab === 'Verified' ? 'Verified' : 'Rejected'} At:
                    </Text>
                    <Text style={styles.detailValue}>
                      {activeTab === 'Verified'
                        ? (selectedEbike?.verifiedAt ? formatDate(selectedEbike.verifiedAt) : 'N/A')
                        : (selectedEbike?.rejectedAt ? formatDate(selectedEbike.rejectedAt) : 'N/A')}
                    </Text>
                  </View>

                  {activeTab === 'Verified' && selectedEbike?.registeredDate && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Registered Date:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedEbike.registeredDate)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Renewal Date:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedEbike.renewalDate)}
                        </Text>
                      </View>
                    </>
                  )}

                  {activeTab === 'Verified' && selectedEbike?.paymentDetails && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Amount:</Text>
                        <Text style={styles.detailValue}>
                          ₱{selectedEbike.paymentDetails.amount?.toFixed?.(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Verified At:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedEbike.paymentDetails.verifiedAt)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* ✅ REGISTRATION HISTORY (Latest → Oldest) */}
              {activeTab === 'Verified' && selectedEbike && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Registration History</Text>
                  <Text style={styles.auditHint}>Latest → Oldest</Text>

                  {getEbikeTransactions(selectedEbike).length === 0 ? (
                    <Text style={{ color: '#7F8C8D' }}>No transactions recorded yet.</Text>
                  ) : (
                    getEbikeTransactions(selectedEbike).map((tx, idx) => {
                      const rec = Array.isArray(tx?.adminVerificationDocs?.receipt) ? tx.adminVerificationDocs.receipt : [];
                      const ebp = Array.isArray(tx?.adminVerificationDocs?.ebikePhotos) ? tx.adminVerificationDocs.ebikePhotos : [];
                      const amt = Number(tx?.paymentDetails?.amount || 0);

                      return (
                        <View key={`${idx}_${tx?.createdAt || ''}`} style={styles.auditCard}>
                          <View style={styles.auditHeaderRow}>
                            <Text style={styles.auditTitle}>
                              {idx === 0 ? 'Latest' : `#${idx + 1}`} • {tx?.type || 'Transaction'}
                            </Text>
                            <Text style={styles.auditDate}>
                              {formatDate(tx?.createdAt || tx?.paymentDetails?.verifiedAt)}
                            </Text>
                          </View>

                          {/* ✅ NO CATEGORY here */}
                          <View style={styles.auditRow}>
                            <Text style={styles.auditLabel}>Registered:</Text>
                            <Text style={styles.auditValue}>{formatDate(tx?.registeredDate)}</Text>
                          </View>

                          <View style={styles.auditRow}>
                            <Text style={styles.auditLabel}>Renewal:</Text>
                            <Text style={styles.auditValue}>{formatDate(tx?.renewalDate)}</Text>
                          </View>

                          <View style={styles.auditRow}>
                            <Text style={styles.auditLabel}>Payment:</Text>
                            <Text style={styles.auditValue}>₱{amt.toFixed(2)}</Text>
                          </View>

                          {rec.length > 0 && (
                            <>
                              <Text style={styles.auditSubTitle}>Photo of the Receipt</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {rec.map((url, i) => (
                                  <TouchableOpacity
                                    key={`r_${idx}_${i}`}
                                    onPress={() => Linking.openURL(url)}
                                  >
                                    <Image source={{ uri: url }} style={styles.auditThumb} />
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </>
                          )}

                          {ebp.length > 0 && (
                            <>
                              <Text style={styles.auditSubTitle}>E-bike Photo</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {ebp.map((url, i) => (
                                  <TouchableOpacity
                                    key={`e_${idx}_${i}`}
                                    onPress={() => Linking.openURL(url)}
                                  >
                                    <Image source={{ uri: url }} style={styles.auditThumb} />
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* ✅ AFTER REGISTRATION HISTORY (outside history): Receipt + E-bike (new+old) */}
              {renderAllDocsAfterHistory()}

              {/* ✅ RENEW BUTTON + FORM */}
              {activeTab === 'Verified' &&
                selectedEbike &&
                getRegistrationStatusFromEbike(selectedEbike)?.status === 'Expired' && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Renewal</Text>

                    {!showRenewForm ? (
                      <TouchableOpacity
                        style={styles.renewButton}
                        disabled={uploading}
                        onPress={() => {
                          setShowRenewForm(true);

                          setReceiptImages([]);
                          setEbikePhotoImages([]);
                          setPaymentAmount('');
                          setRegisteredDateInput('');
                          setRenewalDateInput('');
                          setShowRegisteredPicker(false);
                          setShowRenewalPicker(false);
                        }}
                      >
                        <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                        <Text style={styles.renewButtonText}>Renew</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <Text style={styles.sectionTitle}>New Payment Verification</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter Payment Amount"
                          keyboardType="numeric"
                          value={paymentAmount}
                          onChangeText={setPaymentAmount}
                          editable={!uploading}
                        />

                        <Text style={styles.sectionTitle}>New Registration Dates</Text>

                        <TouchableOpacity
                          style={[styles.dateButton, uploading && styles.dateButtonDisabled]}
                          onPress={() => setShowRegisteredPicker(true)}
                          disabled={uploading}
                        >
                          <Feather name="calendar" size={20} color="#2E7D32" />
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
                              if (Platform.OS === 'android') setShowRegisteredPicker(false);
                              if (selectedDate) setRegisteredDateInput(selectedDate.toISOString().split('T')[0]);
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
                          <Feather name="calendar" size={20} color="#2E7D32" />
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
                              if (Platform.OS === 'android') setShowRenewalPicker(false);
                              if (selectedDate) setRenewalDateInput(selectedDate.toISOString().split('T')[0]);
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

                        {/* ✅ Renewal Upload Photo of the Receipt */}
                        <TouchableOpacity
                          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                          onPress={() => pickImagesGeneric(setReceiptImages)}
                          disabled={uploading}
                        >
                          <Feather name="upload" size={24} color={uploading ? '#999' : '#2E7D32'} />
                          <Text style={[styles.uploadButtonText, uploading && styles.uploadButtonTextDisabled]}>
                            {uploading ? 'Uploading...' : 'Upload Photo of the Receipt'}
                          </Text>
                        </TouchableOpacity>

                        {/* ✅ Renewal Upload E-bike Photo */}
                        <TouchableOpacity
                          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                          onPress={() => pickImagesGeneric(setEbikePhotoImages)}
                          disabled={uploading}
                        >
                          <Feather name="upload" size={24} color={uploading ? '#999' : '#2E7D32'} />
                          <Text style={[styles.uploadButtonText, uploading && styles.uploadButtonTextDisabled]}>
                            {uploading ? 'Uploading...' : 'Upload E-bike Photo'}
                          </Text>
                        </TouchableOpacity>

                        {/* ✅ COMBINED PREVIEW (Old + New for Renewal) */}
                        {renderCombinedDocsPreview('renewal')}

                        <View style={styles.modalButtons}>
                          <TouchableOpacity
                            style={[styles.modalButton, styles.cancelRenewButton, uploading && styles.buttonDisabled]}
                            onPress={() => {
                              setShowRenewForm(false);
                              setReceiptImages([]);
                              setEbikePhotoImages([]);
                              setPaymentAmount('');
                              setRegisteredDateInput('');
                              setRenewalDateInput('');
                              setShowRegisteredPicker(false);
                              setShowRenewalPicker(false);
                            }}
                            disabled={uploading}
                          >
                            <Text style={styles.modalButtonText}>Cancel</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.modalButton, styles.verifyButton, uploading && styles.buttonDisabled]}
                            onPress={handleRenewEbike}
                            disabled={uploading}
                          >
                            <Text style={styles.modalButtonText}>
                              {uploading ? 'Uploading...' : 'Submit Renewal'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                )}

              {/* legacy fallback if old adminVerificationImages exists */}
              {(activeTab === 'Verified' &&
                Array.isArray(selectedEbike?.adminVerificationImages) &&
                selectedEbike.adminVerificationImages.length > 0) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Verification Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedEbike.adminVerificationImages.map((imageUrl, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            Alert.alert('Image', 'Tap to view full image', [
                              { text: 'Open', onPress: () => Linking.openURL(imageUrl) },
                              { text: 'Cancel', style: 'cancel' }
                            ]);
                          }}
                        >
                          <Image source={{ uri: imageUrl }} style={styles.documentImage} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

            </ScrollView>

            {/* ✅ EBike selector sheet */}
            {showEbikeModal && (
              <View style={styles.categoryOverlay}>
                <View style={styles.categorySheet}>
                  <View style={styles.categorySheetHeader}>
                    <Text style={styles.categorySheetTitle}>Select E-Bike</Text>
                    <TouchableOpacity onPress={() => setShowEbikeModal(false)}>
                      <Feather name="x" size={18} color="#2C3E50" />
                    </TouchableOpacity>
                  </View>

                  {ebikesForTab.length === 0 ? (
                    <Text style={{ paddingVertical: 10, color: '#7F8C8D' }}>
                      No e-bike registrations in this tab.
                    </Text>
                  ) : (
                    ebikesForTab.map((e, idx) => (
                      <TouchableOpacity
                        key={String(e.id)}
                        style={styles.categoryOption}
                        onPress={() => {
                          setSelectedEbikeId(e.id);
                          prefillFormFromEbike(e);
                          setShowEbikeModal(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            String(selectedEbikeId) === String(e.id) && styles.categoryOptionTextSelected
                          ]}
                        >
                          {getEbikeLabel(e, idx)}
                        </Text>
                        {String(selectedEbikeId) === String(e.id) && (
                          <Feather name="check" size={18} color="#2E7D32" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* ✅ Category mini-sheet */}
            {showCategoryModal && (
              <View style={styles.categoryOverlay}>
                <View style={styles.categorySheet}>
                  <View style={styles.categorySheetHeader}>
                    <Text style={styles.categorySheetTitle}>Select E-Bike Category</Text>
                    <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                      <Feather name="x" size={18} color="#2C3E50" />
                    </TouchableOpacity>
                  </View>

                  {EBIKE_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      style={styles.categoryOption}
                      onPress={() => {
                        setSelectedCategory(cat.value);
                        setShowCategoryModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          selectedCategory === cat.value && styles.categoryOptionTextSelected
                        ]}
                      >
                        {cat.label}
                      </Text>
                      {selectedCategory === cat.value && (
                        <Feather name="check" size={18} color="#2E7D32" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ✅ FIXED HEADER */}
        <View style={styles.header}>
          {/* Left */}
          <View
            style={styles.headerSideLeft}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w && Math.abs(w - headerLeftW) > 1) setHeaderLeftW(w);
            }}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backArrow}>◂</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Center */}
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Rider Management
          </Text>

          {/* Right spacer */}
          <View style={[styles.headerSideRight, { width: headerLeftW || DEFAULT_SIDE_W }]} />
        </View>

        <View style={styles.tabContainer}>
          {['Pending', 'Verified', 'Rejected'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
              onPress={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
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
          <Feather name="search" size={20} color="#2E7D32" />
          <TextInput
            placeholder="Search name or plate number"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        <FlatList
          data={filteredRiders}
          renderItem={({ item }) => {
            const tabEbikes = (item.ebikes || []).filter(e => getEbikeStatus(e, item.status) === activeTab);

            const firstPlate = tabEbikes[0]?.plateNumber
              ? String(tabEbikes[0].plateNumber).toUpperCase()
              : 'N/A';
            const more = tabEbikes.length > 1 ? ` (+${tabEbikes.length - 1} more)` : '';

            const verifiedItems = activeTab === 'Verified'
              ? tabEbikes.map((e) => {
                const plate = e?.plateNumber ? String(e.plateNumber).toUpperCase() : 'NO PLATE';
                const reg = getRegistrationStatusFromEbike(e);
                return { id: e?.id, plate, reg };
              })
              : [];

            const overallRegStatus = (() => {
              if (activeTab !== 'Verified') return null;
              const regs = verifiedItems.map(x => x.reg).filter(Boolean);

              if (regs.some(r => r.status === 'Expired')) return { status: 'Expired', color: '#F44336' };
              if (regs.some(r => r.status === 'Expiring Soon')) return { status: 'Expiring Soon', color: '#FF9800' };
              if (regs.length > 0) return { status: 'Active', color: '#4CAF50' };
              return null;
            })();

            return (
              <TouchableOpacity
                style={styles.tableRow}
                onPress={() => showRiderDetails(item)}
              >
                <View style={styles.rowContent}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.tableCell}>
                      {item.personalInfo?.firstName} {item.personalInfo?.lastName}
                    </Text>

                    {activeTab === 'Verified' ? (
                      <View style={styles.plateStatusWrap}>
                        {verifiedItems.length === 0 ? (
                          <Text style={styles.tableCell}>N/A</Text>
                        ) : (
                          verifiedItems.map((x, idx) => (
                            <View
                              key={String(x.id ?? idx)}
                              style={[
                                styles.plateStatusChip,
                                x.reg
                                  ? { borderColor: x.reg.color, backgroundColor: x.reg.color + '20' }
                                  : { borderColor: '#E0E0E0', backgroundColor: '#F5F5F5' }
                              ]}
                            >
                              <Text
                                style={[
                                  styles.plateStatusText,
                                  x.reg ? { color: x.reg.color } : { color: '#2C3E50' }
                                ]}
                              >
                                {x.plate}{x.reg ? ` • ${x.reg.status}` : ''}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    ) : (
                      <Text style={styles.tableCell}>
                        {firstPlate}{more}
                      </Text>
                    )}
                  </View>

                  {activeTab === 'Verified' && overallRegStatus && (
                    <View style={[styles.statusIndicator, { backgroundColor: overallRegStatus.color }]}>
                      <Text style={styles.statusIndicatorText}>
                        {overallRegStatus.status === 'Active' ? '✓'
                          : overallRegStatus.status === 'Expiring Soon' ? '⚠' : '✕'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => showRiderDetails(item)}
                    style={styles.actionButton}
                  >
                    <Feather name="info" size={20} color="#2E7D32" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15 * RESPONSIVE.width,
    paddingVertical: 10 * RESPONSIVE.height,
    paddingTop: 40 * RESPONSIVE.height,
    borderBottomWidth: 1,
    borderBottomColor: '#2E7D32',
    backgroundColor: '#2E7D32'
  },
  headerSideLeft: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 16 * RESPONSIVE.width,
    marginRight: 4
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16 * RESPONSIVE.width,
    fontWeight: '600'
  },
  headerTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 20 * RESPONSIVE.width,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 6 * RESPONSIVE.width,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {})
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
    borderBottomColor: '#2E7D32'
  },
  tabText: {
    color: '#7F8C8D',
    fontWeight: '600'
  },
  activeTabText: {
    color: '#2E7D32'
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

  plateStatusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  plateStatusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  plateStatusText: {
    fontSize: 13 * RESPONSIVE.width,
    fontWeight: '600',
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

  categoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  categorySheet: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    elevation: 4,
  },
  categorySheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 4,
  },
  categorySheetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  categoryOptionTextSelected: {
    fontWeight: '700',
    color: '#2E7D32',
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

  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
  },
  renewButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
  },
  cancelRenewButton: {
    backgroundColor: '#95A5A6',
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
    color: '#2E7D32',
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
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  datePickerDoneText: {
    color: 'white',
    fontWeight: '600'
  },

  /* ✅ HISTORY STYLES */
  auditHint: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 10
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  auditHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  auditTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2C3E50'
  },
  auditDate: {
    fontSize: 12,
    color: '#7F8C8D'
  },
  auditRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  auditLabel: {
    width: '38%',
    color: '#7F8C8D',
    fontWeight: '700',
    fontSize: 12
  },
  auditValue: {
    width: '62%',
    color: '#2C3E50',
    fontSize: 12
  },
  auditSubTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#2C3E50'
  },
  auditThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 6
  },

  docsMiniLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
});

export default RiderScreen;


