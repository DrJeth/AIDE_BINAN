// frontend/src/screens/Faq.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";

import BG from "../../assets/bg-background.png"; // static import — correct path from src/screens

export default function Faq({ navigation }) {
  return (
    <View style={styles.container}>
      <Image source={BG} style={styles.bg} resizeMode="cover" />
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>◂</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FAQ</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.h}>FREQUENTLY ASKED QUESTIONS (FAQ)</Text>

          <Text style={styles.q}>1. What is A.I.D.E. Biñan?</Text>
          <Text style={styles.a}>
            A.I.D.E. Biñan (AI Detection and Enforcement for Electric Bicycle Compliance) is a system that
            helps monitor and enforce e-bike regulations using AI for detection and plate recognition.
          </Text>

          <Text style={styles.q}>2. What is the main goal of the system?</Text>
          <Text style={styles.a}>
            Improve e-bike compliance, promote road safety, and support local enforcement with automated detection.
          </Text>

          <Text style={styles.q}>3. Who benefits from the system?</Text>
          <Text style={styles.a}>
            Government agencies, enforcement officers, e-bike riders (fair enforcement), and the community.
          </Text>

          <Text style={styles.q}>4. What are limitations?</Text>
          <Text style={styles.a}>
            Accuracy may be affected by lighting, weather, or visibility. Human review remains important.
          </Text>

          <Text style={styles.q}>5. How is data privacy handled?</Text>
          <Text style={styles.a}>
            The system collects necessary info (images, plate numbers, timestamps) and follows data protection rules.
          </Text>

          <View style={{ height: 36 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  bg: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },

  header: {
    height: 64,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginTop: 6,
    backgroundColor: "#2e7d32",
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  backTxt: { color: "#fff", fontSize: 22 },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },

  scroll: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28 },
  h: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 10 },
  q: { color: "#113e21", fontSize: 15, fontWeight: "700", marginTop: 10 },
  a: { color: "#111", fontSize: 14, lineHeight: 20, marginTop: 6 },
});
