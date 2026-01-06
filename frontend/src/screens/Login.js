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
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import {
  collection,
  getFirestore,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
  // ✅ hide noisy firebase logs in dev (best-effort)
  "FirebaseError:",
  "Firebase: Error"
]);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = Math.min(380, SCREEN_WIDTH - 40);

// Change this to your backend URL
const BACKEND_URL = "https://funnycashbot-olshop.com/send-verification-code.php";

// Helper function to generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ Admin task role helpers
const ADMIN_TASK_ROLES = ["processing", "validator", "inspector"];

const POSITION_TO_TASK_ROLE = {
  "Processing of E-bike Registration": "processing",
  "Validator of E-bike Registration": "validator",
  "Inspector": "inspector",

  // ✅ backward compatibility (old label)
  "Inspection": "inspector"
};

const getAdminTaskRole = (userData = {}) => {
  const raw = (userData.adminTaskRole || "").toString().toLowerCase().trim();
  if (ADMIN_TASK_ROLES.includes(raw)) return raw;

  const pos = (userData.position || "").toString().trim();
  return POSITION_TO_TASK_ROLE[pos] || "processing";
};

// ✅ friendly firebase auth messages (no raw firebase message shown)
const getFriendlyAuthMessage = (code = "") => {
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Please contact the administrator.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Please check your internet connection.",
    // ✅ common “wrong email/password” variants (depends on firebase sdk version)
    "auth/user-not-found": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-login-credentials": "Invalid email or password."
  };

  return map[code] || "Login failed. Please try again.";
};

export default function Login({ navigation }) {
  // ❌ removed role switching
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false); // login loading
  const [isResetting, setIsResetting] = useState(false); // forgot-password loading

  // show/hide password
  const [showPassword, setShowPassword] = useState(false);

  // ✅ inline notice (built-in app message) instead of firebase error popups/messages
  const [loginNotice, setLoginNotice] = useState("");

  // Email verification states
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [tempUserEmail, setTempUserEmail] = useState("");
  const [tempUserRole, setTempUserRole] = useState(""); // detected role
  const [tempUserDocId, setTempUserDocId] = useState(""); // detected user doc id (will be UID)
  const [resendCountdown, setResendCountdown] = useState(0);

  // ✅ store detected admin task role (processing/validator/inspector)
  const [tempAdminTaskRole, setTempAdminTaskRole] = useState("");

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
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // ===== FORGOT PASSWORD HANDLER =====
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      Alert.alert("Forgot Password", "Please enter your email first.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setIsResetting(true);
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        "Reset Link Sent",
        `A password reset link has been sent to ${trimmedEmail}. Please check your inbox or spam folder.`
      );
    } catch (error) {
      // ✅ no firebase raw message
      if (error?.code === "auth/user-not-found") {
        Alert.alert("Error", "No account found with this email.");
      } else if (error?.code === "auth/invalid-email") {
        Alert.alert("Error", "Please enter a valid email address.");
      } else if (error?.code === "auth/network-request-failed") {
        Alert.alert("Error", "Network error. Please check your internet connection.");
      } else {
        Alert.alert("Error", "Failed to send reset email. Please try again.");
      }
    } finally {
      setIsResetting(false);
    }
  };

  // Send email verification code via PHP backend
  const sendEmailVerificationCode = async (userEmail, userDocId) => {
    try {
      const verificationCode = generateVerificationCode();

      // Update user document with verification code
      const userRef = doc(db, "users", userDocId);
      await updateDoc(userRef, {
        emailVerificationCode: verificationCode,
        emailVerificationCodeSentAt: new Date()
      });

      // Call PHP backend to send email
      try {
        const response = await fetch(BACKEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: userEmail,
            verificationCode: verificationCode
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          Alert.alert("Code Sent", `Verification code has been sent to ${userEmail}`);
          return true;
        } else {
          throw new Error(data?.error || "Failed to send email");
        }
      } catch (error) {
        // Fallback: Show code in alert (kept as-is)
        Alert.alert("Code Generated", `Your verification code is:\n\n${verificationCode}`, [
          { text: "OK" }
        ]);
        return true;
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate verification code. Please try again.");
      return false;
    }
  };

  // ✅ role + task routing (FIXED)
  // ✅ Rider -> HomeRider
  // ✅ Admin (processing/validator/inspector) -> ALWAYS HomeAdmin
  // HomeAdmin will handle which tabs to show based on adminTaskRole param.
  const navigateByRoleAndTask = (roleValue, adminTaskRoleValue = "") => {
    if (roleValue === "Rider") {
      navigation.replace("HomeRider");
      return;
    }

    const task = (adminTaskRoleValue || "processing").toLowerCase();

    // ✅ ALWAYS go to HomeAdmin
    navigation.replace("HomeAdmin", { adminTaskRole: task });
  };

  // Verify email code (DOC-ID based)
  const handleVerifyEmailCode = async () => {
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
      if (!tempUserDocId) {
        Alert.alert("Error", "Missing user reference. Please login again.");
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", tempUserDocId);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        Alert.alert("Error", "User not found. Please login again.");
        await signOut(auth);
        return;
      }

      const userData = snap.data();

      if (userData.emailVerificationCode === emailVerificationCode) {
        setShowEmailVerificationModal(false);
        setEmailVerificationCode("");

        // ✅ refresh admin task role (in case missing)
        const computedTaskRole = tempUserRole === "Admin" ? getAdminTaskRole(userData) : "";
        if (computedTaskRole && computedTaskRole !== tempAdminTaskRole) {
          setTempAdminTaskRole(computedTaskRole);
          await setDoc(
            doc(db, "users", tempUserDocId),
            { adminTaskRole: computedTaskRole },
            { merge: true }
          );
        }

        // After email verification, check if 2FA is enabled
        if (userData.twoFAEnabled === true) {
          Alert.alert("Success", "Email verified! Now verify 2FA.");
          setShow2FAModal(true);
        } else {
          Alert.alert("Success", "Email verified! Logging in...");
          setTimeout(() => {
            navigateByRoleAndTask(tempUserRole, computedTaskRole || tempAdminTaskRole);
          }, 500);
        }
      } else {
        Alert.alert("Invalid Code", "The verification code you entered is incorrect.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify email code");
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Resend email verification code
  const handleResendEmailCode = async () => {
    const success = await sendEmailVerificationCode(tempUserEmail, tempUserDocId);
    if (success) setResendCountdown(60);
  };

  // Verify 2FA code (DOC-ID based)
  const handleVerify2FA = async () => {
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
      if (!tempUserDocId) {
        Alert.alert("Error", "Missing user reference. Please login again.");
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", tempUserDocId);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        Alert.alert("Error", "User not found. Please login again.");
        await signOut(auth);
        return;
      }

      const userData = snap.data();

      if (userData.twoFAEnabled === true && userData.twoFACode === twoFACode) {
        Alert.alert("Success", "Login successful!");

        setShow2FAModal(false);
        setTwoFACode("");

        // ✅ refresh admin task role again
        const computedTaskRole = tempUserRole === "Admin" ? getAdminTaskRole(userData) : "";
        if (computedTaskRole && computedTaskRole !== tempAdminTaskRole) {
          setTempAdminTaskRole(computedTaskRole);
          await setDoc(
            doc(db, "users", tempUserDocId),
            { adminTaskRole: computedTaskRole },
            { merge: true }
          );
        }

        setTimeout(() => {
          navigateByRoleAndTask(tempUserRole, computedTaskRole || tempAdminTaskRole);
        }, 500);
      } else {
        Alert.alert("Invalid Code", "The 2FA code you entered is incorrect.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify 2FA code");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  // Resend 2FA code (placeholder)
  const handleResend2FA = () => {
    Alert.alert("Code Sent", "A new 2FA code has been sent to your email");
  };

  const handleLogin = async () => {
    // ✅ clear previous notice
    setLoginNotice("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();

    // ✅ built-in notice (no alert) for input validation
    if (!trimmedEmail) {
      setLoginNotice("Please enter your email.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setLoginNotice("Please enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setLoginNotice("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);

      // ✅ After signIn, get UID
      const uid = auth.currentUser?.uid;
      if (!uid) {
        await signOut(auth);
        setLoginNotice("Missing user session. Please login again.");
        return;
      }

      // ✅ 1) Try users/{uid} first
      let userDocId = uid;
      let userData = null;

      const uidRef = doc(db, "users", uid);
      const uidSnap = await getDoc(uidRef);

      if (uidSnap.exists()) {
        userData = uidSnap.data();

        // ✅ if adminTaskRole missing, auto-create it from position
        if (userData?.role === "Admin") {
          const computed = getAdminTaskRole(userData);
          if ((userData.adminTaskRole || "").toLowerCase() !== computed) {
            await setDoc(doc(db, "users", uid), { adminTaskRole: computed }, { merge: true });
            userData = { ...userData, adminTaskRole: computed };
          }
        }
      } else {
        // ✅ 2) Fallback: old accounts saved with addDoc(randomID) — search by email
        const userQuery = query(collection(db, "users"), where("email", "==", trimmedEmail));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          await signOut(auth);
          setLoginNotice("No account found in the system for this email.");
          return;
        }

        if (userSnapshot.size > 1) {
          await signOut(auth);
          setLoginNotice("Multiple accounts found for this email. Please contact the administrator.");
          return;
        }

        const oldDoc = userSnapshot.docs[0];
        userData = oldDoc.data();

        // ✅ MIGRATION: copy legacy doc into users/{uid}
        const computedTask = userData?.role === "Admin" ? getAdminTaskRole(userData) : "";

        await setDoc(
          doc(db, "users", uid),
          {
            ...userData,
            uid: uid,
            email: trimmedEmail,
            ...(computedTask ? { adminTaskRole: computedTask } : {})
          },
          { merge: true }
        );

        userDocId = uid;
        userData = {
          ...userData,
          uid,
          email: trimmedEmail,
          ...(computedTask ? { adminTaskRole: computedTask } : {})
        };
      }

      const detectedRole = userData?.role; // "Admin" or "Rider"

      if (detectedRole !== "Admin" && detectedRole !== "Rider") {
        await signOut(auth);
        setLoginNotice("Invalid user role. Please contact administrator.");
        return;
      }

      const detectedAdminTaskRole = detectedRole === "Admin" ? getAdminTaskRole(userData) : "";

      // store temp values for verification flows
      setTempUserEmail(trimmedEmail);
      setTempUserRole(detectedRole);
      setTempUserDocId(userDocId); // ✅ always UID now
      setTempAdminTaskRole(detectedAdminTaskRole);

      // Check if email verification is enabled
      if (userData.emailVerificationEnabled === true) {
        const codeSent = await sendEmailVerificationCode(trimmedEmail, userDocId);
        if (codeSent) {
          setShowEmailVerificationModal(true);
          setResendCountdown(60);
        }
        return;
      }

      // If no email verification, check 2FA
      if (userData.twoFAEnabled === true) {
        setShow2FAModal(true);
        return;
      }

      // Both verifications disabled - proceed
      navigateByRoleAndTask(detectedRole, detectedAdminTaskRole);
    } catch (error) {
      // ✅ no console.error, no raw firebase message shown
      const friendly = getFriendlyAuthMessage(error?.code);
      setLoginNotice(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ wrappers to clear notice when typing
  const handleEmailChange = (v) => {
    setLoginNotice("");
    setEmail(v);
  };
  const handlePasswordChange = (v) => {
    setLoginNotice("");
    setPassword(v);
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
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your Email"
                placeholderTextColor="#9b9b9b"
                value={email}
                onChangeText={handleEmailChange}
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
                  onChangeText={handlePasswordChange}
                  editable={!isLoading}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: 14,
                    padding: 4
                  }}
                  disabled={isLoading}
                >
                  <Text style={{ color: "#2e7d32", fontWeight: "700" }}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Forgot password under Show/Hide */}
              <View style={styles.forgotRow}>
                <TouchableOpacity onPress={handleForgotPassword} disabled={isResetting}>
                  <Text style={styles.forgotText}>
                    {isResetting ? "Sending reset link..." : "Forgot password?"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ✅ Built-in app notice (no Firebase popup/message) */}
              {!!loginNotice && <Text style={styles.inlineNotice}>{loginNotice}</Text>}

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
                  onPress={() => navigation.navigate("RegisterRider")}
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
            <Text style={styles.verificationSubtitle}>Enter the 6-digit code</Text>

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
              style={[
                styles.verificationButton,
                isVerifyingEmail && styles.verificationButtonDisabled
              ]}
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
              onPress={async () => {
                if (!isVerifyingEmail) {
                  setShowEmailVerificationModal(false);
                  setEmailVerificationCode("");
                  setEmail("");
                  setPassword("");
                  setLoginNotice("");
                  await signOut(auth); // ✅ security: cancel = logout
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
            <Text style={styles.twoFASubtitle}>Enter the 6-digit code sent to your email</Text>

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
              onPress={async () => {
                if (!isVerifying2FA) {
                  setShow2FAModal(false);
                  setTwoFACode("");
                  setEmail("");
                  setPassword("");
                  setLoginNotice("");
                  await signOut(auth); // ✅ security: cancel = logout
                }
              }}
              disabled={isVerifying2FA}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: "#16662f"
  },
  fullscreen: {
    flex: 1
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40
  },
  fullGreen: {
    position: "absolute",
    width: "100%",
    height: SCREEN_HEIGHT,
    backgroundColor: "#16662f"
  },
  headerWrap: {
    width: "100%",
    paddingHorizontal: 26,
    marginBottom: 10
  },
  welcome: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800"
  },
  aide: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4
  },
  cardWrapper: {
    marginTop: 30,
    alignItems: "center"
  },
  sealHolder: {
    position: "absolute",
    top: -42,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 80,
    zIndex: 50
  },
  scooterMiddle: {
    width: 85,
    height: 85
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
    elevation: 8
  },
  label: {
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
    marginLeft: 4
  },
  input: {
    backgroundColor: "#fff",
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e3e3e3"
  },

  // forgot password styles
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -4,
    marginBottom: 4
  },
  forgotText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "600"
  },

  // ✅ inline notice style
  inlineNotice: {
    marginTop: 6,
    marginBottom: 4,
    color: "#b00020",
    fontSize: 12,
    fontWeight: "700"
  },

  loginBtn: {
    backgroundColor: "#124923",
    paddingVertical: 13,
    borderRadius: 22,
    alignSelf: "center",
    width: "65%",
    alignItems: "center",
    marginTop: 20
  },
  loginBtnDisabled: {
    opacity: 0.6
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800"
  },
  signupRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center"
  },
  bottomText: { color: "#777" },
  signUpText: {
    color: "#2e7d32",
    fontWeight: "700"
  },

  /* MODALS */
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  },

  /* EMAIL VERIFICATION MODAL */
  emailVerificationModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center"
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    color: "#333"
  },
  verificationSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30
  },
  verificationCodeInput: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#2e7d32",
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 8,
    marginBottom: 24
  },
  verificationButton: {
    width: "100%",
    backgroundColor: "#2e7d32",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12
  },
  verificationButtonDisabled: {
    opacity: 0.6
  },
  verificationButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700"
  },

  /* 2FA Modal */
  twoFAModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center"
  },
  twoFATitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    color: "#333"
  },
  twoFASubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30
  },
  twoFACodeInput: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#2e7d32",
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 8,
    marginBottom: 24
  },
  twoFAButton: {
    width: "100%",
    backgroundColor: "#2e7d32",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12
  },
  twoFAButtonDisabled: {
    opacity: 0.6
  },
  twoFAButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700"
  },

  resendButton: {
    marginBottom: 12
  },
  resendButtonDisabled: {
    opacity: 0.5
  },
  resendText: {
    color: "#2e7d32",
    fontSize: 14,
    fontWeight: "600"
  },

  cancelButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center"
  },
  cancelText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600"
  }
});
