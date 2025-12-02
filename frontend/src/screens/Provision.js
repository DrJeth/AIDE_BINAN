// frontend/src/screens/Provision.js
import React from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";

const { width: WINDOW_W } = Dimensions.get("window");
const CARD_W = Math.min(330, WINDOW_W - 56);
const GREEN = "#2e7d32";

export default function Provision({ navigation }) {
  const handleBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate("Ordinance");
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* ============= HEADER SAME AS DEFINITION2 ============= */}
      <View style={styles.headerGreen}>
        <Pressable
          onPress={handleBack}
          style={styles.backCircle}
          android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: true }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Administrative Provision</Text>
      </View>

      {/* ===================== CONTENT ===================== */}
      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>

          <Text style={styles.paragraph}>
            <Text style={styles.letter}>a. </Text>
            <Text style={styles.bodyText}>
              A metal plate and/or sticker shall be provided by the Biñan Tricycle
              Franchising and Regulatory Board (BTFRB) to be paid at cost by the owner.
            </Text>
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.letter}>b. </Text>
            <Text style={styles.bodyText}>
              The Biñan Tricycle Franchising and Regulatory Board (BTFRB) shall keep a
              Register of all the electric vehicles which shall include information such
              as: its make and brand, the name and address of the owner, and the number
              of the plate or sticker issued.
            </Text>
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.letter}>c. </Text>
            <Text style={styles.bodyText}>
              The Biñan Tricycle Franchising and Regulatory Board (BTFRB), Public Order
              and Safety Office (POSO), and Philippine National Police - Biñan shall be
              deputized and will have the authority to enforce the said ordinance and
              conduct operations relative to the registration of the above-mentioned
              vehicles.
            </Text>
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.letter}>d. </Text>
            <Text style={styles.bodyText}>
              An Electric Route (E-Route) or Designated Road Lanes will be issued which
              also includes reminders of wearing appropriate protective gear and
              adherence to the maximum speed levels.
            </Text>
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.letter}>e. </Text>
            <Text style={styles.bodyText}>
              A Fare Matrix will be imposed on those Electric Vehicles for Hire and/or
              used as passenger utility vehicles and will be regulated by the Biñan
              Tricycle Franchising and Regulatory Board (BTFRB).
            </Text>
          </Text>

          <Text style={[styles.paragraph, styles.lastParagraph]}>
            <Text style={styles.letter}>f. </Text>
            <Text style={styles.bodyText}>
              All electric vehicles shall only be allowed to use the outermost lane of
              major thoroughfares of the city and will only be limited to Barangay Roads
              to ensure a safe ride.
            </Text>
          </Text>

          <Text style={styles.footerNote}>
            City Ordinance No. 21-(2023) dated September 4, 2023
          </Text>
        </View>

        <View style={{ height: 40 }} />
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
    backgroundColor: "#fff",
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
    fontSize: 20,
    fontWeight: "700",
  },

  scrollArea: {
    paddingTop: 130,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },

  paragraph: {
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  lastParagraph: {
    marginBottom: 0,
  },

  letter: {
    fontWeight: "700",
    fontSize: 15,
  },

  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#222",
    flexShrink: 1,
  },

  footerNote: {
    marginTop: 18,
    fontSize: 11,
    color: "#333",
  },
});

