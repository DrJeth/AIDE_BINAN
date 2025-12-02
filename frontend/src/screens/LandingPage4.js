// frontend/src/screens/LandingPage4.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
} from "react-native";

/**
 * LandingPage4
 * - Full-screen background image (behind status bar)
 * - No headline text / no logo (removed as requested)
 * - Sign in pill preserved (adjust position in styles)
 */

function LandingPage4({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Allow image behind the status bar */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Full-screen background image */}
      <Image
        source={require("../../assets/Ex.png")}
        style={styles.bgImage}
        resizeMode="cover"
        resizeMethod="resize"
      />

      {/* Optional translucent overlay (keeps text readable). Set to 'transparent' to remove) */}
      <View style={styles.overlay} />

      {/* Content safely placed inside SafeAreaView (no headline/logo per request) */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Intentionally empty: headline/logo removed as requested */}
        </View>
      </SafeAreaView>

      {/* Sign-in pill button (keeps navigation target you had earlier) */}
      <Pressable
        style={styles.signInWrapper}
        onPress={() => navigation?.navigate?.("Login")}
      >
        <View style={styles.signInPill}>
          <Text style={styles.signInText}>Sign in</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Root must fill whole screen
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Full-screen image (covers status bar and bottom)
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },

  // Overlay above image (adjust alpha or set backgroundColor: 'transparent' to remove)
  overlay: {
    ...StyleSheet.absoluteFillObject,
   
  },

  safeArea: {
    flex: 1,
  },

  content: {
    flex: 1,
    // Keep padding if you want to add content later
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Sign-in pill positioned above the bottom area and centered
  signInWrapper: {
    position: "absolute",
    bottom: 44, // adjust up/down to match your design
    alignSelf: "center",
  },

  signInPill: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
  },

  signInText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});

export default LandingPage4;
