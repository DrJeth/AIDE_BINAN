// frontend/src/screens/Requirements.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";

const { width: WINDOW_W } = Dimensions.get("window");
const CARD_W = Math.min(300, WINDOW_W - 40); // narrow column as in screenshot
const GREEN = "#2e7d32";

export default function Requirements({ navigation }) {
  const body = `
SECTION 5. Requirements for Registration of Electric Vehicles:

a. Any person residing within the City of Biñan (18 years old and above) who owned and possesses an E-Bike / E-Vehicle shall first secure a Permit from the Biñan Tricycle Franchising and Regulatory Board (BTFRB) Office as a pre-requisite for operating an electric vehicle. This shall be applicable to those individuals who owned/purchased said e-vehicle before the effectivity of this Ordinance.

b. All electric vehicles that will be purchased after the approval of this Ordinance, shall be registered by the Marketing / Distributor before its release to the buyer.

c. E-Bikes / E-Vehicles are subject to comply with Administrative Order No. 039-2021 of the Land Transportation Office and are only allowed / limited to pass Private Roads / Barangay Roads and need not to secure LTO License are as follows:
• Personal Mobility Vehicle
• Electric Kick Scooter
• Category L1a - Capable of propelling the unit up to a maximum speed of 25 km/hr
• Category L2a - Capable of propelling the unit up to a maximum speed of 25 km/hr
• Category L2b - Capable of propelling the unit up to a maximum speed of 26–50 km/hr

d. E-Bikes / E-Vehicles are subject to comply to use standard protective helmet, and shall not be used for public transport purposes as follows:
• Category L1b - Capable of propelling the unit up to a maximum speed of 26–50 km/hr
• Category L2a - Capable of propelling the unit up to a maximum speed of 25 km/hr

e. E-Vehicles under Category L3 (e-Motorcycle) and Category L4 & L5 (e-Tricycle / Three Wheeled Vehicle) shall comply with LTO AO 039-2021 and are required to secure an LTO Driver's License and are subject to limited roads (Barangay and Local Roads). They are also authorized to be used privately or "for hire".
  
City Ordinance No. 21-(2023) dated September 4, 2023
  `.trim();

  const handleBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate("Ordinance");
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* ========== HEADER (same style as Definition screens) ========== */}
      <View style={styles.headerGreen}>
        <Pressable
          onPress={handleBack}
          style={styles.backCircle}
          android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: true }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Requirements for Registration</Text>
      </View>

      {/* ========== CONTENT ========== */}
      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          {/* shape removed – clean white card */}

          <Text style={styles.bodyText}>
            {body.split("\n\n").map((p, i) => (
              <Text
                key={i}
                style={i === 0 ? styles.sectionHeading : styles.paragraph}
              >
                {p}
                {"\n\n"}
              </Text>
            ))}
          </Text>

          <Text style={styles.footerNote}>
            City Ordinance No. 21-(2023) dated September 4, 2023
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
  },

  /* header same as Definition1/2/3 */
  headerGreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: GREEN,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 18,
    zIndex: 10,
  },

  backCircle: {
    position: "absolute",
    left: 16,
    top: 35,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  backIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: GREEN,
  },

  headerTitle: {
    marginTop: 8,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  /* content */
  scrollArea: {
    paddingTop: 130, // push content below the rounded header
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "flex-start",
    position: "relative",
  },

  bodyText: {
    width: "100%",
  },

  sectionHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 6,
  },

  paragraph: {
    fontSize: 13.5,
    color: "#222",
    lineHeight: 20,
  },

  footerNote: {
    marginTop: 8,
    fontSize: 11,
    color: "#333",
  },
});
