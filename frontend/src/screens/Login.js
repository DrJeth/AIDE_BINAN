import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  LogBox,
  ActivityIndicator
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { collection, getFirestore, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = Math.min(380, SCREEN_WIDTH - 40);

// Change this to your backend URL
const BACKEND_URL = "https://funnycashbot-olshop.com/send-verification-code.php";
// OR for localhost: "http://localhost:8000/send-verification-code.php"

// Helper function to generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function Login({ navigation }) {
  const [role, setRole] = useState("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationModalVisible, setRegistrationModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // NEW: show/hide password
  const [showPassword, setShowPassword] = useState(false);
  
  // Email verification states
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [tempUserEmail, setTempUserEmail] = useState("");
  const [tempUserRole, setTempUserRole] = useState("");
  const [tempUserDocId, setTempUserDocId] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  
  // 2FA states
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  
  const db = getFirestore();

  // Countdown timer for resend button
  useEffect(() => {
    let interval;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  useEffect(() => {
    console.log("Login screen mounted");
  }, []);

  // Send email verification code via PHP backend
  const sendEmailVerificationCode = async (userEmail, userDocId) => {
    try {
      const verificationCode = generateVerificationCode();
      console.log("Generated verification code:", verificationCode);

      // Update user document with verification code
      const userRef = doc(db, "users", userDocId);
      await updateDoc(userRef, {
        emailVerificationCode: verificationCode,
        emailVerificationCodeSentAt: new Date(),
      });

      console.log("Verification code saved to Firestore");

      // Call PHP backend to send email
      try {
        console.log("Calling PHP backend...");
        
        const response = await fetch(BACKEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userEmail,
            verificationCode: verificationCode,
          }),
        });

        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);

        if (response.ok && data.success) {
          console.log("Email sent successfully!");
          Alert.alert("Code Sent", `Verification code has been sent to ${userEmail}`);
          return true;
        } else {
          console.error("Backend error:", data.error);
          throw new Error(data.error || "Failed to send email");
        }
      } catch (error) {
        console.error("PHP backend error:", error);
        
        // Fallback: Show code in alert
        console.log(`\n=== VERIFICATION CODE (Fallback) ===`);
        console.log(`Email: ${userEmail}`);
        console.log(`Code: ${verificationCode}`);
        console.log(`====================================\n`);
        
        Alert.alert(
          "Code Generated",
          `Your verification code is:\n\n${verificationCode}`,
          [{ text: "OK" }]
        );
        return true;
      }
    } catch (error) {
      console.error("Error in sendEmailVerificationCode:", error);
      Alert.alert("Error", "Failed to generate verification code. Please try again.");
      return false;
    }
  };

  // Verify email code
  const handleVerifyEmailCode = async () => {
    console.log("Verifying email code:", emailVerificationCode);

    if (!emailVerificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    if (emailVerificationCode.length !== 6) {
      Alert.alert("Error", "Verification code must be 6 digits");
      return;
    }

    setIsVerifyingEmail(true);
    try {
      // Get user data to verify code
      const userQuery = query(
        collection(db, "users"),
        where("email", "==", tempUserEmail),
        where("role", "==", tempUserRole)
      );

      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        console.log("Verifying email code against user data");

        // Check if code matches
        if (userData.emailVerificationCode === emailVerificationCode) {
          console.log("Email verification successful!");

          setShowEmailVerificationModal(false);
          setEmailVerificationCode("");

          // After email verification, check if 2FA is enabled
          if (userData.twoFAEnabled === true) {
            console.log("2FA is ENABLED - showing 2FA modal");
            Alert.alert("Success", "Email verified! Now verify 2FA.");
            setShow2FAModal(true);
          } else {
            console.log("2FA is NOT enabled - proceeding to home");
            Alert.alert("Success", "Email verified! Logging in...");
            setTimeout(() => {
              if (tempUserRole === "Rider") {
                navigation.replace("HomeRider");
              } else {
                navigation.replace("HomeAdmin");
              }
            }, 500);
          }
        } else {
          Alert.alert("Invalid Code", "The verification code you entered is incorrect.");
        }
      } else {
        Alert.alert("Error", "User not found");
      }
    } catch (error) {
      console.error("Email verification error:", error);
      Alert.alert("Error", "Failed to verify email code");
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Resend email verification code
  const handleResendEmailCode = async () => {
    console.log("Resending email verification code");
    const success = await sendEmailVerificationCode(tempUserEmail, tempUserDocId);
    if (success) {
      setResendCountdown(60);
    }
  };

  // Verify 2FA code
  const handleVerify2FA = async () => {
    console.log("Verifying 2FA code:", twoFACode);

    if (!twoFACode.trim()) {
      Alert.alert("Error", "Please enter your 2FA code");
      return;
    }

    if (twoFACode.length !== 6) {
      Alert.alert("Error", "2FA code must be 6 digits");
      return;
    }

    setIsVerifying2FA(true);
    try {
      const userQuery = query(
        collection(db, "users"),
        where("email", "==", tempUserEmail),
        where("role", "==", tempUserRole)
      );

      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        console.log("Verifying against user data:", userData);

        if (userData.twoFAEnabled === true && userData.twoFACode === twoFACode) {
          console.log("2FA verification successful!");
          Alert.alert("Success", "Login successful!");

          setShow2FAModal(false);
          setTwoFACode("");

          setTimeout(() => {
            if (tempUserRole === "Rider") {
              console.log("Navigating to HomeRider");
              navigation.replace("HomeRider");
            } else {
              console.log("Navigating to HomeAdmin");
              navigation.replace("HomeAdmin");
            }
          }, 500);
        } else {
          Alert.alert("Invalid Code", "The 2FA code you entered is incorrect.");
        }
      } else {
        Alert.alert("Error", "User not found");
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      Alert.alert("Error", "Failed to verify 2FA code");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  // Resend 2FA code
  const handleResend2FA = () => {
    console.log("Resend 2FA code");
    Alert.alert("Code Sent", "A new 2FA code has been sent to your email");
  };

  const handleLogin = async () => {
    console.log("Attempting login with email:", email, "role:", role);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Firebase authentication...");
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log("Authentication successful");

      // Check user role and get user document
      if (role === "Rider") {
        console.log("Checking Rider role...");
        const riderQuery = query(
          collection(db, "users"),
          where("email", "==", email.trim()),
          where("role", "==", "Rider")
        );
        const riderSnapshot = await getDocs(riderQuery);

        if (riderSnapshot.empty) {
          console.log("No rider found");
          await auth.signOut();
          Alert.alert("Login Error", "No rider account found with this email.");
          setIsLoading(false);
          return;
        }

        const userData = riderSnapshot.docs[0].data();
        const userDocId = riderSnapshot.docs[0].id;
        console.log("Rider data found:", userData);

        // Check if email verification is enabled
        if (userData.emailVerificationEnabled === true) {
          console.log("Email verification is ENABLED - sending code");
          setTempUserEmail(email.trim());
          setTempUserRole("Rider");
          setTempUserDocId(userDocId);

          const codeSent = await sendEmailVerificationCode(email.trim(), userDocId);
          if (codeSent) {
            setShowEmailVerificationModal(true);
            setResendCountdown(60);
          }
        } else {
          console.log("Email verification is NOT enabled - checking 2FA");
          if (userData.twoFAEnabled === true) {
            console.log("2FA is ENABLED - showing 2FA modal");
            setTempUserEmail(email.trim());
            setTempUserRole("Rider");
            setShow2FAModal(true);
          } else {
            console.log("Both verifications disabled - proceeding to HomeRider");
            navigation.replace("HomeRider");
          }
        }

        setIsLoading(false);
        return;
      } else {
        // Admin login
        console.log("Checking Admin role...");
        const adminQuery = query(
          collection(db, "users"),
          where("email", "==", email.trim()),
          where("role", "==", "Admin")
        );
        const adminSnapshot = await getDocs(adminQuery);

        if (adminSnapshot.empty) {
          console.log("No admin found");
          await auth.signOut();
          Alert.alert("Login Error", "No admin account found with this email.");
          setIsLoading(false);
          return;
        }

        const userData = adminSnapshot.docs[0].data();
        const userDocId = adminSnapshot.docs[0].id;
        console.log("Admin data found:", userData);

        // Check if email verification is enabled
        if (userData.emailVerificationEnabled === true) {
          console.log("Email verification is ENABLED - sending code");
          setTempUserEmail(email.trim());
          setTempUserRole("Admin");
          setTempUserDocId(userDocId);

          const codeSent = await sendEmailVerificationCode(email.trim(), userDocId);
          if (codeSent) {
            setShowEmailVerificationModal(true);
            setResendCountdown(60);
          }
        } else {
          console.log("Email verification is NOT enabled - checking 2FA");
          if (userData.twoFAEnabled === true) {
            console.log("2FA is ENABLED - showing 2FA modal");
            setTempUserEmail(email.trim());
            setTempUserRole("Admin");
            setShow2FAModal(true);
          } else {
            console.log("Both verifications disabled - proceeding to HomeAdmin");
            navigation.replace("HomeAdmin");
          }
        }

        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.code === 'auth/invalid-email') {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
      } else if (error.code === 'auth/user-not-found') {
        Alert.alert("Login Failed", "No user found with this email address.");
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert("Login Failed", "Incorrect password. Please try again.");
      } else {
        Alert.alert("Login Failed", error.message || "Unable to log in.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSelection = (selectedRole) => {
    setRegistrationModalVisible(false);
    if (selectedRole === "Admin") {
      navigation.navigate("RegisterAdmin");
    } else {
      navigation.navigate("RegisterRider");
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        style={styles.fullscreen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.centerContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fullGreen} />

          <View style={styles.headerWrap}>
            <Text style={styles.welcome}>WELCOME to</Text>
            <Text style={styles.aide}>A.I.D.E BINAN</Text>
          </View>

          <View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
            <View style={styles.sealHolder}>
              <Image
                source={require("../../assets/scooter-emblem.png")}
                style={styles.scooterMiddle}
                resizeMode="contain"
              />
            </View>

            <View style={styles.whiteCard}>
              <View style={styles.tabsRow}>
                <TouchableOpacity style={styles.tabTouch} onPress={() => setRole("Admin")}>
                  <Text style={[styles.tabText, role === "Admin" && styles.tabTextActive]}>
                    Admin
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabTouch} onPress={() => setRole("Rider")}>
                  <Text style={[styles.tabText, role === "Rider" && styles.tabTextActive]}>
                    Rider
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.progressRow}>
                <View
                  style={[
                    styles.progressSegment,
                    role === "Admin" ? styles.progressGreen : styles.progressDark,
                  ]}
                />
                <View
                  style={[
                    styles.progressSegment,
                    role === "Rider" ? styles.progressGreen : styles.progressDark,
                  ]}
                />
              </View>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your Email"
                placeholderTextColor="#9b9b9b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />

              <Text style={[styles.label, { marginTop: 8 }]}>Password</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9b9b9b"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: 14,
                    padding: 4,
                  }}
                  disabled={isLoading}
                >
                  <Text style={{ color: "#2e7d32", fontWeight: "700" }}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Log In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.signupRow}>
                <Text style={styles.bottomText}>Don't have an account?</Text>
                <TouchableOpacity
                  onPress={() => setRegistrationModalVisible(true)}
                  disabled={isLoading}
                >
                  <Text style={styles.signUpText}> Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* EMAIL VERIFICATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showEmailVerificationModal}
        onRequestClose={() => {
          if (!isVerifyingEmail) {
            setShowEmailVerificationModal(false);
            setEmailVerificationCode("");
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.emailVerificationModalContent}>
            <Text style={styles.verificationTitle}>Email Verification</Text>
            <Text style={styles.verificationSubtitle}>
              Enter the 6-digit code
            </Text>

            <TextInput
              style={styles.verificationCodeInput}
              placeholder="000000"
              placeholderTextColor="#ccc"
              value={emailVerificationCode}
              onChangeText={setEmailVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifyingEmail}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.verificationButton, isVerifyingEmail && styles.verificationButtonDisabled]}
              onPress={handleVerifyEmailCode}
              disabled={isVerifyingEmail}
            >
              {isVerifyingEmail ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.verificationButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resendButton,
                resendCountdown > 0 && styles.resendButtonDisabled
              ]}
              onPress={handleResendEmailCode}
              disabled={isVerifyingEmail || resendCountdown > 0}
            >
              <Text style={styles.resendText}>
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Didn't receive? Resend"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                if (!isVerifyingEmail) {
                  setShowEmailVerificationModal(false);
                  setEmailVerificationCode("");
                  setEmail("");
                  setPassword("");
                }
              }}
              disabled={isVerifyingEmail}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2FA VERIFICATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={show2FAModal}
        onRequestClose={() => {
          if (!isVerifying2FA) {
            setShow2FAModal(false);
            setTwoFACode("");
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.twoFAModalContent}>
            <Text style={styles.twoFATitle}>2-Step Verification</Text>
            <Text style={styles.twoFASubtitle}>
              Enter the 6-digit code sent to your email
            </Text>

            <TextInput
              style={styles.twoFACodeInput}
              placeholder="000000"
              placeholderTextColor="#ccc"
              value={twoFACode}
              onChangeText={setTwoFACode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifying2FA}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.twoFAButton, isVerifying2FA && styles.twoFAButtonDisabled]}
              onPress={handleVerify2FA}
              disabled={isVerifying2FA}
            >
              {isVerifying2FA ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.twoFAButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend2FA}
              disabled={isVerifying2FA}
            >
              <Text style={styles.resendText}>Didn't receive? Resend</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                if (!isVerifying2FA) {
                  setShow2FAModal(false);
                  setTwoFACode("");
                  setEmail("");
                  setPassword("");
                }
              }}
              disabled={isVerifying2FA}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REGISTRATION SELECTION MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={registrationModalVisible}
        onRequestClose={() => setRegistrationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Registration Type</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleRegistrationSelection("Admin")}
            >
              <Text style={styles.modalButtonText}>Register as Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleRegistrationSelection("Rider")}
            >
              <Text style={styles.modalButtonText}>Register as Rider</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setRegistrationModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#16662f",
  },
  fullscreen: {
    flex: 1,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  fullGreen: {
    position: "absolute",
    width: "100%",
    height: SCREEN_HEIGHT,
    backgroundColor: "#16662f",
  },
  headerWrap: {
    width: "100%",
    paddingHorizontal: 26,
    marginBottom: 10,
  },
  welcome: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
  },
  aide: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  cardWrapper: {
    marginTop: 30,
    alignItems: "center",
  },
  sealHolder: {
    position: "absolute",
    top: -42,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 80,
    zIndex: 50,
  },
  scooterMiddle: {
    width: 85,
    height: 85,
  },
  whiteCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "#cccccc",
    elevation: 8,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabTouch: {
    paddingVertical: 6,
  },
  tabText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#2e7d32",
  },
  progressRow: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  progressGreen: { backgroundColor: "#2e7d32" },
  progressDark: { backgroundColor: "#222" },
  label: {
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#fff",
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e3e3e3",
  },
  loginBtn: {
    backgroundColor: "#124923",
    paddingVertical: 13,
    borderRadius: 22,
    alignSelf: "center",
    width: "65%",
    alignItems: "center",
    marginTop: 20,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  signupRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
  },
  bottomText: { color: "#777" },
  signUpText: {
    color: "#2e7d32",
    fontWeight: "700",
  },

  /* MODALS */
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },

  /* EMAIL VERIFICATION MODAL */
  emailVerificationModalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    color: '#333',
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  verificationCodeInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#2e7d32',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 8,
    marginBottom: 24,
  },
  verificationButton: {
    width: '100%',
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationButtonDisabled: {
    opacity: 0.6,
  },
  verificationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  /* 2FA Modal */
  twoFAModalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  twoFATitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    color: '#333',
  },
  twoFASubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  twoFACodeInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#2e7d32',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 8,
    marginBottom: 24,
  },
  twoFAButton: {
    width: '100%',
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  twoFAButtonDisabled: {
    opacity: 0.6,
  },
  twoFAButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  resendButton: {
    marginBottom: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },

  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Registration Modal */
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  modalButton: {
    width: '100%',
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center'
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  modalCancelButton: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  modalCancelText: {
    color: '#333',
    fontSize: 16
  }
});
