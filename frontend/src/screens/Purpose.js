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
const CONTENT_W = Math.min(330, WINDOW_W - 36);

export default function Purpose({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      {/* Header green curved top */}
      <View style={styles.topGreen} pointerEvents="none">
        <Text style={styles.headerTitle}>Purpose and Scope</Text>
      </View>

      {/* Back Button - aligned with header */}
      <Pressable
        onPress={() => navigation?.goBack?.()}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }} // ✅ easier to tap
        pressRetentionOffset={{ top: 20, left: 20, bottom: 20, right: 20 }}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.backWrap, pressed && styles.backPressed]}
        android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
      >
        <View style={styles.backCircle}>
          <Text style={styles.backX}>‹</Text>
        </View>
      </Pressable>

      {/* Decorative green circle (right side) */}
      <View style={styles.rightGreenCircle} pointerEvents="none" />

      {/* AIDE logo top-right */}
      <Image
        source={require("../../assets/scooter-icon.png")}
        style={styles.topRightBadge}
        resizeMode="contain"
        pointerEvents="none"
      />

      {/* Content Section */}
      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CONTENT_W }]}>
          {/* Binan Logo - Original Position */}
          <Image
            source={require("../../assets/binan-logo.png")}
            style={styles.binanLogo}
            resizeMode="contain"
            pointerEvents="none"
          />

          {/* Description text */}
          <Text style={styles.contentText}>
            To adopt a uniform system for the Registration and Operation of all
            Electric Vehicle (Bicycle, Tricycle, 4-Cycle and Scooters) being
            used as a mode of transportation within the territorial jurisdiction
            of the City of Biñan, Laguna.
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

  /* Header area with corrected alignment */
  topGreen: {
    position: "absolute",
    top: -20,
    left: -40,
    width: WINDOW_W + 80,
    height: 210,
    backgroundColor: "#2e7d32",
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 85,
    zIndex: 0,
  },

  headerTitle: {
    fontWeight: "700",
    color: "#fff",
    fontSize: 24,
    textAlign: "center",
  },

  /* Back Button Perfect Alignment WITH title */
  backWrap: {
    position: "absolute",
    left: 12,
    top: 70, // <-- PERFECTLY LEVEL WITH TITLE
    zIndex: 10,
    elevation: 20, // ✅ Android: makes sure it's above and clickable
  },

  backPressed: { opacity: 0.8 },

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

  backX: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  rightGreenCircle: {
    position: "absolute",
    right: -30,
    top: 100,
    width: 140,
    height: 240,
    backgroundColor: "#2e7d32",
    borderRadius: 100,
    zIndex: 0,
  },

  topRightBadge: {
    position: "absolute",
    right: 24,
    top: 85,
    width: 92,
    height: 92,
    zIndex: 2,
  },

  scrollArea: {
    paddingTop: 200,
    alignItems: "center",
    paddingBottom: 40,
    width: "100%",
  },

  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    alignItems: "center",
  },

  binanLogo: {
    position: "absolute",
    right: 10,
    top: -36,
    width: 86,
    height: 86,
  },

  contentText: {
    marginTop: 20,
    fontSize: 18,
    lineHeight: 26,
    color: "#000",
    textAlign: "center",
  },
});
