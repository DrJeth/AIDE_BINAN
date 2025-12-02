// frontend/src/screens/LandingPage3.js
import React from "react";
import {
  View,
  SafeAreaView,
  Image,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from "react-native";

function LandingPage3({ navigation, onNext = null }) {
  const handleNext = () => {
    if (typeof onNext === "function") return onNext();
    return navigation?.navigate?.("LandingPage4");
  };

  return (
    <View style={styles.container}>
      {/* make status bar translucent so background extends behind it */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Full-screen background image (behind everything) */}
      <Image
        source={require("../../assets/Binan.png")}
        style={styles.background}
        resizeMode="cover"
        resizeMethod="resize"
      />

      {/* overlay to improve text contrast */}
      <View style={styles.overlay} />

      {/* safe area content */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Example markup to match your screenshot:
              Logo + heading text. Replace or remove as needed. */}
          <View style={styles.header}>
            {/* You can add logo images here */}
          </View>

          
        </View>
      </SafeAreaView>

      {/* centered rounded button at bottom */}
      <Pressable style={styles.ctaButton} onPress={handleNext}>
        <Text style={styles.ctaText}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // fills whole device window
    backgroundColor: "transparent",
  },

  // cover whole container (including status bar area)
  background: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },

  header: {
    height: 80, // reserved area for logos if needed
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    marginTop: 12,
    color: "#052d16",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 38,
  },

  highlight: {
    color: "#fb7a44",
  },

  ctaButton: {
    position: "absolute",
    bottom: 44,
    alignSelf: "center",
    backgroundColor: "#2e7d32",
    paddingHorizontal: 42,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  ctaText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
});

export default LandingPage3;
