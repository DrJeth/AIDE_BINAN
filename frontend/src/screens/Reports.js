// Reports.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const reports = [
  { id: 1, img: require("./assets/avatar1.png"), plate: "Plate not provided", datetime: "11/11/2025, 7:58:07 PM" },
  { id: 2, img: require("./assets/avatar2.png"), plate: "Plate not provided", datetime: "11/11/2025, 7:57:52 PM" },
  { id: 3, img: require("./assets/avatar3.png"), plate: "Plate not provided", datetime: "11/11/2025, 7:45:06 PM" },
  { id: 4, img: require("./assets/avatar4.png"), plate: "Plate not provided", datetime: "11/11/2025, 7:44:31 PM" },
];

export default function Reports() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={styles.header.backgroundColor} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reports</Text>

        <TouchableOpacity style={styles.cameraBtn}>
          <Text style={styles.cameraBtnText}>Open Camera</Text>
        </TouchableOpacity>
      </View>

      {/* Subheading */}
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Reports</Text>
      </View>

      {/* List */}
      <ScrollView style={styles.listArea} contentContainerStyle={{ paddingBottom: 110 }}>
        {reports.map((r) => (
          <View key={r.id} style={styles.card}>
            <Image source={r.img} style={styles.avatar} />
            <View style={styles.cardText}>
              <Text style={styles.plateText}>{r.plate}</Text>
              <Text style={styles.datetimeText}>{r.datetime}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={20} color="#fff" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItemActive}>
          <Ionicons name="document" size={20} color="#fff" />
          <Text style={styles.navLabel}>Report</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="receipt-long" size={20} color="#fff" />
          <Text style={styles.navLabel}>Transaction</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={20} color="#fff" />
          <Text style={styles.navLabel}>Me</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f6f5",
  },
  header: {
    height: 52,
    backgroundColor: "#1f7a3a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
  cameraBtn: {
    backgroundColor: "#2fa24a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cameraBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  titleRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2d6b2f",
  },

  listArea: {
    flex: 1,
    paddingHorizontal: 14,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 10,
    marginRight: 10,
  },
  cardText: {
    flex: 1,
  },
  plateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  datetimeText: {
    fontSize: 12,
    color: "#8a8a8a",
  },

  bottomNav: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: Platform.OS === "ios" ? 18 : 12,
    height: 60,
    backgroundColor: "#1f7a3a",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    elevation: 6,
  },
  navItem: {
    alignItems: "center",
  },
  navItemActive: {
    alignItems: "center",
    transform: [{ translateY: -2 }],
  },
  navLabel: {
    color: "#fff",
    fontSize: 11,
    marginTop: 2,
  },
});
