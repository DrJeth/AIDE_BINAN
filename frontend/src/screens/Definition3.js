// frontend/src/screens/Definition3.js
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
const CARD_W = Math.min(340, WINDOW_W - 32);

const GREEN = "#2e7d32";

export default function Definition3({ navigation }) {
  const longText = `
required to wear a protective helmet similar to those designed for a bicycle rider. Driver's license and registration are not required.

4.2. Electric Kick Scooter
Figure 2 Examples of Electric Mobility Scooters
The operation of electric kick scooter shall be limited within barangay roads only. They may be operated on bicycle lanes or similar lanes designated by proper authorities. Driver/rider of this vehicle is required to wear protective helmet similar to those designed for a motorcycle riders. Driver's license and registration are not required.

4.3. Category L1a - Capable of propelling the unit up to a maximum speed of 25 km/hr.
Figure 3 Examples of Category L1a vehicles
The operation shall be limited within barangay local roads only. It can pass national roads and other type of roads for purposes of crossing only when the road/lane it is allowed to traverse is divided by the former. They may be operated on bicycle lanes and similar lanes designated by proper authorities. Driver/rider of this vehicle is required to wear a protective helmet similar to those designed for bicycle riders, when driven on the road. These shall not be used for public transport purposes. Driver's license and registration are not required.

4.4. Category L1b - Capable of propelling the unit to maximum of 26 to 50 km/hr.
Figure 4 Examples of Category L1b vehicles
The operation of these vehicles may be allowed to go beyond barangay roads to cover other local roads provided that it will take the outermost part of the road close to the edge. It can pass main thoroughfares and national roads for purposes of crossing only when the road it is allowed to traverse is divided by the former and shall yield the right of way to all oncoming traffic that constitute an immediate hazard.

Drivers/riders of these units are required to wear motorcycle helmet.

City Ordinance No. 21-(2023) dated September 4, 2023
  `.trim();

  const handleBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate("Ordinance");
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* HEADER */}
      <View style={styles.headerGreen}>
        <Pressable
          onPress={handleBack}
          style={styles.backCircle}
          android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: true }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Definition of Terms</Text>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          <Text style={styles.bodyText}>
            {longText.split("\n\n").map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
                {"\n\n"}
              </Text>
            ))}
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
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  backIcon: {
    color: GREEN,
    fontSize: 18,
    fontWeight: "900",
  },

  headerTitle: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },

  scroll: {
    flex: 1,
    alignSelf: "stretch",
  },

  scrollArea: {
    paddingTop: 130,
    paddingHorizontal: 12,
    alignItems: "center",
    paddingBottom: 24,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  bodyText: {
    width: "100%",
    color: "#222",
  },

  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: "#222",
  },
});
