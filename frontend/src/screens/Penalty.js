// frontend/src/screens/Penalty.js
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
const CARD_W = Math.min(320, WINDOW_W - 48); // narrow column similar to screenshot

export default function Penalty() {
  const body = `
Any person found riding an unregistered E-Bike or E-Scooters shall be punished with the following fines:

a. First Offense
Five Hundred Pesos (P500.00)

b. Second Offense
One Thousand Pesos (P1,000.00)

c. Third Offense
Two Thousand Pesos (P2,000.00) *

d. Fourth / Subsequent Offenses:
Confiscation of License / Impoundment of Unit

For unregistered e-vehicle units driven by riders with no license, the penalty shall be based on the City of Biñan’s Traffic Code with an Impoundable Procedure.

For those who failed to install an authorized metal plate/sticker, a penalty of Five Hundred Pesos (P500.00) shall be imposed.

Non-residents of the City of Biñan who shall pass the city's road and will frequently visit due to unavoidable circumstances (only mode of transportation) such as but not limited to: school and work service, use for livelihood and purchase of basic needs (food, medicine and other necessities) shall also be required to register their e-vehicle to BTFRB.

Penalty for Distributor / Marketing who failed to comply hereto:
  `.trim();

  return (
    <SafeAreaView style={styles.screen}>
      {/* Green curved header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Penalty</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          {/* green circle accent */}
          <View style={styles.cardAccent} />

          <Text style={styles.bodyText}>
            {body.split("\n\n").map((para, idx) => (
              <Text key={idx} style={styles.paragraph}>
                {para}
                {"\n\n"}
              </Text>
            ))}
          </Text>

          <Text style={styles.footer}>
            City Ordinance No. 21-(2023) dated September 4, 2023
          </Text>
        </View>

        <View style={{ height: 56 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111",
    alignItems: "center",
  },

  header: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    height: 64,
    backgroundColor: "#2e7d32",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Karma-Bold",
    fontWeight: "700",
  },

  scrollArea: {
    paddingTop: 56,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    position: "relative",
    alignItems: "flex-start",
  },

  cardAccent: {
    position: "absolute",
    left: -36,
    top: -30,
    width: 110,
    height: 110,
    backgroundColor: "#2e7d32",
    borderRadius: 64,
    zIndex: 0,
  },

  bodyText: {
    width: "100%",
    color: "#111",
    zIndex: 1,
  },

  paragraph: {
    fontFamily: "CrimsonText-Regular",
    fontSize: 13.5,
    lineHeight: 20,
    color: "#111",
  },

  footer: {
    marginTop: 8,
    fontFamily: "CrimsonText-Regular",
    fontSize: 11,
    color: "#333",
  },
});
