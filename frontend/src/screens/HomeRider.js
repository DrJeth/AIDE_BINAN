// HomeRider.js
import React, { useState, useEffect, useMemo } from "react";
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
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView
} from "react-native";
import { WebView } from "react-native-webview";
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
  where,
  runTransaction,
  updateDoc,
  addDoc
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Static Assets
const MenuIcon = require("../../assets/ic_menu.png");
const BellIcon = require("../../assets/bell.png");

// NEW ICONS
const HomeIcon = require("../../assets/home.png");
const ScheduleIcon = require("../../assets/schedule.png");
const UserIcon = require("../../assets/user.png");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/** UPDATED categories (support NEW + LEGACY values) */
const EBIKE_CATEGORIES = [
  { label: "CATEGORY L1A", value: "L1A" },
  { label: "CATEGORY L1B", value: "L1B" },
  { label: "CATEGORY L2A", value: "L2A" },
  { label: "CATEGORY L2B", value: "L2B" },
];

const MAX_ADD_EBIKE_PHOTOS = 5;

const toJSDate = (v) => {
  if (!v) return null;
  try {
    if (typeof v?.toDate === "function") return v.toDate();
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const toMs = (v) => {
  const d = toJSDate(v);
  return d ? d.getTime() : null;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";
  try {
    const date = toJSDate(dateValue);
    if (!date) return "Invalid Date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch (e) {
    return "Invalid Date";
  }
};

const getRegistrationStatusFromEbike = (ebike) => {
  if (!ebike?.renewalDate) return null;

  const today = new Date();
  const renewalDate = toJSDate(ebike.renewalDate);
  if (!renewalDate) return null;

  const daysUntilExpiry = Math.floor((renewalDate - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return { status: "Expired", daysLeft: 0, color: "#F44336" };
  } else if (daysUntilExpiry <= 30) {
    return { status: "Expiring Soon", daysLeft: daysUntilExpiry, color: "#FF9800" };
  } else {
    return { status: "Active", daysLeft: daysUntilExpiry, color: "#4CAF50" };
  }
};

const getCategoryLabel = (value) => {
  if (!value) return "N/A";
  const found = EBIKE_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value;
};

/* Payment Amount display should be only "Paid" or "Not Paid" */
const normPayText = (v) => (v ?? "").toString().trim().toLowerCase();
const getPaymentStatusText = (ebike, txs = []) => {
  // collect possible paymentDetails sources (ebike + tx history fallback)
  const candidates = [
    ebike?.paymentDetails || null,
    ...(Array.isArray(txs) ? txs.map((t) => t?.paymentDetails).filter(Boolean) : [])
  ].filter(Boolean);

  let statusStr = "";
  let paidBool = null;
  let hasVerifiedStamp = false;

  for (const pd of candidates) {
    // booleans (most reliable)
    if (typeof pd?.isPaid === "boolean") paidBool = pd.isPaid;
    if (typeof pd?.paid === "boolean") paidBool = pd.paid;
    if (typeof pd?.verified === "boolean") paidBool = pd.verified;

    // strings (common in your select: "Paid" / "Not Paid")
    const s = pd?.paymentStatus ?? pd?.status ?? pd?.state ?? pd?.payment_state ?? "";
    if (s) statusStr = String(s);

    // timestamps (sometimes means verified/paid)
    if (pd?.verifiedAt || pd?.paidAt || pd?.confirmedAt || pd?.approvedAt) {
      hasVerifiedStamp = true;
    }
  }

  const s = normPayText(statusStr);

  // explicit NOT PAID check first (para di tamaan ng "paid" substring)
  const isNotPaid =
    paidBool === false ||
    s === "not paid" ||
    s.includes("not paid") ||
    s.includes("not_paid") ||
    s.includes("notpaid") ||
    s.includes("unpaid") ||
    (s.includes("not") && s.includes("paid"));

  if (isNotPaid) return "Not Paid";

  const isPaid =
    paidBool === true ||
    s === "paid" ||
    (s.includes("paid") && !s.includes("not")) ||
    hasVerifiedStamp;

  if (isPaid) return "Paid";

  // default (kung wala pa talagang info)
  return "Not Paid";
};

/** Normalize ebikes (supports NEW schema + LEGACY single fields) */
const normalizeUserEbikes = (userData) => {
  if (Array.isArray(userData?.ebikes) && userData.ebikes.length > 0) {
    return userData.ebikes.map((e, idx) => ({
      id: e?.id || String(idx),
      ebikeBrand: e?.ebikeBrand || "",
      ebikeModel: e?.ebikeModel || "",
      ebikeColor: e?.ebikeColor || "",
      chassisMotorNumber: e?.chassisMotorNumber || e?.chassisNumber || "",
      branch: e?.branch || "",
      plateNumber: e?.plateNumber || "",
      hasPlate: typeof e?.hasPlate === "boolean" ? e.hasPlate : !!e?.plateNumber,

      status: e?.status || userData?.status || "Pending",
      ebikeCategorySelected: e?.ebikeCategorySelected || "",
      registeredDate: e?.registeredDate || null,
      renewalDate: e?.renewalDate || null,
      registrationStatus: e?.registrationStatus || null,
      verifiedAt: e?.verifiedAt || null,
      rejectedAt: e?.rejectedAt || null,

      adminVerificationDocs: e?.adminVerificationDocs || null,
      transactionHistory: Array.isArray(e?.transactionHistory) ? e.transactionHistory : [],

      // legacy
      adminVerificationImages: Array.isArray(e?.adminVerificationImages) ? e.adminVerificationImages : [],

      paymentDetails: e?.paymentDetails || null,
      createdAt: e?.createdAt || null
    }));
  }

  // legacy single ebike
  return [
    {
      id: "legacy",
      ebikeBrand: userData?.ebikeBrand || "",
      ebikeModel: userData?.ebikeModel || "",
      ebikeColor: userData?.ebikeColor || "",
      chassisMotorNumber: userData?.chassisMotorNumber || userData?.chassisNumber || "",
      branch: userData?.branch || "",
      plateNumber: userData?.plateNumber || "",
      hasPlate: !!userData?.plateNumber,

      status: userData?.status || "Pending",
      ebikeCategorySelected: userData?.ebikeCategorySelected || "",
      registeredDate: userData?.registeredDate || null,
      renewalDate: userData?.renewalDate || null,
      registrationStatus: userData?.registrationStatus || null,
      verifiedAt: userData?.verifiedAt || null,
      rejectedAt: userData?.rejectedAt || null,

      adminVerificationDocs: userData?.adminVerificationDocs || null,
      transactionHistory: Array.isArray(userData?.transactionHistory) ? userData.transactionHistory : [],

      adminVerificationImages: Array.isArray(userData?.adminVerificationImages)
        ? userData.adminVerificationImages
        : [],

      paymentDetails: userData?.paymentDetails || null,
      createdAt: userData?.createdAt || null
    }
  ];
};

/** Transactions latest -> oldest */
const getEbikeTransactions = (ebike) => {
  const tx = Array.isArray(ebike?.transactionHistory) ? [...ebike.transactionHistory] : [];

  if (tx.length === 0 && (ebike?.paymentDetails || ebike?.verifiedAt)) {
    tx.push({
      type: ebike?.paymentDetails?.type || "Registration",
      registeredDate: ebike?.registeredDate || null,
      renewalDate: ebike?.renewalDate || null,
      paymentDetails: ebike?.paymentDetails || null,
      adminVerificationDocs: ebike?.adminVerificationDocs || null,
      createdAt: ebike?.paymentDetails?.verifiedAt || ebike?.verifiedAt || null
    });
  }

  tx.sort((a, b) => {
    const da = toJSDate(a?.createdAt || a?.paymentDetails?.verifiedAt) || new Date(0);
    const db = toJSDate(b?.createdAt || b?.paymentDetails?.verifiedAt) || new Date(0);
    return db - da;
  });

  return tx;
};

/* ===========================
   REGISTRATION STEPPER HELPERS (FIXED)
   UI Steps (3 lang dapat makita):
   Pending → Inspect → Registered

   Behavior:
   - Pending Compliance stays on Inspect (hindi uusad; hindi magdodoble ng Inspect)
=========================== */
const REG_STEPS = [
  { key: "pending", label: "Pending" },
  { key: "inspect", label: "Inspect" },
  { key: "registered", label: "Registered" }
];

const normalizeStatusText = (v) => (v ?? "").toString().trim().toLowerCase();

const getRegistrationStepperInfo = (rawStatus) => {
  const s = normalizeStatusText(rawStatus);

  if (s.includes("reject")) {
    return {
      index: 0,
      mode: "rejected",
      statusLabel: "Rejected",
      nextText: "Your registration was rejected. Please check requirements and resubmit."
    };
  }

  // Registered / Verified (final)
  if (s.includes("registered") || s.includes("verified") || s.includes("approved") || s === "done") {
    return {
      index: 2, // last step (Registered)
      mode: "done",
      statusLabel: "Registered",
      nextText: "Registration complete ✅"
    };
  }

  // Pending Compliance (failed sa inspect) — tracker stays on Inspect
  if (
    s.includes("pending compliance") ||
    (s.includes("compliance") && !s.includes("complied")) ||
    s.includes("for final") ||
    s.includes("final validation") ||
    s.includes("for verification") ||
    s.includes("back to validator") ||
    s.includes("inspector to validator")
  ) {
    return {
      index: 1, //stay on Inspect (NOT another step)
      mode: "active",
      statusLabel: "Inspect",
      nextText: "You have failed the inspection. Please comply and resubmit for checking."
    };
  }

  // Inspect stage
  if (s.includes("inspect") || s.includes("inspection") || s.includes("for inspection")) {
    return {
      index: 1,
      mode: "active",
      statusLabel: "Inspect",
      nextText: "Waiting for inspection/checking of your e-bike."
    };
  }

  // Pending (default)
  return {
    index: 0,
    mode: "active",
    statusLabel: "Pending",
    nextText: "Your registration is pending."
  };
};

/** docType helpers (for HomeRider sections) */
const normDocType = (v) => (v ?? "").toString().trim().toLowerCase();
const isGovIdDoc = (d) => {
  const t = normDocType(d?.docType);
  if (!t) return false;
  return t.includes("gov") || t.includes("gov_id") || t.includes("id") || t.includes("license") || t.includes("driver");
};
const isEbikePhotoDoc = (d) => {
  const t = normDocType(d?.docType);
  if (!t) return false;
  // supports: ebike_photo, ebikePhotos, ebike, e-bike photo, bike photo
  if (t.includes("ebike")) return true;
  if (t.includes("e-bike")) return true;
  if (t.includes("bike") && t.includes("photo")) return true;
  if (t.includes("ebike") && t.includes("photo")) return true;
  return false;
};

export default function HomeRider({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [userDocId, setUserDocId] = useState(null);

  const [riderDocs, setRiderDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  // multiple ebikes
  const [selectedEbikeId, setSelectedEbikeId] = useState(null);
  const [showEbikePicker, setShowEbikePicker] = useState(false);

  // ADD NEW EBIKE modal
  const [addEbikeVisible, setAddEbikeVisible] = useState(false);
  const [addEbikeLoading, setAddEbikeLoading] = useState(false);
  const [addNoPlateNumber, setAddNoPlateNumber] = useState(false);
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);

  // photos state for Add New E-bike
  const [addEbikePhotos, setAddEbikePhotos] = useState([]); // [{ id, uri }]

  const [addEbikeForm, setAddEbikeForm] = useState({
    ebikeBrand: "",
    ebikeModel: "",
    ebikeColor: "",
    chassisMotorNumber: "",
    branch: "",
    plateNumber: "",
    ebikeCategorySelected: "" // ✅ NEW
  });

  const [newsUpdates, setNewsUpdates] = useState([
    {
      id: "welcome",
      headline: "Welcome to AIDE",
      details: "Stay tuned for latest updates",
      type: "System",
      createdAt: new Date().toLocaleDateString(),
      createdAtMs: Date.now()
    }
  ]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // Notifications: appointment + registration (system)
  const [appointmentNotifs, setAppointmentNotifs] = useState([]);
  const [registrationNotifs, setRegistrationNotifs] = useState([]);

  // Seen tracker (badge count)
  const [notifLastSeen, setNotifLastSeen] = useState({
    announcements: null,
    appointment: null,
    registration: null
  });

  // IMAGE VIEWER (in-app preview)
  const [imgViewerVisible, setImgViewerVisible] = useState(false);
  const [imgViewerUrl, setImgViewerUrl] = useState(null);
  const [imgViewerTitle, setImgViewerTitle] = useState("");
  const [imgViewerScale, setImgViewerScale] = useState(1);

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const openImageViewer = (url, title = "Preview") => {
    if (!url) {
      Alert.alert("No Image", "Image URL is missing.");
      return;
    }
    setImgViewerTitle(title);
    setImgViewerUrl(url);
    setImgViewerScale(1);
    setImgViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImgViewerVisible(false);
    setImgViewerScale(1);
    setImgViewerUrl(null);
    setImgViewerTitle("");
  };

  const viewerZoomIn = () =>
    setImgViewerScale((s) => clamp(Number((s + 0.25).toFixed(2)), 1, 3));
  const viewerZoomOut = () =>
    setImgViewerScale((s) => clamp(Number((s - 0.25).toFixed(2)), 1, 3));

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const toUpper = (v) => (v ?? "").toString().toUpperCase();
  const makeEbikeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const makePhotoId = () => `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const resetAddEbikeForm = () => {
    setAddEbikeForm({
      ebikeBrand: "",
      ebikeModel: "",
      ebikeColor: "",
      chassisMotorNumber: "",
      branch: "",
      plateNumber: "",
      ebikeCategorySelected: ""
    });
    setAddEbikePhotos([]); 
    setAddNoPlateNumber(false);
    setAddCategoryVisible(false);
  };

  const validateChassisMotorNumber = (number) => {
    if (!number || number.trim() === "") return false;
    if (number.toLowerCase() === "none") return true;

    const cleanNumber = number.replace(/\D/g, "");
    return (
      (cleanNumber.length >= 10 && cleanNumber.length <= 12) ||
      (cleanNumber.length >= 15 && cleanNumber.length <= 20)
    );
  };

  const validatePlateNumber = (plateNumber) => {
    const plateRegex = /^[A-Za-z]{2}\d{4}$/;
    return plateRegex.test(plateNumber.trim().toUpperCase());
  };

  // upload helper
  const uploadUriToStorage = async (uri, storagePath) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const r = sRef(storage, storagePath);
      const task = uploadBytesResumable(r, blob);

      task.on(
        "state_changed",
        () => {},
        (err) => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  };

  // picker for Add New E-bike photos
  const pickAddEbikePhotos = async () => {
    try {
      if (addEbikeLoading) return;

      if (addEbikePhotos.length >= MAX_ADD_EBIKE_PHOTOS) {
        Alert.alert("Limit Reached", `You can upload up to ${MAX_ADD_EBIKE_PHOTOS} photos only.`);
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert("Permission Needed", "Please allow photo library access to upload e-bike photos.");
        return;
      }

      const remaining = MAX_ADD_EBIKE_PHOTOS - addEbikePhotos.length;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: remaining // iOS only; Android may ignore (still ok)
      });

      if (result?.canceled) return;

      const assets = Array.isArray(result?.assets) ? result.assets : [];
      const picked = assets
        .map((a) => a?.uri)
        .filter(Boolean)
        .slice(0, remaining)
        .map((uri) => ({ id: makePhotoId(), uri }));

      if (picked.length === 0) return;

      setAddEbikePhotos((prev) => [...prev, ...picked]);
    } catch (e) {
      console.error("pickAddEbikePhotos error:", e);
      Alert.alert("Failed", "Could not pick photo. Please try again.");
    }
  };

  const removeAddEbikePhoto = (photoId) => {
    setAddEbikePhotos((prev) => prev.filter((p) => String(p.id) !== String(photoId)));
  };

  const validateAddEbikeEntry = () => {
    if (!addEbikeForm.ebikeBrand.trim()) {
      Alert.alert("Error", "Please fill in E-Bike Brand");
      return false;
    }
    if (!addEbikeForm.ebikeModel.trim()) {
      Alert.alert("Error", "Please fill in Model Unit");
      return false;
    }
    if (!addEbikeForm.ebikeColor.trim()) {
      Alert.alert("Error", "Please fill in E-Bike Color");
      return false;
    }

    // category required
    if (!addEbikeForm.ebikeCategorySelected) {
      Alert.alert("Error", "Please select E-Bike Category");
      return false;
    }

    if (!validateChassisMotorNumber(addEbikeForm.chassisMotorNumber)) {
      Alert.alert(
        "Error",
        'Please enter Chassis Number (10-12 digits), Motor Number (15-20 digits), or type "none"'
      );
      return false;
    }

    // at least 1 photo
    if (!Array.isArray(addEbikePhotos) || addEbikePhotos.length === 0) {
      Alert.alert("Error", "Please upload at least 1 E-Bike photo");
      return false;
    }

    if (!addNoPlateNumber) {
      if (!addEbikeForm.plateNumber.trim()) {
        Alert.alert("Error", "Please fill in Plate Number");
        return false;
      }
      if (!validatePlateNumber(addEbikeForm.plateNumber)) {
        Alert.alert("Error", "Plate Number must be in format: AB1234");
        return false;
      }
    }
    return true;
  };

  const computeOverallUserStatus = (ebikesList = []) => {
    const statuses = (ebikesList || []).map((e) => e?.status).filter(Boolean);
    if (statuses.includes("Pending")) return "Pending";
    if (statuses.length > 0 && statuses.every((s) => s === "Rejected")) return "Rejected";
    return "Verified";
  };

  const submitAddNewEbike = async () => {
    try {
      if (!userDocId) {
        Alert.alert("Error", "User record not found. Please login again.");
        return;
      }
      if (!validateAddEbikeEntry()) return;

      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert("Error", "No active session found. Please login again.");
        return;
      }

      const plate = addNoPlateNumber ? null : addEbikeForm.plateNumber.trim().toUpperCase();

      // local duplicate check
      if (plate) {
        const ebikesLocal = normalizeUserEbikes(userData || {});
        const dupLocal = ebikesLocal.some((e) => String(e?.plateNumber || "").toUpperCase() === plate);
        if (dupLocal) {
          Alert.alert("Error", `Plate number already in your account: ${plate}`);
          return;
        }
      }

      setAddEbikeLoading(true);

      // global uniqueness check
      if (plate) {
        const plateQ = query(collection(db, "users"), where("plateNumbers", "array-contains", plate));
        const plateSnap = await getDocs(plateQ);
        const conflict = plateSnap.docs.some((d) => d.id !== userDocId);
        if (conflict) {
          Alert.alert("Error", `Plate number already registered: ${plate}`);
          setAddEbikeLoading(false);
          return;
        }

        const legacyQ = query(collection(db, "users"), where("plateNumber", "==", plate));
        const legacySnap = await getDocs(legacyQ);
        const legacyConflict = legacySnap.docs.some((d) => d.id !== userDocId);
        if (legacyConflict) {
          Alert.alert("Error", `Plate number already registered: ${plate}`);
          setAddEbikeLoading(false);
          return;
        }
      }

      const newEbikeId = makeEbikeId();

      const newItem = {
        id: newEbikeId,
        ebikeBrand: addEbikeForm.ebikeBrand.trim().toUpperCase(),
        ebikeModel: addEbikeForm.ebikeModel.trim().toUpperCase(),
        ebikeColor: addEbikeForm.ebikeColor.trim().toUpperCase(),
        chassisMotorNumber:
          addEbikeForm.chassisMotorNumber.trim().toLowerCase() === "none"
            ? "none"
            : addEbikeForm.chassisMotorNumber.trim(),
        branch: (addEbikeForm.branch || "").trim().toUpperCase(),
        plateNumber: plate,
        hasPlate: !addNoPlateNumber,

        status: "Pending",
        ebikeCategorySelected: addEbikeForm.ebikeCategorySelected || "", // ✅ NEW
        registeredDate: null,
        renewalDate: null,
        registrationStatus: null,
        verifiedAt: null,
        rejectedAt: null,
        paymentDetails: null,
        adminVerificationDocs: null,
        adminVerificationImages: [],
        transactionHistory: [],
        createdAt: new Date().toISOString()
      };

      const userRef = doc(db, "users", userDocId);

      // 1) Save new ebike into user doc
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) throw new Error("User document not found.");

        const data = snap.data() || {};
        const existingEbikes = Array.isArray(data?.ebikes) ? data.ebikes : [];
        const mergedEbikes = [...existingEbikes, newItem];

        const basePlates = Array.isArray(data?.plateNumbers) ? data.plateNumbers : [];
        const mergedPlates = Array.from(
          new Set(
            [
              ...basePlates.map((p) => String(p).toUpperCase()),
              ...(plate ? [plate] : []),
              ...(data?.plateNumber ? [String(data.plateNumber).toUpperCase()] : [])
            ].filter(Boolean)
          )
        );

        const overallStatus = computeOverallUserStatus(mergedEbikes);

        tx.update(userRef, {
          ebikes: mergedEbikes,
          plateNumbers: mergedPlates,
          status: overallStatus
        });
      });

      // 2) Upload e-bike photos + save to riderRegistrations/{uid}/images with docType=ebike_photo
      try {
        const imagesCol = collection(db, "riderRegistrations", uid, "images");

        for (let i = 0; i < addEbikePhotos.length; i++) {
          const p = addEbikePhotos[i];
          if (!p?.uri) continue;

          const storagePath = `riderRegistrations/${uid}/ebikePhotos/${newEbikeId}/${p.id}.jpg`;
          const url = await uploadUriToStorage(p.uri, storagePath);

          await addDoc(imagesCol, {
            url,
            type: "original",
            docType: "ebike_photo",
            ebikeId: newEbikeId,
            createdAt: new Date().toISOString()
          });
        }

        // refresh local docs (so it shows agad)
        await loadRiderDocuments(uid);
      } catch (photoErr) {
        console.error("E-bike photo upload error:", photoErr);
        Alert.alert(
          "Saved (Photos failed)",
          "Your new e-bike was saved, but uploading photos failed. Please try again."
        );
      }

      // update local state
      setUserData((prev) => {
        const prevSafe = prev || {};
        const prevEbikesNorm = Array.isArray(prevSafe.ebikes) ? prevSafe.ebikes : [];
        const nextEbikesNorm = [...prevEbikesNorm, newItem];
        const nextStatus = computeOverallUserStatus(nextEbikesNorm);

        const prevPlates = Array.isArray(prevSafe.plateNumbers) ? prevSafe.plateNumbers : [];
        const nextPlates = Array.from(
          new Set([
            ...prevPlates.map((p) => String(p).toUpperCase()),
            ...(plate ? [plate] : [])
          ])
        );

        return {
          ...prevSafe,
          ebikes: nextEbikesNorm,
          plateNumbers: nextPlates,
          status: nextStatus
        };
      });

      setSelectedEbikeId(newItem.id);
      setAddEbikeVisible(false);
      resetAddEbikeForm();

      Alert.alert("Success", "New e-bike registration added (Pending for verification).");
    } catch (err) {
      console.error("Add new ebike error:", err);
      Alert.alert("Failed", err?.message || "Could not add new e-bike registration.");
    } finally {
      setAddEbikeLoading(false);
    }
  };

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

  /** include docType + ebikeId so we can route docs to proper sections */
  const loadRiderDocuments = async (docId) => {
    try {
      setDocsLoading(true);
      const imagesRef = collection(db, "riderRegistrations", docId, "images");
      const docsSnap = await getDocs(imagesRef);
      const docs = docsSnap.docs.map((d) => {
        const data = d.data() || {};
        const url = data.url || data.imageUrl || data.downloadUrl || data.downloadURL || data.image;
        const docType =
          data.docType ||
          data.doc_type ||
          data.documentType ||
          data.kind ||
          data.category ||
          null;

        const ebikeId = data.ebikeId || data.ebike_id || data.ebikeID || null;

        return {
          id: d.id,
          url,
          type: data.type || "original",
          docType,
          ebikeId
        };
      });
      setRiderDocs(docs);
    } catch (err) {
      console.error("Error loading rider documents:", err);
      setRiderDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const refreshAnnouncements = async () => {
    try {
      const newsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const newsSnapshot = await getDocs(newsQuery);

      const newsList = newsSnapshot.docs.map((d) => {
        const raw = d.data().createdAt;
        const ms =
          typeof raw?.seconds === "number"
            ? raw.seconds * 1000
            : toMs(raw) ?? Date.now();

        return {
          id: d.id,
          headline: d.data().title || "AIDE Update",
          details: d.data().description || "No additional details",
          type: d.data().type || "Announcement",
          createdAt: new Date(ms).toLocaleDateString(),
          createdAtMs: ms
        };
      });

      if (newsList.length > 0) setNewsUpdates(newsList);
    } catch (error) {
      console.error("Error fetching news updates:", error);
    }
  };

  const normalizeAppointmentStatus = (raw) => {
    const s = (raw ?? "").toString().trim().toLowerCase();
    if (!s) return null;

    if (s.includes("accept") || s.includes("approve") || s.includes("confirmed") || s === "done") {
      return "Accepted";
    }
    if (s.includes("reject") || s.includes("declin") || s.includes("cancel")) {
      return "Rejected";
    }
    return null;
  };

  const extractAppointmentDate = (data) => {
    return (
      data?.appointmentDate ||
      data?.date ||
      data?.scheduleDate ||
      data?.selectedDate ||
      data?.appointment_day ||
      data?.apptDate ||
      null
    );
  };

  const refreshAppointmentNotifs = async (uid, docId) => {
    try {
      if (!uid && !docId) return;

      const apptCol = collection(db, "appointments");
      const qs = [];
      if (uid) {
        qs.push(query(apptCol, where("uid", "==", uid)));
        qs.push(query(apptCol, where("userId", "==", uid)));
        qs.push(query(apptCol, where("riderUid", "==", uid)));
      }
      if (docId) {
        qs.push(query(apptCol, where("riderId", "==", docId)));
        qs.push(query(apptCol, where("userDocId", "==", docId)));
      }

      const snaps = await Promise.all(qs.map((qq) => getDocs(qq)));

      const map = new Map();
      snaps.forEach((snap) => {
        snap.docs.forEach((d) => {
          if (!map.has(d.id)) map.set(d.id, d);
        });
      });

      const items = [];
      map.forEach((d) => {
        const data = d.data() || {};
        const rawStatus = data.status ?? data.appointmentStatus ?? data.state ?? data.apptStatus;
        const status = normalizeAppointmentStatus(rawStatus);
        if (!status) return;

        const decidedAt =
          data.updatedAt ||
          data.statusUpdatedAt ||
          data.decidedAt ||
          data.approvedAt ||
          data.rejectedAt ||
          data.createdAt ||
          data.timestamp;

        const ms = toMs(decidedAt) ?? Date.now();

        const apptDate = extractAppointmentDate(data);
        const apptMs = toMs(apptDate);

        const whenText = apptMs ? formatDate(new Date(apptMs)) : null;

        items.push({
          id: `appt_${d.id}_${status.toLowerCase()}`,
          category: "appointment",
          headline: `Appointment ${status}`,
          details: whenText
            ? `Your appointment on ${whenText} was ${status.toLowerCase()}.`
            : `Your appointment was ${status.toLowerCase()}.`,
          createdAt: new Date(ms).toLocaleDateString(),
          createdAtMs: ms
        });
      });

      items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setAppointmentNotifs(items);
    } catch (e) {
      console.error("Error fetching appointment notifications:", e);
      setAppointmentNotifs([]);
    }
  };

  useEffect(() => {
    try {
      if (!userData) {
        setRegistrationNotifs([]);
        return;
      }
      const list = normalizeUserEbikes(userData || {});
      const items = [];

      list.forEach((e, idx) => {
        const st = (e?.status ?? "").toString().trim().toLowerCase();
        if (st !== "verified" && st !== "rejected") return;

        const plate = e?.plateNumber ? String(e.plateNumber).toUpperCase() : "NO PLATE";
        const ts =
          st === "verified"
            ? e?.verifiedAt || e?.paymentDetails?.verifiedAt || e?.registeredDate || e?.createdAt
            : e?.rejectedAt || e?.createdAt;

        const ms = toMs(ts) ?? Date.now();

        items.push({
          id: `reg_${e?.id || idx}_${st}`,
          category: "registration",
          headline: st === "verified" ? "Registration Verified" : "Registration Rejected",
          details:
            st === "verified"
              ? `Your e-bike registration (${plate}) has been verified.`
              : `Your e-bike registration (${plate}) was rejected. Please check the requirements and resubmit.`,
          createdAt: new Date(ms).toLocaleDateString(),
          createdAtMs: ms
        });
      });

      items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setRegistrationNotifs(items);
    } catch (e) {
      console.error("Build registration notifs error:", e);
      setRegistrationNotifs([]);
    }
  }, [userData]);

  const systemNotifs = useMemo(() => {
    const all = [...(appointmentNotifs || []), ...(registrationNotifs || [])];
    all.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    return all;
  }, [appointmentNotifs, registrationNotifs]);

  const unreadCount = useMemo(() => {
    const annSeen = toMs(notifLastSeen?.announcements) ?? 0;
    const apptSeen = toMs(notifLastSeen?.appointment) ?? 0;
    const regSeen = toMs(notifLastSeen?.registration) ?? 0;

    let count = 0;

    (newsUpdates || []).forEach((n) => {
      const ms = Number(n?.createdAtMs || 0);
      if (ms > annSeen) count += 1;
    });

    (systemNotifs || []).forEach((n) => {
      const ms = Number(n?.createdAtMs || 0);
      if (n?.category === "appointment" && ms > apptSeen) count += 1;
      if (n?.category === "registration" && ms > regSeen) count += 1;
    });

    return count;
  }, [newsUpdates, systemNotifs, notifLastSeen]);

  const openNotifications = async () => {
    setNotifVisible(true);

    const now = new Date().toISOString();
    const next = { announcements: now, appointment: now, registration: now };
    setNotifLastSeen(next);

    try {
      if (userDocId) {
        await updateDoc(doc(db, "users", userDocId), { notifLastSeen: next });
      }
    } catch (e) {
      console.error("Failed to save notifLastSeen:", e);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        let foundDocId = null;
        let data = null;

        // 1) Try doc id = uid
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          foundDocId = userDocSnap.id;
          data = userDocSnap.data();
        } else {
          // 2) try uid field
          const usersRef = collection(db, "users");
          let q = query(usersRef, where("uid", "==", currentUser.uid));
          let querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            foundDocId = querySnapshot.docs[0].id;
            data = querySnapshot.docs[0].data();
          } else {
            // 3) try email
            q = query(usersRef, where("email", "==", currentUser.email));
            querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              foundDocId = querySnapshot.docs[0].id;
              data = querySnapshot.docs[0].data();
            }
          }
        }

        if (data && foundDocId) {
          const ebikes = normalizeUserEbikes(data);

          setUserDocId(foundDocId);
          setUserData({ ...data, _id: foundDocId, ebikes });

          if (ebikes.length > 0) setSelectedEbikeId(ebikes[0].id);

          // notifLastSeen init
          const existingSeen = data?.notifLastSeen;
          if (
            existingSeen &&
            (existingSeen.announcements || existingSeen.appointment || existingSeen.registration)
          ) {
            setNotifLastSeen({
              announcements: existingSeen.announcements || null,
              appointment: existingSeen.appointment || null,
              registration: existingSeen.registration || null
            });
          } else {
            const now = new Date().toISOString();
            const initSeen = { announcements: now, appointment: now, registration: now };
            setNotifLastSeen(initSeen);
            try {
              await updateDoc(doc(db, "users", foundDocId), { notifLastSeen: initSeen });
            } catch {
              // ignore
            }
          }

          /** riderRegistrations doc is keyed by UID (so use uid first) */
          await loadRiderDocuments(currentUser.uid || foundDocId);

          await refreshAppointmentNotifs(currentUser.uid, foundDocId);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
    refreshAnnouncements();

    const newsRotationTimer = setInterval(() => {
      setCurrentNewsIndex((prevIndex) =>
        newsUpdates.length > 1 ? (prevIndex + 1) % newsUpdates.length : 0
      );
    }, 5000);

    return () => clearInterval(newsRotationTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const timer = setInterval(() => {
      refreshAnnouncements();
      if (userDocId) refreshAppointmentNotifs(uid, userDocId);
    }, 20000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDocId]);

  const ebikes = useMemo(() => normalizeUserEbikes(userData || {}), [userData]);

  const selectedEbike = useMemo(() => {
    if (!ebikes || ebikes.length === 0) return null;
    return ebikes.find((e) => String(e.id) === String(selectedEbikeId)) || ebikes[0];
  }, [ebikes, selectedEbikeId]);

  const getCurrentNews = () => {
    return (
      newsUpdates[currentNewsIndex] || {
        headline: "Welcome to AIDE",
        details: "Stay tuned for latest updates",
        type: "System",
        createdAt: new Date().toLocaleDateString(),
        createdAtMs: Date.now()
      }
    );
  };

  const handleWhatsNew = () => {
    if (!userData) {
      Alert.alert(
        "E-bike Details",
        "No registration record was found for your account yet. Please complete your e-bike registration or try logging in again."
      );
      return;
    }
    if (!selectedEbikeId && ebikes.length > 0) setSelectedEbikeId(ebikes[0].id);
    setDetailsVisible(true);
  };

  const getDisplayName = () => {
    if (userData?.firstName) return userData.firstName;

    const currentUser = auth.currentUser;
    if (currentUser?.displayName) return currentUser.displayName;

    if (currentUser?.email) return currentUser.email.split("@")[0];

    return "Rider";
  };

  const getEbikeLabel = (e, idx) => {
    const plate = e?.plateNumber ? String(e.plateNumber).toUpperCase() : "NO PLATE";
    const brand = e?.ebikeBrand ? ` • ${e.ebikeBrand}` : "";
    return `E-bike ${idx + 1}: ${plate}${brand}`;
  };

  /* Render Stepper (used in E-bike Details modal + NOW also in Home above buttons) */
  const renderRegistrationStepper = (statusValue) => {
    const info = getRegistrationStepperInfo(statusValue);
    const currentIndex = info.index;

    return (
      <View style={styles.stepperWrap}>
        <View style={styles.stepperTopRow}>
          <Text style={styles.stepperTitle}>Registration Progress</Text>
          <View
            style={[
              styles.stepperStatusPill,
              info.mode === "rejected"
                ? styles.stepperPillRejected
                : info.mode === "done"
                ? styles.stepperPillDone
                : styles.stepperPillActive
            ]}
          >
            <Text style={styles.stepperStatusPillText}>{info.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.stepperRow}>
          {REG_STEPS.map((st, i) => {
            const isDone = info.mode !== "rejected" && i < currentIndex;
            const isActive = info.mode !== "rejected" && i === currentIndex;
            const isLast = i === REG_STEPS.length - 1;

            const dotStyle =
              info.mode === "rejected"
                ? styles.stepDotRejected
                : isDone
                ? styles.stepDotDone
                : isActive
                ? styles.stepDotActive
                : styles.stepDotTodo;

            const lineStyle =
              info.mode === "rejected"
                ? styles.stepLineRejected
                : i < currentIndex
                ? styles.stepLineDone
                : styles.stepLineTodo;

            return (
              <React.Fragment key={st.key}>
                <View style={[styles.stepDotBase, dotStyle]}>
                  <Text style={styles.stepDotText}>
                    {info.mode === "rejected" ? "!" : isDone ? "✓" : String(i + 1)}
                  </Text>
                </View>
                {!isLast ? <View style={[styles.stepLineBase, lineStyle]} /> : null}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.stepLabelsRow}>
          {REG_STEPS.map((st, i) => {
            const isDone2 = info.mode !== "rejected" && i < currentIndex;
            const isActive2 = info.mode !== "rejected" && i === currentIndex;

            return (
              <Text
                key={st.key}
                style={[
                  styles.stepLabel,
                  info.mode === "rejected"
                    ? styles.stepLabelRejected
                    : isDone2
                    ? styles.stepLabelDone
                    : isActive2
                    ? styles.stepLabelActive
                    : styles.stepLabelTodo
                ]}
                numberOfLines={1}
              >
                {st.label}
              </Text>
            );
          })}
        </View>

        <Text style={styles.stepNextText}>{info.nextText}</Text>
      </View>
    );
  };

  const renderEbikePickerModal = () => {
    return (
      <Modal
        visible={showEbikePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEbikePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEbikePicker(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { marginBottom: 10 }]}>Select E-Bike</Text>

            {ebikes.length === 0 ? (
              <Text style={styles.emptyDocsText}>No e-bike found.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {ebikes.map((e, idx) => {
                  const isSelected = String(selectedEbike?.id) === String(e.id);
                  const reg = getRegistrationStatusFromEbike(e);
                  return (
                    <TouchableOpacity
                      key={String(e.id)}
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => {
                        setSelectedEbikeId(e.id);
                        setShowEbikePicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected
                          ]}
                        >
                          {getEbikeLabel(e, idx)}
                        </Text>
                        {reg && (
                          <Text style={[styles.pickerSubText, { color: reg.color }]}>
                            {reg.status}
                            {reg.status !== "Expired" ? ` • ${reg.daysLeft} days` : ""}
                          </Text>
                        )}
                      </View>
                      {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Category Picker for Add New E-bike
  const renderAddCategoryPickerModal = () => {
    return (
      <Modal
        visible={addCategoryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCategoryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAddCategoryVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { marginBottom: 10 }]}>Select E-Bike Category</Text>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {EBIKE_CATEGORIES.map((c) => {
                const isSel = String(addEbikeForm.ebikeCategorySelected) === String(c.value);
                return (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.pickerItem, isSel && styles.pickerItemSelected]}
                    onPress={() => {
                      setAddEbikeForm((p) => ({ ...p, ebikeCategorySelected: c.value }));
                      setAddCategoryVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSel && styles.pickerItemTextSelected]}>
                      {c.label}
                    </Text>
                    {isSel ? <Text style={styles.checkMark}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAddEbikeModal = () => {
    return (
      <Modal
        visible={addEbikeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (addEbikeLoading) return;
          setAddEbikeVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.addEbikeCard}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  if (addEbikeLoading) return;
                  setAddEbikeVisible(false);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>

              <ScrollView
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalTitle}>Add New E-Bike</Text>
                <Text style={styles.auditHint}>
                  This will be added as a new registration (Pending for verification).
                </Text>

                <Text style={styles.inputLabel}>E-Bike Brand</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="Enter E-bike brand"
                    placeholderTextColor="#999"
                    value={addEbikeForm.ebikeBrand}
                    onChangeText={(v) =>
                      setAddEbikeForm((p) => ({ ...p, ebikeBrand: toUpper(v) }))
                    }
                    editable={!addEbikeLoading}
                    autoCapitalize="characters"
                  />
                </View>

                <Text style={styles.inputLabel}>Model Unit</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="Enter model unit"
                    placeholderTextColor="#999"
                    value={addEbikeForm.ebikeModel}
                    onChangeText={(v) =>
                      setAddEbikeForm((p) => ({ ...p, ebikeModel: toUpper(v) }))
                    }
                    editable={!addEbikeLoading}
                    autoCapitalize="characters"
                  />
                </View>

                <Text style={styles.inputLabel}>E-Bike Color</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="Enter E-bike color"
                    placeholderTextColor="#999"
                    value={addEbikeForm.ebikeColor}
                    onChangeText={(v) =>
                      setAddEbikeForm((p) => ({ ...p, ebikeColor: toUpper(v) }))
                    }
                    editable={!addEbikeLoading}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Category select (same like signup) */}
                <Text style={styles.inputLabel}>E-Bike Category</Text>
                <TouchableOpacity
                  style={styles.selectField}
                  onPress={() => {
                    if (addEbikeLoading) return;
                    setAddCategoryVisible(true);
                  }}
                  activeOpacity={0.9}
                  disabled={addEbikeLoading}
                >
                  <Text
                    style={[
                      styles.selectFieldText,
                      !addEbikeForm.ebikeCategorySelected && { color: "#999" }
                    ]}
                    numberOfLines={2}
                  >
                    {addEbikeForm.ebikeCategorySelected
                      ? getCategoryLabel(addEbikeForm.ebikeCategorySelected)
                      : "Select E-Bike Category"}
                  </Text>
                  <Text style={styles.selectFieldChevron}>⌄</Text>
                </TouchableOpacity>
                <Text style={styles.helpSmall}>Select category (same as sign up).</Text>

                <Text style={styles.inputLabel}>Chassis / Motor Number</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="10–12 or 15–20 digits, or type 'none'"
                    placeholderTextColor="#999"
                    value={addEbikeForm.chassisMotorNumber}
                    onChangeText={(v) =>
                      setAddEbikeForm((p) => ({ ...p, chassisMotorNumber: v }))
                    }
                    editable={!addEbikeLoading}
                  />
                </View>
                <Text style={styles.helpSmall}>
                  Chassis: 10–12 digits / Motor: 15–20 digits / or type "none"
                </Text>

                <Text style={styles.inputLabel}>Branch</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="Store where purchased"
                    placeholderTextColor="#999"
                    value={addEbikeForm.branch}
                    onChangeText={(v) => setAddEbikeForm((p) => ({ ...p, branch: toUpper(v) }))}
                    editable={!addEbikeLoading}
                    autoCapitalize="characters"
                  />
                </View>

                <Text style={styles.inputLabel}>Plate Number</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="e.g., AB1234"
                    placeholderTextColor="#999"
                    value={addEbikeForm.plateNumber}
                    onChangeText={(v) =>
                      setAddEbikeForm((p) => ({ ...p, plateNumber: toUpper(v) }))
                    }
                    editable={!addEbikeLoading && !addNoPlateNumber}
                    maxLength={6}
                    autoCapitalize="characters"
                  />
                </View>
                <Text style={styles.helpSmall}>
                  Format: 2 letters followed by 4 numbers (e.g., AB1234)
                </Text>

                <View style={styles.checkboxRowAdd}>
                  <TouchableOpacity
                    style={[styles.checkboxAdd, addNoPlateNumber && styles.checkboxAddChecked]}
                    onPress={() => {
                      if (addEbikeLoading) return;
                      setAddNoPlateNumber((prev) => !prev);
                      if (!addNoPlateNumber) {
                        setAddEbikeForm((p) => ({ ...p, plateNumber: "" }));
                      }
                    }}
                  >
                    {addNoPlateNumber ? <Text style={styles.checkboxTick}>✓</Text> : null}
                  </TouchableOpacity>
                  <Text style={styles.checkboxTextAdd}>
                    Check this if this is your e-bike&apos;s first registration and you don&apos;t
                    have a plate number yet.
                  </Text>
                </View>

                {/*Upload E-bike Photos */}
                <Text style={styles.inputLabel}>Upload E-Bike Photos</Text>
                <Text style={styles.auditHint}>
                  Upload clear photos (front/side). Max {MAX_ADD_EBIKE_PHOTOS} photos.
                </Text>

                <TouchableOpacity
                  style={[styles.photoPickBtn, addEbikeLoading && styles.btnDisabled]}
                  onPress={pickAddEbikePhotos}
                  disabled={addEbikeLoading}
                  activeOpacity={0.9}
                >
                  <Text style={styles.photoPickBtnText}>
                    {addEbikePhotos.length > 0 ? "+ Add Photo" : "Select Photos"}
                  </Text>
                </TouchableOpacity>

                {addEbikePhotos.length === 0 ? (
                  <Text style={styles.emptyDocsText}>No photos selected.</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8, marginBottom: 6 }}
                    nestedScrollEnabled
                  >
                    {addEbikePhotos.map((p) => (
                      <View key={p.id} style={styles.photoThumbWrap}>
                        <TouchableOpacity
                          onPress={() => openImageViewer(p.uri, "Selected E-Bike Photo")}
                          activeOpacity={0.9}
                        >
                          <Image source={{ uri: p.uri }} style={styles.photoThumb} resizeMode="cover" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.photoRemoveBtn}
                          onPress={() => removeAddEbikePhoto(p.id)}
                          disabled={addEbikeLoading}
                        >
                          <Text style={styles.photoRemoveText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity
                  style={[styles.addSubmitBtn, addEbikeLoading && styles.btnDisabled]}
                  onPress={submitAddNewEbike}
                  disabled={addEbikeLoading}
                >
                  <Text style={styles.addSubmitBtnText}>
                    {addEbikeLoading ? "Saving..." : "Submit New E-Bike"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addCancelBtn, addEbikeLoading && styles.btnDisabled]}
                  onPress={() => {
                    if (addEbikeLoading) return;
                    setAddEbikeVisible(false);
                  }}
                  disabled={addEbikeLoading}
                >
                  <Text style={styles.addCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  const renderDetailsModal = () => {
    if (!userData) return null;

    const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "N/A";

    const regObj = getRegistrationStatusFromEbike(selectedEbike);
    const regStatusText = regObj
      ? `${regObj.status}${regObj.status !== "Expired" ? ` (${regObj.daysLeft} days)` : ""}`
      : selectedEbike?.registrationStatus || userData?.registrationStatus || "N/A";

    const txs = selectedEbike ? getEbikeTransactions(selectedEbike) : [];

    // NEW: Payment Amount row will show only Paid / Not Paid
    const paymentStatusText = getPaymentStatusText(selectedEbike, txs);

    const allReceipt = Array.from(
      new Set(
        txs
          .flatMap((tx) =>
            Array.isArray(tx?.adminVerificationDocs?.receipt) ? tx.adminVerificationDocs.receipt : []
          )
          .filter(Boolean)
      )
    );

    const allEbike = Array.from(
      new Set(
        txs
          .flatMap((tx) =>
            Array.isArray(tx?.adminVerificationDocs?.ebikePhotos)
              ? tx.adminVerificationDocs.ebikePhotos
              : []
          )
          .filter(Boolean)
      )
    );

    const legacyAdminImgs = Array.isArray(selectedEbike?.adminVerificationImages)
      ? selectedEbike.adminVerificationImages
      : Array.isArray(userData?.adminVerificationImages)
      ? userData.adminVerificationImages
      : [];

    /** route riderDocs into correct sections */
    const riderGovIdDocs = (riderDocs || []).filter(isGovIdDoc);
    const riderGovIdUrls = Array.from(new Set(riderGovIdDocs.map((d) => d?.url).filter(Boolean)));

    // filter ebike photos by selected ebikeId when present
    const riderSignupEbikeDocs = (riderDocs || []).filter((d) => {
      if (!isEbikePhotoDoc(d)) return false;
      if (!d?.ebikeId) return true; // legacy / signup
      return String(d.ebikeId) === String(selectedEbike?.id);
    });

    const riderSignupEbikeUrls = Array.from(
      new Set(riderSignupEbikeDocs.map((d) => d?.url).filter(Boolean))
    );

    // combine signup ebike photos + admin/transaction ebike photos
    const mergedEbikePhotos = Array.from(
      new Set([...(riderSignupEbikeUrls || []), ...(allEbike || [])])
    ).filter(Boolean);

    // everything else should stay in "Rider Uploaded Documents"
    const riderOtherDocs = (riderDocs || []).filter((d) => !isGovIdDoc(d) && !isEbikePhotoDoc(d));

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
              style={styles.detailsScroll}
              contentContainerStyle={styles.detailsScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>E-bike Details</Text>

              {renderRegistrationStepper(selectedEbike?.status || userData?.status || "Pending")}

              {ebikes.length > 1 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Select E-Bike Registration</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setShowEbikePicker(true)}>
                    <Text style={styles.selectBtnText}>
                      {selectedEbike?.plateNumber
                        ? String(selectedEbike.plateNumber).toUpperCase()
                        : "NO PLATE"}
                    </Text>
                    <Text style={styles.selectBtnChevron}>⌄</Text>
                  </TouchableOpacity>

                  {regObj && (
                    <View
                      style={[
                        styles.statusPill,
                        { borderColor: regObj.color, backgroundColor: regObj.color + "15" }
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: regObj.color }]}>
                        {regStatusText}
                      </Text>
                    </View>
                  )}
                </View>
              )}

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
                  <Text style={styles.detailValue}>
                    {selectedEbike?.plateNumber
                      ? String(selectedEbike.plateNumber).toUpperCase()
                      : "N/A"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Brand</Text>
                  <Text style={styles.detailValue}>{selectedEbike?.ebikeBrand || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Model</Text>
                  <Text style={styles.detailValue}>{selectedEbike?.ebikeModel || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Color</Text>
                  <Text style={styles.detailValue}>{selectedEbike?.ebikeColor || "N/A"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chassis/Motor No.</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.chassisMotorNumber || "N/A"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Branch</Text>
                  <Text style={styles.detailValue}>{selectedEbike?.branch || "N/A"}</Text>
                </View>
              </View>

              {/* Registration Details */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Registration Details</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Status</Text>
                  <Text style={styles.detailValue}>{userData.status || "Pending"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>E-bike Status</Text>
                  <Text style={styles.detailValue}>
                    {selectedEbike?.status || userData.status || "Pending"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registration Status</Text>
                  <Text style={styles.detailValue}>{regStatusText}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>
                    {getCategoryLabel(selectedEbike?.ebikeCategorySelected)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registered Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedEbike?.registeredDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Renewal Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedEbike?.renewalDate)}</Text>
                </View>

                {/* ✅ CHANGED: Payment Amount now shows Paid / Not Paid only */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Amount</Text>
                  <Text style={styles.detailValue}>{paymentStatusText}</Text>
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

                {!docsLoading &&
                  riderGovIdUrls.length === 0 &&
                  mergedEbikePhotos.length === 0 &&
                  riderOtherDocs.length === 0 &&
                  legacyAdminImgs.length === 0 &&
                  allReceipt.length === 0 && (
                    <Text style={styles.emptyDocsText}>No uploaded documents found.</Text>
                  )}

                {!docsLoading && (
                  <>
                    {/* ✅ NEW: Rider Uploaded ID */}
                    <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Rider Uploaded ID</Text>
                    <Text style={styles.auditHint}>Government Valid ID / Driver’s License</Text>

                    {riderGovIdUrls.length === 0 ? (
                      <Text style={styles.emptyDocsText}>No ID uploaded.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.docsScroll}
                        nestedScrollEnabled
                      >
                        {riderGovIdUrls.map((url, idx) => (
                          <TouchableOpacity
                            key={`gid_${idx}`}
                            onPress={() => openImageViewer(url, "Rider Uploaded ID")}
                          >
                            <Image source={{ uri: url }} style={styles.docThumb} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    {/* Receipt */}
                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Photo of the Receipt</Text>

                    {allReceipt.length === 0 ? (
                      <Text style={styles.emptyDocsText}>No receipt photos.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.docsScroll}
                        nestedScrollEnabled
                      >
                        {allReceipt.map((url, idx) => (
                          <TouchableOpacity
                            key={`all_r_${idx}`}
                            onPress={() => openImageViewer(url, "Receipt Photo")}
                          >
                            <Image source={{ uri: url }} style={styles.docThumb} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    {/* E-bike photo now includes SIGNUP photos + admin photos */}
                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>E-Bike Photo</Text>

                    {mergedEbikePhotos.length === 0 ? (
                      <Text style={styles.emptyDocsText}>No e-bike photos.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.docsScroll}
                        nestedScrollEnabled
                      >
                        {mergedEbikePhotos.map((url, idx) => (
                          <TouchableOpacity
                            key={`all_e_${idx}`}
                            onPress={() => openImageViewer(url, "E-Bike Photo")}
                          >
                            <Image source={{ uri: url }} style={styles.docThumb} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}

                {/* Rider Uploaded Documents = EXCLUDE gov id + signup ebike photos */}
                {!docsLoading && riderOtherDocs.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
                      Rider Uploaded Documents
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.docsScroll}
                      nestedScrollEnabled
                    >
                      {riderOtherDocs.map((d) => {
                        const badge =
                          isGovIdDoc(d) ? "🪪" : isEbikePhotoDoc(d) ? "🚲" : d.type === "original" ? "📝" : "✅";

                        return (
                          <TouchableOpacity
                            key={d.id}
                            style={styles.docThumbContainer}
                            onPress={() => d.url && openImageViewer(d.url, "Rider Uploaded Document")}
                          >
                            {d.url ? (
                              <Image source={{ uri: d.url }} style={styles.docThumb} resizeMode="cover" />
                            ) : (
                              <View style={[styles.docThumb, styles.docThumbPlaceholder]}>
                                <Text style={styles.docThumbPlaceholderText}>No Image</Text>
                              </View>
                            )}
                            <View style={styles.docTypeBadge}>
                              <Text style={styles.docTypeBadgeText}>{badge}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                {!docsLoading && legacyAdminImgs.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
                      Admin Verification (Legacy)
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.docsScroll}
                      nestedScrollEnabled
                    >
                      {legacyAdminImgs.map((url, index) => (
                        <TouchableOpacity
                          key={index.toString()}
                          style={styles.docThumbContainer}
                          onPress={() => url && openImageViewer(url, "Admin Verification")}
                        >
                          <Image source={{ uri: url }} style={styles.docThumb} resizeMode="cover" />
                          <View style={styles.docTypeBadge}>
                            <Text style={styles.docTypeBadgeText}>✅</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </View>

              {/* Transaction History REMOVED as requested */}
              {/* NOTE: Tinanggal ko yung old Add New button dito (inside ScrollView) */}
            </ScrollView>

            {/* STICKY Add New E-bike button (always visible) */}
            <TouchableOpacity
              style={styles.addNewEbikeStickyBtn}
              onPress={() => {
                resetAddEbikeForm();
                setAddEbikeVisible(true);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.addNewEbikeBtnText}>+ Add New E-Bike</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

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
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setNotifVisible(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { marginBottom: 10 }]}>Announcements & Updates</Text>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {/* System Updates */}
              <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>System Updates</Text>
              {systemNotifs.length === 0 ? (
                <Text style={styles.emptyDocsText}>No system updates yet.</Text>
              ) : (
                systemNotifs.map((item) => (
                  <View key={item.id} style={styles.notifItem}>
                    <Text style={styles.notifHeadline}>{item.headline}</Text>
                    <Text style={styles.notifDetails}>{item.details}</Text>
                    <Text style={styles.notifDate}>{item.createdAt}</Text>
                  </View>
                ))
              )}

              {/* Announcements */}
              <Text style={[styles.sectionTitle, { marginTop: 10, marginBottom: 8 }]}>Announcements</Text>
              {newsUpdates.length === 0 ? (
                <Text style={styles.emptyDocsText}>No announcements yet.</Text>
              ) : (
                newsUpdates.map((item) => (
                  <View key={item.id || item.headline} style={styles.notifItem}>
                    <Text style={styles.notifHeadline}>{item.headline}</Text>
                    <Text style={styles.notifDetails}>{item.details}</Text>
                    <Text style={styles.notifDate}>{item.createdAt}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderImageViewerModal = () => {
    const BASE_W = SCREEN_WIDTH;
    const BASE_H = SCREEN_HEIGHT * 0.72;

    const scaledW = BASE_W * imgViewerScale;
    const scaledH = BASE_H * imgViewerScale;

    return (
      <Modal
        visible={imgViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerCard}>
            <TouchableOpacity style={styles.viewerCloseBtn} onPress={closeImageViewer}>
              <Text style={styles.viewerCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.viewerTitle}>{imgViewerTitle || "Preview"}</Text>

            <View style={{ flex: 1, width: "100%", overflow: "hidden" }}>
              <ScrollView
                style={{ flex: 1 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 14 }}
              >
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 14 }}
                >
                  <View style={{ width: scaledW, height: scaledH }}>
                    {imgViewerUrl ? (
                      <Image
                        source={{ uri: imgViewerUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="contain"
                      />
                    ) : null}
                  </View>
                </ScrollView>
              </ScrollView>
            </View>

            <View style={styles.viewerControlsRow}>
              <Pressable style={styles.viewerCtrlBtn} onPress={viewerZoomOut}>
                <Text style={styles.viewerCtrlText}>−</Text>
              </Pressable>

              <View style={styles.viewerScalePill}>
                <Text style={styles.viewerScaleText}>{Math.round(imgViewerScale * 100)}%</Text>
              </View>

              <Pressable style={styles.viewerCtrlBtn} onPress={viewerZoomIn}>
                <Text style={styles.viewerCtrlText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.viewerHint}>Tip: Use + / − to zoom, then drag (scroll) to pan.</Text>
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

        {/* Bell with badge */}
        <Pressable onPress={openNotifications} style={styles.bellButton}>
          <Image source={BellIcon} style={styles.headerIcon} resizeMode="contain" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeText}>Welcome, {getDisplayName()}</Text>
          <Text style={styles.subtitleText}>Your journey starts here</Text>
        </View>

        {/*TRACKER STEP-BY-STEP ABOVE THE TWO BUTTONS */}
        <View style={styles.homeStepperContainer}>
          {renderRegistrationStepper(selectedEbike?.status || userData?.status || "Pending")}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleWhatsNew}>
            <Text style={styles.quickActionText}>E-bike Details</Text>
          </TouchableOpacity>

          {/* Ordinance screen NOT modified (as you requested) */}
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Ordinance")}
          >
            <Text style={styles.quickActionText}>Ordinance</Text>
          </TouchableOpacity>
        </View>

        {/* Green Route Section (Map preview only) */}
        <View style={styles.mapPreviewContainer}>
          <View style={styles.mapPreviewHeader}>
            <Text style={styles.mapPreviewTitle}>Green Routes in Binan</Text>
          </View>

          <View style={styles.mapOnlyWrapper}>
            <View style={{ flex: 1 }}>
              <WebView originWhitelist={["*"]} source={{ html: BINAN_MAPS_EMBED }} style={styles.webview} />

              <TouchableOpacity
                style={styles.mapFloatingBtn}
                onPress={() => navigation.navigate("GreenRouteMap")}
                activeOpacity={0.85}
              >
                <Text style={styles.mapFloatingBtnText}>Open Full Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* News preview */}
        <View style={styles.newsContainer}>
          <Text style={styles.newsSectionTitle}>Latest Updates</Text>
          <View style={styles.newsCard}>
            <Text style={styles.newsHeadline}>{getCurrentNews().headline}</Text>
            <Text style={styles.newsDetails}>{getCurrentNews().details}</Text>
            <Text style={styles.newsDate}>{getCurrentNews().createdAt}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("HomeRider")}>
          <Image source={HomeIcon} style={styles.navIconImg} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Appointment")}>
          <Image source={ScheduleIcon} style={styles.navIconImg} />
          <Text style={styles.navLabel}>Appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("Me")}>
          <Image source={UserIcon} style={styles.navIconImg} />
          <Text style={styles.navLabel}>Me</Text>
        </TouchableOpacity>
      </View>

      {renderDetailsModal()}
      {renderEbikePickerModal()}
      {renderAddCategoryPickerModal()}
      {renderNotificationsModal()}
      {renderAddEbikeModal()}
      {renderImageViewerModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { flex: 1 },

  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0"
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#2E7D32" },
  headerIcon: { width: 24, height: 24, tintColor: "#2E7D32" },

  bellButton: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },

  greetingSection: { paddingHorizontal: 20, paddingVertical: 15 },
  welcomeText: { fontSize: 22, fontWeight: "600", color: "#2E7D32" },
  subtitleText: { color: "gray", marginTop: 5 },

  /* spacing for stepper above buttons */
  homeStepperContainer: {
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 6
  },

  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginVertical: 10
  },
  quickActionButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  quickActionText: { color: "white" },

  mapPreviewContainer: {
    backgroundColor: "#F5F5F5",
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: "hidden"
  },
  mapPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingBottom: 0
  },
  mapPreviewTitle: { fontSize: 18, fontWeight: "700", color: "#2E7D32" },

  webview: { flex: 1 },
  mapOnlyWrapper: { width: "100%", height: 250 },

  mapFloatingBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(46,125,50,0.92)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999
  },
  mapFloatingBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },

  newsContainer: { paddingHorizontal: 20, marginVertical: 15 },
  newsSectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#2E7D32" },
  newsCard: { backgroundColor: "#F5F5F5", borderRadius: 10, padding: 15 },
  newsHeadline: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  newsDetails: { color: "#757575", marginBottom: 10 },
  newsDate: { color: "#9E9E9E", fontSize: 12, alignSelf: "flex-end" },

  bottomNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#2E7D32",
    paddingVertical: 10
  },
  navItem: { alignItems: "center" },
  navIconImg: { width: 24, height: 24, tintColor: "white" },
  navLabel: { color: "white", fontSize: 12, marginTop: 5 },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCard: {
    width: "90%",
    height: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  notifCard: {
    width: "90%",
    height: "70%",
    backgroundColor: "white",
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 16
  },
  pickerCard: {
    width: "90%",
    height: "55%",
    backgroundColor: "white",
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 16
  },
  addEbikeCard: {
    width: "90%",
    height: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 16
  },

  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#EEEEEE",
    zIndex: 50
  },
  modalCloseText: { fontSize: 16, fontWeight: "700", color: "#333" },
  modalScrollContent: { paddingBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#2E7D32" },

  /* E-bike Details Scroll fix styles */
  detailsScroll: {
    flex: 1,
    width: "100%"
  },
  detailsScrollContent: {
    paddingBottom: 120, // extra space para di matakpan ng sticky button
    flexGrow: 1
  },

  detailSection: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8, color: "#2C3E50" },
  detailRow: { flexDirection: "row", marginBottom: 6 },
  detailLabel: { width: "40%", fontSize: 13, fontWeight: "600", color: "#7F8C8D" },
  detailValue: { width: "60%", fontSize: 13, color: "#2C3E50", flexWrap: "wrap" },

  selectBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  selectBtnText: { fontSize: 14, fontWeight: "700", color: "#2C3E50" },
  selectBtnChevron: { fontSize: 18, fontWeight: "800", color: "#2E7D32" },

  statusPill: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start"
  },
  statusPillText: { fontSize: 12, fontWeight: "800" },

  docsLoading: { flexDirection: "row", alignItems: "center" },
  docsLoadingText: { marginLeft: 8, fontSize: 13, color: "#555" },
  emptyDocsText: { fontSize: 13, color: "#7F8C8D" },
  docsScroll: { marginTop: 6 },

  docThumbContainer: { marginRight: 8, position: "relative" },
  docThumb: { width: 90, height: 90, borderRadius: 8, backgroundColor: "#DDD", marginRight: 8 },
  docThumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  docThumbPlaceholderText: { fontSize: 11, color: "#777" },
  docTypeBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  docTypeBadgeText: { color: "white", fontSize: 11, fontWeight: "700" },

  notifItem: { backgroundColor: "#F5F5F5", borderRadius: 10, padding: 12, marginBottom: 10 },
  notifHeadline: { fontSize: 15, fontWeight: "700", color: "#2C3E50", marginBottom: 4 },
  notifDetails: { fontSize: 13, color: "#555", marginBottom: 6 },
  notifDate: { fontSize: 11, color: "#888", textAlign: "right" },

  auditHint: { fontSize: 12, color: "#7F8C8D", marginBottom: 10 },

  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  pickerItemSelected: { borderColor: "#2E7D32", backgroundColor: "#E6F3EC" },
  pickerItemText: { fontSize: 14, fontWeight: "700", color: "#2C3E50", flex: 1 },
  pickerItemTextSelected: { color: "#2E7D32" },
  pickerSubText: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  checkMark: { fontSize: 18, fontWeight: "900", color: "#2E7D32", marginLeft: 10 },

  addNewEbikeBtn: {
    backgroundColor: "#E6F3EC",
    borderWidth: 1,
    borderColor: "#2E7D32",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: "flex-start"
  },
  addNewEbikeBtnText: { color: "#2E7D32", fontWeight: "800" },

  // Sticky button style
  addNewEbikeStickyBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
    backgroundColor: "#E6F3EC",
    borderWidth: 1,
    borderColor: "#2E7D32",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    zIndex: 60
  },

  inputLabel: { fontSize: 13, fontWeight: "800", color: "#2C3E50", marginBottom: 6 },
  inputBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12
  },
  inputText: { fontSize: 14, color: "#000" },
  helpSmall: { marginTop: -6, marginBottom: 12, fontSize: 12, color: "#777", fontStyle: "italic" },

  // NEW: Category select field style
  selectField: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  selectFieldText: { flex: 1, fontSize: 13, fontWeight: "800", color: "#2C3E50", marginRight: 10 },
  selectFieldChevron: { fontSize: 18, fontWeight: "900", color: "#2E7D32" },

  checkboxRowAdd: { flexDirection: "row", alignItems: "center", marginTop: 2, marginBottom: 14 },
  checkboxAdd: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#FFF"
  },
  checkboxAddChecked: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  checkboxTick: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  checkboxTextAdd: { flex: 1, fontSize: 12, color: "#444" },

  // ✅ NEW: Photo picker styles
  photoPickBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#2E7D32",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 6
  },
  photoPickBtnText: { color: "#2E7D32", fontWeight: "900" },

  photoThumbWrap: { marginRight: 10, position: "relative" },
  photoThumb: { width: 90, height: 90, borderRadius: 10, backgroundColor: "#DDD" },
  photoRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center"
  },
  photoRemoveText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  addSubmitBtn: { backgroundColor: "#2E7D32", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 6 },
  addSubmitBtnText: { color: "#FFF", fontWeight: "900" },

  addCancelBtn: { backgroundColor: "#EEEEEE", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 10 },
  addCancelBtnText: { color: "#333", fontWeight: "900" },

  btnDisabled: { opacity: 0.6 },

  /* ✅ STEPPER STYLES */
  stepperWrap: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EAEAEA"
  },
  stepperTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  stepperTitle: { fontSize: 14, fontWeight: "900", color: "#2C3E50" },
  stepperStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  stepperPillActive: { backgroundColor: "#E6F3EC", borderWidth: 1, borderColor: "#2E7D32" },
  stepperPillDone: { backgroundColor: "#E6F3EC", borderWidth: 1, borderColor: "#2E7D32" },
  stepperPillRejected: { backgroundColor: "#FFEBEE", borderWidth: 1, borderColor: "#D32F2F" },
  stepperStatusPillText: { fontSize: 12, fontWeight: "900", color: "#2C3E50" },

  stepperRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  stepDotBase: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepDotTodo: { backgroundColor: "#E0E0E0" },
  stepDotActive: { backgroundColor: "#2E7D32" },
  stepDotDone: { backgroundColor: "#2E7D32" },
  stepDotRejected: { backgroundColor: "#D32F2F" },
  stepDotText: { color: "#FFF", fontSize: 13, fontWeight: "900" },

  stepLineBase: { flex: 1, height: 3, borderRadius: 999, marginHorizontal: 6 },
  stepLineTodo: { backgroundColor: "#E0E0E0" },
  stepLineDone: { backgroundColor: "#2E7D32" },
  stepLineRejected: { backgroundColor: "#D32F2F" },

  stepLabelsRow: { flexDirection: "row", justifyContent: "space-between" },
  stepLabel: { flex: 1, textAlign: "center", fontSize: 10, fontWeight: "800" },
  stepLabelTodo: { color: "#8A8A8A" },
  stepLabelActive: { color: "#2E7D32" },
  stepLabelDone: { color: "#2E7D32" },
  stepLabelRejected: { color: "#D32F2F" },

  stepNextText: { marginTop: 8, fontSize: 12, color: "#555", fontWeight: "700" },

  /* IMAGE VIEWER MODAL STYLES */
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center"
  },
  viewerCard: {
    width: "94%",
    height: "86%",
    backgroundColor: "#111",
    borderRadius: 16,
    paddingTop: 42,
    paddingHorizontal: 12,
    overflow: "hidden"
  },
  viewerCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center"
  },
  viewerCloseText: { fontSize: 16, fontWeight: "900", color: "#111" },
  viewerTitle: { color: "#FFF", fontSize: 16, fontWeight: "900", alignSelf: "center", marginBottom: 6 },
  viewerControlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 10 },
  viewerCtrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center"
  },
  viewerCtrlText: { fontSize: 20, fontWeight: "900", color: "#2E7D32" },
  viewerScalePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  viewerScaleText: { color: "#FFF", fontWeight: "900" },
  viewerHint: { color: "rgba(255,255,255,0.75)", fontSize: 12, textAlign: "center", marginBottom: 10 }
});
