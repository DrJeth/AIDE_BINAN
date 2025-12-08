import React, { useState } from "react";
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
  KeyboardAvoidingView, // ✅ NEW
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { auth } from "../config/firebaseConfig";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const db = getFirestore();

function RegisterRider({ navigation }) {
  const [activeSection, setActiveSection] = useState("personal");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthday: new Date(),
    contactNumber: "",
    address: "",
    ebikeBrand: "",
    ebikeModel: "",
    ebikeColor: "",
    chassisMotorNumber: "",
    branch: "",
    plateNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ NEW STATES
  const [noPlateNumber, setNoPlateNumber] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Validation Functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim().toLowerCase());
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.slice(0, 11); // Max 11 digits
  };

  // ✅ UPDATED: must start with 09 and be 11 digits
  const validateContactNumber = (contactNumber) => {
    const cleaned = contactNumber.replace(/\D/g, "");
    const phoneRegex = /^09\d{9}$/; // 09 + 9 digits = 11 digits
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
    // Chassis: 10-12 digits OR Motor: 15-20 digits
    return (
      (cleanNumber.length >= 10 && cleanNumber.length <= 12) ||
      (cleanNumber.length >= 15 && cleanNumber.length <= 20)
    );
  };

  const validatePlateNumber = (plateNumber) => {
    // Format: 2 letters & 4 numbers (e.g., AB1234)
    const plateRegex = /^[A-Za-z]{2}\d{4}$/;
    return plateRegex.test(plateNumber.trim().toUpperCase());
  };

  const validatePersonalInfo = () => {
    const personalFields = [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "contactNumber", label: "Contact Number" },
      { key: "address", label: "Address" },
    ];

    for (let field of personalFields) {
      if (
        !form[field.key] ||
        (typeof form[field.key] === "string" &&
          form[field.key].trim() === "")
      ) {
        Alert.alert("Error", `Please fill in ${field.label}`);
        return false;
      }
    }

    if (!form.birthday) {
      Alert.alert("Error", "Please select your birthday");
      return false;
    }

    const age = validateAge(form.birthday);
    if (age < 18) {
      Alert.alert(
        "Error",
        `You must be at least 18 years old to register. You are currently ${age} years old.`
      );
      return false;
    }

    // ✅ UPDATED MESSAGE FOR NEW CONTACT VALIDATION
    if (!validateContactNumber(form.contactNumber)) {
      Alert.alert(
        "Error",
        "Contact number must start with 09 and have 11 digits"
      );
      return false;
    }

    return true;
  };

  const validateEbikeInfo = () => {
    const ebikeFields = [
      { key: "ebikeBrand", label: "E-Bike Brand" },
      { key: "ebikeModel", label: "Model Unit" },
      { key: "ebikeColor", label: "E-Bike Color" },
      { key: "branch", label: "Branch" },
      { key: "plateNumber", label: "Plate Number" },
      { key: "email", label: "Email" },
      { key: "password", label: "Password" },
      { key: "confirmPassword", label: "Confirm Password" },
    ];

    for (let field of ebikeFields) {
      // ✅ SKIP plateNumber required check if noPlateNumber is true
      if (field.key === "plateNumber" && noPlateNumber) {
        continue;
      }

      const value = form[field.key];
      if (
        value === null ||
        value === "" ||
        (typeof value === "string" && value.trim() === "")
      ) {
        Alert.alert("Error", `Please fill in ${field.label}`);
        return false;
      }
    }

    if (!validateChassisMotorNumber(form.chassisMotorNumber)) {
      Alert.alert(
        "Error",
        'Please enter Chassis Number (10-12 digits), Motor Number (15-20 digits), or type "none"'
      );
      return false;
    }

    if (!validateEmail(form.email)) {
      Alert.alert(
        "Error",
        "Please enter a valid email address (e.g., user@example.com)"
      );
      return false;
    }

    // ✅ Only validate plate format when rider actually has a plate number
    if (!noPlateNumber && !validatePlateNumber(form.plateNumber)) {
      Alert.alert(
        "Error",
        "Plate Number must be in format: 2 letters followed by 4 numbers (e.g., AB1234)"
      );
      return false;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (form.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    console.log("Starting registration validation...");
    if (!validateEbikeInfo()) return;

    setLoading(true);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      // ✅ Handle "no plate yet" case
      const normalizedPlateNumber = noPlateNumber
        ? "NO-PLATE"
        : form.plateNumber.trim().toUpperCase();

      if (!noPlateNumber) {
        console.log("Checking plate number...");
        const plateQuery = query(
          collection(db, "users"),
          where("plateNumber", "==", normalizedPlateNumber)
        );
        const plateSnapshot = await getDocs(plateQuery);

        if (!plateSnapshot.empty) {
          Alert.alert(
            "Error",
            "This plate number is already registered. Please use a different plate number."
          );
          setLoading(false);
          return;
        }
      }

      console.log("Checking email...");
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

      console.log("Creating Firebase user...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        form.password
      );

      console.log("Adding user to Firestore...");
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthday: form.birthday.toISOString().split("T")[0],
        contactNumber: form.contactNumber,
        address: form.address.trim(),
        ebikeBrand: form.ebikeBrand.trim(),
        ebikeModel: form.ebikeModel.trim(),
        ebikeColor: form.ebikeColor.trim(),
        chassisMotorNumber:
          form.chassisMotorNumber.toLowerCase() === "none"
            ? "none"
            : form.chassisMotorNumber,
        branch: form.branch.trim(),
        plateNumber: normalizedPlateNumber, // ✅ now can be "NO-PLATE"
        email: normalizedEmail,
        role: "Rider",
        status: "Pending",
        createdAt: new Date().toISOString(),
      });

      console.log("Automatically logging in user...");
      await signInWithEmailAndPassword(auth, normalizedEmail, form.password);

      console.log("Registration successful!");
      Alert.alert(
        "Success",
        "Your rider account has been created successfully! You are now logged in.",
        [{ text: "OK", onPress: () => navigation.replace("HomeRider") }]
      );
    } catch (error) {
      console.error(
        "Registration error full details:",
        JSON.stringify(error, null, 2)
      );
      console.error("Error name:", error.name);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      let errorMessage = "";

      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered. Please use a different email or log in.";
      } else if (error.code === "auth/weak-password") {
        errorMessage =
          "Password is too weak. Please use a stronger password with at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage =
          "Invalid email format. Please check your email address.";
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

  /* ---------- UI SECTIONS WITH LABEL + CARD INPUT ---------- */

  const renderPersonalSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Personal Information</Text>

      {/* First Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>First Name</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            placeholderTextColor="#999"
            value={form.firstName}
            onChangeText={(v) => update("firstName", v)}
            editable={!loading}
          />
        </View>
      </View>

      {/* Last Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Last Name</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            placeholderTextColor="#999"
            value={form.lastName}
            onChangeText={(v) => update("lastName", v)}
            editable={!loading}
          />
        </View>
      </View>

      {/* Birthday */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Birthday</Text>
        <View style={styles.inputCard}>
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
            }
          }}
        />
      )}

      {/* Contact Number */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Contact Number</Text>
        <View style={styles.inputCard}>
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

      {/* Address */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Address</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Enter your address"
            placeholderTextColor="#999"
            value={form.address}
            onChangeText={(v) => update("address", v)}
            editable={!loading}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>
    </View>
  );

  const renderEbikeSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>E-Bike Information</Text>

      {/* E-Bike Brand */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>E-Bike Brand</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Enter E-bike brand"
            placeholderTextColor="#999"
            value={form.ebikeBrand}
            onChangeText={(v) => update("ebikeBrand", v)}
            editable={!loading}
          />
        </View>
      </View>

      {/* Model Unit */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Model Unit</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Enter model unit"
            placeholderTextColor="#999"
            value={form.ebikeModel}
            onChangeText={(v) => update("ebikeModel", v)}
            editable={!loading}
          />
        </View>
      </View>

      {/* E-Bike Color */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>E-Bike Color</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Enter E-bike color"
            placeholderTextColor="#999"
            value={form.ebikeColor}
            onChangeText={(v) => update("ebikeColor", v)}
            editable={!loading}
          />
        </View>
      </View>

      {/* Chassis/Motor Number */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Chassis / Motor Number</Text>
        <View style={styles.inputCard}>
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

      {/* Branch */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Branch</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Store where purchased"
            placeholderTextColor="#999"
            value={form.branch}
            onChangeText={(v) => update("branch", v)}
            editable={!loading}
          />
        </View>
      </View>

      {/* Plate Number + Checkbox */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Plate Number</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="e.g., AB1234"
            placeholderTextColor="#999"
            value={form.plateNumber}
            onChangeText={(v) => update("plateNumber", v.toUpperCase())}
            editable={!loading && !noPlateNumber} // ✅ disable when checkbox is checked
            maxLength={6}
          />
        </View>
        <Text style={styles.helpText}>
          Format: 2 letters followed by 4 numbers (e.g., AB1234)
        </Text>

        {/* ✅ NEW CHECKBOX */}
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[styles.checkbox, noPlateNumber && styles.checkboxChecked]}
            onPress={() => {
              if (loading) return;
              setNoPlateNumber((prev) => !prev);
              if (!noPlateNumber) {
                // just checked: clear plate number
                update("plateNumber", "");
              }
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

      {/* Email */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Email</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#999"
            value={form.email}
            onChangeText={(v) => update("email", v.toLowerCase())}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>
      </View>

      {/* Password with show/hide */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Password</Text>
        <View style={[styles.inputCard, styles.passwordRow]}>
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
            <Text style={styles.toggleText}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password with show/hide */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Confirm Password</Text>
        <View style={[styles.inputCard, styles.passwordRow]}>
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
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ KeyboardAvoidingView para di matakpan ng keyboard */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {/* 🔹 Green header bar like the other screen */}
        <View style={styles.greenHeader}>
          <Text style={styles.greenHeaderText}>AIDE</Text>
        </View>

        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => !loading && navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backText}>◂</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create an account</Text>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag" // ✅ helpful with keyboard
          >
            {activeSection === "personal"
              ? renderPersonalSection()
              : renderEbikeSection()}

            <View style={styles.navigationButtons}>
              {activeSection === "ebike" && (
                <TouchableOpacity
                  style={[styles.button, styles.backButtonStyle]}
                  onPress={() => setActiveSection("personal")}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

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
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* 🔹 new green header */
  greenHeader: {
    backgroundColor: "#2E7D32",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  greenHeaderText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 5,
  },
  backText: {
    fontSize: 24,
    color: "#000",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginLeft: 15,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },

  // label + card layout
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  inputCard: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    ...cardShadow,
  },
  input: {
    fontSize: 14,
    color: "#000",
    paddingVertical: 8,
  },
  multilineInput: {
    textAlignVertical: "top",
  },

  datePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  datePickerText: {
    fontSize: 14,
    color: "#000",
  },
  datePickerIcon: {
    fontSize: 18,
  },

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
  backButtonStyle: {
    backgroundColor: "#F0F0F0",
  },
  nextButton: {
    backgroundColor: "#4CAF50",
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.7,
  },
  backButtonText: {
    color: "#000",
    fontWeight: "500",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },

  // ✅ NEW styles for password show/hide
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordInput: {
    flex: 1,
    marginRight: 10,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2E7D32",
  },

  // ✅ NEW styles for checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
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
  checkboxChecked: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  checkboxTick: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: "#444",
  },
});

export default RegisterRider;