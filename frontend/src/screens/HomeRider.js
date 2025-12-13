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
  Linking,
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
  runTransaction
} from "firebase/firestore";

// Static Assets
const MenuIcon = require("../../assets/ic_menu.png");
const BellIcon = require("../../assets/bell.png");

// NEW ICONS
const HomeIcon = require("../../assets/home.png");
const ScheduleIcon = require("../../assets/schedule.png");
const UserIcon = require("../../assets/user.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** ✅ UPDATED categories (support NEW + LEGACY values) */
const EBIKE_CATEGORIES = [
  // New (your admin side)
  { label: "CATEGORY L1A", value: "L1A" },
  { label: "CATEGORY L1B", value: "L1B" },
  { label: "CATEGORY L2A", value: "L2A" },
  { label: "CATEGORY L2B", value: "L2B" },

  // Legacy fallback (keep if may old data)
  { label: "Category L1 (e-Moped 2w)", value: "L1" },
  { label: "Category L2 (e-Moped 3w)", value: "L2" },
  { label: "Category L3 (e-Motorcycle)", value: "L3" },
  { label: "Category L4 and L5 (e-Tricycle/e-Three Wheeled Vehicle)", value: "L4L5" },
  { label: "Category L6 and L7 (e-Quad)", value: "L6L7" },
  { label: "Category M1 (e-Car, 6-SUV)", value: "M1" },
  { label: "Category M2 (e-Utility Vehicle, e-jeepney)", value: "M2" },
  { label: "Category M3 (e-bus)", value: "M3" },
  { label: "Category N1 (e-truck)", value: "N1" },
  { label: "Category N2 (e-truck)", value: "N2" },
  { label: "Category N3 (e-truck)", value: "N3" }
];

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

/** ✅ Normalize ebikes (supports NEW schema + LEGACY single fields) */
const normalizeUserEbikes = (userData) => {
  // new schema
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

      // new docs schema
      adminVerificationDocs: e?.adminVerificationDocs || null,

      // per-ebike audit trail
      transactionHistory: Array.isArray(e?.transactionHistory) ? e.transactionHistory : [],

      // legacy (keep compatibility)
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

      adminVerificationDocs: userData?.adminVerificationDocs || null,
      transactionHistory: Array.isArray(userData?.transactionHistory) ? userData.transactionHistory : [],

      adminVerificationImages: Array.isArray(userData?.adminVerificationImages) ? userData.adminVerificationImages : [],
      paymentDetails: userData?.paymentDetails || null,
      createdAt: userData?.createdAt || null
    }
  ];
};

/** ✅ Transactions latest -> oldest (same idea as RiderScreen.js) */
const getEbikeTransactions = (ebike) => {
  const tx = Array.isArray(ebike?.transactionHistory) ? [...ebike.transactionHistory] : [];

  // fallback if verified but history missing
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

export default function HomeRider({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [userDocId, setUserDocId] = useState(null);

  const [riderDocs, setRiderDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  // ✅ multiple ebikes
  const [selectedEbikeId, setSelectedEbikeId] = useState(null);
  const [showEbikePicker, setShowEbikePicker] = useState(false);

  // ✅ ADD NEW EBIKE modal
  const [addEbikeVisible, setAddEbikeVisible] = useState(false);
  const [addEbikeLoading, setAddEbikeLoading] = useState(false);
  const [addNoPlateNumber, setAddNoPlateNumber] = useState(false);
  const [addEbikeForm, setAddEbikeForm] = useState({
    ebikeBrand: "",
    ebikeModel: "",
    ebikeColor: "",
    chassisMotorNumber: "",
    branch: "",
    plateNumber: ""
  });

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

  const toUpper = (v) => (v ?? "").toString().toUpperCase();
  const makeEbikeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const resetAddEbikeForm = () => {
    setAddEbikeForm({
      ebikeBrand: "",
      ebikeModel: "",
      ebikeColor: "",
      chassisMotorNumber: "",
      branch: "",
      plateNumber: ""
    });
    setAddNoPlateNumber(false);
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
    if (!validateChassisMotorNumber(addEbikeForm.chassisMotorNumber)) {
      Alert.alert(
        "Error",
        'Please enter Chassis Number (10-12 digits), Motor Number (15-20 digits), or type "none"'
      );
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

      const plate = addNoPlateNumber ? null : addEbikeForm.plateNumber.trim().toUpperCase();

      // ✅ local duplicate vs YOUR current ebikes
      if (plate) {
        const dupLocal = ebikes.some((e) => String(e?.plateNumber || "").toUpperCase() === plate);
        if (dupLocal) {
          Alert.alert("Error", `Plate number already in your account: ${plate}`);
          return;
        }
      }

      setAddEbikeLoading(true);

      // ✅ global uniqueness check (ignore sariling doc)
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

      const newItem = {
        id: makeEbikeId(),
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
        ebikeCategorySelected: "",
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

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) throw new Error("User document not found.");

        const data = snap.data() || {};

        // keep existing array
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

      // ✅ update local state (para mag-refresh agad UI)
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

  const loadRiderDocuments = async (docId) => {
    try {
      setDocsLoading(true);
      const imagesRef = collection(db, "riderRegistrations", docId, "images");
      const docsSnap = await getDocs(imagesRef);
      const docs = docsSnap.docs.map((d) => {
        const data = d.data();
        const url = data.url || data.imageUrl || data.downloadUrl || data.downloadURL || data.image;
        return {
          id: d.id,
          url,
          type: data.type || "original"
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

          // default select first ebike
          if (ebikes.length > 0) setSelectedEbikeId(ebikes[0].id);

          await loadRiderDocuments(foundDocId);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchNewsUpdates = async () => {
      try {
        const newsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const newsSnapshot = await getDocs(newsQuery);
        const newsList = newsSnapshot.docs.map((d) => ({
          id: d.id,
          headline: d.data().title || "AIDE Update",
          details: d.data().description || "No additional details",
          type: d.data().type || "Announcement",
          createdAt: d.data().createdAt
            ? new Date(d.data().createdAt.seconds * 1000).toLocaleDateString()
            : new Date().toLocaleDateString()
        }));

        if (newsList.length > 0) setNewsUpdates(newsList);
      } catch (error) {
        console.error("Error fetching news updates:", error);
      }
    };

    fetchUserData();
    fetchNewsUpdates();

    const newsRotationTimer = setInterval(() => {
      setCurrentNewsIndex((prevIndex) =>
        newsUpdates.length > 1 ? (prevIndex + 1) % newsUpdates.length : 0
      );
    }, 5000);

    return () => clearInterval(newsRotationTimer);
  }, []);

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
        createdAt: new Date().toLocaleDateString()
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
              <ScrollView showsVerticalScrollIndicator={false}>
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
                    onChangeText={(v) =>
                      setAddEbikeForm((p) => ({ ...p, branch: toUpper(v) }))
                    }
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

    // ✅ All docs across all transactions (new + old)
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

    // legacy adminVerificationImages (if still used)
    const legacyAdminImgs = Array.isArray(selectedEbike?.adminVerificationImages)
      ? selectedEbike.adminVerificationImages
      : Array.isArray(userData?.adminVerificationImages)
      ? userData.adminVerificationImages
      : [];

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

              {/* ✅ E-bike selector (only if multiple) */}
              {ebikes.length > 1 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Select E-Bike Registration</Text>
                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => setShowEbikePicker(true)}
                  >
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

              {/* ✅ E-bike Information (per selected e-bike) */}
              <View style={styles.detailSection}>
                {/* ✅ TITLE LEFT + BUTTON RIGHT (same line) */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0, flex: 1 }]}>
                    E-Bike Information
                  </Text>

                  <TouchableOpacity
                    style={[styles.addNewEbikeBtn, styles.addNewEbikeBtnInline]}
                    onPress={() => {
                      resetAddEbikeForm();
                      setAddEbikeVisible(true);
                    }}
                  >
                    <Text style={styles.addNewEbikeBtnText}>+ Add New E-Bike</Text>
                  </TouchableOpacity>
                </View>

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

              {/* ✅ Registration Details (per selected e-bike) */}
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
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Amount</Text>
                  <Text style={styles.detailValue}>
                    ₱{selectedEbike?.paymentDetails?.amount?.toFixed?.(2) || "0.00"}
                  </Text>
                </View>
              </View>

              {/* ✅✅ MOVED UP: Uploaded Documents (with Receipt + E-Bike Photos inside) */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Uploaded Documents</Text>

                {docsLoading ? (
                  <View style={styles.docsLoading}>
                    <ActivityIndicator size="small" color="#2E7D32" />
                    <Text style={styles.docsLoadingText}>Loading documents...</Text>
                  </View>
                ) : null}

                {!docsLoading &&
                  riderDocs.length === 0 &&
                  legacyAdminImgs.length === 0 &&
                  allReceipt.length === 0 &&
                  allEbike.length === 0 && (
                    <Text style={styles.emptyDocsText}>No uploaded documents found.</Text>
                  )}

                {/* ✅ Photo of the Receipt (inside Uploaded Documents) */}
                {!docsLoading && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Photo of the Receipt</Text>
                    <Text style={styles.auditHint}>New and old photo</Text>

                    {allReceipt.length === 0 ? (
                      <Text style={styles.emptyDocsText}>No receipt photos.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.docsScroll}
                      >
                        {allReceipt.map((url, idx) => (
                          <TouchableOpacity key={`all_r_${idx}`} onPress={() => Linking.openURL(url)}>
                            <Image source={{ uri: url }} style={styles.docThumb} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    {/* ✅ E-Bike Photo (inside Uploaded Documents) */}
                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>E-Bike Photo</Text>
                    <Text style={styles.auditHint}>New and old photo</Text>

                    {allEbike.length === 0 ? (
                      <Text style={styles.emptyDocsText}>No e-bike photos.</Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.docsScroll}
                      >
                        {allEbike.map((url, idx) => (
                          <TouchableOpacity key={`all_e_${idx}`} onPress={() => Linking.openURL(url)}>
                            <Image source={{ uri: url }} style={styles.docThumb} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}

                {/* Rider Uploaded Documents */}
                {!docsLoading && riderDocs.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Rider Uploaded Documents</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docsScroll}>
                      {riderDocs.map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={styles.docThumbContainer}
                          onPress={() => d.url && Linking.openURL(d.url)}
                        >
                          {d.url ? (
                            <Image source={{ uri: d.url }} style={styles.docThumb} resizeMode="cover" />
                          ) : (
                            <View style={[styles.docThumb, styles.docThumbPlaceholder]}>
                              <Text style={styles.docThumbPlaceholderText}>No Image</Text>
                            </View>
                          )}
                          <View style={styles.docTypeBadge}>
                            <Text style={styles.docTypeBadgeText}>{d.type === "original" ? "📝" : "✅"}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {/* Admin Verification (Legacy) */}
                {!docsLoading && legacyAdminImgs.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Admin Verification (Legacy)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docsScroll}>
                      {legacyAdminImgs.map((url, index) => (
                        <TouchableOpacity
                          key={index.toString()}
                          style={styles.docThumbContainer}
                          onPress={() => url && Linking.openURL(url)}
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

              {/* ✅ TRANSACTION HISTORY (NOW BELOW Uploaded Documents) */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <Text style={styles.auditHint}>Latest → Oldest</Text>

                {txs.length === 0 ? (
                  <Text style={styles.emptyDocsText}>No transactions recorded yet.</Text>
                ) : (
                  txs.map((tx, idx) => {
                    const rec = Array.isArray(tx?.adminVerificationDocs?.receipt)
                      ? tx.adminVerificationDocs.receipt
                      : [];
                    const ebp = Array.isArray(tx?.adminVerificationDocs?.ebikePhotos)
                      ? tx.adminVerificationDocs.ebikePhotos
                      : [];
                    const amt = Number(tx?.paymentDetails?.amount || 0);

                    return (
                      <View key={`${idx}_${String(tx?.createdAt || "")}`} style={styles.auditCard}>
                        <View style={styles.auditHeaderRow}>
                          <Text style={styles.auditTitle}>
                            {idx === 0 ? "Latest" : `#${idx + 1}`} • {tx?.type || "Transaction"}
                          </Text>
                          <Text style={styles.auditDate}>
                            {formatDate(tx?.createdAt || tx?.paymentDetails?.verifiedAt)}
                          </Text>
                        </View>

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
                                <TouchableOpacity key={`r_${idx}_${i}`} onPress={() => Linking.openURL(url)}>
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
                                <TouchableOpacity key={`e_${idx}_${i}`} onPress={() => Linking.openURL(url)}>
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
            </ScrollView>
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

            {newsUpdates.length === 0 ? (
              <Text style={styles.emptyDocsText}>No announcements yet.</Text>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
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
          <Image source={BellIcon} style={styles.headerIcon} resizeMode="contain" />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeText}>Welcome, {getDisplayName()}</Text>
          <Text style={styles.subtitleText}>Your journey starts here</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleWhatsNew}>
            <Text style={styles.quickActionText}>E-bike Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Ordinance")}
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
              onPress={() => navigation.navigate("GreenRouteMap")}
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
      {renderNotificationsModal()}
      {renderAddEbikeModal()}
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

  greetingSection: { paddingHorizontal: 20, paddingVertical: 15 },
  welcomeText: { fontSize: 22, fontWeight: "600", color: "#2E7D32" },
  subtitleText: { color: "gray", marginTop: 5 },

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
  openMapButton: { paddingVertical: 6, paddingHorizontal: 10 },
  openMapText: { color: "#2E7D32", fontWeight: "700" },

  mapWrapper: { height: 250, width: "100%" },
  webview: { flex: 1 },

  newsContainer: { paddingHorizontal: 20, marginVertical: 15 },
  newsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#2E7D32"
  },
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
    paddingHorizontal: 16
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
    backgroundColor: "#EEEEEE"
  },
  modalCloseText: { fontSize: 16, fontWeight: "700", color: "#333" },
  modalScrollContent: { paddingBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#2E7D32" },

  detailSection: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8, color: "#2C3E50" },

  /* ✅ NEW: header row for section title + right button */
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },

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

  /* 🔔 Notification item styles */
  notifItem: { backgroundColor: "#F5F5F5", borderRadius: 10, padding: 12, marginBottom: 10 },
  notifHeadline: { fontSize: 15, fontWeight: "700", color: "#2C3E50", marginBottom: 4 },
  notifDetails: { fontSize: 13, color: "#555", marginBottom: 6 },
  notifDate: { fontSize: 11, color: "#888", textAlign: "right" },

  /* ✅ HISTORY STYLES */
  auditHint: { fontSize: 12, color: "#7F8C8D", marginBottom: 10 },
  auditCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  auditHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  auditTitle: { fontSize: 13, fontWeight: "800", color: "#2C3E50" },
  auditDate: { fontSize: 12, color: "#7F8C8D" },
  auditRow: { flexDirection: "row", marginBottom: 6 },
  auditLabel: { width: "38%", color: "#7F8C8D", fontWeight: "700", fontSize: 12 },
  auditValue: { width: "62%", color: "#2C3E50", fontSize: 12 },
  auditSubTitle: { marginTop: 10, marginBottom: 8, fontSize: 12, fontWeight: "800", color: "#2C3E50" },
  auditThumb: { width: 80, height: 80, borderRadius: 10, marginRight: 10, marginBottom: 6 },

  /* ✅ Picker */
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
  pickerItemText: { fontSize: 14, fontWeight: "700", color: "#2C3E50" },
  pickerItemTextSelected: { color: "#2E7D32" },
  pickerSubText: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  checkMark: { fontSize: 18, fontWeight: "900", color: "#2E7D32", marginLeft: 10 },

  /* ✅ Add New E-bike button inside details */
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

  /* ✅ NEW: inline version para di malaki at walang extra margin */
  addNewEbikeBtnInline: {
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 10
  },

  /* ✅ Add E-bike form styles */
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

  addSubmitBtn: {
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6
  },
  addSubmitBtnText: { color: "#FFF", fontWeight: "900" },

  addCancelBtn: {
    backgroundColor: "#EEEEEE",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10
  },
  addCancelBtnText: { color: "#333", fontWeight: "900" },

  btnDisabled: { opacity: 0.6 }
});
