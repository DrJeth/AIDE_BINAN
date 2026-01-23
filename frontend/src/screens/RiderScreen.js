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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EBIKE_CATEGORIES = [
  { label: 'CATEGORY L1A', value: 'L1A' },
  { label: 'CATEGORY L1B', value: 'L1B' },
  { label: 'CATEGORY L2A', value: 'L2A' },
  { label: 'CATEGORY L2B', value: 'L2B' },
];

// Payment Status options
const PAYMENT_STATUSES = [
  { label: 'Paid', value: 'Paid' },
  { label: 'Not Paid', value: 'Not Paid' },
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

/** NEW 4-TAB FLOW ONLY */
const STATUS = {
  PENDING: 'Pending',
  INSPECT: 'Inspect',
  PENDING_COMPLIANCE: 'Pending Compliance',
  REGISTERED: 'Registered',
};

const INSPECT_TAB = STATUS.INSPECT;

// 4 tabs only
const ALL_ADMIN_TABS = [
  STATUS.PENDING,
  INSPECT_TAB,
  STATUS.PENDING_COMPLIANCE,
  STATUS.REGISTERED,
];

const TABS_BY_ROLE = {
  processing: ALL_ADMIN_TABS,
  validator: ALL_ADMIN_TABS,  // role can remain, but flow is still 4 tabs
  inspector: ALL_ADMIN_TABS,
};

// map ONLY your 4 stages
const mapStatusToStage = (rawStatus) => {
  const s = (rawStatus || '').toString().trim().toLowerCase();

  if (!s || s === STATUS.PENDING.toLowerCase()) return STATUS.PENDING;
  if (s === STATUS.INSPECT.toLowerCase()) return STATUS.INSPECT;
  if (s === STATUS.PENDING_COMPLIANCE.toLowerCase()) return STATUS.PENDING_COMPLIANCE;
  if (s === STATUS.REGISTERED.toLowerCase()) return STATUS.REGISTERED;

  return STATUS.PENDING;
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

// get today's date in YYYY-MM-DD using LOCAL time (safe for Manila timezone)
const getTodayISO = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// add years to YYYY-MM-DD safely (UTC-based to avoid TZ shifting)
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

// helper: convert ISO (YYYY-MM-DD) to Date (UTC midnight)
const isoToUTCDate = (isoDate) => {
  const parts = String(isoDate || '').split('-').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return isNaN(dt.getTime()) ? null : dt;
};

// inspector list should only show those still needing inspection
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
  { key: 'gov_id', label: "Copy of Government Valid ID / Driver’s License", group: 'Documents', required: true },

  { key: 'head_light', label: 'Head Light', group: 'Lights & Signals', required: true },
  { key: 'brake_light', label: 'Brake Light', group: 'Lights & Signals', required: true },
  { key: 'signal_light', label: 'Signal Light', group: 'Lights & Signals', required: true },

  { key: 'side_mirror', label: 'Side Mirror', group: 'Safety & Condition', required: true },
  { key: 'tire_condition', label: 'Tire (Good Condition)', group: 'Safety & Condition', required: true },

  { key: 'shock_absorber', label: 'Shock Absorber (Good Condition)', group: 'Safety & Condition', required: true },
  { key: 'motor_condition', label: 'Motor (Good Condition)', group: 'Safety & Condition', required: true },
  { key: 'wheel_bearings', label: 'Wheel Bearings', group: 'Safety & Condition', required: true },
  { key: 'seats', label: 'Seats (Driver and Passenger)', group: 'Safety & Condition', required: true },

  // NOTE: treated as "exempt" in pass/fail logic
  { key: 'trash_can', label: 'Trash Can', group: 'Optional / If Applicable', required: true },
  { key: 'window_wiper', label: 'Window Wiper', group: 'Optional / If Applicable', required: true },
];

const CHECKLIST_ALLOWED_VALUES = ['OK', 'FAIL', 'NA'];
const PASS_FAIL_EXEMPT_FAIL_KEYS = new Set(['trash_can', 'window_wiper']);

const normalizeChecklistValue = (v) => {
  const s = (v ?? '').toString().trim().toUpperCase();
  if (!s) return '';
  if (s === 'OK' || s === 'PASS' || s === 'PASSED') return 'OK';
  if (s === 'NA' || s === 'N/A' || s === 'NOT APPLICABLE') return 'NA';
  if (s === 'FAIL' || s === 'FAILED' || s === 'NOT OK' || s === 'NOTOK') return 'FAIL';
  return s;
};

const normalizeChecklistDefaults = (incoming = {}) => {
  const out = { ...(incoming || {}) };

  CHECKLIST_ITEMS.forEach((it) => {
    const hasKey = Object.prototype.hasOwnProperty.call(out, it.key);
    const v = hasKey ? out[it.key] : undefined;

    if (!hasKey || v === null || v === undefined) out[it.key] = '';
    out[it.key] = normalizeChecklistValue(out[it.key]);
  });

  return out;
};

/* =========================
   URL / STORAGE HELPERS
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

  try {
    const dl = await getDownloadURL(ref(storage, s));
    return dl;
  } catch {
    return null;
  }
};

const decodeLoose = (s) => {
  const raw = String(s || '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const gatherDocCandidates = (data = {}) => {
  const d = data || {};
  const raw = [
    ...coerceStringArray(d.url),
    ...coerceStringArray(d.downloadURL),
    ...coerceStringArray(d.downloadUrl),
    ...coerceStringArray(d.imageUrl),
    ...coerceStringArray(d.imageURL),
    ...coerceStringArray(d.uri),
    ...coerceStringArray(d.urls),
    ...coerceStringArray(d.path),
    ...coerceStringArray(d.storagePath),
    ...coerceStringArray(d.storageUri),
    ...coerceStringArray(d.gsUrl),
    ...coerceStringArray(d.gsURL),
  ];
  return Array.from(new Set(raw.map(safeTrim).filter(Boolean)));
};

const looksLikeFromText = (text, words = []) => {
  const t = (text || '').toString().toLowerCase();
  return words.some(w => t.includes(w));
};

// collect docs separately (GovID vs Receipt vs E-bike)
const collectUploadsCandidates = (userData = {}, imageDocs = []) => {
  const gov = [];
  const receipt = [];
  const ebike = [];

  (imageDocs || []).forEach((docItem) => {
    const d = docItem || {};
    const typeText = (d.type || d.docType || d.category || d.group || d.kind || '').toString().toLowerCase();

    const candidates = gatherDocCandidates(d);
    const candidatesJoined = decodeLoose(candidates.join(' ')).toLowerCase();

    const isReceipt =
      looksLikeFromText(typeText, ['receipt', 'payment', 'proof']) ||
      looksLikeFromText(candidatesJoined, ['receipt', 'payment', 'proof']);

    const isEbike =
      looksLikeFromText(typeText, ['ebike', 'e-bike', 'bike', 'vehicle', 'unit', 'motor']) ||
      looksLikeFromText(candidatesJoined, ['ebike', 'e-bike', 'ebike_photo', 'bike', 'vehicle']);

    const isId =
      looksLikeFromText(typeText, ['gov', 'valid', 'id', 'license', 'driver']) ||
      looksLikeFromText(candidatesJoined, ['gov', 'valid', 'id', 'license', 'driver']);

    // Priority: receipt > ebike > id
    if (isReceipt) receipt.push(...candidates);
    else if (isEbike) ebike.push(...candidates);
    else if (isId || !typeText) gov.push(...candidates);
  });

  // accept old user fields for gov-id
  gov.push(
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

  receipt.push(
    ...coerceStringArray(userData.receiptUrl),
    ...coerceStringArray(userData.receiptUrls),
    ...coerceStringArray(userData.paymentReceiptUrl),
    ...coerceStringArray(userData.paymentProofUrl),
  );

  ebike.push(
    ...coerceStringArray(userData.ebikePhotoUrl),
    ...coerceStringArray(userData.ebikePhotoUrls),
    ...coerceStringArray(userData.ebikePhotos),
  );

  const uniq = (arr) => Array.from(new Set(arr.map(safeTrim).filter(Boolean)));

  return {
    gov: uniq(gov),
    receipt: uniq(receipt),
    ebike: uniq(ebike),
  };
};

const birthdayToInput = (v) => {
  const d = toJSDate(v);
  if (d) return d.toISOString().split('T')[0];
  const s = String(v || '').trim();
  return s;
};

const parseBirthdayForSave = (input) => {
  const s = String(input || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!isNaN(dt.getTime())) return dt;
  }
  return s;
};

// normalize Paid/Not Paid across old/new records
const normalizePaymentStatus = (paymentDetails) => {
  const pd = paymentDetails || {};
  const raw = (pd.status || pd.paymentStatus || pd.paidStatus || '').toString().trim();
  if (raw) {
    const low = raw.toLowerCase();
    if (low === 'paid') return 'Paid';
    if (low === 'not paid' || low === 'unpaid' || low === 'notpaid') return 'Not Paid';
  }
  const amt = Number(pd.amount);
  if (Number.isFinite(amt)) return amt > 0 ? 'Paid' : 'Not Paid';
  return '';
};

const isPaymentPaid = (paymentDetails) => normalizePaymentStatus(paymentDetails) === 'Paid';

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

  const [savedReceiptUrls, setSavedReceiptUrls] = useState([]);
  const [savedEbikeUrls, setSavedEbikeUrls] = useState([]);

  const [receiptImages, setReceiptImages] = useState([]);
  const [ebikePhotoImages, setEbikePhotoImages] = useState([]);

  const [paymentStatus, setPaymentStatus] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  const [manualPlateNumber, setManualPlateNumber] = useState('');
  const [manualPlateError, setManualPlateError] = useState('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEbikeModal, setShowEbikeModal] = useState(false);

  const [inspectionChecklist, setInspectionChecklist] = useState(normalizeChecklistDefaults({}));
  const [inspectionNotes, setInspectionNotes] = useState('');

  const DEFAULT_SIDE_W = 90 * RESPONSIVE.width;
  const [headerLeftW, setHeaderLeftW] = useState(DEFAULT_SIDE_W);

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState(null);

  // used for "Reject" deletion now (Pending Compliance) — UI removed, but safe to keep
  const [deletingRecord, setDeletingRecord] = useState(false);

  // editable fields in Pending + Pending Compliance
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const [editEbikeBrand, setEditEbikeBrand] = useState('');
  const [editEbikeModel, setEditEbikeModel] = useState('');
  const [editEbikeColor, setEditEbikeColor] = useState('');
  const [editChassisMotorNumber, setEditChassisMotorNumber] = useState('');
  const [editBranch, setEditBranch] = useState('');

  const openImageViewer = (url) => {
    const u = (url || '').toString().trim();
    if (!u) return;
    setImageViewerUrl(u);
    setImageViewerVisible(true);
  };

  const renderImageViewerModal = () => (
    <Modal
      transparent
      animationType="fade"
      visible={imageViewerVisible}
      onRequestClose={() => setImageViewerVisible(false)}
    >
      <View style={styles.imageViewerOverlay}>
        <TouchableOpacity
          style={styles.imageViewerClose}
          onPress={() => setImageViewerVisible(false)}
        >
          <Feather name="x" size={26} color="#fff" />
        </TouchableOpacity>

        {!!imageViewerUrl && (
          <Image
            source={{ uri: imageViewerUrl }}
            style={styles.imageViewerImage}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );

  const allowedTabs = useMemo(() => {
    const role = adminRole || 'processing';
    return TABS_BY_ROLE[role] || ALL_ADMIN_TABS;
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
        else if (raw.includes('inspect')) setAdminRole('inspector');
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

  /** permissions by TAB */
  const canEditAsProcessing =
    (activeTab === STATUS.PENDING || activeTab === STATUS.PENDING_COMPLIANCE);

  const canEditPersonalAndEbike =
    (activeTab === STATUS.PENDING || activeTab === STATUS.PENDING_COMPLIANCE);

  const canActAsInspector =
    (activeTab === INSPECT_TAB || activeTab === STATUS.PENDING_COMPLIANCE);

  const computeOverallUserStatus = (ebikes = []) => {
    const stages = (ebikes || [])
      .map(e => mapStatusToStage(e?.status))
      .filter(Boolean);

    if (stages.includes(STATUS.PENDING)) return STATUS.PENDING;
    if (stages.includes(STATUS.INSPECT)) return STATUS.INSPECT;
    if (stages.includes(STATUS.PENDING_COMPLIANCE)) return STATUS.PENDING_COMPLIANCE;

    if (stages.length > 0 && stages.every(s => s === STATUS.REGISTERED)) {
      return STATUS.REGISTERED;
    }

    return STATUS.PENDING;
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

        adminVerificationDocs: e?.adminVerificationDocs || null,

        inspectionResult: e?.inspectionResult || e?.inspection?.result || null,
        inspection: e?.inspection || null,

        inspectionFailedKeys: Array.isArray(e?.inspectionFailedKeys) ? e.inspectionFailedKeys : null,

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

      adminVerificationDocs: userData?.adminVerificationDocs || null,
      transactionHistory: Array.isArray(userData?.transactionHistory) ? userData.transactionHistory : [],
      adminVerificationImages: Array.isArray(userData?.adminVerificationImages) ? userData.adminVerificationImages : [],
      paymentDetails: userData?.paymentDetails || null,
      createdAt: userData?.createdAt || null,

      inspectionResult: userData?.inspectionResult || userData?.inspection?.result || null,
      inspection: userData?.inspection || null,

      inspectionFailedKeys: Array.isArray(userData?.inspectionFailedKeys) ? userData.inspectionFailedKeys : null,
    }];
  };

  const getEbikeStage = (ebike, userDataStatus) => {
    const st = ebike?.status || userDataStatus || STATUS.PENDING;
    return mapStatusToStage(st);
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

        // collect uploads (gov id / receipt / ebike) from riderRegistrations subcollection
        let riderUploads = { gov: [], receipt: [], ebike: [] };

        try {
          const imagesColRef = collection(db, 'riderRegistrations', userDoc.id, 'images');
          const imagesSnap = await getDocs(imagesColRef);
          const imageDocs = imagesSnap.docs.map(d => d.data() || {});

          const raw = collectUploadsCandidates(userData, imageDocs);

          const [govResolved, recResolved, ebResolved] = await Promise.all([
            Promise.all((raw.gov || []).map(resolveStorageUrlMaybe)),
            Promise.all((raw.receipt || []).map(resolveStorageUrlMaybe)),
            Promise.all((raw.ebike || []).map(resolveStorageUrlMaybe)),
          ]);

          riderUploads = {
            gov: (govResolved || []).filter(Boolean),
            receipt: (recResolved || []).filter(Boolean),
            ebike: (ebResolved || []).filter(Boolean),
          };
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

          // keep legacy name `images` for Gov ID section
          images: riderUploads.gov || [],
          riderUploads,
          ebikes,
        };
      }));

      const ridersForTab = riderData.filter(r => {
        const list = r.ebikes || [];
        return list.some(e => {
          const stage = getEbikeStage(e, r.status);

          if (activeTab === INSPECT_TAB) {
            return stage === STATUS.INSPECT && needsInspection(e);
          }
          return stage === activeTab;
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

    return (selectedRider.ebikes || []).filter(e => {
      const stage = getEbikeStage(e, selectedRider.status);

      if (activeTab === INSPECT_TAB) {
        return stage === STATUS.INSPECT && needsInspection(e);
      }
      return stage === activeTab;
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

  // prefill rider-uploaded receipt/ebike photos so they show under Upload buttons
  const prefillFormFromEbike = (ebike, rider = selectedRider) => {
    setReceiptImages([]);
    setEbikePhotoImages([]);

    const sr = Array.isArray(ebike?.adminVerificationDocs?.receipt) ? ebike.adminVerificationDocs.receipt : [];
    const se = Array.isArray(ebike?.adminVerificationDocs?.ebikePhotos) ? ebike.adminVerificationDocs.ebikePhotos : [];

    const riderReceipt = Array.isArray(rider?.riderUploads?.receipt) ? rider.riderUploads.receipt : [];
    const riderEbike = Array.isArray(rider?.riderUploads?.ebike) ? rider.riderUploads.ebike : [];

    setSavedReceiptUrls(Array.from(new Set([...(sr || []), ...(riderReceipt || [])])).filter(Boolean));
    setSavedEbikeUrls(Array.from(new Set([...(se || []), ...(riderEbike || [])])).filter(Boolean));

    setManualPlateError('');

    setSelectedCategory(ebike?.ebikeCategorySelected || '');
    setPaymentStatus(normalizePaymentStatus(ebike?.paymentDetails));
    setManualPlateNumber(ebike?.plateNumber ? String(ebike.plateNumber).toUpperCase() : '');

    // editable personal info
    setEditFirstName((rider?.personalInfo?.firstName || '').toString());
    setEditLastName((rider?.personalInfo?.lastName || '').toString());
    setEditContactNumber((rider?.personalInfo?.contactNumber || '').toString());
    setEditBirthday(birthdayToInput(rider?.personalInfo?.birthday));
    setEditAddress((rider?.personalInfo?.address || '').toString());

    // editable e-bike info
    setEditEbikeBrand((ebike?.ebikeBrand || '').toString());
    setEditEbikeModel((ebike?.ebikeModel || '').toString());
    setEditEbikeColor((ebike?.ebikeColor || '').toString());
    setEditChassisMotorNumber((ebike?.chassisMotorNumber || '').toString());
    setEditBranch((ebike?.branch || '').toString());

    const incomingChecklist = ebike?.inspection?.checklist || {};
    setInspectionChecklist(normalizeChecklistDefaults(incomingChecklist));
    setInspectionNotes((ebike?.inspection?.notes || '').toString());
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const queryText = text.toLowerCase();

    const filtered = riders.filter(r => {
      const fn = (r.personalInfo?.firstName || '').toLowerCase();
      const ln = (r.personalInfo?.lastName || '').toLowerCase();

      const tabEbikes = (r.ebikes || []).filter(e => {
        const stage = getEbikeStage(e, r.status);

        if (activeTab === INSPECT_TAB) {
          return stage === STATUS.INSPECT && needsInspection(e);
        }
        return stage === activeTab;
      });

      const anyPlateMatch = tabEbikes.some(e =>
        (e?.plateNumber || '').toString().toLowerCase().includes(queryText)
      );

      return fn.includes(queryText) || ln.includes(queryText) || anyPlateMatch;
    });

    setFilteredRiders(filtered);
  };

  const showRiderDetails = (rider) => {
    setSelectedRider(rider);

    const list = (rider.ebikes || []).filter(e => {
      const stage = getEbikeStage(e, rider.status);

      if (activeTab === INSPECT_TAB) {
        return stage === STATUS.INSPECT && needsInspection(e);
      }
      return stage === activeTab;
    });

    const first = list[0] || (rider.ebikes || [])[0] || null;

    setSelectedEbikeId(first ? first.id : null);
    prefillFormFromEbike(first, rider);

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

  // ✅ INSPECT TAB ONLY: show saved receipt & ebike photos
  const renderSavedVerificationPhotos = () => {
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
                <TouchableOpacity key={`fi_rec_${i}`} onPress={() => openImageViewer(url)}>
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
                <TouchableOpacity key={`fi_eb_${i}`} onPress={() => openImageViewer(url)}>
                  <Image source={{ uri: url }} style={styles.documentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    );
  };

  const renderReadOnlyVerificationDocs = () => {
    if (!selectedEbike) return null;

    const receipt = Array.isArray(selectedEbike?.adminVerificationDocs?.receipt)
      ? selectedEbike.adminVerificationDocs.receipt.filter(Boolean)
      : [];

    const ebike = Array.isArray(selectedEbike?.adminVerificationDocs?.ebikePhotos)
      ? selectedEbike.adminVerificationDocs.ebikePhotos.filter(Boolean)
      : [];

    if (receipt.length === 0 && ebike.length === 0) {
      return (
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Verification Photos</Text>
          <Text style={{ color: '#7F8C8D', fontSize: 12 }}>
            No uploaded receipt/e-bike photos found.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Verification Photos</Text>

        {receipt.length > 0 && (
          <>
            <Text style={styles.docsMiniLabel}>Photo of the Receipt</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {receipt.map((url, i) => (
                <TouchableOpacity key={`ver_rec_${i}`} onPress={() => openImageViewer(url)}>
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
                <TouchableOpacity key={`ver_eb_${i}`} onPress={() => openImageViewer(url)}>
                  <Image source={{ uri: url }} style={styles.documentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    );
  };

  /** Finalize register when PASSED */
  const finalizeRegisterFromInspection = async ({ cleanedChecklist, notes }) => {
    if (!selectedRider?.userId || !selectedEbikeId) {
      Alert.alert('Error', 'No rider / e-bike selected');
      return;
    }

    const plate = (selectedEbike?.plateNumber || '').toString().trim().toUpperCase();
    if (!plate || !PLATE_REGEX.test(plate)) {
      Alert.alert('Missing Plate Number', 'Please go back to Pending / Pending Compliance to fix plate number.');
      return;
    }

    const cat = selectedEbike?.ebikeCategorySelected;
    const paid = isPaymentPaid(selectedEbike?.paymentDetails);

    if (!cat || !paid) {
      Alert.alert('Missing data', 'Please complete category and set Payment Status to Paid first.');
      return;
    }

    const regISO = getTodayISO();
    const renISO = addYearsISO(regISO, 1);
    const regD = isoToUTCDate(regISO);
    const renD = isoToUTCDate(renISO);

    if (!regD || !renD) {
      Alert.alert('Error', 'Could not generate registration/renewal dates. Please try again.');
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
        status: 'Paid',
        verifiedBy: auth.currentUser?.uid || '',
        verifiedAt: now,
        type: 'Registration'
      };

      let txHistory = Array.isArray(old?.transactionHistory) ? [...old.transactionHistory] : [];
      txHistory.push({
        type: 'Registration',
        registeredDate: regD,
        renewalDate: renD,
        paymentDetails: verifiedPayment,
        adminVerificationDocs: docsObj,
        createdAt: now,
        createdBy: auth.currentUser?.uid || ''
      });

      normalized[idx] = {
        ...old,
        status: STATUS.REGISTERED,
        registrationStatus: 'Active',
        verifiedAt: now,

        registeredDate: regD,
        renewalDate: renD,

        inspectionResult: 'PASSED',
        inspection: {
          result: 'PASSED',
          checklist: cleanedChecklist,
          notes: (notes || '').trim(),
          inspectedAt: now,
          inspectedBy: auth.currentUser?.uid || '',
        },

        inspectionFailedKeys: null,

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
  };

  /** Inspect result handler (Inspect tab)
   *  Buttons only in INSPECT tab
   */
  const handleInspectorSetResult = async (result) => {
    try {
      if (!canActAsInspector) return;
      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      const now = new Date();
      const cleanedChecklist = normalizeChecklistDefaults(inspectionChecklist || {});

      const keysFromRecord = Array.isArray(selectedEbike?.inspectionFailedKeys)
        ? selectedEbike.inspectionFailedKeys.filter(Boolean)
        : [];

      const requiredKeys = (activeTab === STATUS.PENDING_COMPLIANCE && keysFromRecord.length > 0)
        ? keysFromRecord
        : CHECKLIST_ITEMS.map(i => i.key);

      const unanswered = requiredKeys.filter((k) => {
        const v = normalizeChecklistValue(cleanedChecklist[k]);
        return !CHECKLIST_ALLOWED_VALUES.includes(v);
      });

      if (unanswered.length > 0) {
        Alert.alert('Checklist required', 'Please answer the required checklist items (OK / NOT OK / N/A).');
        return;
      }

      if (String(result).toUpperCase() === 'PASSED') {
        const blockingFails = CHECKLIST_ITEMS.filter((i) => {
          const v = normalizeChecklistValue(cleanedChecklist[i.key]);
          return v === 'FAIL' && !PASS_FAIL_EXEMPT_FAIL_KEYS.has(i.key);
        });

        if (blockingFails.length > 0) {
          Alert.alert(
            'Cannot Pass',
            'There are checklist items marked NOT OK. Only Trash Can and Window Wiper can be NOT OK and still PASS.'
          );
          return;
        }

        await finalizeRegisterFromInspection({
          cleanedChecklist,
          notes: inspectionNotes || '',
        });

        Alert.alert('Saved', 'Inspection PASSED. Rider is now Registered (dates auto-set).');
        setDetailModalVisible(false);
        return;
      }

      if (String(result).toUpperCase() === 'FAILED') {
        const failedNonExemptKeys = requiredKeys.filter((k) => {
          const v = normalizeChecklistValue(cleanedChecklist[k]);
          return v === 'FAIL' && !PASS_FAIL_EXEMPT_FAIL_KEYS.has(k);
        });

        if (failedNonExemptKeys.length === 0) {
          Alert.alert(
            'Cannot Fail',
            'All required items are OK/N/A, or the only NOT OK items are optional (Trash Can / Window Wiper). Please mark as PASSED or set at least one required item to NOT OK.'
          );
          return;
        }

        const failedKeys = CHECKLIST_ITEMS
          .filter((i) => requiredKeys.includes(i.key))
          .filter((i) => {
            const v = normalizeChecklistValue(cleanedChecklist[i.key]);
            return v === 'FAIL' && !PASS_FAIL_EXEMPT_FAIL_KEYS.has(i.key);
          })
          .map((i) => i.key);

        if (failedKeys.length === 0) {
          Alert.alert('Cannot Fail', 'No valid failed (required) items detected. Please mark PASSED instead.');
          return;
        }

        await updateSelectedEbikeStatus(STATUS.PENDING_COMPLIANCE, {
          inspectionResult: 'FAILED',
          inspection: {
            result: 'FAILED',
            checklist: cleanedChecklist,
            notes: (inspectionNotes || '').trim(),
            inspectedAt: now,
            inspectedBy: auth.currentUser?.uid || '',
          },
          inspectionFailedKeys: failedKeys,
        });

        Alert.alert('Saved', 'Moved to Pending Compliance for correction & re-check.');
        setDetailModalVisible(false);
        return;
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not save inspection result');
    }
  };

  /** Pending -> Inspect */
  const handleSendToInspect = async () => {
    try {
      if (!canEditAsProcessing) return;
      if (activeTab !== STATUS.PENDING) return;

      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      if (!selectedCategory) {
        Alert.alert('Error', 'Please select an E-Bike Category');
        return;
      }

      if (!paymentStatus) {
        Alert.alert('Required', 'Please select Payment Status (Paid or Not Paid).');
        return;
      }

      // ✅ NEW VALIDATION: if Not Paid, do not continue to Send to Inspect (Pending tab)
      if (paymentStatus !== 'Paid') {
        Alert.alert(
          'Payment Required',
          'Cannot send to Inspect while Payment Status is "Not Paid". Please set it to "Paid" first.'
        );
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

        const docsObj = {
          receipt: finalReceiptUrls,
          ebikePhotos: finalEbikeUrls
        };

        const preparedPayment = {
          status: paymentStatus,
          preparedBy: auth.currentUser?.uid || '',
          preparedAt: now,
          type: 'Registration'
        };

        const userPersonalUpdates = (activeTab === STATUS.PENDING && canEditPersonalAndEbike) ? {
          firstName: (editFirstName || '').toString().trim(),
          lastName: (editLastName || '').toString().trim(),
          contactNumber: (editContactNumber || '').toString().trim(),
          birthday: parseBirthdayForSave(editBirthday),
          address: (editAddress || '').toString().trim(),
        } : null;

        normalized[idx] = {
          ...old,
          status: STATUS.INSPECT,

          ...(activeTab === STATUS.PENDING && canEditPersonalAndEbike ? {
            ebikeBrand: (editEbikeBrand || '').toString().trim(),
            ebikeModel: (editEbikeModel || '').toString().trim(),
            ebikeColor: (editEbikeColor || '').toString().trim(),
            chassisMotorNumber: (editChassisMotorNumber || '').toString().trim(),
            branch: (editBranch || '').toString().trim(),
          } : {}),

          ebikeCategorySelected: selectedCategory,

          plateNumber: finalPlateNumber,
          hasPlate: true,

          adminVerificationDocs: docsObj,
          paymentDetails: preparedPayment,

          inspectionResult: null,
          inspection: null,
          inspectionFailedKeys: null,
        };

        const plateUpper = finalPlateNumber ? finalPlateNumber.toUpperCase() : null;
        const existingPlates = Array.isArray(data?.plateNumbers) ? [...data.plateNumbers] : [];
        const newPlates = plateUpper
          ? Array.from(new Set([...existingPlates, plateUpper]))
          : existingPlates;

        const overallStatus = computeOverallUserStatus(normalized);

        const updateObj = {
          ebikes: normalized,
          plateNumbers: newPlates,
          status: overallStatus,
        };

        if (userPersonalUpdates) {
          updateObj.firstName = userPersonalUpdates.firstName;
          updateObj.lastName = userPersonalUpdates.lastName;
          updateObj.contactNumber = userPersonalUpdates.contactNumber;
          updateObj.birthday = userPersonalUpdates.birthday;
          updateObj.address = userPersonalUpdates.address;
        }

        transaction.update(userRef, updateObj);
      });

      setReceiptImages([]);
      setEbikePhotoImages([]);
      setSavedReceiptUrls(finalReceiptUrls);
      setSavedEbikeUrls(finalEbikeUrls);
      setManualPlateError('');

      fetchRiders();
      Alert.alert('Sent', 'Registration sent to Inspect.');
      setDetailModalVisible(false);

    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Failed', error.message || 'Could not save');
    }
  };

  /** Pending Compliance "PASSED" -> Registered */
  const handlePassedFromCompliance = async () => {
    try {
      if (!canEditAsProcessing) return;
      if (activeTab !== STATUS.PENDING_COMPLIANCE) return;

      if (!selectedRider?.userId || !selectedEbikeId) {
        Alert.alert('Error', 'No rider / e-bike selected');
        return;
      }

      const failedKeysFromRecord = Array.isArray(selectedEbike?.inspectionFailedKeys)
        ? selectedEbike.inspectionFailedKeys.filter(Boolean)
        : [];

      if (failedKeysFromRecord.length > 0) {
        const cleanedChecklist = normalizeChecklistDefaults(inspectionChecklist || {});
        const unanswered = failedKeysFromRecord.filter((k) => {
          const v = normalizeChecklistValue(cleanedChecklist[k]);
          return !CHECKLIST_ALLOWED_VALUES.includes(v);
        });

        if (unanswered.length > 0) {
          Alert.alert('Checklist required', 'Please answer the failed checklist items first (OK / NOT OK / N/A).');
          return;
        }

        const stillFail = failedKeysFromRecord.filter((k) => {
          const v = normalizeChecklistValue(cleanedChecklist[k]);
          return v === 'FAIL';
        });

        if (stillFail.length > 0) {
          Alert.alert('Cannot Pass', 'Some failed items are still marked NOT OK. Set them to OK or N/A before passing.');
          return;
        }
      }

      if (!selectedCategory) {
        Alert.alert('Error', 'Please select an E-Bike Category');
        return;
      }

      if (!paymentStatus) {
        Alert.alert('Required', 'Please select Payment Status.');
        return;
      }

      if (paymentStatus !== 'Paid') {
        Alert.alert('Cannot Pass', 'Payment Status must be Paid to mark as PASSED.');
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

      const regISO = getTodayISO();
      const renISO = addYearsISO(regISO, 1);
      const regD = isoToUTCDate(regISO);
      const renD = isoToUTCDate(renISO);

      if (!regD || !renD) {
        Alert.alert('Error', 'Could not generate registration/renewal dates. Please try again.');
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

        const docsObj = {
          receipt: finalReceiptUrls,
          ebikePhotos: finalEbikeUrls
        };

        const verifiedPayment = {
          ...(old.paymentDetails || {}),
          status: 'Paid',
          verifiedBy: auth.currentUser?.uid || '',
          verifiedAt: now,
          type: 'Registration'
        };

        const userPersonalUpdates = canEditPersonalAndEbike ? {
          firstName: (editFirstName || '').toString().trim(),
          lastName: (editLastName || '').toString().trim(),
          contactNumber: (editContactNumber || '').toString().trim(),
          birthday: parseBirthdayForSave(editBirthday),
          address: (editAddress || '').toString().trim(),
        } : null;

        // update checklist only for failed keys
        let mergedChecklist = normalizeChecklistDefaults(old?.inspection?.checklist || {});
        const failedKeysFromRecordInner = Array.isArray(old?.inspectionFailedKeys) ? old.inspectionFailedKeys.filter(Boolean) : [];

        if (failedKeysFromRecordInner.length > 0) {
          const cleanedChecklist = normalizeChecklistDefaults(inspectionChecklist || {});
          failedKeysFromRecordInner.forEach((k) => {
            mergedChecklist[k] = normalizeChecklistValue(cleanedChecklist[k]);
          });
        }

        let txHistory = Array.isArray(old?.transactionHistory) ? [...old.transactionHistory] : [];
        txHistory.push({
          type: 'Registration',
          registeredDate: regD,
          renewalDate: renD,
          paymentDetails: verifiedPayment,
          adminVerificationDocs: docsObj,
          createdAt: now,
          createdBy: auth.currentUser?.uid || ''
        });

        normalized[idx] = {
          ...old,

          ...(canEditPersonalAndEbike ? {
            ebikeBrand: (editEbikeBrand || '').toString().trim(),
            ebikeModel: (editEbikeModel || '').toString().trim(),
            ebikeColor: (editEbikeColor || '').toString().trim(),
            chassisMotorNumber: (editChassisMotorNumber || '').toString().trim(),
            branch: (editBranch || '').toString().trim(),
          } : {}),

          status: STATUS.REGISTERED,
          registrationStatus: 'Active',
          verifiedAt: now,

          ebikeCategorySelected: selectedCategory,
          plateNumber: finalPlateNumber,
          hasPlate: true,

          registeredDate: regD,
          renewalDate: renD,

          inspectionResult: 'PASSED',
          inspection: {
            ...(old.inspection || {}),
            result: 'PASSED',
            checklist: mergedChecklist,
            notes: (inspectionNotes || '').trim() || 'Compliance passed.',
            inspectedAt: now,
            inspectedBy: auth.currentUser?.uid || '',
          },
          inspectionFailedKeys: null,

          paymentDetails: verifiedPayment,
          adminVerificationDocs: docsObj,
          transactionHistory: txHistory,
        };

        const plateUpper = finalPlateNumber ? finalPlateNumber.toUpperCase() : null;
        const existingPlates = Array.isArray(data?.plateNumbers) ? [...data.plateNumbers] : [];
        const newPlates = plateUpper
          ? Array.from(new Set([...existingPlates, plateUpper]))
          : existingPlates;

        const overallStatus = computeOverallUserStatus(normalized);

        const updateObj = {
          ebikes: normalized,
          status: overallStatus,
          plateNumbers: newPlates,
        };

        if (userPersonalUpdates) {
          updateObj.firstName = userPersonalUpdates.firstName;
          updateObj.lastName = userPersonalUpdates.lastName;
          updateObj.contactNumber = userPersonalUpdates.contactNumber;
          updateObj.birthday = userPersonalUpdates.birthday;
          updateObj.address = userPersonalUpdates.address;
        }

        transaction.update(userRef, updateObj);
      });

      setReceiptImages([]);
      setEbikePhotoImages([]);
      setSavedReceiptUrls(finalReceiptUrls);
      setSavedEbikeUrls(finalEbikeUrls);
      setManualPlateError('');

      fetchRiders();
      Alert.alert('Passed', 'Moved to Registered (dates auto-set).');
      setDetailModalVisible(false);

    } catch (error) {
      console.error('Passed error:', error);
      Alert.alert('Failed', error.message || 'Could not mark as Passed');
    }
  };

  /** Pending Compliance -> Reject (delete record)
   *  Pending -> Move to Pending Compliance
   *  (UI buttons removed per request; function kept for safety)
   */
  const handleMoveOrReject = async () => {
    try {
      if (activeTab === STATUS.PENDING_COMPLIANCE) {
        // UI removed — keep handler safe in case it’s triggered elsewhere
        return;
      }

      // Pending = Move to Pending Compliance (UI removed)
      if (activeTab !== STATUS.PENDING) return;

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

        const userPersonalUpdates = (activeTab === STATUS.PENDING && canEditPersonalAndEbike) ? {
          firstName: (editFirstName || '').toString().trim(),
          lastName: (editLastName || '').toString().trim(),
          contactNumber: (editContactNumber || '').toString().trim(),
          birthday: parseBirthdayForSave(editBirthday),
          address: (editAddress || '').toString().trim(),
        } : null;

        normalized[idx] = {
          ...normalized[idx],

          ...(activeTab === STATUS.PENDING && canEditPersonalAndEbike ? {
            ebikeBrand: (editEbikeBrand || '').toString().trim(),
            ebikeModel: (editEbikeModel || '').toString().trim(),
            ebikeColor: (editEbikeColor || '').toString().trim(),
            chassisMotorNumber: (editChassisMotorNumber || '').toString().trim(),
            branch: (editBranch || '').toString().trim(),
          } : {}),

          status: STATUS.PENDING_COMPLIANCE,
          statusUpdatedAt: now,
          statusUpdatedBy: auth.currentUser?.uid || '',
        };

        const overallStatus = computeOverallUserStatus(normalized);

        const updateObj = {
          ebikes: normalized,
          status: overallStatus,
        };

        if (userPersonalUpdates) {
          updateObj.firstName = userPersonalUpdates.firstName;
          updateObj.lastName = userPersonalUpdates.lastName;
          updateObj.contactNumber = userPersonalUpdates.contactNumber;
          updateObj.birthday = userPersonalUpdates.birthday;
          updateObj.address = userPersonalUpdates.address;
        }

        transaction.update(userRef, updateObj);
      });

      setDetailModalVisible(false);
      setShowCategoryModal(false);
      setShowEbikeModal(false);
      setShowPaymentModal(false);

      fetchRiders();
      Alert.alert('Moved', 'Moved to Pending Compliance.');
    } catch (error) {
      console.error('Error moving/rejecting:', error);
      Alert.alert('Error', `Could not update: ${error.message}`);
    }
  };

  // Receipt + E-bike previews show NEW selected beside SAVED (same row)
  const renderCombinedDocsPreview = () => {
    const allowRemoveSaved = canEditAsProcessing;

    const hasSavedReceipt = (savedReceiptUrls?.length || 0) > 0;
    const hasSavedEbike = (savedEbikeUrls?.length || 0) > 0;

    const hasNewReceipt = (receiptImages?.length || 0) > 0;
    const hasNewEbike = (ebikePhotoImages?.length || 0) > 0;

    const hasAnything =
      hasSavedReceipt || hasSavedEbike || hasNewReceipt || hasNewEbike;

    if (!hasAnything) return null;

    return (
      <View style={{ marginTop: 12 }}>
        <Text style={styles.auditSubTitle}>Current (Saved) + Selected</Text>

        {(hasSavedReceipt || hasNewReceipt) && (
          <>
            <Text style={styles.docsMiniLabel}>Photo of the Receipt</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(savedReceiptUrls || []).map((url, i) => (
                <View key={`saved_rec_${i}`} style={styles.imageContainer}>
                  <TouchableOpacity onPress={() => openImageViewer(url)}>
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

              {(receiptImages || []).map((image, i) => (
                <View key={`sel_rec_${i}`} style={styles.imageContainer}>
                  <TouchableOpacity onPress={() => openImageViewer(image)}>
                    <Image source={{ uri: image }} style={styles.documentImage} />
                  </TouchableOpacity>

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

            {hasNewReceipt ? (
              <Text style={styles.auditHint}>
                Note: Newly selected receipt photos are shown beside the saved photos.
              </Text>
            ) : null}
          </>
        )}

        {(hasSavedEbike || hasNewEbike) && (
          <>
            <Text style={[styles.docsMiniLabel, { marginTop: (hasSavedReceipt || hasNewReceipt) ? 10 : 0 }]}>
              E-bike Photo
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(savedEbikeUrls || []).map((url, i) => (
                <View key={`saved_eb_${i}`} style={styles.imageContainer}>
                  <TouchableOpacity onPress={() => openImageViewer(url)}>
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

              {(ebikePhotoImages || []).map((image, i) => (
                <View key={`sel_eb_${i}`} style={styles.imageContainer}>
                  <TouchableOpacity onPress={() => openImageViewer(image)}>
                    <Image source={{ uri: image }} style={styles.documentImage} />
                  </TouchableOpacity>

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

            {hasNewEbike ? (
              <Text style={styles.auditHint}>
                Note: Newly selected e-bike photos are shown beside the saved photos.
              </Text>
            ) : null}
          </>
        )}
      </View>
    );
  };

  const renderInspectorChecklist = () => {
    const failedKeysFromRecord = Array.isArray(selectedEbike?.inspectionFailedKeys)
      ? selectedEbike.inspectionFailedKeys.filter(Boolean)
      : [];

    const baseItems =
      (activeTab === STATUS.PENDING_COMPLIANCE && failedKeysFromRecord.length > 0)
        ? CHECKLIST_ITEMS.filter(i => failedKeysFromRecord.includes(i.key))
        : CHECKLIST_ITEMS;

    const groups = baseItems.reduce((acc, item) => {
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
        <Text style={styles.sectionTitle}>
          {activeTab === STATUS.PENDING_COMPLIANCE ? 'Checklist (Failed Items Only)' : 'Checklist'}
        </Text>

        <Text style={styles.auditHint}>
          Tip: Use <Text style={{ fontWeight: '800' }}>N/A</Text> for items that are not applicable to 2-wheel e-bikes (e.g., Window Wiper).
        </Text>

        {Object.keys(groups).map((groupName) => (
          <View key={groupName} style={{ marginBottom: 12 }}>
            <Text style={styles.auditSubTitle}>{groupName}</Text>

            {groups[groupName].map((item) => {
              const cur = normalizeChecklistValue(inspectionChecklist?.[item.key] || '');
              const isMissingRequired = (!cur || cur === '');

              return (
                <View key={item.key} style={styles.checkItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkItemLabel}>
                      {item.label}
                      <Text style={{ color: '#F44336' }}> *</Text>
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

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
          {activeTab === STATUS.PENDING_COMPLIANCE ? 'Compliance / Notes (optional)' : 'Inspector Notes (optional)'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Add remarks (optional)"
          value={inspectionNotes}
          onChangeText={setInspectionNotes}
          multiline
        />

        {activeTab === INSPECT_TAB && (
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
        )}
      </View>
    );
  };

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

          {canEditPersonalAndEbike ? (
            <>
              <Text style={styles.docsMiniLabel}>First Name</Text>
              <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} editable={!uploading} />

              <Text style={styles.docsMiniLabel}>Last Name</Text>
              <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} editable={!uploading} />

              <Text style={styles.docsMiniLabel}>Email (Read-only)</Text>
              <View style={[styles.input, { justifyContent: 'center' }]}>
                <Text style={{ color: '#2C3E50' }}>{selectedRider.email || 'N/A'}</Text>
              </View>

              <Text style={styles.docsMiniLabel}>Contact No.</Text>
              <TextInput style={styles.input} value={editContactNumber} onChangeText={setEditContactNumber} editable={!uploading} />

              <Text style={styles.docsMiniLabel}>Birthday (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={editBirthday}
                onChangeText={setEditBirthday}
                placeholder="e.g., 2001-09-18"
                editable={!uploading}
              />

              <Text style={styles.docsMiniLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={editAddress}
                onChangeText={setEditAddress}
                editable={!uploading}
                multiline
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>E-bike Information</Text>

          {canEditPersonalAndEbike ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plate Number:</Text>
                <Text style={styles.detailValue}>{plate}</Text>
              </View>

              <Text style={styles.docsMiniLabel}>Chassis/Motor No.</Text>
              <TextInput
                style={styles.input}
                value={editChassisMotorNumber}
                onChangeText={setEditChassisMotorNumber}
                editable={!uploading}
              />

              <Text style={styles.docsMiniLabel}>Brand</Text>
              <TextInput style={styles.input} value={editEbikeBrand} onChangeText={setEditEbikeBrand} editable={!uploading} />

              <Text style={styles.docsMiniLabel}>Model</Text>
              <TextInput style={styles.input} value={editEbikeModel} onChangeText={setEditEbikeModel} editable={!uploading} />

              <Text style={styles.docsMiniLabel}>Color</Text>
              <TextInput style={styles.input} value={editEbikeColor} onChangeText={setEditEbikeColor} editable={!uploading} />

              <Text style={styles.docsMiniLabel}>Branch</Text>
              <TextInput style={styles.input} value={editBranch} onChangeText={setEditBranch} editable={!uploading} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{catLabel}</Text>
              </View>
            </>
          ) : (
            <>
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

              {(activeTab === STATUS.REGISTERED || selectedEbike?.registeredDate || selectedEbike?.renewalDate) ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registration Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedEbike?.registeredDate)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Renewal Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedEbike?.renewalDate)}</Text>
                  </View>
                </>
              ) : null}

              {(selectedEbike?.inspectionResult || selectedEbike?.inspection?.result) ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Inspection:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.inspectionResult || selectedEbike?.inspection?.result}
                  </Text>
                </View>
              ) : null}

              {(selectedEbike?.inspection?.inspectedAt || selectedEbike?.inspection?.inspectedBy) ? (
                <Text style={{ marginTop: 8, color: '#7F8C8D', fontSize: 12 }}>
                  Last inspection: {formatDate(selectedEbike?.inspection?.inspectedAt)} • {selectedEbike?.inspection?.inspectedBy ? `By: ${selectedEbike.inspection.inspectedBy}` : ''}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Government Valid ID / Driver’s License</Text>
          {(selectedRider.images && selectedRider.images.length > 0) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedRider.images.map((imageUrl, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => openImageViewer(imageUrl)}
                >
                  <Image source={{ uri: imageUrl }} style={styles.documentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: '#7F8C8D', fontSize: 12 }}>No uploaded ID found.</Text>
          )}
        </View>

        {(activeTab === STATUS.REGISTERED) ? renderReadOnlyVerificationDocs() : null}
      </>
    );
  };

  const modalTitle = useMemo(() => {
    if (activeTab === STATUS.PENDING) return 'Rider Registration (Pending)';
    if (activeTab === INSPECT_TAB) return 'Inspect Rider';
    if (activeTab === STATUS.PENDING_COMPLIANCE) return 'Pending Compliance (Fix & Pass)';
    if (activeTab === STATUS.REGISTERED) return 'Registered Rider Details';
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
                setShowPaymentModal(false);

                setReceiptImages([]);
                setEbikePhotoImages([]);
                setSavedReceiptUrls([]);
                setSavedEbikeUrls([]);

                setInspectionChecklist(normalizeChecklistDefaults({}));
                setInspectionNotes('');

                setImageViewerVisible(false);
                setImageViewerUrl(null);

                setPaymentStatus('');

                setEditFirstName('');
                setEditLastName('');
                setEditContactNumber('');
                setEditBirthday('');
                setEditAddress('');
                setEditEbikeBrand('');
                setEditEbikeModel('');
                setEditEbikeColor('');
                setEditChassisMotorNumber('');
                setEditBranch('');
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

              {renderNonInspectorInfo()}

              {/* Inspect tab shows Saved Verification Photos + Checklist */}
              {activeTab === INSPECT_TAB && (
                <>
                  {renderSavedVerificationPhotos()}
                  {renderInspectorChecklist()}
                </>
              )}

              {canEditAsProcessing && (
                <>
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
                    <Text style={styles.sectionTitle}>
                      {activeTab === STATUS.PENDING_COMPLIANCE ? 'Payment / Details (Compliance)' : 'Payment (Processing)'}
                    </Text>

                    <Text style={styles.docsMiniLabel}>Payment Status</Text>
                    <TouchableOpacity
                      style={[styles.categoryButton, uploading && styles.categoryButtonDisabled]}
                      onPress={() => {
                        if (!uploading) setShowPaymentModal(true);
                      }}
                      disabled={uploading}
                    >
                      <Text style={styles.categoryButtonText}>
                        {paymentStatus ? paymentStatus : 'Select Payment Status'}
                      </Text>
                      <Feather name="chevron-down" size={20} color="#2E7D32" />
                    </TouchableOpacity>

                    {/* Removed: Registration Dates title + hint (per request) */}

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

                    {renderCombinedDocsPreview()}
                  </View>

                  {/* Pending Compliance: checklist at bottom + buttons */}
                  {activeTab === STATUS.PENDING_COMPLIANCE && (
                    <>
                      {renderInspectorChecklist()}

                      {/* Removed Reject button — Passed only */}
                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.verifyButton, uploading && styles.buttonDisabled]}
                          onPress={handlePassedFromCompliance}
                          disabled={uploading}
                        >
                          <Text style={styles.modalButtonText}>
                            {uploading ? 'Uploading...' : 'Passed'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Pending tab buttons */}
                  {activeTab === STATUS.PENDING && (
                    <View style={styles.modalButtons}>
                      {/* Removed "Move to Compliance" button — Send to Inspect only */}
                      <TouchableOpacity
                        style={[styles.modalButton, styles.verifyButton, uploading && styles.buttonDisabled]}
                        onPress={handleSendToInspect}
                        disabled={uploading}
                      >
                        <Text style={styles.modalButtonText}>
                          {uploading ? 'Uploading...' : 'Send to Inspect'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

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
                          prefillFormFromEbike(e, selectedRider);
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

            {showPaymentModal && (
              <View style={styles.categoryOverlay}>
                <View style={styles.categorySheet}>
                  <View style={styles.categorySheetHeader}>
                    <Text style={styles.categorySheetTitle}>Select Payment Status</Text>
                    <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                      <Feather name="x" size={18} color="#2C3E50" />
                    </TouchableOpacity>
                  </View>

                  {PAYMENT_STATUSES.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={styles.categoryOption}
                      onPress={() => {
                        setPaymentStatus(opt.value);
                        setShowPaymentModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          paymentStatus === opt.value && styles.categoryOptionTextSelected
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {paymentStatus === opt.value && (
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
              const stage = getEbikeStage(e, item.status);

              if (activeTab === INSPECT_TAB) {
                return stage === STATUS.INSPECT && needsInspection(e);
              }
              return stage === activeTab;
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

                        {activeTab === STATUS.PENDING_COMPLIANCE ? (
                          <Text style={styles.subInfoText}>
                            Last Result: {firstE?.inspectionResult || firstE?.inspection?.result || 'FAILED'}
                          </Text>
                        ) : null}

                        {activeTab === STATUS.REGISTERED ? (
                          <>
                            <Text style={styles.subInfoText}>
                              Registration: {formatDate(firstE?.registeredDate)}
                            </Text>
                            <Text style={styles.subInfoText}>
                              Renewal: {formatDate(firstE?.renewalDate)}
                            </Text>
                          </>
                        ) : null}
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
        {renderImageViewerModal()}
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

  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  imageViewerClose: {
    position: 'absolute',
    top: 45,
    right: 18,
    zIndex: 20,
    padding: 8,
  },
  imageViewerImage: {
    width: '100%',
    height: '85%',
  },
});

export default RiderScreen;
