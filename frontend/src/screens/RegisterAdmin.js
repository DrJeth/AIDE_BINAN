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
  Modal,
  FlatList,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth } from "../config/firebaseConfig";

const ALLOWED_POSITIONS = [
  "Processing of E-bike Registration",
  "Validator of E-bike Registration",
  "Inspection",
  "Office Supervisor",
  "Community Affairs Officer",
];

export default function RegisterAdmin({ navigation }) {
  const [activeSection, setActiveSection] = useState("personal");
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    birthday: "",
    contactNumber: "",
    address: "",
    employeeNumber: "",
    department: "Binan Tricycle Franchising And Regulatory Board",
    position: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [positionModalVisible, setPositionModalVisible] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [birthdayDate, setBirthdayDate] = useState(new Date());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const firstInitial = form.firstName.charAt(0).toUpperCase();
  const lastInitial = form.lastName.charAt(0).toUpperCase();
  const employeeNum = form.employeeNumber;

  const scrollViewRef = useRef(null);
  const db = getFirestore();

  const handleBirthdayChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowBirthdayPicker(false);

    if (selectedDate) {
      setBirthdayDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      update("birthday", formattedDate);
    }
  };

  const formatBirthdayDisplay = (dateString) => {
    if (!dateString) return "Select Birthday";
    return dateString;
  };

  // ✅ AUTO FORMAT: uppercase personal info + lowercase email (remove spaces)
  const update = (key, value) => {
    let v = value ?? "";

    const UPPERCASE_KEYS = ["firstName", "middleName", "lastName", "address"];
    if (UPPERCASE_KEYS.includes(key)) v = v.toUpperCase();

    if (key === "email") v = v.toLowerCase().replace(/\s/g, "");

    setForm((prev) => ({ ...prev, [key]: v }));
  };

  const isValidEmployeeNumber = (empNum) => /^\d{4}$/.test(empNum);

  const expectedPattern = new RegExp(
    `^${firstInitial}${lastInitial}[0-9]{6}${employeeNum}$`
  );

  // ✅ Gmail only
  const isValidEmail = (email) => {
    const clean = (email || "").toLowerCase().trim();
    const gmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(clean);
  };

  // ✅ must start with 09 and be exactly 11 digits
  const isValidContactNumber = (phone) => {
    const digitsOnly = phone.replace(/[^0-9]/g, "");
    return /^09\d{9}$/.test(digitsOnly);
  };

  const validatePersonalInfo = () => {
    const personalFields = [
      "firstName",
      "lastName",
      "birthday",
      "contactNumber",
      "address",
    ];

    for (let field of personalFields) {
      if (!form[field] || form[field].trim() === "") {
        Alert.alert(
          "Error",
          `Please fill in ${field.replace(/([A-Z])/g, " $1")}`
        );
        return false;
      }
    }

    if (!isValidContactNumber(form.contactNumber)) {
      Alert.alert(
        "Error",
        "Contact number must start with 09 and have 11 digits"
      );
      return false;
    }

    return true;
  };

  const validateWorkInfo = () => {
    const workFields = [
      "employeeNumber",
      "department",
      "position",
      "email",
      "password",
      "confirmPassword",
    ];

    for (let field of workFields) {
      if (!form[field] || form[field].trim() === "") {
        Alert.alert(
          "Error",
          `Please fill in ${field.replace(/([A-Z])/g, " $1")}`
        );
        return false;
      }
    }

    if (!isValidEmployeeNumber(form.employeeNumber)) {
      Alert.alert("Error", "Employee number must be exactly 4 digits");
      return false;
    }

    if (!isValidEmail(form.email)) {
      Alert.alert(
        "Error",
        "Email must be a valid Gmail address (example@gmail.com)"
      );
      return false;
    }

    if (!ALLOWED_POSITIONS.includes(form.position)) {
      Alert.alert("Error", "Please select a valid position");
      return false;
    }

    if (!expectedPattern.test(form.password)) {
      Alert.alert("Error", "Invalid password format.");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return false;
    }

    return true;
  };

  // ✅ CONFIRMATION before leaving
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

  const handleSubmit = async () => {
    if (!validateWorkInfo()) return;

    setLoading(true);
    try {
      const normalizedEmail = (form.email || "").toLowerCase().trim();

      const employeeQuery = query(
        collection(db, "users"),
        where("employeeNumber", "==", form.employeeNumber)
      );
      const employeeSnapshot = await getDocs(employeeQuery);
      if (!employeeSnapshot.empty) {
        Alert.alert("Error", "Employee number already exists");
        return;
      }

      const emailQuery = query(
        collection(db, "users"),
        where("email", "==", normalizedEmail)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        Alert.alert("Error", "Email already exists");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        form.password
      );

      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        birthday: form.birthday,
        contactNumber: form.contactNumber,
        address: form.address,
        employeeNumber: form.employeeNumber,
        department: form.department,
        position: form.position,
        email: normalizedEmail,
        role: "Admin",
        createdAt: new Date().toISOString(),
        status: "active",
      });

      Alert.alert("Success", "Admin account created successfully", [
        { text: "OK", onPress: () => navigation.replace("Login") },
      ]);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Personal Information</Text>

      <Text style={styles.fieldLabel}>First Name</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#999"
        value={form.firstName}
        onChangeText={(v) => update("firstName", v)}
        autoCapitalize="characters"
      />

      <Text style={styles.fieldLabel}>Middle Name (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Middle Name (Optional)"
        placeholderTextColor="#999"
        value={form.middleName}
        onChangeText={(v) => update("middleName", v)}
        autoCapitalize="characters"
      />

      <Text style={styles.fieldLabel}>Last Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#999"
        value={form.lastName}
        onChangeText={(v) => update("lastName", v)}
        autoCapitalize="characters"
      />

      <Text style={styles.fieldLabel}>Birthday</Text>
      <TouchableOpacity
        style={styles.datePickerInput}
        onPress={() => setShowBirthdayPicker(true)}
      >
        <Text
          style={[
            styles.datePickerText,
            !form.birthday && styles.placeholderText,
          ]}
        >
          {formatBirthdayDisplay(form.birthday)}
        </Text>
        <Text style={styles.datePickerIcon}>📅</Text>
      </TouchableOpacity>

      {showBirthdayPicker && (
        <DateTimePicker
          value={birthdayDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleBirthdayChange}
          maximumDate={new Date()}
        />
      )}

      {Platform.OS === "ios" && showBirthdayPicker && (
        <View style={styles.iosBirthdayPickerButtons}>
          <TouchableOpacity
            style={styles.iosBirthdayButton}
            onPress={() => setShowBirthdayPicker(false)}
          >
            <Text style={styles.iosBirthdayButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.fieldLabel}>Contact Number</Text>
      <TextInput
        style={styles.input}
        placeholder="09XXXXXXXXX"
        placeholderTextColor="#999"
        value={form.contactNumber}
        onChangeText={(v) => {
          const digitsOnly = v.replace(/[^0-9]/g, "").slice(0, 11);
          update("contactNumber", digitsOnly);
        }}
        keyboardType="phone-pad"
        maxLength={11}
      />

      <Text style={styles.fieldLabel}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Address"
        placeholderTextColor="#999"
        value={form.address}
        onChangeText={(v) => update("address", v)}
        autoCapitalize="characters"
      />
    </View>
  );

  const renderWorkSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Work Information</Text>

      <Text style={styles.fieldLabel}>Employee Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Employee Number"
        placeholderTextColor="#999"
        value={form.employeeNumber}
        onChangeText={(v) =>
          update("employeeNumber", v.replace(/[^0-9]/g, "").slice(0, 4))
        }
        keyboardType="numeric"
        maxLength={4}
      />

      <Text style={styles.fieldLabel}>Position</Text>
      <TouchableOpacity
        style={styles.dropdownInput}
        onPress={() => setPositionModalVisible(true)}
      >
        <Text
          style={[
            styles.dropdownText,
            !form.position && styles.placeholderText,
          ]}
        >
          {form.position || "Select Position"}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={positionModalVisible}
        animationType="fade"
        onRequestClose={() => setPositionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Position</Text>
              <TouchableOpacity onPress={() => setPositionModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={ALLOWED_POSITIONS}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.positionItem,
                    form.position === item && styles.positionItemSelected,
                  ]}
                  onPress={() => {
                    update("position", item);
                    setPositionModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.positionItemText,
                      form.position === item && styles.positionItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {form.position === item && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="example@gmail.com"
        placeholderTextColor="#999"
        value={form.email}
        onChangeText={(v) => update("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.fieldLabel}>Password</Text>
      <View style={[styles.input, styles.passwordRow]}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#999"
          value={form.password}
          onChangeText={(v) => update("password", v)}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          disabled={loading}
        >
          <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>Confirm Password</Text>
      <View style={[styles.input, styles.passwordRow]}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          value={form.confirmPassword}
          onChangeText={(v) => update("confirmPassword", v)}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword((prev) => !prev)}
          disabled={loading}
        >
          <Text style={styles.toggleText}>
            {showConfirmPassword ? "Hide" : "Show"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {/* ✅ HEADER (No back button + moved down) */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Create Admin Account</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {activeSection === "personal"
            ? renderPersonalSection()
            : renderWorkSection()}

          {/* ✅ BUTTONS (Personal has Back+Next now with confirmation) */}
          <View style={styles.navigationButtons}>
            {activeSection === "personal" ? (
              <TouchableOpacity
                style={[styles.button, styles.backButtonStyle]}
                onPress={confirmExit} // ✅ confirm before leaving
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            ) : (
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
                  if (validatePersonalInfo()) setActiveSection("work");
                } else {
                  handleSubmit();
                }
              }}
              disabled={loading}
            >
              <Text style={styles.nextButtonText}>
                {loading
                  ? "Processing..."
                  : activeSection === "personal"
                  ? "Next"
                  : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  headerContainer: {
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + 12
        : 15,
    paddingBottom: 15,
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

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20 },

  spacer: { height: 100 },
  formSection: { marginTop: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    fontSize: 14,
    color: "#000",
  },

  dropdownInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: { fontSize: 14, color: "#000" },
  placeholderText: { color: "#999" },
  dropdownIcon: { fontSize: 12, color: "#666" },

  datePickerInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datePickerText: { fontSize: 14, color: "#000" },
  datePickerIcon: { fontSize: 18 },

  iosBirthdayPickerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginBottom: 15,
  },
  iosBirthdayButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
  },
  iosBirthdayButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: { fontSize: 16, fontWeight: "600", color: "#000" },
  closeButton: { fontSize: 24, color: "#666" },

  positionItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  positionItemSelected: { backgroundColor: "#E8F5E9" },
  positionItemText: { fontSize: 14, color: "#333" },
  positionItemTextSelected: { color: "#4CAF50", fontWeight: "600" },
  checkmark: { fontSize: 18, color: "#4CAF50", fontWeight: "bold" },

  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  backButtonStyle: { backgroundColor: "#F0F0F0" },
  nextButton: { backgroundColor: "#4CAF50" },
  buttonDisabled: { opacity: 0.6 },
  backButtonText: { color: "#000", fontWeight: "500" },
  nextButtonText: { color: "#FFFFFF", fontWeight: "500" },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 0,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 10,
    fontSize: 14,
    color: "#000",
  },
  toggleText: { fontSize: 13, fontWeight: "500", color: "#4CAF50" },
});
