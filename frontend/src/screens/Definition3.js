// frontend/src/screens/Definition3.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Pressable,
} from "react-native";

const { width: WINDOW_W } = Dimensions.get("window");
const CARD_W = Math.min(280, WINDOW_W - 40); // narrow column like screenshot

export default function Definition3({ navigation }) {
  const body = `
4.2. Electric Kick Scooter
Figure 2 Examples of Electric Mobility Scooters
The operation of electric kick scooter shall be limited within barangay roads only. They may be operated on bicycle lanes or similar lanes designated by proper authorities. Driver/rider of this vehicle is required to wear protective helmet similar to those designed for a motorcycle riders. Driver's license and registration are not required.

4.3. Category L1a
- Capable of propelling the unit up to a maximum speed of 25 km/hr.
Figure 3 Examples of Category L1a vehicles
The operation shall be limited within barangay local roads only. It can pass national roads and other type of roads for purposes of crossing only when the road/lane it is allowed to traverse is divided by the former. They may be operated on bicycle lanes and similar lanes designated by proper authorities. Driver/rider of this vehicle is required to wear a protective helmet similar to those designed for bicycle riders, when driven on the road. These shall not be used for public transport purposes. Driver's license and registration are not required.

4.4. Category L1b
- Capable of propelling the unit to maximum of 26 to 50 km/hr.
Figure 4 Examples of Category L1b vehicles
The operation of these vehicles may be allowed to go beyond barangay roads to cover other local roads provided that it will take the outermost part of the road close to the edge. It can pass main thoroughfares and national roads for purposes of crossing only when the road it is allowed to traverse is divided by the former and shall yield the right of way to all oncoming traffic that constitute an immediate hazard.

Drivers/riders of these units are required to wear motorcycle protective helmet.
City Ordinance No. 21-(2023) dated September 4, 2023
  `.trim();

  const handleBack = () => {
    if (navigation?.navigate) navigation.navigate("Ordinance");
    else if (navigation?.goBack) navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* green curved header */}
      <View style={styles.headerGreen}>
        {/* left emblem for balance */}
        <Image
          source={require("../../assets/top-emblem.png")}
          style={styles.leftIcon}
          resizeMode="contain"
        />

        <Text style={styles.title}>Definition of Terms</Text>

        {/* right emblem (back control) */}
        <Pressable style={styles.rightIconWrap} onPress={handleBack}>
          <Image
            source={require("../../assets/top-emblem.png")}
            style={styles.rightIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          {/* small green circle accent overlapping card top-left */}
          <View style={styles.cardTopAccent} />

          {/* The long body text */}
          <Text style={styles.bodyText}>
            {body.split("\n\n").map((para, i) => (
              <Text
                key={i}
                style={i === 0 ? styles.sectionHeading : styles.paragraph}
              >
                {para}
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
    backgroundColor: "#111",
    alignItems: "center",
  },

  /* header */
  headerGreen: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    height: 64,
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    paddingHorizontal: 12,
  },

  /* left emblem (new) */
  leftIcon: {
    position: "absolute",
    left: 12,
    top: 12,
    width: 34,
    height: 34,
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Karma-Bold",
    fontWeight: "700",
    textAlign: "center",
  },

  /* right emblem wrapper & icon */
  rightIconWrap: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  rightIcon: {
    width: 34,
    height: 34,
  },

  scrollArea: {
    paddingTop: 48,
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
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "flex-start",
    position: "relative",
  },

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
