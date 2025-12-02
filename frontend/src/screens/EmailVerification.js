import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { auth } from "../config/firebaseConfig";
import { collection, getFirestore, query, where, getDocs } from "firebase/firestore";

// Function to generate a 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function EmailVerification({
  visible = false,
  email = "",
  onVerified = () => {},
  onCancel = () => {},
}) {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const db = getFirestore();

  // Send verification code to email when modal opens
  useEffect(() => {
    if (visible && !codeSent) {
      sendVerificationCode();
    }
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (!codeSent || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [codeSent, timeLeft]);

  const sendVerificationCode = async () => {
    setLoading(true);
    try {
      const code = generateVerificationCode();
      setGeneratedCode(code);

      // TODO: Integrate with email service (Firebase Functions, Nodemailer, SendGrid, etc.)
      // For now, we'll log it and show it in development
      console.log("Verification code generated:", code);

      // Example using Firebase Cloud Functions
      // const sendEmail = httpsCallable(functions, 'sendVerificationEmail');
      // await sendEmail({ email, code });

      // For production, you should use a backend service
      Alert.alert(
        "Verification Code Sent",
        `A verification code has been sent to ${email}.\n\nDev: ${code}`,
        [{ text: "OK" }]
      );

      setCodeSent(true);
      setTimeLeft(300);
    } catch (error) {
      console.error("Error sending verification code:", error);
      Alert.alert("Error", "Failed to send verification code");
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    if (verificationCode !== generatedCode) {
      Alert.alert("Error", "Invalid verification code");
      return;
    }

    setLoading(true);
    try {
      // Optional: Update last login time in Firestore
      const user = auth.currentUser;
      if (user) {
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", user.uid)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          // You can update user's last login or other metadata here
          console.log("User verified successfully");
        }
      }

      Alert.alert("Success", "Email verified successfully!");
      setVerificationCode("");
      onVerified();
    } catch (error) {
      console.error("Error verifying email:", error);
      Alert.alert("Error", "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationCode("");
    setCodeSent(false);
    await sendVerificationCode();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2e7d32" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                A verification code has been sent to {email}
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#ccc"
                value={verificationCode}
                onChangeText={setVerificationCode}
                maxLength={6}
                keyboardType="number-pad"
                editable={codeSent && !loading}
              />

              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Code expires in:</Text>
                <Text
                  style={[
                    styles.timer,
                    timeLeft < 60 && { color: "#e8151b" },
                  ]}
                >
                  {formatTime(timeLeft)}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.verifyButton, loading && { opacity: 0.6 }]}
                onPress={handleVerify}
                disabled={loading}
              >
                <Text style={styles.verifyButtonText}>Verify Email</Text>
              </TouchableOpacity>

              {timeLeft > 0 ? (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendCode}
                  disabled={loading}
                >
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.resendButton, { backgroundColor: "#f1f1f1" }]}
                  onPress={handleResendCode}
                  disabled={loading}
                >
                  <Text style={[styles.resendButtonText, { color: "#999" }]}>
                    Code Expired - Resend
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    width: "85%",
    maxWidth: 350,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: "#2e7d32",
    borderRadius: 8,
    padding: 14,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 6,
    color: "#000",
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  timer: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
  },
  verifyButton: {
    backgroundColor: "#2e7d32",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resendButton: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  resendButtonText: {
    color: "#2e7d32",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});
