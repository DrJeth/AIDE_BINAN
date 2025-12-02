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
  Platform
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from "../config/firebaseConfig";
import { getFirestore, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const db = getFirestore();

function RegisterRider({ navigation }) {
  const [activeSection, setActiveSection] = useState('personal');
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
    confirmPassword: ""
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Validation Functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim().toLowerCase());
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.slice(0, 11); // Max 11 digits
  };

  const validateContactNumber = (contactNumber) => {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(contactNumber.replace(/\D/g, ''));
  };

  const validateAge = (birthday) => {
    const today = new Date();
    const age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      return age - 1;
    }
    return age;
  };

  const validateChassisMotorNumber = (number) => {
    if (!number || number.trim() === '') return false;
    if (number.toLowerCase() === 'none') return true;
    
    const cleanNumber = number.replace(/\D/g, '');
    // Chassis: 10-12 digits OR Motor: 15-20 digits
    return (cleanNumber.length >= 10 && cleanNumber.length <= 12) || 
           (cleanNumber.length >= 15 && cleanNumber.length <= 20);
  };

  const validatePlateNumber = (plateNumber) => {
    // Format: 2 letters & 4 numbers (e.g., AB1234)
    const plateRegex = /^[A-Za-z]{2}\d{4}$/;
    return plateRegex.test(plateNumber.trim().toUpperCase());
  };

  const validatePersonalInfo = () => {
    const personalFields = [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'contactNumber', label: 'Contact Number' },
      { key: 'address', label: 'Address' }
    ];

    for (let field of personalFields) {
      if (!form[field.key] || (typeof form[field.key] === 'string' && form[field.key].trim() === '')) {
        Alert.alert('Error', `Please fill in ${field.label}`);
        return false;
      }
    }

    if (!form.birthday) {
      Alert.alert('Error', 'Please select your birthday');
      return false;
    }

    // Validate age (minimum 18 years old)
    const age = validateAge(form.birthday);
    if (age < 18) {
      Alert.alert('Error', `You must be at least 18 years old to register. You are currently ${age} years old.`);
      return false;
    }

    if (!validateContactNumber(form.contactNumber)) {
      Alert.alert('Error', 'Contact number must be 10-11 digits');
      return false;
    }

    return true;
  };

  const validateEbikeInfo = () => {
    // Check all required fields
    const ebikeFields = [
      { key: 'ebikeBrand', label: 'E-Bike Brand' },
      { key: 'ebikeModel', label: 'Model Unit' },
      { key: 'ebikeColor', label: 'E-Bike Color' },
      { key: 'branch', label: 'Branch' },
      { key: 'plateNumber', label: 'Plate Number' },
      { key: 'email', label: 'Email' },
      { key: 'password', label: 'Password' },
      { key: 'confirmPassword', label: 'Confirm Password' }
    ];

    for (let field of ebikeFields) {
      const value = form[field.key];
      if (value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
        Alert.alert('Error', `Please fill in ${field.label}`);
        return false;
      }
    }

    // Validate Chassis/Motor number
    if (!validateChassisMotorNumber(form.chassisMotorNumber)) {
      Alert.alert('Error', 'Please enter Chassis Number (10-12 digits), Motor Number (15-20 digits), or type "none"');
      return false;
    }

    // Validate Email format
    if (!validateEmail(form.email)) {
      Alert.alert('Error', 'Please enter a valid email address (e.g., user@example.com)');
      return false;
    }

    // Validate Plate Number format
    if (!validatePlateNumber(form.plateNumber)) {
      Alert.alert('Error', 'Plate Number must be in format: 2 letters followed by 4 numbers (e.g., AB1234)');
      return false;
    }

    // Validate passwords match
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    // Validate password length
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
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
      const normalizedPlateNumber = form.plateNumber.trim().toUpperCase();

      console.log("Checking plate number...");
      // Check if plate number exists
      const plateQuery = query(
        collection(db, "users"), 
        where("plateNumber", "==", normalizedPlateNumber)
      );
      const plateSnapshot = await getDocs(plateQuery);

      if (!plateSnapshot.empty) {
        Alert.alert('Error', 'This plate number is already registered. Please use a different plate number.');
        setLoading(false);
        return;
      }

      console.log("Checking email...");
      // Check if email already exists
      const emailQuery = query(
        collection(db, "users"), 
        where("email", "==", normalizedEmail)
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        Alert.alert('Error', 'This email is already registered. Please use a different email or log in.');
        setLoading(false);
        return;
      }

      console.log("Creating Firebase user...");
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        normalizedEmail, 
        form.password
      );

      console.log("Adding user to Firestore...");
      // Add user to Firestore
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthday: form.birthday.toISOString().split('T')[0],
        contactNumber: form.contactNumber,
        address: form.address.trim(),
        ebikeBrand: form.ebikeBrand.trim(),
        ebikeModel: form.ebikeModel.trim(),
        ebikeColor: form.ebikeColor.trim(),
        chassisMotorNumber: form.chassisMotorNumber.toLowerCase() === 'none' ? 'none' : form.chassisMotorNumber,
        branch: form.branch.trim(),
        plateNumber: normalizedPlateNumber,
        email: normalizedEmail,
        role: "Rider",
        status: "Pending",
        createdAt: new Date().toISOString()
      });

      console.log("Automatically logging in user...");
      // Automatically log in the user after registration
      await signInWithEmailAndPassword(auth, normalizedEmail, form.password);

      console.log("Registration successful!");
      Alert.alert(
        'Success', 
        'Your rider account has been created successfully! You are now logged in.',
        [{ text: 'OK', onPress: () => navigation.replace('HomeRider') }]
      );
    } catch (error) {
      console.error("Registration error full details:", JSON.stringify(error, null, 2));
      console.error("Error name:", error.name);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      let errorMessage = '';
      
      // More specific error messages
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or log in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password with at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format. Please check your email address.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Account creation is currently disabled. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }

      Alert.alert(
        'Registration Failed', 
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#999"
        value={form.firstName}
        onChangeText={(v) => update('firstName', v)}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#999"
        value={form.lastName}
        onChangeText={(v) => update('lastName', v)}
        editable={!loading}
      />
      
      <TouchableOpacity 
        style={styles.input} 
        onPress={() => !loading && setShowDatePicker(true)}
        disabled={loading}
      >
        <Text style={form.birthday ? styles.inputText : styles.placeholderText}>
          {form.birthday ? form.birthday.toLocaleDateString() : 'Birthday'}
        </Text>
      </TouchableOpacity>
      
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={form.birthday}
          mode="date"
          display="spinner"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              update('birthday', selectedDate);
            }
          }}
        />
      )}
      
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={form.birthday}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (event.type === 'set' && selectedDate) {
              update('birthday', selectedDate);
            }
          }}
        />
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Contact Number (10-11 digits)"
        placeholderTextColor="#999"
        value={form.contactNumber}
        onChangeText={(v) => update('contactNumber', formatPhoneNumber(v))}
        keyboardType="phone-pad"
        editable={!loading}
        maxLength={11}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Address"
        placeholderTextColor="#999"
        value={form.address}
        onChangeText={(v) => update('address', v)}
        editable={!loading}
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderEbikeSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>E-Bike Information</Text>
      
      <TextInput
        style={styles.input}
        placeholder="E-Bike Brand"
        placeholderTextColor="#999"
        value={form.ebikeBrand}
        onChangeText={(v) => update('ebikeBrand', v)}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Model Unit"
        placeholderTextColor="#999"
        value={form.ebikeModel}
        onChangeText={(v) => update('ebikeModel', v)}
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="E-Bike Color"
        placeholderTextColor="#999"
        value={form.ebikeColor}
        onChangeText={(v) => update('ebikeColor', v)}
        editable={!loading}
      />
      
      <View>
        <TextInput
          style={styles.input}
          placeholder="Chassis/Motor Number (10-12 or 15-20 digits, or 'none')"
          placeholderTextColor="#999"
          value={form.chassisMotorNumber}
          onChangeText={(v) => update('chassisMotorNumber', v)}
          editable={!loading}
        />
        <Text style={styles.helpText}>
          Format: Chassis 10-12 digits / Motor 15-20 digits / or type "none"
        </Text>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Branch (Store where purchased)"
        placeholderTextColor="#999"
        value={form.branch}
        onChangeText={(v) => update('branch', v)}
        editable={!loading}
      />
      
      <View>
        <TextInput
          style={styles.input}
          placeholder="Plate Number (e.g., AB1234)"
          placeholderTextColor="#999"
          value={form.plateNumber}
          onChangeText={(v) => update('plateNumber', v.toUpperCase())}
          editable={!loading}
          maxLength={6}
        />
        <Text style={styles.helpText}>
          Format: 2 letters followed by 4 numbers (e.g., AB1234)
        </Text>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={form.email}
        onChangeText={(v) => update('email', v.toLowerCase())}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        placeholderTextColor="#999"
        value={form.password}
        onChangeText={(v) => update('password', v)}
        secureTextEntry
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#999"
        value={form.confirmPassword}
        onChangeText={(v) => update('confirmPassword', v)}
        secureTextEntry
        editable={!loading}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
        >
          {activeSection === 'personal' ? renderPersonalSection() : renderEbikeSection()}

          <View style={styles.navigationButtons}>
            {activeSection === 'ebike' && (
              <TouchableOpacity 
                style={[styles.button, styles.backButtonStyle]} 
                onPress={() => setActiveSection('personal')}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.nextButton,
                loading && styles.buttonDisabled
              ]} 
              onPress={() => {
                if (activeSection === 'personal') {
                  if (validatePersonalInfo()) setActiveSection('ebike');
                } else {
                  handleSubmit();
                }
              }}
              disabled={loading}
            >
              <Text style={styles.nextButtonText}>
                {loading ? 'Loading...' : (activeSection === 'personal' ? 'Next' : 'Submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  backButton: {
    padding: 5
  },
  backText: {
    fontSize: 24,
    color: '#000'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginLeft: 15
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20
  },
  formSection: {
    marginTop: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
    color: '#000',
    justifyContent: 'center'
  },
  inputText: {
    color: '#000'
  },
  placeholderText: {
    color: '#999'
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 10,
    fontStyle: 'italic'
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 10
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  backButtonStyle: {
    backgroundColor: '#F0F0F0'
  },
  nextButton: {
    backgroundColor: '#4CAF50'
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7
  },
  backButtonText: {
    color: '#000',
    fontWeight: '500'
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '500'
  }
});

export default RegisterRider;