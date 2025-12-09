// frontend/src/screens/Definition1.js
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
const CARD_W = Math.min(314, WINDOW_W - 40);

export default function Definition1({ navigation }) {
  const bodyText = `
SECTION 3. Definition of Terms. The following terms are included pursuant to Land Transportation Office Administrative Order No. 2021-039 dated May 11, 2021, to wit:

Electric Vehicle - a motor vehicle powered by electric motors with power storage charge directly from external sources. The definition excludes hybrid vehicles.

Curb Weight - total unloaded mass of a vehicle with standard equipment and all necessary operating consumables such as fluids, oils, coolant, refrigerant and batteries in the case of electric vehicles.
Unladen Weight - unloaded weight of the vehicle. In the case of electric vehicles, it excludes the weight of the battery.

Category - shall refer to vehicle category as specified in the Philippine National Standards (PS) on Road Vehicles-Classification and Definition PNS 1891/2008 (UN ECE Published 2017) ICS 43.040.01

Electric Mobility Scooter - a two, three, or four-wheeled vehicle powered by electrical energy with less than 300 wattage capable of reaching up to 12.5 km/hr.

Category L Electric Vehicle - a motor vehicle with less than four wheels including restricted 4-wheeled variants with maximum limits on speed, mass, and rated power.

Category L1 (e-Moped 2w) - a two-wheeled e-vehicle capable of up to 50 km/hr.

Category L2 (e-Moped 3w) - a three-wheeled e-vehicle capable of up to 50 km/hr.

Category L3 (e-Motorcycle) - a two-wheeled e-vehicle capable of more than 50 km/hr.

Category L4 / L5 (e-Tricycle / e-Three-Wheel Vehicle) - a three-wheeled vehicle powered solely by electrical energy with at least 1000W power, max speed 50 km/hr and max curb weight 600 kg.

City Ordinance No. 21-(2023) dated September 4, 2023
  `.trim();

  const handleBack = () => {
    if (navigation?.navigate) navigation.navigate("Ordinance");
    else if (navigation?.goBack) navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* ================= HEADER ================= */}
      <View style={styles.headerGreen}>
        {/* Back button – same style as Purpose.js */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backWrap, pressed && styles.backPressed]}
          android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
        >
          <View style={styles.backCircle}>
            <Text style={styles.backIcon}>‹</Text>
          </View>
        </Pressable>

        <Text style={styles.headerTitle}>Definition of Terms</Text>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          <Text style={styles.body}>
            {bodyText.split("\n\n").map((p, i) => (
              <Text
                key={i}
                style={i === 0 ? styles.sectionHeading : styles.paragraph}
              >
                {p}
                {"\n\n"}
              </Text>
            ))}
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Next button */}
      <Pressable
        onPress={() => navigation.navigate("Definition2")}
        style={styles.nextButton}
      >
        <Text style={styles.nextText}>Proceed</Text>
      </Pressable>
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
    backgroundColor: "#2e7d32",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 18,
    zIndex: 10,
  },

  // 🔙 back button only (matching Purpose.js style)
  backWrap: {
    position: "absolute",
    left: 16,
    top: 35, // keep same vertical placement as your original
    zIndex: 20,
  },
  backPressed: {
    opacity: 0.85,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  headerTitle: {
    marginTop: 8,
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 20,
  },

  scrollArea: {
    paddingTop: 130,
    alignItems: "center",
    paddingHorizontal: 12,
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
    position: "relative",
    overflow: "hidden",
  },

  body: { width: "100%" },

  sectionHeading: {
    fontSize: 16,
    color: "#111",
    marginBottom: 6,
  },

  paragraph: {
    fontSize: 14,
    color: "#222",
    lineHeight: 20,
  },

  nextButton: {
    position: "absolute",
    bottom: 25,
    backgroundColor: "#66bb6a",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 5,
  },

  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

	
