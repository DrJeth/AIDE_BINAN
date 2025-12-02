// frontend/src/screens/Requirements.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";

const { width: WINDOW_W } = Dimensions.get("window");
const CARD_W = Math.min(300, WINDOW_W - 40); // narrow column as in screenshot

export default function Requirements() {
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

  return (
    <SafeAreaView style={styles.screen}>
      {/* green curved header */}
      <View style={styles.headerGreen}>
        {/* optional small left circular icon - uncomment & replace with asset if you have one */}
        {/*
        <Image
          source={require("../../assets/back-circle.png")}
          style={styles.headerLeftIcon}
          resizeMode="contain"
        />
        */}
        <Text style={styles.title}>Requirements for Registration</Text>
        {/* optional small right badge - uncomment if you have one
        <Image source={require("../../assets/top-badge.png")} style={styles.headerRightIcon} resizeMode="contain" />
        */}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          {/* green circular accent overlapping the card (left/top) */}
          <View style={styles.cardTopAccent} />

          {/* long body text (serif type) */}
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
    backgroundColor: "#fefefe",
    alignItems: "center",
  },

  /* header */
  headerGreen: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    height: 68,
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    paddingHorizontal: 12,
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Karma-Bold",
    fontWeight: "700",
    textAlign: "center",
  },

  headerLeftIcon: {
    position: "absolute",
    left: 8,
    top: 8,
    width: 30,
    height: 30,
  },
  headerRightIcon: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
  },

  /* push content down so card overlaps header (like screenshot) */
  scrollArea: {
    paddingTop: 48,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 24,
  },

  /* card */
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    // shadow for raised card look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "flex-start",
    position: "relative",
  },

  /* green circle accent that peeks from top-left of the card */
  cardTopAccent: {
    position: "absolute",
    left: -36,
    top: -26,
    width: 92,
    height: 92,
    backgroundColor: "#2e7d32",
    borderRadius: 60,
    zIndex: 0,
  },

  bodyText: {
    width: "100%",
    zIndex: 1,
  },

  sectionHeading: {
    fontFamily: "CrimsonText-Bold",
    fontSize: 14,
    color: "#111",
    marginBottom: 6,
  },

  paragraph: {
    fontFamily: "CrimsonText-Regular",
    fontSize: 13.5,
    color: "#222",
    lineHeight: 20,
  },

  footerNote: {
    marginTop: 8,
    fontFamily: "CrimsonText-Regular",
    fontSize: 11,
    color: "#333",
  },
});


