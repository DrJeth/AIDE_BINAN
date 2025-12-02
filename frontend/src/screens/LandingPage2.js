import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  StatusBar,
  Platform,
} from "react-native";

import bgImage from "../../assets/LP2.png";

function LandingPage2({ navigation }) {
  return (
    <View style={styles.container}>

      {/* Transparent status bar for clean fullscreen */}
      <StatusBar 
        barStyle="light-content"
        translucent 
        backgroundColor="transparent"
      />

      {/* Background image */}
      <ImageBackground 
        source={bgImage} 
        style={styles.bgImage} 
        resizeMode="cover"
      >

        <View style={styles.overlay}>

          {/* Get Started Button */}
          <Pressable
            style={styles.getStartedBtn}
            onPress={() => navigation.navigate("LandingPage3")}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </Pressable>

        </View>

      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  bgImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  overlay: {
    flex: 1,
    paddingHorizontal: 20,
  },

  getStartedBtn: {
    position: "absolute",
    bottom: Platform.OS === "android" ? 28 : 40,
    alignSelf: "center",
    backgroundColor: "#2e7d32",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 100,
    elevation: 6, // Android shadow
  },

  getStartedText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});

export default LandingPage2;
