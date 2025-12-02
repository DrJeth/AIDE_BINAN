// frontend/src/screens/ChangeEmail2.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_WIDTH = Math.min(360, SCREEN_WIDTH);
const HEADER_HEIGHT = 78;

// Replace with your actual icon (white chevron/back)
const ICON_BACK = require("../../assets/ic_back.png");

export default function ChangeEmail2({ onBack = () => {}, onNext = () => {} }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backWrap}>
            <Image source={ICON_BACK} style={styles.backIcon} resizeMode="contain" />
          </Pressable>

          <Text style={styles.title}>Change Email</Text>

          <Pressable onPress={onNext} style={styles.nextWrap}>
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.instruction}>
            Please enter a new email and we will send you a verification code
          </Text>

          <View style={{ height: 18 }} />

          {/* Input pill */}
          <View style={styles.inputPill}>
            <TextInput
              placeholder="Enter new email"
              placeholderTextColor="#bdbdbd"
              style={styles.input}
              keyboardType="email-address"
              returnKeyType="done"
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const PILL_WIDTH = 314;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727", // dark frame like screenshot
    alignItems: "center",
  },
  container: {
    width: PAGE_WIDTH,
    flex: 1,
    backgroundColor: "#fefefe",
  },

  /* Header */
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: "#2e7d32",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  backWrap: {
    position: "absolute",
    left: 12,
    top: (HEADER_HEIGHT - 36) / 2,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    width: 18,
    height: 18,
    tintColor: "#fff",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  nextWrap: {
    position: "absolute",
    right: 12,
    top: (HEADER_HEIGHT - 36) / 2,
    height: 36,
    justifyContent: "center",
  },
  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Content */
  content: {
    paddingTop: 28,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  instruction: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    textAlign: "left",
    width: "100%",
    lineHeight: 22,
  },

  inputPill: {
    width: PILL_WIDTH,
    height: 48,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  input: {
    fontSize: 16,
    color: "#222",
    padding: 0,
    margin: 0,
  },
});
