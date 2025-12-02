// frontend/src/screens/Logout.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";

export default function Logout({ navigation }) {
  const handleConfirm = () => {
    // perform sign-out logic here (clear tokens, call API, etc.)
    // then navigate to Login or LandingPage
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Log Out</Text>
        <Text style={styles.message}>Are you sure you want to log out?</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleConfirm}>
          <Text style={styles.logoutBtnText}>Yes, log me out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "700", color: "#113e21", marginBottom: 8 },
  message: { fontSize: 15, color: "#666", marginBottom: 24, textAlign: "center" },
  logoutBtn: { backgroundColor: "#c21a1a", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 12 },
  logoutBtnText: { color: "#fff", fontWeight: "700" },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 20 },
  cancelText: { color: "#113e21", fontWeight: "600" },
});
