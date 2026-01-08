// RiderScreen.js
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
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import {
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../config/firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const STATUS = {
  PENDING: 'Pending',
  RETURNED: 'Returned',
  FOR_VALIDATION: 'For Validation',
  FOR_INSPECTION: 'For Inspection',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

const INSPECT_TAB = 'Inspect'; // ✅ Inspector-only tab label

const TABS_BY_ROLE = {
  processing: [STATUS.PENDING, STATUS.RETURNED, STATUS.VERIFIED, STATUS.REJECTED],
  validator: [STATUS.FOR_VALIDATION, STATUS.FOR_INSPECTION, STATUS.VERIFIED, STATUS.REJECTED],
  inspector: [INSPECT_TAB], // ✅ Inspector sees "Inspect" list only
};

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

// ✅ NEW: add years to YYYY-MM-DD safely (UTC-based to avoid TZ shifting)
const addYearsISO = (isoDate, years = 1) => {
  if (!isoDate) return '';
  const parts = String(isoDate).split('-').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return '';
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, (m - 1), d));
  if (isNaN(dt.getTime())) return '';
  dt.setUTCFullYear(dt.getUTCFullYear() + years);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ✅ NEW: inspector list should only show those still needing inspection
const getInspectionResultUpper = (ebike) =>
  (ebike?.inspectionResult || ebike?.inspection?.result || '')
    .toString()
    .trim()
    .toUpperCase();

const needsInspection = (ebike) => {
  const r = getInspectionResultUpper(ebike);
  return !r || r === 'PENDING';
};

const CHECKLIST_ITEMS = [
  // Documents
  { key: 'gov_id', label: "Copy of Government Valid ID / Driver’s License", group: 'Documents', required: true },

  // Lights & signals
  { key: 'head_light', label: 'Head Light', group: 'Lights & Signals', required: true },
  { key: 'brake_light', label: 'Brake Light', group: 'Lights & Signals', required: true },
  { key: 'signal_light', label: 'Signal Light', group: 'Lights & Signals', required: true },

  // Safety / condition
  { key: 'side_mirror', label: 'Side Mirror', group: 'Safety & Condition', required: true },
  { key: 'tire_condition', label: 'Tire (Good Condition)', group: 'Safety & Condition', required: true },
  { key: 'shock_absorber', label: 'Shock Absorber (Good Condition)', group: 'Safety & Condition', required: false },
  { key: 'motor_condition', label: 'Motor (Good Condition)', group: 'Safety & Condition', required: true },
  { key: 'wheel_bearings', label: 'Wheel Bearings', group: 'Safety & Condition', required: false },
  { key: 'seats', label: 'Seats (Driver and Passenger)', group: 'Safety & Condition', required: true },

  // Optional / not always applicable for 2-wheel e-bikes
  { key: 'trash_can', label: 'Trash Can', group: 'Optional / If Applicable', required: false },
  { key: 'window_wiper', label: 'Window Wiper', group: 'Optional / If Applicable', required: false },
];

const normalizeChecklistDefaults = (incoming = {}) => {
  const out = { ...(incoming || {}) };
  CHECKLIST_ITEMS.forEach((it) => {
    // default optional items to "NA" to solve 2-wheel compatibility (like window wiper)
    if (!out[it.key]) out[it.key] = it.required ? '' : 'NA';
  });
  return out;
};

const getTabStatusFilter = (tab) => {
  // ✅ map "Inspect" tab to actual status filter
  return tab === INSPECT_TAB ? STATUS.FOR_INSPECTION : tab;
};

/* =========================
   ✅ FIX #1: GOV ID URL RESOLVER
   - supports url/downloadURL/imageUrl/uri/urls/storagePath/gs://
   - does NOT rely on type == "original"
========================= */
const isHttpUrl = (s) => /^https?:\/\//i.test(String(s || '').trim());

const coerceStringArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap(coerceStringArray);
  if (typeof v === 'string') return [v];
  return [];
};

const safeTrim = (s) => (typeof s === 'string' ? s.trim() : '');

const resolveStorageUrlMaybe = async (maybeUrlOrPath) => {
  const s = safeTrim(maybeUrlOrPath);
  if (!s) return null;
  if (isHttpUrl(s)) return s;

  // gs:// or storage path -> convert to downloadURL
  try {
    const dl = await getDownloadURL(ref(storage, s));
    return dl;
  } catch {
    return null;
  }
};

const collectGovIdCandidates = (userData = {}, imageDocs = []) => {
  const raw = [];

  // from image docs
  (imageDocs || []).forEach((d) => {
    const data = d || {};
    const t = (data.type || data.docType || data.category || '').toString().toLowerCase();

    // exclude obvious non-ID types
    const isNotId =
      t.includes('receipt') ||
      t.includes('ebike') ||
      t.includes('payment') ||
      t.includes('profile');

    if (isNotId) return;

    // include if type is blank/unknown or looks like ID/license
    const looksLikeId =
      !t ||
      t === 'original' ||
      t.includes('gov') ||
      t.includes('valid') ||
      t.includes('id') ||
      t.includes('license') ||
      t.includes('driver');

    if (!looksLikeId) return;

    raw.push(
      ...coerceStringArray(data.url),
      ...coerceStringArray(data.downloadURL),
      ...coerceStringArray(data.downloadUrl),
      ...coerceStringArray(data.imageUrl),
      ...coerceStringArray(data.imageURL),
      ...coerceStringArray(data.uri),
      ...coerceStringArray(data.urls),
      ...coerceStringArray(data.path),
      ...coerceStringArray(data.storagePath),
      ...coerceStringArray(data.storageUri),
      ...coerceStringArray(data.gsUrl),
      ...coerceStringArray(data.gsURL),
    );
  });

  // fallback fields directly on user doc (in case you store IDs there)
  raw.push(
    ...coerceStringArray(userData.govIdUrl),
    ...coerceStringArray(userData.govIDUrl),
    ...coerceStringArray(userData.govIdImageUrl),
    ...coerceStringArray(userData.govIDImageUrl),
    ...coerceStringArray(userData.validIdUrl),
    ...coerceStringArray(userData.validIDUrl),
    ...coerceStringArray(userData.driverLicenseUrl),
    ...coerceStringArray(userData.driversLicenseUrl),
    ...coerceStringArray(userData.idUrl),
    ...coerceStringArray(userData.idUrls),
    ...coerceStringArray(userData.govIdUrls),
    ...coerceStringArray(userData.govIDUrls),
  );

  // normalize + dedupe
  return Array.from(
    new Set(raw.map(safeTrim).filter(Boolean))
  );
};

const RiderScreen = ({ navigation, route }) => {
  const [adminRole, setAdminRole] = useState(
    (route?.params?.adminRole || '').toString().toLowerCase() || ''
  );
  const [roleLoading, setRoleLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(STATUS.PENDING);

  const [riders, setRiders] = useState([]);
  const [filteredRiders, setFilteredRiders] = useState([]);

  const [selectedRider, setSelectedRider] = useState(null);
  const [selectedEbikeId, setSelectedEbikeId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // ✅ saved (existing) docs that can be removed by processing on Pending/Returned
  const [savedReceiptUrls, setSavedReceiptUrls] = useState([]);
  const [savedEbikeUrls, setSavedEbikeUrls] = useState([]);

  // ✅ new picked images (not yet uploaded)
  const [receiptImages, setReceiptImages] = useState([]);
  const [ebikePhotoImages, setEbikePhotoImages] = useState([]);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [registeredDateInput, setRegisteredDateInput] = useState('');
  const [renewalDateInput, setRenewalDateInput] = useState('');
  const [showRegisteredPicker, setShowRegisteredPicker] = useState(false);
  const [showRenewalPicker, setShowRenewalPicker] = useState(false);

  const [manualPlateNumber, setManualPlateNumber] = useState('');
  const [manualPlateError, setManualPlateError] = useState('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEbikeModal, setShowEbikeModal] = useState(false);

  const [showRenewForm, setShowRenewForm] = useState(false);

  const [validatorNotes, setValidatorNotes] = useState('');

  // ✅ INSPECTOR states
  const [inspectionChecklist, setInspectionChecklist] = useState(normalizeChecklistDefaults({}));
  const [inspectionNotes, setInspectionNotes] = useState('');

  const DEFAULT_SIDE_W = 90 * RESPONSIVE.width;
  const [headerLeftW, setHeaderLeftW] = useState(DEFAULT_SIDE_W);

  const allowedTabs = useMemo(() => {
    const role = adminRole || 'processing';
    return TABS_BY_ROLE[role] || [STATUS.PENDING, STATUS.VERIFIED, STATUS.REJECTED];
  }, [adminRole]);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const me = auth.currentUser?.uid;
        if (!me) {
          setAdminRole('processing');
          return;
        }

        let raw = '';
        const snapUsers = await getDoc(doc(db, 'users', me));
        if (snapUsers.exists()) {
          const data = snapUsers.data() || {};
          raw = (
            data.adminRole ||
            data.adminType ||
            data.subRole ||
            data.roleType ||
            data.type ||
            data.position ||
            ''
          ).toString().toLowerCase();
        }

        if (!raw) {
          const snapAdmins = await getDoc(doc(db, 'admins', me));
          if (snapAdmins.exists()) {
            const data = snapAdmins.data() || {};
            raw = (
              data.adminRole ||
              data.adminType ||
              data.subRole ||
              data.roleType ||
              data.type ||
              data.position ||
              ''
            ).toString().toLowerCase();
          }
        }

        if (raw.includes('valid')) setAdminRole('validator');
        else if (raw.includes('inspect')) setAdminRole('inspector'); // ✅ added
        else if (raw.includes('process')) setAdminRole('processing');
        else setAdminRole(raw || 'processing');
      } catch (e) {
        setAdminRole('processing');
      } finally {
        setRoleLoading(false);
      }
    };

    if (!adminRole) loadRole();
    else setRoleLoading(false);
  }, [adminRole]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] || STATUS.PENDING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedTabs]);

  const canEditAsProcessing =
    (adminRole || 'processing') === 'processing' &&
    (activeTab === STATUS.PENDING || activeTab === STATUS.RETURNED);

  const canActAsValidator =
    (adminRole || 'processing') === 'validator' &&
    (activeTab === STATUS.FOR_VALIDATION || activeTab === STATUS.FOR_INSPECTION);

  const canActAsInspector =
    (adminRole || 'processing') === 'inspector' &&
    activeTab === INSPECT_TAB;

  // ✅ NEW: Auto renewal date = Registered + 1 year (processing only)
  useEffect(() => {
    if (!canEditAsProcessing) return;

    if (!registeredDateInput) {
      if (renewalDateInput) setRenewalDateInput('');
      return;
    }

    const auto = addYearsISO(registeredDateInput, 1);
    if (auto && auto !== renewalDateInput) {
      setRenewalDateInput(auto);
    }
  }, [registeredDateInput, canEditAsProcessing, renewalDateInput]);

  const getEbikeStatus = (ebike, userDataStatus) => {
    return ebike?.status || userDataStatus || STATUS.PENDING;
  };

  const computeOverallUserStatus = (ebikes = []) => {
    const statuses = ebikes.map(e => e?.status).filter(Boolean);

    if (statuses.includes(STATUS.PENDING)) return STATUS.PENDING;
    if (statuses.includes(STATUS.RETURNED)) return STATUS.RETURNED;
    if (statuses.includes(STATUS.FOR_VALIDATION)) return STATUS.FOR_VALIDATION;
    if (statuses.includes(STATUS.FOR_INSPECTION)) return STATUS.FOR_INSPECTION;

    if (statuses.length > 0 && statuses.every(s => s === STATUS.REJECTED)) return STATUS.REJECTED;
    return STATUS.VERIFIED;
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

  // ✅ for birthday/string dates
  const formatMaybeDate = (v) => {
    if (!v) return 'N/A';
    const d = toJSDate(v);
    if (d) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const s = String(v || '').trim();
    return s ? s : 'N/A';
  };

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

        status: e?.status || userData.status || STATUS.PENDING,
        ebikeCategorySelected: e?.ebikeCategorySelected || '',
        registeredDate: e?.registeredDate || null,
        renewalDate: e?.renewalDate || null,
        registrationStatus: e?.registrationStatus || null,
        verifiedAt: e?.verifiedAt || null,

        rejectedAt: e?.rejectedAt || null,
        rejectedBy: e?.rejectedBy || null,
        rejectedReason: e?.rejectedReason || null,

        adminVerificationDocs: e?.adminVerificationDocs || null,

        submittedForValidationAt: e?.submittedForValidationAt || null,
        submittedForValidationBy: e?.submittedForValidationBy || null,
        approvedForInspectionAt: e?.approvedForInspectionAt || null,
        approvedForInspectionBy: e?.approvedForInspectionBy || null,

        returnedAt: e?.returnedAt || null,
        returnedBy: e?.returnedBy || null,
        returnReason: e?.returnReason || null,

        validatorNotes: e?.validatorNotes || null,

        inspectionResult: e?.inspectionResult || e?.inspection?.result || null,
        inspection: e?.inspection || null,

        transactionHistory: Array.isArray(e?.transactionHistory) ? e.transactionHistory : [],

        adminVerificationImages: Array.isArray(e?.adminVerificationImages) ? e.adminVerificationImages : [],

        paymentDetails: e?.paymentDetails || null,
        createdAt: e?.createdAt || null,
      }));
    }

    return [{
      id: 'legacy',
      ebikeBrand: userData?.ebikeBrand || '',
      ebikeModel: userData?.ebikeModel || '',
      ebikeColor: userData?.ebikeColor || '',
      chassisMotorNumber: userData?.chassisMotorNumber || userData?.chassisNumber || '',
      branch: userData?.branch || '',
      plateNumber: userData?.plateNumber || '',
      hasPlate: !!userData?.plateNumber,

      status: userData?.status || STATUS.PENDING,
      ebikeCategorySelected: userData?.ebikeCategorySelected || '',
      registeredDate: userData?.registeredDate || null,
      renewalDate: userData?.renewalDate || null,
      registrationStatus: userData?.registrationStatus || null,
      verifiedAt: userData?.verifiedAt || null,

      rejectedAt: userData?.rejectedAt || null,
      rejectedBy: userData?.rejectedBy || null,
      rejectedReason: userData?.rejectedReason || null,

      adminVerificationDocs: userData?.adminVerificationDocs || null,
      transactionHistory: Array.isArray(userData?.transactionHistory) ? userData.transactionHistory : [],

      adminVerificationImages: Array.isArray(userData?.adminVerificationImages) ? userData.adminVerificationImages : [],

      paymentDetails: userData?.paymentDetails || null,
      createdAt: userData?.createdAt || null,

      returnedAt: userData?.returnedAt || null,
      returnedBy: userData?.returnedBy || null,
      returnReason: userData?.returnReason || null,

      inspectionResult: userData?.inspectionResult || userData?.inspection?.result || null,
      inspection: userData?.inspection || null,
    }];
  };

  const fetchRiders = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'Rider')
      );

      const snapshot = await getDocs(q);

      const riderData = await Promise.all(snapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();

        let imagesData = [];
        try {
          // ✅ FIX #1: do NOT filter by type=="original" only; fetch all then extract likely gov-id urls
          const imagesColRef = collection(db, 'riderRegistrations', userDoc.id, 'images');
          const imagesSnap = await getDocs(imagesColRef);
          const imageDocs = imagesSnap.docs.map(d => d.data() || {});

          const rawCandidates = collectGovIdCandidates(userData, imageDocs);

          // resolve gs:// or storage paths
          const resolved = await Promise.all(rawCandidates.map(resolveStorageUrlMaybe));
          imagesData = resolved.filter(Boolean);
        } catch (e) { }

        const ebikes = normalizeUserEbikes(userData);

        return {
          id: userDoc.id,
          userId: userDoc.id,
          uid: userData.uid || userDoc.id,
          status: userData.status || STATUS.PENDING,
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
        };
      }));

      const tabStatus = getTabStatusFilter(activeTab);

      // ✅ UPDATED: Inspect tab shows ONLY For Inspection + still needing inspection (no PASSED/FAILED)
      const ridersForTab = riderData.filter(r => {
        const list = r.ebikes || [];
        return list.some(e => {
          const st = getEbikeStatus(e, r.status);
          if (activeTab === INSPECT_TAB) {
            return st === STATUS.FOR_INSPECTION && needsInspection(e);
          }
          return st === tabStatus;
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const ebikesForTab = useMemo(() => {
    if (!selectedRider) return [];
    const tabStatus = getTabStatusFilter(activeTab);

    return (selectedRider.ebikes || []).filter(e => {
      const ok = getEbikeStatus(e, selectedRider.status) === tabStatus;
      if (!ok) return false;

      if (activeTab === INSPECT_TAB) {
        return needsInspection(e);
      }
      return true;
    });
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

    const sr = Array.isArray(ebike?.adminVerificationDocs?.receipt) ? ebike.adminVerificationDocs.receipt : [];
    const se = Array.isArray(ebike?.adminVerificationDocs?.ebikePhotos) ? ebike.adminVerificationDocs.ebikePhotos : [];
    setSavedReceiptUrls(sr);
    setSavedEbikeUrls(se);

    setManualPlateError('');
    setShowRenewForm(false);
    setValidatorNotes('');

    setSelectedCategory(ebike?.ebikeCategorySelected || '');

    const amt = ebike?.paymentDetails?.amount;
    setPaymentAmount(typeof amt === 'number' ? String(amt) : (amt ? String(amt) : ''));

    setRegisteredDateInput(toISODate(ebike?.registeredDate));
    setRenewalDateInput(toISODate(ebike?.renewalDate));

    setManualPlateNumber(ebike?.plateNumber ? String(ebike.plateNumber).toUpperCase() : '');

    setShowRegisteredPicker(false);
    setShowRenewalPicker(false);

    // ✅ inspector prefill
    const incomingChecklist = ebike?.inspection?.checklist || {};
    setInspectionChecklist(normalizeChecklistDefaults(incomingChecklist));
    setInspectionNotes((ebike?.inspection?.notes || '').toString());
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const queryText = text.toLowerCase();
    const tabStatus = getTabStatusFilter(activeTab);

    const filtered = riders.filter(r => {
      const fn = (r.personalInfo?.firstName || '').toLowerCase();
      const ln = (r.personalInfo?.lastName || '').toLowerCase();

      const tabEbikes = (r.ebikes || []).filter(e => {
        const ok = getEbikeStatus(e, r.status) === tabStatus;
        if (!ok) return false;
        if (activeTab === INSPECT_TAB) return needsInspection(e);
        return true;
      });

      const anyPlateMatch = tabEbikes.some(e => (e?.plateNumber || '').toString().toLowerCase().includes(queryText));

      return fn.includes(queryText) || ln.includes(queryText) || anyPlateMatch;
    });

    setFilteredRiders(filtered);
  };

  const showRiderDetails = (rider) => {
    setSelectedRider(rider);

    const tabStatus = getTabStatusFilter(activeTab);
    const list = (rider.ebikes || []).filter(e => {
      const ok = getEbikeStatus(e, rider.status) === tabStatus;
      if (!ok) return false;
      if (activeTab === INSPECT_TAB) return needsInspection(e);
      return true;
    });

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

  // ✅ Helper for updating a selected ebike (used by validator + inspector)
  const updateSelectedEbikeStatus = async (nextStatus, extra = {}) => {
    if (!selectedRider?.userId || !selectedEbikeId) {
      Alert.alert('Error', 'No rider / e-bike selected');
      return;
    }

    const userRef = doc(db, 'users', selectedRider.userId);
    const now = new Date();

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
        status: nextStatus,
        statusUpdatedAt: now,
        statusUpdatedBy: auth.currentUser?.uid || '',
        ...extra,
      };

      const overallStatus = computeOverallUserStatus(normalized);

      transaction.update(userRef, {
        ebikes: normalized,
        status: overallStatus,
      });
    });

    fetchRiders();
  };

  // ✅ NEW: Validator photo preview helper (used on For Inspection)
  const renderValidatorVerificationPhotos = () => {
    if (!selectedEbike) return null;

    const receipt = Array.from(new Set([
      ...(Array.isArray(selectedEbike?.adminVerificationDocs?.receipt) ? selectedEbike.adminVerificationDocs.receipt : []),
      ...(Array.isArray(savedReceiptUrls) ? savedReceiptUrls : [])
    ])).filter(Boolean);

    const ebike = Array.from(new Set([
      ...(Array.isArray(selectedEbike?.adminVerificationDocs?.ebikePhotos) ? selectedEbike.adminVerificationDocs.ebikePhotos : []),
      ...(Array.isArray(savedEbikeUrls) ? savedEbikeUrls : [])
    ])).filter(Boolean);

    if (receipt.length === 0 && ebike.length === 0) {
      return (
        <Text style={{ color: '#7F8C8D', fontSize: 12, marginTop: 8 }}>
          No uploaded receipt/e-bike photos found.
        </Text>
      );
    }

    return (
      <View style={{ marginTop: 12 }}>
        <Text style={styles.auditSubTitle}>Verification Photos (Saved)</Text>

        {receipt.length > 0 && (
          <>
            <Text style={styles.docsMiniLabel}>Photo of the Receipt</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {receipt.map((url, i) => (
                <TouchableOpacity key={`fi_rec_${i}`} onPress={() => Linking.openURL(url)}>
                  <Image source={{ uri: url }} style={styles.documentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {ebike.length > 0 && (
          <>
            <Text style={[styles.docsMiniLabel, { marginTop: 10 }]}>E-bike Photo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ebike.map((url, i) => (
                <TouchableOpacity key={`fi_eb_${i}`} onPress={() => Linking.openURL(url)}>
                  <Image source={{ uri: url }} style={styles.documentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    );
  };

  // ✅ INSPECTOR: save Passed/Failed + checklist + notes
  const handleInspectorSetResult = async (result) => {
    try {
      if (!canActAsInspector) return;
      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      const now = new Date();

      const cleanedChecklist = normalizeChecklistDefaults(inspectionChecklist || {});
      const missingRequired = CHECKLIST_ITEMS
        .filter(i => i.required)
        .filter(i => !cleanedChecklist[i.key] || cleanedChecklist[i.key] === '');

      if (missingRequired.length > 0) {
        Alert.alert(
          'Checklist required',
          'Please answer all required checklist items (OK / NOT OK / N/A).'
        );
        return;
      }

      // PASSED -> keep status FOR_INSPECTION but will disappear from Inspect list (filtered out)
      // FAILED -> automatically return to RETURNED
      if (String(result).toUpperCase() === 'FAILED') {
        const reason =
          (inspectionNotes || '').trim()
            ? `Inspection failed: ${(inspectionNotes || '').trim()}`
            : 'Inspection failed. Please correct the issues and resubmit.';

        await updateSelectedEbikeStatus(STATUS.RETURNED, {
          inspectionResult: 'FAILED',
          inspection: {
            result: 'FAILED',
            checklist: cleanedChecklist,
            notes: (inspectionNotes || '').trim(),
            inspectedAt: now,
            inspectedBy: auth.currentUser?.uid || '',
          },
          returnReason: reason,
          returnedAt: now,
          returnedBy: auth.currentUser?.uid || '',
        });

        Alert.alert('Saved', 'Inspection marked as FAILED and returned to Processing.');
        setDetailModalVisible(false);
        return;
      }

      await updateSelectedEbikeStatus(STATUS.FOR_INSPECTION, {
        inspectionResult: 'PASSED',
        inspection: {
          result: 'PASSED',
          checklist: cleanedChecklist,
          notes: (inspectionNotes || '').trim(),
          inspectedAt: now,
          inspectedBy: auth.currentUser?.uid || '',
        }
      });

      Alert.alert('Saved', 'Inspection marked as PASSED.');
      setDetailModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not save inspection result');
    }
  };

  // ✅ Processing → Send for Validation
  const handleSendForValidation = async () => {
    try {
      if (!canEditAsProcessing) return;

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

      // ✅ Renewal date is automatic (Registered + 1 year)
      const autoRenewISO = addYearsISO(registeredDateInput, 1);
      if (!autoRenewISO) {
        Alert.alert('Error', 'Invalid Registration Date. Please select again.');
        return;
      }

      const totalReceiptCount = (savedReceiptUrls?.length || 0) + (receiptImages?.length || 0);
      const totalEbikeCount = (savedEbikeUrls?.length || 0) + (ebikePhotoImages?.length || 0);

      if (totalReceiptCount === 0) {
        Alert.alert('Required', 'Please upload Photo of the Receipt (or keep existing).');
        return;
      }
      if (totalEbikeCount === 0) {
        Alert.alert('Required', 'Please upload E-bike Photo (or keep existing).');
        return;
      }

      // ✅ allow processing to SET/OVERRIDE plate number using manualPlateNumber
      let finalPlateNumber = (manualPlateNumber || '').trim().toUpperCase();
      if (!finalPlateNumber) {
        finalPlateNumber = selectedEbike?.plateNumber ? String(selectedEbike.plateNumber).trim().toUpperCase() : '';
      }

      if (!finalPlateNumber) {
        setManualPlateError('Plate number is required');
        Alert.alert('Error', 'Please enter plate number for this e-bike');
        return;
      }

      if (!PLATE_REGEX.test(finalPlateNumber)) {
        setManualPlateError('Format must be 2 letters + 4 numbers (e.g., AB1234)');
        Alert.alert('Invalid Plate Number', 'Plate must be 2 letters followed by 4 numbers (e.g., AB1234)');
        return;
      }

      const receiptUploadedUrls = receiptImages.length > 0
        ? await uploadImagesToFirebase(receiptImages, 'receipt')
        : [];
      const ebikeUploadedUrls = ebikePhotoImages.length > 0
        ? await uploadImagesToFirebase(ebikePhotoImages, 'ebike_photo')
        : [];

      const finalReceiptUrls = [...(savedReceiptUrls || []), ...(receiptUploadedUrls || [])].filter(Boolean);
      const finalEbikeUrls = [...(savedEbikeUrls || []), ...(ebikeUploadedUrls || [])].filter(Boolean);

      if (finalReceiptUrls.length === 0 || finalEbikeUrls.length === 0) {
        Alert.alert('Upload Failed', 'Receipt and E-bike photos are required. Please upload again or keep existing.');
        return;
      }

      const userRef = doc(db, 'users', selectedRider.userId);
      const now = new Date();

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
        const renD = new Date(autoRenewISO);

        const docsObj = {
          receipt: finalReceiptUrls,
          ebikePhotos: finalEbikeUrls
        };

        const preparedPayment = {
          amount: parseFloat(paymentAmount),
          preparedBy: auth.currentUser?.uid || '',
          preparedAt: now,
          type: 'Registration'
        };

        // ✅ FIX #2: When Processing resubmits after FAILED inspection (or any resubmission),
        // reset inspection fields so it will show again to Inspector when sent back for inspection.
        normalized[idx] = {
          ...old,
          status: STATUS.FOR_VALIDATION,
          ebikeCategorySelected: selectedCategory,
          registeredDate: regD,
          renewalDate: renD, // ✅ AUTO
          registrationStatus: old?.registrationStatus || null,
          plateNumber: finalPlateNumber,
          hasPlate: true, // ✅ ensure updated

          adminVerificationDocs: docsObj,
          paymentDetails: preparedPayment,

          submittedForValidationAt: now,
          submittedForValidationBy: auth.currentUser?.uid || '',

          // ✅ clear any previous cycle inspection (FAILED/PASSED) so it can be inspected again
          inspectionResult: null,
          inspection: null,
          approvedForInspectionAt: null,
          approvedForInspectionBy: null,

          returnReason: null,
          returnedAt: null,
          returnedBy: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectedReason: null,
          validatorNotes: null,
        };

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
      setSavedReceiptUrls([]);
      setSavedEbikeUrls([]);
      setPaymentAmount('');
      setSelectedCategory('');
      setRegisteredDateInput('');
      setRenewalDateInput('');
      setManualPlateNumber('');
      setManualPlateError('');
      setValidatorNotes('');
      setDetailModalVisible(false);
      setShowCategoryModal(false);
      setShowEbikeModal(false);
      setShowRenewForm(false);

      fetchRiders();
      Alert.alert('Sent', 'Registration sent to Validator (For Validation).');
    } catch (error) {
      console.error('Send for validation error:', error);
      Alert.alert('Failed', error.message || 'Could not send for validation');
    }
  };

  const handleApproveForInspection = async () => {
    try {
      if (!canActAsValidator || activeTab !== STATUS.FOR_VALIDATION) return;

      // ✅ BLOCK if no valid plate number
      const plate = (selectedEbike?.plateNumber || '').toString().trim().toUpperCase();
      if (!plate || !PLATE_REGEX.test(plate)) {
        Alert.alert(
          'Missing Plate Number',
          'Cannot approve. This registration has no valid plate number.\n\nPlease RETURN it to Processing so they can encode/fix the plate number.'
        );
        return;
      }

      // ✅ FIX #2 safety: always reset inspection fields when moving to For Inspection
      await updateSelectedEbikeStatus(STATUS.FOR_INSPECTION, {
        approvedForInspectionAt: new Date(),
        approvedForInspectionBy: auth.currentUser?.uid || '',
        validatorNotes: validatorNotes?.trim() || '',
        inspectionResult: null,
        inspection: null,
      });

      Alert.alert('Approved', 'Sent to For Inspection.');
      setValidatorNotes('');
      setDetailModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not approve for inspection');
    }
  };

  const handleReturnToProcessing = async () => {
    try {
      if (!canActAsValidator) return;

      const reason = (validatorNotes || '').trim() || 'Please correct the details/documents and resubmit.';

      await updateSelectedEbikeStatus(STATUS.RETURNED, {
        returnReason: reason,
        returnedAt: new Date(),
        returnedBy: auth.currentUser?.uid || '',
      });

      Alert.alert('Returned', 'Returned to Processing.');
      setValidatorNotes('');
      setDetailModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not return');
    }
  };

  const handleFinalVerify = async () => {
    try {
      if (!canActAsValidator || activeTab !== STATUS.FOR_INSPECTION) return;

      const insp = (
        selectedEbike?.inspectionResult ||
        selectedEbike?.inspection?.result ||
        ''
      ).toString().toUpperCase();

      if (insp !== 'PASSED') {
        Alert.alert('Not allowed', 'Cannot verify yet. Inspection result must be PASSED.');
        return;
      }

      // ✅ BLOCK if no valid plate number
      const plate = (selectedEbike?.plateNumber || '').toString().trim().toUpperCase();
      if (!plate || !PLATE_REGEX.test(plate)) {
        Alert.alert(
          'Missing Plate Number',
          'Cannot verify. This registration has no valid plate number.\n\nPlease RETURN it to Processing so they can encode/fix the plate number.'
        );
        return;
      }

      const cat = selectedEbike?.ebikeCategorySelected;
      const amt = Number(selectedEbike?.paymentDetails?.amount);

      if (!cat || !isFinite(amt) || !selectedEbike?.registeredDate || !selectedEbike?.renewalDate) {
        Alert.alert('Missing data', 'Processing details are incomplete. Return to Processing.');
        return;
      }

      const userRef = doc(db, 'users', selectedRider.userId);
      const now = new Date();

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User document does not exist');

        const data = userDoc.data();
        const ebikes = Array.isArray(data?.ebikes) ? [...data.ebikes] : [];
        const normalized = ebikes.length > 0 ? ebikes : normalizeUserEbikes(data);

        const idx = normalized.findIndex(e => String(e?.id) === String(selectedEbikeId));
        if (idx === -1) throw new Error('Selected e-bike not found');

        const old = normalized[idx] || {};
        const docsObj = old?.adminVerificationDocs || { receipt: [], ebikePhotos: [] };

        const verifiedPayment = {
          ...(old.paymentDetails || {}),
          amount: amt,
          verifiedBy: auth.currentUser?.uid || '',
          verifiedAt: now,
          type: 'Registration'
        };

        let txHistory = Array.isArray(old?.transactionHistory) ? [...old.transactionHistory] : [];
        txHistory.push({
          type: 'Registration',
          registeredDate: old?.registeredDate || null,
          renewalDate: old?.renewalDate || null,
          paymentDetails: verifiedPayment,
          adminVerificationDocs: docsObj,
          createdAt: now,
          createdBy: auth.currentUser?.uid || ''
        });

        normalized[idx] = {
          ...old,
          status: STATUS.VERIFIED,
          registrationStatus: 'Active',
          verifiedAt: now,
          paymentDetails: verifiedPayment,
          adminVerificationDocs: docsObj,
          transactionHistory: txHistory,
        };

        const overallStatus = computeOverallUserStatus(normalized);

        transaction.update(userRef, {
          ebikes: normalized,
          status: overallStatus,
        });
      });

      fetchRiders();
      Alert.alert('Verified', 'Rider registration is now fully verified.');
      setValidatorNotes('');
      setDetailModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not verify');
    }
  };

  const handleRejectRider = async () => {
    try {
      const role = adminRole || 'processing';
      const allowed =
        (role === 'processing' && (activeTab === STATUS.PENDING || activeTab === STATUS.RETURNED)) ||
        (role === 'validator' && (activeTab === STATUS.FOR_VALIDATION || activeTab === STATUS.FOR_INSPECTION));

      if (!allowed) return;

      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      const userRef = doc(db, 'users', selectedRider.userId);
      const rejectedAt = new Date();
      const reason = (role === 'validator' ? (validatorNotes || '').trim() : '').trim() || null;

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
          status: STATUS.REJECTED,
          rejectedAt,
          rejectedBy: auth.currentUser?.uid || '',
          rejectedReason: reason,

          returnReason: null,
          returnedAt: null,
          returnedBy: null,
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
      setValidatorNotes('');

      fetchRiders();
      Alert.alert('Notice', 'E-bike registration has been rejected');
    } catch (error) {
      console.error('Error rejecting:', error);
      Alert.alert('Error', `Could not reject: ${error.message}`);
    }
  };

  // ✅ COMBINED DOCS PREVIEW: saved (editable/remove) + new picked
  const renderCombinedDocsPreview = (mode = 'pending') => {
    const allowRemoveSaved = canEditAsProcessing && mode === 'pending';

    const hasSaved = (savedReceiptUrls?.length || 0) > 0 || (savedEbikeUrls?.length || 0) > 0;
    const hasNew = (receiptImages?.length || 0) > 0 || (ebikePhotoImages?.length || 0) > 0;

    if (!hasSaved && !hasNew) return null;

    const savedTitle = mode === 'renewal' ? 'Old Photos (Saved)' : 'Current (Saved)';
    const newTitle = mode === 'renewal' ? 'New Photos (Renewal)' : 'New Photos (Selected)';

    return (
      <View style={{ marginTop: 12 }}>
        {hasSaved && (
          <>
            <Text style={styles.auditSubTitle}>{savedTitle}</Text>

            {(savedReceiptUrls?.length || 0) > 0 && (
              <>
                <Text style={styles.docsMiniLabel}>Photo of the Receipt</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {savedReceiptUrls.map((url, i) => (
                    <View key={`saved_rec_${i}`} style={styles.imageContainer}>
                      <TouchableOpacity onPress={() => Linking.openURL(url)}>
                        <Image source={{ uri: url }} style={styles.documentImage} />
                      </TouchableOpacity>

                      {allowRemoveSaved && (
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImageGeneric(setSavedReceiptUrls, url)}
                          disabled={uploading}
                        >
                          <Feather name="x" size={16} color="white" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {(savedEbikeUrls?.length || 0) > 0 && (
              <>
                <Text style={[styles.docsMiniLabel, { marginTop: 10 }]}>E-bike Photo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {savedEbikeUrls.map((url, i) => (
                    <View key={`saved_eb_${i}`} style={styles.imageContainer}>
                      <TouchableOpacity onPress={() => Linking.openURL(url)}>
                        <Image source={{ uri: url }} style={styles.documentImage} />
                      </TouchableOpacity>

                      {allowRemoveSaved && (
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImageGeneric(setSavedEbikeUrls, url)}
                          disabled={uploading}
                        >
                          <Feather name="x" size={16} color="white" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        {hasNew && (
          <>
            <Text style={styles.auditSubTitle}>{newTitle}</Text>

            {(receiptImages?.length || 0) > 0 && (
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

            {(ebikePhotoImages?.length || 0) > 0 && (
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

  // ✅ INSPECTOR UI: grouped checklist with OK / NOT OK / N/A
  const renderInspectorChecklist = () => {
    const groups = CHECKLIST_ITEMS.reduce((acc, item) => {
      acc[item.group] = acc[item.group] || [];
      acc[item.group].push(item);
      return acc;
    }, {});

    const setValue = (key, val) => {
      setInspectionChecklist(prev => normalizeChecklistDefaults({ ...(prev || {}), [key]: val }));
    };

    const renderTriButtons = (key, current) => (
      <View style={styles.triBtnRow}>
        <TouchableOpacity
          style={[styles.triBtn, current === 'OK' && styles.triBtnOk]}
          onPress={() => setValue(key, 'OK')}
        >
          <Text style={[styles.triBtnText, current === 'OK' && styles.triBtnTextOn]}>OK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.triBtn, current === 'FAIL' && styles.triBtnFail]}
          onPress={() => setValue(key, 'FAIL')}
        >
          <Text style={[styles.triBtnText, current === 'FAIL' && styles.triBtnTextOn]}>NOT OK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.triBtn, current === 'NA' && styles.triBtnNa]}
          onPress={() => setValue(key, 'NA')}
        >
          <Text style={[styles.triBtnText, current === 'NA' && styles.triBtnTextOn]}>N/A</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Checklist</Text>
        <Text style={styles.auditHint}>
          Tip: Use <Text style={{ fontWeight: '800' }}>N/A</Text> for items that are not applicable to 2-wheel e-bikes (e.g., Window Wiper).
        </Text>

        {Object.keys(groups).map((groupName) => (
          <View key={groupName} style={{ marginBottom: 12 }}>
            <Text style={styles.auditSubTitle}>{groupName}</Text>

            {groups[groupName].map((item) => {
              const cur = inspectionChecklist?.[item.key] || (item.required ? '' : 'NA');
              const isMissingRequired = item.required && (!cur || cur === '');
              return (
                <View key={item.key} style={styles.checkItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkItemLabel}>
                      {item.label}
                      {item.required ? <Text style={{ color: '#F44336' }}> *</Text> : null}
                    </Text>
                    {isMissingRequired ? (
                      <Text style={styles.checkItemMissing}>Required</Text>
                    ) : null}
                  </View>

                  {renderTriButtons(item.key, cur)}
                </View>
              );
            })}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Inspector Notes (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Add remarks (optional)"
          value={inspectionNotes}
          onChangeText={setInspectionNotes}
          multiline
        />

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.rejectButton]}
            onPress={() => handleInspectorSetResult('FAILED')}
          >
            <Text style={styles.modalButtonText}>Failed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.verifyButton]}
            onPress={() => handleInspectorSetResult('PASSED')}
          >
            <Text style={styles.modalButtonText}>Passed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ RESTORED: Personal + E-bike info for Processing/Validator (and any non-inspector view)
  const renderNonInspectorInfo = () => {
    if (!selectedRider) return null;

    const catLabel =
      EBIKE_CATEGORIES.find(c => c.value === selectedEbike?.ebikeCategorySelected)?.label ||
      (selectedCategory ? (EBIKE_CATEGORIES.find(c => c.value === selectedCategory)?.label || 'N/A') : 'N/A');

    const plate =
      selectedEbike?.plateNumber ? String(selectedEbike.plateNumber).toUpperCase() :
        (manualPlateNumber ? String(manualPlateNumber).toUpperCase() : 'NO PLATE');

    return (
      <>
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>
              {(selectedRider.personalInfo?.firstName || '')} {(selectedRider.personalInfo?.lastName || '')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{selectedRider.email || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact No.:</Text>
            <Text style={styles.detailValue}>{selectedRider.personalInfo?.contactNumber || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Birthday:</Text>
            <Text style={styles.detailValue}>{formatMaybeDate(selectedRider.personalInfo?.birthday)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{selectedRider.personalInfo?.address || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>E-bike Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plate Number:</Text>
            <Text style={styles.detailValue}>{plate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Chassis/Motor No.:</Text>
            <Text style={styles.detailValue}>{selectedEbike?.chassisMotorNumber || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Brand:</Text>
            <Text style={styles.detailValue}>{selectedEbike?.ebikeBrand || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Model:</Text>
            <Text style={styles.detailValue}>{selectedEbike?.ebikeModel || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Color:</Text>
            <Text style={styles.detailValue}>{selectedEbike?.ebikeColor || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{catLabel}</Text>
          </View>

          {(selectedEbike?.inspectionResult || selectedEbike?.inspection?.result) ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Inspection:</Text>
              <Text style={styles.detailValue}>
                {selectedEbike?.inspectionResult || selectedEbike?.inspection?.result}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Government Valid ID / Driver’s License</Text>
          {(selectedRider.images && selectedRider.images.length > 0) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedRider.images.map((imageUrl, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => Linking.openURL(imageUrl)}
                >
                  <Image source={{ uri: imageUrl }} style={styles.documentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: '#7F8C8D', fontSize: 12 }}>No uploaded ID found.</Text>
          )}
        </View>
      </>
    );
  };

  const modalTitle = useMemo(() => {
    if (activeTab === INSPECT_TAB) return 'Inspect Rider';
    if (activeTab === STATUS.PENDING) return 'Rider Registration (Pending)';
    if (activeTab === STATUS.RETURNED) return 'Returned for Correction';
    if (activeTab === STATUS.FOR_VALIDATION) return 'For Validation (Validator Review)';
    if (activeTab === STATUS.FOR_INSPECTION) return 'For Inspection';
    if (activeTab === STATUS.VERIFIED) return 'Verified Rider Details';
    if (activeTab === STATUS.REJECTED) return 'Rejected Rider Details';
    return 'Rider Details';
  }, [activeTab]);

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
                setSavedReceiptUrls([]);
                setSavedEbikeUrls([]);

                setValidatorNotes('');

                setInspectionChecklist(normalizeChecklistDefaults({}));
                setInspectionNotes('');
              }}
            >
              <Feather name="x" size={24} color="#2C3E50" />
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>{modalTitle}</Text>

              {/* Select E-bike */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Select E-Bike Registration</Text>

                <TouchableOpacity
                  style={styles.categoryButton}
                  onPress={() => setShowEbikeModal(true)}
                >
                  <Text style={styles.categoryButtonText}>
                    {selectedEbike
                      ? (
                        (manualPlateNumber || selectedEbike?.plateNumber)
                          ? String(manualPlateNumber || selectedEbike.plateNumber).toUpperCase()
                          : 'NO PLATE'
                      )
                      : 'Select E-Bike'}
                  </Text>
                  <Feather name="chevron-down" size={20} color="#2E7D32" />
                </TouchableOpacity>

                <Text style={{ color: '#7F8C8D', fontSize: 12 }}>
                  Showing {activeTab} registrations only. If you want other status, switch tab.
                </Text>
              </View>

              {/* ✅ RESTORED INFO FOR PROCESSING + VALIDATOR (NON-INSPECTOR) */}
              {!canActAsInspector && renderNonInspectorInfo()}

              {/* ✅ INSPECTOR VIEW (ONLY) */}
              {canActAsInspector && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Personal and E-Bike Information</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name:</Text>
                      <Text style={styles.detailValue}>
                        {selectedRider.personalInfo.firstName} {selectedRider.personalInfo.lastName}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Chassis/Motor Number:</Text>
                      <Text style={styles.detailValue}>{selectedEbike?.chassisMotorNumber || ''}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Brand:</Text>
                      <Text style={styles.detailValue}>{selectedEbike?.ebikeBrand || ''}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Model:</Text>
                      <Text style={styles.detailValue}>{selectedEbike?.ebikeModel || ''}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Color:</Text>
                      <Text style={styles.detailValue}>{selectedEbike?.ebikeColor || ''}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Category:</Text>
                      <Text style={styles.detailValue}>
                        {EBIKE_CATEGORIES.find(c => c.value === selectedEbike?.ebikeCategorySelected)?.label || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Plate Number:</Text>
                      <Text style={styles.detailValue}>
                        {selectedEbike?.plateNumber ? String(selectedEbike.plateNumber).toUpperCase() : 'NO PLATE'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Current Result:</Text>
                      <Text style={styles.detailValue}>
                        {selectedEbike?.inspectionResult || selectedEbike?.inspection?.result || 'PENDING'}
                      </Text>
                    </View>

                    {(selectedEbike?.inspection?.inspectedAt || selectedEbike?.inspection?.inspectedBy) ? (
                      <Text style={{ marginTop: 8, color: '#7F8C8D', fontSize: 12 }}>
                        Last inspection: {formatDate(selectedEbike?.inspection?.inspectedAt)} • {selectedEbike?.inspection?.inspectedBy ? `By: ${selectedEbike.inspection.inspectedBy}` : ''}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Government Valid ID / Driver’s License</Text>
                    {(selectedRider.images && selectedRider.images.length > 0) ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedRider.images.map((imageUrl, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => Linking.openURL(imageUrl)}
                          >
                            <Image source={{ uri: imageUrl }} style={styles.documentImage} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={{ color: '#7F8C8D', fontSize: 12 }}>No uploaded ID found.</Text>
                    )}
                  </View>

                  {renderInspectorChecklist()}
                </>
              )}

              {/* ✅ KEEP processing UI */}
              {canEditAsProcessing && (
                <>
                  {/* ✅ Plate Number input (Pending/Returned) */}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Plate Number (Required)</Text>
                    <Text style={styles.auditHint}>Format: AB1234 (2 letters + 4 numbers)</Text>

                    <TextInput
                      style={[
                        styles.input,
                        manualPlateError ? { borderColor: '#F44336' } : null
                      ]}
                      placeholder="e.g., AB1234"
                      autoCapitalize="characters"
                      value={manualPlateNumber}
                      maxLength={6}
                      onChangeText={(t) => {
                        const cleaned = (t || '')
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, '')
                          .slice(0, 6);

                        setManualPlateNumber(cleaned);
                        setManualPlateError('');

                        // show error only when complete length but invalid
                        if (cleaned.length === 6 && !PLATE_REGEX.test(cleaned)) {
                          setManualPlateError('Format must be 2 letters + 4 numbers (e.g., AB1234)');
                        }
                      }}
                      editable={!uploading}
                    />

                    {manualPlateError ? (
                      <Text style={styles.errorText}>{manualPlateError}</Text>
                    ) : null}
                  </View>

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
                    <Text style={styles.sectionTitle}>Payment (Processing)</Text>
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
                          if (selectedDate) {
                            const iso = selectedDate.toISOString().split('T')[0];
                            setRegisteredDateInput(iso);

                            // ✅ auto renewal +1 year
                            const auto = addYearsISO(iso, 1);
                            if (auto) setRenewalDateInput(auto);
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

                    {/* Renewal Date is automatic; no manual picker */}
                    <View style={[styles.dateButton, styles.dateButtonDisabled]}>
                      <Feather name="calendar" size={20} color="#2E7D32" />
                      <Text style={styles.dateButtonText}>
                        {renewalDateInput
                          ? new Date(renewalDateInput).toLocaleDateString()
                          : (registeredDateInput ? new Date(addYearsISO(registeredDateInput, 1)).toLocaleDateString() : 'Auto Renewal Date (select Registered Date)')}
                      </Text>
                    </View>
                    <Text style={styles.auditHint}>Renewal Date is automatically set to 1 year after Registered Date.</Text>

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
                      onPress={handleSendForValidation}
                      disabled={uploading}
                    >
                      <Text style={styles.modalButtonText}>
                        {uploading ? 'Uploading...' : 'Send for Validation'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {(adminRole === 'validator' && activeTab === STATUS.FOR_VALIDATION) && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Validator Review</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plate:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike?.plateNumber ? String(selectedEbike.plateNumber).toUpperCase() : 'NO PLATE'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>
                      {EBIKE_CATEGORIES.find(c => c.value === selectedEbike?.ebikeCategorySelected)?.label || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment:</Text>
                    <Text style={styles.detailValue}>
                      ₱{Number(selectedEbike?.paymentDetails?.amount || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registered:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedEbike?.registeredDate)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Renewal:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedEbike?.renewalDate)}</Text>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.auditSubTitle}>Current (Saved)</Text>
                    {Array.isArray(selectedEbike?.adminVerificationDocs?.receipt) && selectedEbike.adminVerificationDocs.receipt.length > 0 && (
                      <>
                        <Text style={styles.docsMiniLabel}>Photo of the Receipt</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {selectedEbike.adminVerificationDocs.receipt.map((url, i) => (
                            <TouchableOpacity key={`v_rec_${i}`} onPress={() => Linking.openURL(url)}>
                              <Image source={{ uri: url }} style={styles.documentImage} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}

                    {Array.isArray(selectedEbike?.adminVerificationDocs?.ebikePhotos) && selectedEbike.adminVerificationDocs.ebikePhotos.length > 0 && (
                      <>
                        <Text style={[styles.docsMiniLabel, { marginTop: 10 }]}>E-bike Photo</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {selectedEbike.adminVerificationDocs.ebikePhotos.map((url, i) => (
                            <TouchableOpacity key={`v_eb_${i}`} onPress={() => Linking.openURL(url)}>
                              <Image source={{ uri: url }} style={styles.documentImage} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </>
                    )}
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Notes (for Return/Reject)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Type reason / notes here"
                    value={validatorNotes}
                    onChangeText={setValidatorNotes}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.rejectButton]}
                      onPress={handleRejectRider}
                    >
                      <Text style={styles.modalButtonText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelRenewButton]}
                      onPress={handleReturnToProcessing}
                    >
                      <Text style={styles.modalButtonText}>Return</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.verifyButton]}
                      onPress={handleApproveForInspection}
                    >
                      <Text style={styles.modalButtonText}>Approve for Inspection</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {(adminRole === 'validator' && activeTab === STATUS.FOR_INSPECTION) && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>For Inspection</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plate:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike?.plateNumber ? String(selectedEbike.plateNumber).toUpperCase() : 'NO PLATE'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Inspection Result:</Text>
                    <Text style={styles.detailValue}>
                      {selectedEbike?.inspectionResult || selectedEbike?.inspection?.result || 'PENDING'}
                    </Text>
                  </View>

                  {renderValidatorVerificationPhotos()}

                  <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Notes (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Notes"
                    value={validatorNotes}
                    onChangeText={setValidatorNotes}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelRenewButton]}
                      onPress={handleReturnToProcessing}
                    >
                      <Text style={styles.modalButtonText}>Return</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.verifyButton]}
                      onPress={handleFinalVerify}
                    >
                      <Text style={styles.modalButtonText}>Verify (Final)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </ScrollView>

            {/* EBike selector sheet */}
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

            {/* Category mini-sheet (processing only) */}
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

  if (roleLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: '#2C3E50' }}>Loading role…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabStatus = getTabStatusFilter(activeTab);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
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

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Rider Management
          </Text>

          <View style={[styles.headerSideRight, { width: headerLeftW || DEFAULT_SIDE_W }]} />
        </View>

        <View style={styles.tabContainer}>
          {allowedTabs.map(tab => (
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
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText
                ]}
                numberOfLines={1}
              >
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
            const tabEbikes = (item.ebikes || []).filter(e => {
              const ok = (e?.status || item.status) === tabStatus;
              if (!ok) return false;

              if (activeTab === INSPECT_TAB) {
                return needsInspection(e);
              }
              return true;
            });

            const firstPlate = tabEbikes[0]?.plateNumber
              ? String(tabEbikes[0].plateNumber).toUpperCase()
              : 'NO PLATE';
            const more = tabEbikes.length > 1 ? ` (+${tabEbikes.length - 1} more)` : '';

            const firstE = tabEbikes[0] || null;
            const ebikeSummary = firstE
              ? `${firstE.ebikeBrand || 'N/A'}${firstE.ebikeModel ? ` • ${firstE.ebikeModel}` : ''}`
              : 'N/A';

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

                    <Text style={styles.tableCell}>
                      {firstPlate}{more}
                    </Text>

                    {activeTab !== INSPECT_TAB ? (
                      <>
                        <Text style={styles.subInfoText}>
                          Contact: {item.personalInfo?.contactNumber || 'N/A'}
                        </Text>
                        <Text style={styles.subInfoText}>
                          E-bike: {ebikeSummary}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.subInfoText}>
                        Inspection: {tabEbikes?.[0]?.inspectionResult || tabEbikes?.[0]?.inspection?.result || 'PENDING'}
                      </Text>
                    )}
                  </View>

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
    fontWeight: '600',
    fontSize: 12
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
  subInfoText: {
    fontSize: 12 * RESPONSIVE.width,
    color: '#7F8C8D',
    marginBottom: 2
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

  auditHint: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 10
  },
  auditSubTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#2C3E50'
  },

  docsMiniLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },

  errorText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '800',
    marginTop: -6,
    marginBottom: 6,
  },

  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA'
  },
  checkItemLabel: {
    color: '#2C3E50',
    fontSize: 13,
    fontWeight: '700',
  },
  checkItemMissing: {
    color: '#F44336',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700'
  },
  triBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  triBtn: {
    borderWidth: 1,
    borderColor: '#DADADA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  triBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2C3E50',
  },
  triBtnTextOn: {
    color: '#FFFFFF',
  },
  triBtnOk: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  triBtnFail: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  triBtnNa: {
    backgroundColor: '#95A5A6',
    borderColor: '#95A5A6',
  },
});

export default RiderScreen;
