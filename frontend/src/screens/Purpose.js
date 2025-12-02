// frontend/src/screens/Purpose.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  Pressable,
} from "react-native";

const { width: WINDOW_W } = Dimensions.get("window");
const CONTENT_W = Math.min(280, WINDOW_W - 48);

export default function Purpose({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      {/* big green curved shapes (left/top and right/bottom) */}
      <View style={styles.topGreen}>
        <Text style={styles.headerTitle}>Purpose and Scope</Text>
      </View>

      {/* Back button (top-left) */}
      <Pressable
        onPress={() => navigation?.goBack()}
        style={({ pressed }) => [styles.backWrap, pressed && styles.backPressed]}
        android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
        accessibilityRole="button"
      >
        <View style={styles.backCircle}>
          <Text style={styles.backX}>‹</Text>
        </View>
      </Pressable>

      {/* faint decorative circle on right */}
      <View style={styles.rightGreenCircle} />

      {/* top-right scooter/logo circle */}
      <Image
        source={require("../../assets/scooter-icon.png")}
        style={styles.topRightBadge}
        resizeMode="contain"
      />

      {/* white card content */}
      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CONTENT_W }]}>
          <Image
            source={require("../../assets/binan-logo.png")}
            style={styles.binanLogo}
            resizeMode="contain"
          />

          <Text style={styles.contentText}>
            To adopt a uniform system for the Registration and Operation of all
            Electric Vehicle (Bicycle, Tricycle, 4-Cycle and Scooters) being used
            as a mode of transportation within the territorial jurisdiction of the
            City of Binan, Laguna.
          </Text>
        </View>
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

  topGreen: {
    position: "absolute",
    top: -40,
    left: -40,
    width: WINDOW_W + 80,
    height: 220,
    backgroundColor: "#2e7d32",
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 36,
    zIndex: 0,
  },
  headerTitle: {
    fontFamily: "Karma-Bold",
    fontWeight: "700",
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
  },

  /* back button */
  backWrap: {
    position: "absolute",
    left: 10,
    top: 12,
    zIndex: 10,
  },
  backPressed: { opacity: 0.8 },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  backX: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "700",
  },

  rightGreenCircle: {
    position: "absolute",
    right: -30,
    top: 80,
    width: 140,
    height: 240,
    backgroundColor: "#2e7d32",
    borderRadius: 100,
    zIndex: 0,
  },

  topRightBadge: {
    position: "absolute",
    right: 24,
    top: 40,
    width: 92,
    height: 92,
    zIndex: 2,
  },

  scrollArea: {
    paddingTop: 110,
    alignItems: "center",
    paddingBottom: 40,
    width: "100%",
  },

  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 3,
    alignItems: "flex-start",
  },

  binanLogo: {
    position: "absolute",
    right: 10,
    top: -36,
    width: 86,
    height: 86,
  },

  contentText: {
    marginTop: 12,
    fontFamily: "CrimsonText-Regular",
    fontSize: 16,
    color: "#000",
    lineHeight: 22,
  },
});
