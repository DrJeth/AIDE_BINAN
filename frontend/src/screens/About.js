// frontend/src/screens/About.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";

const BG = require("../../assets/bg-background.png");

export default function About({ navigation }) {
  return (
    <View style={styles.container}>
      <Image source={BG} style={styles.bg} resizeMode="cover" />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backTxt}>◂</Text>
          </TouchableOpacity>

          {/* Header title centered */}
          <Text style={styles.headerTitle}>About</Text>

          {/* spacer for symmetry */}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>A.I.D.E. Biñan</Text>

          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.p}>
            A.I.D.E. Biñan is an innovative system designed to assist the City of Biñan in regulating and monitoring
            electric bicycles through Artificial Intelligence (AI). It automatically detects e-bikes, identifies plate
            numbers and model info, and verifies registration in real time.
          </Text>

          <Text style={styles.sectionTitle}>Purpose</Text>
          <Text style={styles.p}>
            The main purpose of A.I.D.E. Biñan is to enhance enforcement efficiency and road safety by replacing slow
            manual inspections with a fast, accurate, and automated detection process. Through this system, local
            enforcement officers can focus on decision-making and accountability while the AI handles detection and
            verification tasks.
          </Text>

          <Text style={styles.sectionTitle}>Mission</Text>
          <Text style={styles.p}>
            To support Biñan City in building a safer, smarter, and more organized traffic environment through the use of
            modern AI technology and data-driven enforcement.
          </Text>

          <Text style={styles.sectionTitle}>Vision</Text>
          <Text style={styles.p}>
            A future where technology and governance work together to maintain order, promote compliance, and protect the
            welfare of all road users in Biñan City.
          </Text>

          <Text style={styles.sectionTitle}>Developed By</Text>
          <Text style={styles.p}>
            A.I.D.E. Biñan is developed by students from the Polytechnic University of the Philippines – Biñan Campus,
            College of Information Technology and Engineering, as part of their capstone project for the Bachelor of Science
            in Information Technology program.
          </Text>

          <View style={{ height: 36 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  bg: { ...StyleSheet.absoluteFillObject },

  header: {
    height: 64,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginTop: 6,
  },
  backBtn: { width: 40 },
  backTxt: { color: "#fff", fontSize: 22 },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },

  scroll: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28 },

  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 8 },

  sectionTitle: { marginTop: 12, color: "#113e21", fontWeight: "700", fontSize: 15 },

  p: { color: "#111", fontSize: 14, lineHeight: 20, marginTop: 8 },
});
