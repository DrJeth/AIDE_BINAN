// frontend/src/components/ZoomImage.js
import React from "react";
import { View, Image, StyleSheet, useWindowDimensions } from "react-native";

// Use bg-blurred.png as a safe default to ensure the file exists
const onboardingImage = require("../../assets/bg-background.png");

export default function ZoomImage() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={[styles.wrap, { width, height: height * 0.6 }]}>
      <Image source={onboardingImage} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "180%",
    transform: [{ scale: 1 }],
  },
});
