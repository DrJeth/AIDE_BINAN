import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth } from "../config/firebaseConfig";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const db = getFirestore();

function RegisterRider({ navigation }) {
  const [activeSection, setActiveSection] = useState("personal");

  // ✅ Scroll ref (for auto-scroll to bottom when editing)
  const scrollRef = useRef(null);

  // ✅ ebikes array (multiple registrations)
  const [ebikes, setEbikes] = useState([]);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "", // ✅ Middle Name (Optional)
    lastName: "",
    birthday: new Date(),
    contactNumber: "",
    address: "",

    // current ebike entry fields (eto yung i-aadd sa ebikes array)
    ebikeBrand: "",
    ebikeModel: "",
    ebikeColor: "",
    chassisMotorNumber: "",
    branch: "",
    plateNumber: "",

    // account fields
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ plate checkbox is per CURRENT ebike entry
  const [noPlateNumber, setNoPlateNumber] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ editing mode for added ebike
  const [editingEbikeId, setEditingEbikeId] = useState(null);

  // ✅ NEW: errors state for red highlight
  const [errors, setErrors] = useState({});

  const clearError = (key) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setSectionErrors = (keys, errObj) => {
    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]); // clear old errors for this section
      Object.keys(errObj).forEach((k) => {
        if (errObj[k]) next[k] = true;
      });
      return next;
    });
  };

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key); // ✅ remove red highlight while typing
  };

  const toUpper = (v) => (v ?? "").toString().toUpperCase();
  const toLower = (v) => (v ?? "").toString().toLowerCase();

  const makeEbikeId = () =>
    `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 150);
  };

  // ✅ CONFIRMATION before leaving (used in Personal section Back)
  const confirmExit = () => {
    if (loading) return;

    Alert.alert(
      "Leave registration?",
      "Your entered information will not be saved. Do you want to go back?",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Go Back",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Validation Functions
  const validateEmail = (email) => {
    const normalized = (email || "").trim().toLowerCase();
    // ✅ must be @gmail.com
    const gmailRegex = /^[^\s@]+@gmail\.com$/;
    return gmailRegex.test(normalized);
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.slice(0, 11);
  };

  const validateContactNumber = (contactNumber) => {
    const cleaned = contactNumber.replace(/\D/g, "");
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(cleaned);
  };

  const validateAge = (birthday) => {
    const today = new Date();
    const age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthday.getDate())
    ) {
      return age - 1;
    }
    return age;
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

  const validatePersonalInfo = () => {
    const sectionKeys = [
      "firstName",
      "lastName",
      "birthday",
      "contactNumber",
      "address",
    ];

    const err = {};
    const messages = [];

    if (!form.firstName?.trim()) {
      err.firstName = true;
      messages.push("Please fill in First Name");
    }

    if (!form.lastName?.trim()) {
      err.lastName = true;
      messages.push("Please fill in Last Name");
    }

    if (!form.birthday) {
      err.birthday = true;
      messages.push("Please select your birthday");
    } else {
      const age = validateAge(form.birthday);
      if (age < 18) {
        err.birthday = true;
        messages.push(
          `You must be at least 18 years old to register. You are currently ${age} years old.`
        );
      }
    }

    if (!form.contactNumber?.trim()) {
      err.contactNumber = true;
      messages.push("Please fill in Contact Number");
    } else if (!validateContactNumber(form.contactNumber)) {
      err.contactNumber = true;
      messages.push("Contact number must start with 09 and have 11 digits");
    }

    if (!form.address?.trim()) {
      err.address = true;
      messages.push("Please fill in Address");
    }

    setSectionErrors(sectionKeys, err);

    if (messages.length) {
      Alert.alert("Error", messages[0]);
      return false;
    }

    return true;
  };

  const validateCurrentEbikeEntry = () => {
    const sectionKeys = [
      "ebikeBrand",
      "ebikeModel",
      "ebikeColor",
      "chassisMotorNumber",
      "plateNumber",
    ];

    const err = {};
    const messages = [];

    if (!form.ebikeBrand?.trim()) {
      err.ebikeBrand = true;
      messages.push("Please fill in E-Bike Brand");
    }

    if (!form.ebikeModel?.trim()) {
      err.ebikeModel = true;
      messages.push("Please fill in Model Unit");
    }

    if (!form.ebikeColor?.trim()) {
      err.ebikeColor = true;
      messages.push("Please fill in E-Bike Color");
    }

    if (!form.chassisMotorNumber?.trim()) {
      err.chassisMotorNumber = true;
      messages.push(
        'Please enter Chassis Number (10-12 digits), Motor Number (15-20 digits), or type "none"'
      );
    } else if (!validateChassisMotorNumber(form.chassisMotorNumber)) {
      err.chassisMotorNumber = true;
      messages.push(
        'Please enter Chassis Number (10-12 digits), Motor Number (15-20 digits), or type "none"'
      );
    }

    // plate only required if noPlateNumber is false
    if (!noPlateNumber) {
      if (!form.plateNumber?.trim()) {
        err.plateNumber = true;
        messages.push("Please fill in Plate Number");
      } else if (!validatePlateNumber(form.plateNumber)) {
        err.plateNumber = true;
        messages.push(
          "Plate Number must be in format: 2 letters followed by 4 numbers (e.g., AB1234)"
        );
      }
    }

    setSectionErrors(sectionKeys, err);

    if (messages.length) {
      Alert.alert("Error", messages[0]);
      return false;
    }

    return true;
  };

  const validateAccountInfo = () => {
    const sectionKeys = ["email", "password", "confirmPassword"];
    const err = {};
    const messages = [];

    if (!form.email?.trim()) {
      err.email = true;
      messages.push("Please fill in Email");
    } else if (!validateEmail(form.email)) {
      err.email = true;
      messages.push("Email must be a valid Gmail address (e.g., name@gmail.com)");
    }

    if (!form.password?.trim()) {
      err.password = true;
      messages.push("Please fill in Password");
    } else if (form.password.length < 6) {
      err.password = true;
      messages.push("Password must be at least 6 characters long");
    }

    if (!form.confirmPassword?.trim()) {
      err.confirmPassword = true;
      messages.push("Please fill in Confirm Password");
    } else if (form.password !== form.confirmPassword) {
      err.password = true;
      err.confirmPassword = true;
      messages.push("Passwords do not match");
    }

    setSectionErrors(sectionKeys, err);

    if (messages.length) {
      Alert.alert("Error", messages[0]);
      return false;
    }

    return true;
  };

  const resetEbikeEntryFields = () => {
    update("ebikeBrand", "");
    update("ebikeModel", "");
    update("ebikeColor", "");
    update("chassisMotorNumber", "");
    update("branch", "");
    update("plateNumber", "");
    setNoPlateNumber(false);
    setEditingEbikeId(null);

    // ✅ clear ebike-related errors when reset
    setErrors((prev) => {
      const next = { ...prev };
      ["ebikeBrand", "ebikeModel", "ebikeColor", "chassisMotorNumber", "plateNumber"].forEach(
        (k) => delete next[k]
      );
      return next;
    });
  };

  const startEditEbike = (item) => {
    setActiveSection("ebike");
    setEditingEbikeId(item.id);

    const hasPlate = item?.hasPlate !== false;
    setNoPlateNumber(!hasPlate);

    setForm((prev) => ({
      ...prev,
      ebikeBrand: item?.ebikeBrand || "",
      ebikeModel: item?.ebikeModel || "",
      ebikeColor: item?.ebikeColor || "",
      chassisMotorNumber: item?.chassisMotorNumber || "",
      branch: item?.branch || "",
      plateNumber: hasPlate ? (item?.plateNumber || "") : "",
    }));

    // ✅ clear errors when editing existing
    setErrors((prev) => {
      const next = { ...prev };
      ["ebikeBrand", "ebikeModel", "ebikeColor", "chassisMotorNumber", "plateNumber"].forEach(
        (k) => delete next[k]
      );
      return next;
    });

    scrollToBottom();
  };

  const cancelEditEbike = () => {
    resetEbikeEntryFields();
    scrollToBottom();
  };

  const addCurrentEbikeToList = () => {
    if (!validateCurrentEbikeEntry()) return;

    const plate = noPlateNumber ? null : form.plateNumber.trim().toUpperCase();

    if (plate) {
      const dup = ebikes.some(
        (e) =>
          e.id !== editingEbikeId &&
          String(e.plateNumber || "").toUpperCase() === plate
      );
      if (dup) {
        Alert.alert("Error", `Duplicate plate in your entries: ${plate}`);
        return;
      }
    }

    const payload = {
      ebikeBrand: (form.ebikeBrand || "").trim().toUpperCase(),
      ebikeModel: (form.ebikeModel || "").trim().toUpperCase(),
      ebikeColor: (form.ebikeColor || "").trim().toUpperCase(),
      chassisMotorNumber:
        (form.chassisMotorNumber || "").toLowerCase() === "none"
          ? "none"
          : form.chassisMotorNumber,
      branch: (form.branch || "").trim().toUpperCase(),
      plateNumber: plate,
      hasPlate: !noPlateNumber,
    };

    if (editingEbikeId) {
      setEbikes((prev) =>
        prev.map((e) => (e.id === editingEbikeId ? { ...e, ...payload } : e))
      );

      resetEbikeEntryFields();
      Alert.alert("Updated", "E-bike information has been updated.");
      scrollToBottom();
      return;
    }

    const newItem = {
      id: makeEbikeId(),
      ...payload,

      status: "Pending",
      ebikeCategorySelected: "",
      registeredDate: null,
      renewalDate: null,
      registrationStatus: null,
      verifiedAt: null,
      rejectedAt: null,
      paymentDetails: null,
      adminVerificationImages: [],

      createdAt: new Date().toISOString(),
    };

    setEbikes((prev) => [...prev, newItem]);
    resetEbikeEntryFields();
    Alert.alert("Added", "E-bike registration added. You can add another.");
    scrollToBottom();
  };

  const removeEbikeFromList = (id) => {
    setEbikes((prev) => prev.filter((e) => e.id !== id));

    if (editingEbikeId === id) {
      resetEbikeEntryFields();
      scrollToBottom();
    }
  };

  const handleSubmit = async () => {
    let ebikesToSave = [...ebikes];

    if (editingEbikeId) {
      if (!validateCurrentEbikeEntry()) return;

      const plate = noPlateNumber ? null : form.plateNumber.trim().toUpperCase();

      if (plate) {
        const dup = ebikesToSave.some(
          (e) =>
            e.id !== editingEbikeId &&
            String(e.plateNumber || "").toUpperCase() === plate
        );
        if (dup) {
          Alert.alert("Error", `Duplicate plate in your entries: ${plate}`);
          return;
        }
      }

      const edited = {
        ebikeBrand: (form.ebikeBrand || "").trim().toUpperCase(),
        ebikeModel: (form.ebikeModel || "").trim().toUpperCase(),
        ebikeColor: (form.ebikeColor || "").trim().toUpperCase(),
        chassisMotorNumber:
          (form.chassisMotorNumber || "").toLowerCase() === "none"
            ? "none"
            : form.chassisMotorNumber,
        branch: (form.branch || "").trim().toUpperCase(),
        plateNumber: plate,
        hasPlate: !noPlateNumber,
      };

      ebikesToSave = ebikesToSave.map((e) =>
        e.id === editingEbikeId ? { ...e, ...edited } : e
      );
    } else {
      const hasCurrentEbikeSomething =
        (form.ebikeBrand || "").trim() ||
        (form.ebikeModel || "").trim() ||
        (form.ebikeColor || "").trim() ||
        (form.chassisMotorNumber || "").trim() ||
        (form.branch || "").trim() ||
        (form.plateNumber || "").trim();

      if (hasCurrentEbikeSomething) {
        if (!validateCurrentEbikeEntry()) return;

        const plate = noPlateNumber
          ? null
          : form.plateNumber.trim().toUpperCase();

        if (plate) {
          const dup = ebikesToSave.some(
            (e) => String(e.plateNumber || "").toUpperCase() === plate
          );
          if (dup) {
            Alert.alert("Error", `Duplicate plate in your entries: ${plate}`);
            return;
          }
        }

        ebikesToSave.push({
          id: makeEbikeId(),
          ebikeBrand: (form.ebikeBrand || "").trim().toUpperCase(),
          ebikeModel: (form.ebikeModel || "").trim().toUpperCase(),
          ebikeColor: (form.ebikeColor || "").trim().toUpperCase(),
          chassisMotorNumber:
            (form.chassisMotorNumber || "").toLowerCase() === "none"
              ? "none"
              : form.chassisMotorNumber,
          branch: (form.branch || "").trim().toUpperCase(),
          plateNumber: plate,
          hasPlate: !noPlateNumber,

          status: "Pending",
          ebikeCategorySelected: "",
          registeredDate: null,
          renewalDate: null,
          registrationStatus: null,
          verifiedAt: null,
          rejectedAt: null,
          paymentDetails: null,
          adminVerificationImages: [],
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (ebikesToSave.length === 0) {
      Alert.alert("Error", "Please add at least one e-bike registration.");
      return;
    }

    if (!validatePersonalInfo()) return;
    if (!validateAccountInfo()) return;

    setLoading(true);

    try {
      const normalizedEmail = (form.email || "").trim().toLowerCase();

      const emailQuery = query(
        collection(db, "users"),
        where("email", "==", normalizedEmail)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        Alert.alert(
          "Error",
          "This email is already registered. Please use a different email or log in."
        );
        setLoading(false);
        return;
      }

      const plates = ebikesToSave
        .map((e) => (e.plateNumber ? String(e.plateNumber).toUpperCase() : null))
        .filter(Boolean);

      const seen = new Set();
      for (const p of plates) {
        if (seen.has(p)) {
          Alert.alert("Error", `Duplicate plate in your entries: ${p}`);
          setLoading(false);
          return;
        }
        seen.add(p);
      }

      for (const p of plates) {
        const plateQ = query(
          collection(db, "users"),
          where("plateNumbers", "array-contains", p)
        );
        const plateSnap = await getDocs(plateQ);

        if (!plateSnap.empty) {
          Alert.alert("Error", `Plate number already registered: ${p}`);
          setLoading(false);
          return;
        }

        const legacyQ = query(
          collection(db, "users"),
          where("plateNumber", "==", p)
        );
        const legacySnap = await getDocs(legacyQ);
        if (!legacySnap.empty) {
          Alert.alert("Error", `Plate number already registered: ${p}`);
          setLoading(false);
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        form.password
      );

      const userId = userCredential.user.uid;

      const firstPlate = plates[0] || "";
      const firstEbike = ebikesToSave[0] || null;

      await setDoc(doc(db, "users", userId), {
        uid: userId,
        firstName: (form.firstName || "").trim().toUpperCase(),
        middleName: (form.middleName || "").trim().toUpperCase(),
        lastName: (form.lastName || "").trim().toUpperCase(),
        birthday: form.birthday.toISOString().split("T")[0],
        contactNumber: form.contactNumber,
        address: (form.address || "").trim().toUpperCase(),
        email: normalizedEmail,
        role: "Rider",

        status: "Pending",

        plateNumber: firstPlate,
        ebikeBrand: firstEbike?.ebikeBrand || "",
        ebikeModel: firstEbike?.ebikeModel || "",
        ebikeColor: firstEbike?.ebikeColor || "",
        chassisMotorNumber: firstEbike?.chassisMotorNumber || "",
        branch: firstEbike?.branch || "",

        ebikes: ebikesToSave,
        plateNumbers: plates,

        createdAt: new Date().toISOString(),
      });

      await signInWithEmailAndPassword(auth, normalizedEmail, form.password);

      Alert.alert(
        "Success",
        "Your rider account has been created successfully! You are now logged in.",
        [{ text: "OK", onPress: () => navigation.replace("HomeRider") }]
      );
    } catch (error) {
      let errorMessage = "";

      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered. Please use a different email or log in.";
      } else if (error.code === "auth/weak-password") {
        errorMessage =
          "Password is too weak. Please use a stronger password with at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format. Please check your email address.";
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage =
          "Account creation is currently disabled. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = "An unexpected error occurred. Please try again.";
      }

      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI SECTIONS ---------- */

  const renderPersonalSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Personal Information</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          First Name<Text style={styles.requiredStar}> *</Text>
        </Text>
        <View style={[styles.inputCard, errors.firstName && styles.inputCardError]}>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            placeholderTextColor="#999"
            value={form.firstName}
            onChangeText={(v) => update("firstName", toUpper(v))}
            editable={!loading}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Middle Name (Optional)</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Enter your middle name"
            placeholderTextColor="#999"
            value={form.middleName}
            onChangeText={(v) => update("middleName", toUpper(v))}
            editable={!loading}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Last Name<Text style={styles.requiredStar}> *</Text>
        </Text>
        <View style={[styles.inputCard, errors.lastName && styles.inputCardError]}>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            placeholderTextColor="#999"
            value={form.lastName}
            onChangeText={(v) => update("lastName", toUpper(v))}
            editable={!loading}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Birthday<Text style={styles.requiredStar}> *</Text>
        </Text>
        <View style={[styles.inputCard, errors.birthday && styles.inputCardError]}>
          <TouchableOpacity
            style={styles.datePickerRow}
            onPress={() => !loading && setShowDatePicker(true)}
            disabled={loading}
          >
            <Text style={styles.datePickerText}>
              {form.birthday
                ? form.birthday.toLocaleDateString()
                : "Select birthday"}
            </Text>
            <Text style={styles.datePickerIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      {Platform.OS === "ios" && showDatePicker && (
        <DateTimePicker
          value={form.birthday}
          mode="date"
          display="spinner"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              update("birthday", selectedDate);
              clearError("birthday");
            }
          }}
        />
      )}

      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={form.birthday}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === "ios");
            if (event.type === "set" && selectedDate) {
              update("birthday", selectedDate);
              clearError("birthday");
            }
          }}
        />
      )}

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Contact Number<Text style={styles.requiredStar}> *</Text>
        </Text>
        <View
          style={[
            styles.inputCard,
            errors.contactNumber && styles.inputCardError,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="09XXXXXXXXX"
            placeholderTextColor="#999"
            value={form.contactNumber}
            onChangeText={(v) => update("contactNumber", formatPhoneNumber(v))}
            keyboardType="phone-pad"
            editable={!loading}
            maxLength={11}
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          Address<Text style={styles.requiredStar}> *</Text>
        </Text>
        <View style={[styles.inputCard, errors.address && styles.inputCardError]}>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Enter your address"
            placeholderTextColor="#999"
            value={form.address}
            onChangeText={(v) => update("address", toUpper(v))}
            editable={!loading}
            multiline
            numberOfLines={3}
            autoCapitalize="characters"
          />
        </View>
      </View>
    </View>
  );

  const renderEbikeSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>E-Bike Information</Text>

      {ebikes.length > 0 && (
        <View style={styles.addedBox}>
          <Text style={styles.addedTitle}>Added E-bikes (Full Details)</Text>

          {ebikes.map((e, idx) => (
            <View key={e.id} style={styles.ebikeCard}>
              <View style={styles.ebikeCardTop}>
                <Text style={styles.ebikeCardTitle}>E-bike #{idx + 1}</Text>
                <Text style={styles.ebikeCardBadge}>
                  {e.plateNumber ? e.plateNumber : "NO PLATE"}
                </Text>
              </View>

              <Text style={styles.ebikeLine}>
                <Text style={styles.ebikeLabel}>Brand:</Text>{" "}
                {e.ebikeBrand || "-"}
              </Text>
              <Text style={styles.ebikeLine}>
                <Text style={styles.ebikeLabel}>Model:</Text>{" "}
                {e.ebikeModel || "-"}
              </Text>
              <Text style={styles.ebikeLine}>
                <Text style={styles.ebikeLabel}>Color:</Text>{" "}
                {e.ebikeColor || "-"}
              </Text>
              <Text style={styles.ebikeLine}>
                <Text style={styles.ebikeLabel}>Chassis/Motor:</Text>{" "}
                {e.chassisMotorNumber || "-"}
              </Text>
              <Text style={styles.ebikeLine}>
                <Text style={styles.ebikeLabel}>Branch:</Text> {e.branch || "-"}
              </Text>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => startEditEbike(e)}
                  disabled={loading}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => removeEbikeFromList(e.id)}
                  disabled={loading}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.entryBox}>
        <Text style={styles.entryTitle}>
          {editingEbikeId ? "Edit Selected E-bike" : "Add New E-bike"}
        </Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            E-Bike Brand<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View
            style={[
              styles.inputCard,
              errors.ebikeBrand && styles.inputCardError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Enter E-bike brand"
              placeholderTextColor="#999"
              value={form.ebikeBrand}
              onChangeText={(v) => update("ebikeBrand", toUpper(v))}
              editable={!loading}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Model Unit<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View
            style={[
              styles.inputCard,
              errors.ebikeModel && styles.inputCardError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Enter model unit"
              placeholderTextColor="#999"
              value={form.ebikeModel}
              onChangeText={(v) => update("ebikeModel", toUpper(v))}
              editable={!loading}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            E-Bike Color<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View
            style={[
              styles.inputCard,
              errors.ebikeColor && styles.inputCardError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Enter E-bike color"
              placeholderTextColor="#999"
              value={form.ebikeColor}
              onChangeText={(v) => update("ebikeColor", toUpper(v))}
              editable={!loading}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Chassis / Motor Number<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View
            style={[
              styles.inputCard,
              errors.chassisMotorNumber && styles.inputCardError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="10–12 or 15–20 digits, or type 'none'"
              placeholderTextColor="#999"
              value={form.chassisMotorNumber}
              onChangeText={(v) => update("chassisMotorNumber", v)}
              editable={!loading}
            />
          </View>
          <Text style={styles.helpText}>
            Chassis: 10–12 digits / Motor: 15–20 digits / or type "none"
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Branch</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="Store where purchased"
              placeholderTextColor="#999"
              value={form.branch}
              onChangeText={(v) => update("branch", toUpper(v))}
              editable={!loading}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Plate Number<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View
            style={[
              styles.inputCard,
              errors.plateNumber && !noPlateNumber && styles.inputCardError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="e.g., AB1234"
              placeholderTextColor="#999"
              value={form.plateNumber}
              onChangeText={(v) => update("plateNumber", v.toUpperCase())}
              editable={!loading && !noPlateNumber}
              maxLength={6}
              autoCapitalize="characters"
            />
          </View>
          <Text style={styles.helpText}>
            Format: 2 letters followed by 4 numbers (e.g., AB1234)
          </Text>

          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[styles.checkbox, noPlateNumber && styles.checkboxChecked]}
              onPress={() => {
                if (loading) return;
                setNoPlateNumber((prev) => !prev);
                clearError("plateNumber");
                if (!noPlateNumber) update("plateNumber", "");
              }}
            >
              {noPlateNumber && <Text style={styles.checkboxTick}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              Check this if this is your e-bike&apos;s first registration and you
              don&apos;t have a plate number yet.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addEbikeBtn, loading && styles.buttonDisabled]}
          onPress={addCurrentEbikeToList}
          disabled={loading}
        >
          <Text style={styles.addEbikeBtnText}>
            {editingEbikeId ? "Save Changes" : "+ Add Another E-bike"}
          </Text>
        </TouchableOpacity>

        {editingEbikeId && (
          <TouchableOpacity
            style={[styles.cancelEditBtn, loading && styles.buttonDisabled]}
            onPress={cancelEditEbike}
            disabled={loading}
          >
            <Text style={styles.cancelEditText}>Cancel Editing</Text>
          </TouchableOpacity>
        )}

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Email<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View style={[styles.inputCard, errors.email && styles.inputCardError]}>
            <TextInput
              style={styles.input}
              placeholder="name@gmail.com"
              placeholderTextColor="#999"
              value={form.email}
              onChangeText={(v) => update("email", toLower(v))}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
          <Text style={styles.helpText}>Gmail only: must end with @gmail.com</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Password<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View
            style={[
              styles.inputCard,
              styles.passwordRow,
              errors.password && styles.inputCardError,
            ]}
          >
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#999"
              value={form.password}
              onChangeText={(v) => update("password", v)}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => !loading && setShowPassword((prev) => !prev)}
            >
              <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Confirm Password<Text style={styles.requiredStar}> *</Text>
          </Text>
          <View
            style={[
              styles.inputCard,
              styles.passwordRow,
              errors.confirmPassword && styles.inputCardError,
            ]}
          >
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Re-enter password"
              placeholderTextColor="#999"
              value={form.confirmPassword}
              onChangeText={(v) => update("confirmPassword", v)}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() =>
                !loading && setShowConfirmPassword((prev) => !prev)
              }
            >
              <Text style={styles.toggleText}>
                {showConfirmPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={styles.greenHeader}>
          <Text style={styles.greenHeaderText}>AIDE</Text>
        </View>

        {/* ✅ HEADER UPDATED: centered title, removed back button */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Create an Account</Text>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {activeSection === "personal"
              ? renderPersonalSection()
              : renderEbikeSection()}

            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={[styles.button, styles.backButtonStyle]}
                onPress={() => {
                  if (activeSection === "personal") {
                    confirmExit();
                  } else {
                    setActiveSection("personal");
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.nextButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={() => {
                  if (activeSection === "personal") {
                    if (validatePersonalInfo()) setActiveSection("ebike");
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.nextButtonText}>
                  {loading
                    ? "Loading..."
                    : activeSection === "personal"
                    ? "Next"
                    : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* shared shadow for the card-style inputs */
const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  greenHeader: {
    backgroundColor: "#2E7D32",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  greenHeaderText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  headerContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    width: "100%",
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },

  contentContainer: { flex: 1, paddingHorizontal: 20 },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },

  formSection: { marginTop: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },

  fieldContainer: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  requiredStar: {
    color: "red",
  },

  inputCard: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    ...cardShadow,
  },

  // ✅ NEW: red highlight style
  inputCardError: {
    borderWidth: 1,
    borderColor: "#F44336",
  },

  input: { fontSize: 14, color: "#000", paddingVertical: 8 },
  multilineInput: { textAlignVertical: "top" },

  datePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  datePickerText: { fontSize: 14, color: "#000" },
  datePickerIcon: { fontSize: 18 },

  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },

  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  backButtonStyle: { backgroundColor: "#F0F0F0" },
  nextButton: { backgroundColor: "#4CAF50" },
  buttonDisabled: { backgroundColor: "#CCCCCC", opacity: 0.7 },
  backButtonText: { color: "#000", fontWeight: "500" },
  nextButtonText: { color: "#FFFFFF", fontWeight: "500" },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordInput: { flex: 1, marginRight: 10 },
  toggleText: { fontSize: 13, fontWeight: "500", color: "#2E7D32" },

  checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#999",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#FFF",
  },
  checkboxChecked: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  checkboxTick: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  checkboxLabel: { flex: 1, fontSize: 12, color: "#444" },

  addEbikeBtn: {
    backgroundColor: "#E6F3EC",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  addEbikeBtnText: { color: "#2E7D32", fontWeight: "700" },

  cancelEditBtn: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  cancelEditText: { color: "#000", fontWeight: "700" },

  addedBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  addedTitle: { fontWeight: "700", marginBottom: 8, color: "#2C3E50" },

  ebikeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    ...cardShadow,
  },
  ebikeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ebikeCardTitle: { fontWeight: "800", color: "#2C3E50" },
  ebikeCardBadge: {
    fontWeight: "800",
    color: "#2E7D32",
    backgroundColor: "#E6F3EC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  ebikeLine: { color: "#2C3E50", marginBottom: 2 },
  ebikeLabel: { fontWeight: "700", color: "#2C3E50" },

  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
    marginTop: 10,
  },
  editText: { color: "#2E7D32", fontWeight: "700" },
  removeText: { color: "#F44336", fontWeight: "700" },

  entryBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    ...cardShadow,
  },
  entryTitle: {
    fontWeight: "800",
    color: "#2C3E50",
    marginBottom: 10,
  },
});

export default RegisterRider;
