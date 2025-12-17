import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from "react-native";
import { auth } from "../config/firebaseConfig";
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { collection, getFirestore, query, where, getDocs, updateDoc } from "firebase/firestore";

// ❌ Removed ICON_BACK (no more back button in header)
// const ICON_BACK = require("./../../assets/top-emblem.png");
const ICON_CHEVRON = require("./../../assets/chevron-right.png");

export default function Settings({
  visible = false,
  onClose = () => {},
  userName = "User Account"
}) {
  const [screen, setScreen] = useState("main");
  const [loading, setLoading] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA state
  const [enabled2FA, setEnabled2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Email verification state
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(false);

  const db = getFirestore();

  // Load user data when Settings opens
  useEffect(() => {
    if (visible && screen === "main") {
      loadUserData();
    }
  }, [visible, screen]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log("Loading user data for:", user.uid);

      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", user.uid)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        console.log("2FA Status loaded:", userData.twoFAEnabled);
        console.log("Email Verification Status loaded:", userData.emailVerificationEnabled);
        setEnabled2FA(userData.twoFAEnabled === true);
        setEmailVerificationEnabled(userData.emailVerificationEnabled === true);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // ===== EMAIL FUNCTIONS =====
  const handleEmailUpdate = async () => {
    if (!newEmail.trim()) {
      Alert.alert("Error", "Please enter a new email");
      return;
    }
    if (newEmail !== confirmEmail) {
      Alert.alert("Error", "Emails do not match");
      return;
    }
    if (!newEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }
    if (!emailPassword.trim()) {
      Alert.alert("Error", "Please enter your password to confirm");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      console.log("Updating email from:", user.email, "to:", newEmail);

      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);

      // Update email in Firebase Auth
      await updateEmail(user, newEmail);
      console.log("Email updated in Firebase Auth");

      // Update email in Firestore
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", user.uid)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDocRef = userSnapshot.docs[0].ref;
        await updateDoc(userDocRef, {
          email: newEmail
        });
        console.log("Email updated in Firestore");
      }

      Alert.alert("Success", "Email updated successfully!");
      setNewEmail("");
      setConfirmEmail("");
      setEmailPassword("");
      setScreen("main");
    } catch (error) {
      console.error("Error updating email:", error);

      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Password is incorrect");
      } else if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "This email is already in use");
      } else {
        Alert.alert("Error", error.message || "Failed to update email");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== PASSWORD FUNCTIONS =====
  const handlePasswordUpdate = async () => {
    if (!currentPassword.trim()) {
      Alert.alert("Error", "Please enter current password");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter new password");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      console.log("Updating password for user:", user.email);

      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      console.log("User reauthenticated");

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);
      console.log("Password updated in Firebase Auth");

      Alert.alert("Success", "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setScreen("main");
    } catch (error) {
      console.error("Error updating password:", error);

      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Current password is incorrect");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Error", "Password is too weak. Use a stronger password");
      } else {
        Alert.alert("Error", error.message || "Failed to update password");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== 2FA FUNCTIONS =====
  const handleEnable2FA = async () => {
    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter verification code");
      return;
    }
    if (verificationCode.length !== 6) {
      Alert.alert("Error", "Code must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "User not logged in");
        setLoading(false);
        return;
      }

      console.log("Enabling 2FA for user:", user.uid);

      // Find and update user document in Firestore
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", user.uid)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDocRef = userSnapshot.docs[0].ref;

        // Update with 2FA enabled
        await updateDoc(userDocRef, {
          twoFAEnabled: true,
          twoFACode: verificationCode
        });

        console.log("2FA enabled and saved to Firestore");
        setEnabled2FA(true);
        setVerificationCode("");
        Alert.alert("Success", "2-step verification enabled successfully!");
      } else {
        Alert.alert("Error", "User document not found");
      }
    } catch (error) {
      console.error("Error enabling 2FA:", error);
      Alert.alert("Error", error.message || "Failed to enable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    Alert.alert(
      "Disable 2-step Verification",
      "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          onPress: async () => {
            setLoading(true);
            try {
              const user = auth.currentUser;

              if (!user) {
                Alert.alert("Error", "User not logged in");
                setLoading(false);
                return;
              }

              console.log("Disabling 2FA for user:", user.uid);

              // Find and update user document in Firestore
              const userQuery = query(
                collection(db, "users"),
                where("uid", "==", user.uid)
              );
              const userSnapshot = await getDocs(userQuery);

              if (!userSnapshot.empty) {
                const userDocRef = userSnapshot.docs[0].ref;

                // Disable 2FA
                await updateDoc(userDocRef, {
                  twoFAEnabled: false,
                  twoFACode: null
                });

                console.log("2FA disabled and saved to Firestore");
                setEnabled2FA(false);
                Alert.alert("Success", "2-step verification disabled");
              }
            } catch (error) {
              console.error("Error disabling 2FA:", error);
              Alert.alert("Error", "Failed to disable 2FA");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // ===== EMAIL VERIFICATION TOGGLE =====
  const handleToggleEmailVerification = async (value) => {
    setLoading(true);
    try {
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "User not logged in");
        setLoading(false);
        return;
      }

      console.log("Toggling email verification to:", value);

      // Find and update user document in Firestore
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", user.uid)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDocRef = userSnapshot.docs[0].ref;

        // Update email verification setting
        await updateDoc(userDocRef, {
          emailVerificationEnabled: value
        });

        console.log("Email verification setting updated");
        setEmailVerificationEnabled(value);
        Alert.alert("Success", `Email verification ${value ? "enabled" : "disabled"}`);
      } else {
        Alert.alert("Error", "User document not found");
      }
    } catch (error) {
      console.error("Error toggling email verification:", error);
      Alert.alert("Error", "Failed to update setting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2e7d32" />
          </View>
        )}

        <View style={styles.modalContent}>
          {/* ===== MAIN SCREEN ===== */}
          {screen === "main" && (
            <>
              <View style={styles.header}>
                {/* 🔥 Removed back button/icon, just title */}
                <Text style={styles.title}>Settings</Text>
              </View>

              <ScrollView contentContainerStyle={styles.content} scrollEnabled={!loading}>
                <View style={{ height: 12 }} />

                <View style={styles.namePill}>
                  <Text style={styles.nameText}>{userName}</Text>
                </View>

                {/* Account Security */}
                <View style={styles.card}>
                  <Text style={styles.sectionHeading}>Account Security</Text>

                  {/* Email settings currently disabled
                  <Pressable 
                    style={[styles.row, loading && { opacity: 0.5 }]} 
                    onPress={() => setScreen("email")}
                    disabled={loading}
                  >
                    <Text style={styles.rowLabel}>Email</Text>
                    <Image source={ICON_CHEVRON} style={styles.chevron} resizeMode="contain" />
                  </Pressable> 
                  */}

                  <View style={styles.divider} />

                  <Pressable
                    style={[styles.row, loading && { opacity: 0.5 }]}
                    onPress={() => setScreen("password")}
                    disabled={loading}
                  >
                    <View>
                      <Text style={styles.rowLabel}>Change password</Text>
                      <Text style={styles.rowSub}>
                        Update your login password to help keep your account secure.
                      </Text>
                    </View>
                    <Image source={ICON_CHEVRON} style={styles.chevron} resizeMode="contain" />
                  </Pressable>

                  <View style={styles.divider} />

                  <Pressable
                    style={[styles.row, loading && { opacity: 0.5 }]}
                    onPress={() => setScreen("2fa")}
                    disabled={loading}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabelBold}>2-step verification</Text>
                      <Text style={styles.rowSub}>
                        {enabled2FA
                          ? "✓ Enabled"
                          : "Add an additional layer of security to your account during sign in"}
                      </Text>
                    </View>
                    <Image source={ICON_CHEVRON} style={styles.chevron} resizeMode="contain" />
                  </Pressable>
                </View>

                <View style={{ height: 36 }} />
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, loading && { opacity: 0.5 }]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ===== EMAIL SCREEN ===== */}
          {screen === "email" && (
            <>
              <View style={styles.header}>
                {/* No back icon, title only */}
                <Text style={styles.title}>Change Email</Text>
              </View>

              <ScrollView contentContainerStyle={styles.content} scrollEnabled={!loading}>
                <View style={{ height: 12 }} />

                <View style={styles.card}>
                  <Text style={styles.screenLabel}>New Email</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter new email"
                    placeholderTextColor="#ccc"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    editable={!loading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={[styles.screenLabel, { marginTop: 16 }]}>Confirm Email</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm email"
                    placeholderTextColor="#ccc"
                    value={confirmEmail}
                    onChangeText={setConfirmEmail}
                    editable={!loading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={[styles.screenLabel, { marginTop: 16 }]}>Current Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter password to confirm"
                    placeholderTextColor="#ccc"
                    value={emailPassword}
                    onChangeText={setEmailPassword}
                    editable={!loading}
                    secureTextEntry={true}
                  />

                  <TouchableOpacity
                    style={[styles.actionButton, loading && { opacity: 0.5 }]}
                    onPress={handleEmailUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.actionButtonText}>Update Email</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={{ height: 36 }} />
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, loading && { opacity: 0.5 }]}
                  onPress={() => {
                    setScreen("main");
                    setNewEmail("");
                    setConfirmEmail("");
                    setEmailPassword("");
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ===== PASSWORD SCREEN ===== */}
          {screen === "password" && (
            <>
              <View style={styles.header}>
                {/* No back icon, title only */}
                <Text style={styles.title}>Change Password</Text>
              </View>

              <ScrollView contentContainerStyle={styles.content} scrollEnabled={!loading}>
                <View style={{ height: 12 }} />

                <View style={styles.card}>
                  <Text style={styles.screenLabel}>Current Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter current password"
                    placeholderTextColor="#ccc"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={true}
                    editable={!loading}
                  />

                  <Text style={[styles.screenLabel, { marginTop: 16 }]}>New Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Min 8 characters"
                    placeholderTextColor="#ccc"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={true}
                    editable={!loading}
                  />

                  <Text style={[styles.screenLabel, { marginTop: 16 }]}>Confirm Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm password"
                    placeholderTextColor="#ccc"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={true}
                    editable={!loading}
                  />

                  <TouchableOpacity
                    style={[styles.actionButton, loading && { opacity: 0.5 }]}
                    onPress={handlePasswordUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.actionButtonText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={{ height: 36 }} />
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, loading && { opacity: 0.5 }]}
                  onPress={() => {
                    setScreen("main");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ===== 2FA SCREEN ===== */}
          {screen === "2fa" && (
            <>
              <View style={styles.header}>
                {/* No back icon, title only */}
                <Text style={styles.title}>Security Settings</Text>
              </View>

              <ScrollView contentContainerStyle={styles.content} scrollEnabled={!loading}>
                <View style={{ height: 12 }} />

                {/* 2FA Section */}
                <View style={[styles.card, { marginBottom: 12 }]}>
                  <Text style={styles.sectionHeading}>2-Step Verification</Text>
                </View>

                {/* Email Verification Section */}
                <View style={styles.card}>
                  <Text style={styles.sectionHeading}>Email Verification on Login</Text>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.screenLabel}>Require email verification code during login</Text>
                      <Text style={styles.screenDescription}>
                        You will need to verify your email with a code every time you log in
                      </Text>
                    </View>
                    <Switch
                      value={emailVerificationEnabled}
                      onValueChange={handleToggleEmailVerification}
                      disabled={loading}
                      trackColor={{ false: "#ccc", true: "#81C784" }}
                      thumbColor={emailVerificationEnabled ? "#2e7d32" : "#f4f3f4"}
                    />
                  </View>
                </View>

                <View style={{ height: 36 }} />
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, loading && { opacity: 0.5 }]}
                  onPress={() => setScreen("main")}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 999
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 10,
    maxHeight: "90%",
    overflow: "hidden"
  },

  header: {
    height: 78,
    backgroundColor: "#2e7d32",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  // backWrap & backIcon no longer used but you can delete if you want
  backWrap: {
    position: "absolute",
    left: 12,
    top: (78 - 36) / 2,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  backIcon: {
    width: 18,
    height: 18,
    tintColor: "#fff"
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700"
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    alignItems: "center"
  },

  namePill: {
    width: 314,
    height: 48,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4
  },
  nameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000"
  },

  card: {
    width: 314,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#f1f1f1"
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    justifyContent: "space-between"
  },
  rowLabel: {
    fontSize: 18,
    color: "#000",
    fontWeight: "600"
  },
  rowLabelBold: {
    fontSize: 18,
    color: "#000",
    fontWeight: "700"
  },
  rowSub: {
    marginTop: 6,
    fontSize: 14,
    color: "#9e9e9e",
    width: 200
  },
  chevron: {
    width: 18,
    height: 18,
    tintColor: "#9e9e9e",
    marginLeft: 12
  },

  divider: {
    height: 1,
    backgroundColor: "#f1f1f1"
  },

  buttonContainer: {
    padding: 15,
    backgroundColor: "white",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#2e7d32"
  },
  cancelButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 16
  },

  screenLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8
  },
  screenDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#f9f9f9"
  },
  actionButton: {
    backgroundColor: "#2e7d32",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    minHeight: 50,
    justifyContent: "center"
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  },
  dangerButton: {
    backgroundColor: "#e8151b"
  },
  statusText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000"
  },
  statusSubtext: {
    fontSize: 14,
    marginTop: 4
  },
  successCard: {
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50"
  },
  successText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20"
  },
  successSubtext: {
    fontSize: 14,
    color: "#2E7D32",
    marginTop: 4
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    justifyContent: "space-between"
  }
});
