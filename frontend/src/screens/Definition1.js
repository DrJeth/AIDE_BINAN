// frontend/src/screens/Definition1.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
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
      {/* Header */}
      <View style={styles.headerGreen}>
        {/* left emblem */}
        <Image
          source={require("../../assets/top-emblem.png")}
          style={styles.leftIcon}
          resizeMode="contain"
        />

        <Text style={styles.title}>Definition of Terms</Text>

        {/* right emblem (back to Ordinance) */}
        <Pressable onPress={handleBack} style={styles.rightIconWrap}>
          <Image
            source={require("../../assets/top-emblem.png")}
            style={styles.rightIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          <View style={styles.cardTopAccent} />

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

      {/* Next button (center-bottom) */}
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
    backgroundColor: "#fefefe",
    alignItems: "center",
  },

  headerGreen: {
    width: "100%",
    height: 150,
    backgroundColor: "#2e7d32",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    zIndex: 1,
  },

  leftIcon: {
    position: "absolute",
    left: 15,
    top: 18,
    width: 34,
    height: 34,
  },

  rightIconWrap: {
    position: "absolute",
    right: 15,
    top: 18,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  rightIcon: {
    width: 34,
    height: 34,
  },

  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 20,
    textAlign: "center",
  },

  scrollArea: {
    paddingTop: 110,
    alignItems: "center",
    paddingHorizontal: 12,
  },

  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 20,
    elevation: 6,
  },

  cardTopAccent: {
    position: "absolute",
    left: -36,
    top: -30,
    width: 120,
    height: 120,
    backgroundColor: "#2e7d32",
    borderRadius: 70,
    zIndex: -1,
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

  /* NEXT button (light green) */
  nextButton: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
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
