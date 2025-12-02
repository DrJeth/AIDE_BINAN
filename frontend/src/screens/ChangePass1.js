// frontend/src/screens/ChangePass1.js
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
const PILL_WIDTH = 314;

// Replace with your assets (optional)
const ICON_BACK = require("../../assets/ic_back.png"); // white left chevron

export default function ChangePass1({ onBack = () => {}, onNext = () => {} }) {
  const [password, setPassword] = React.useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backWrap}>
            <Image source={ICON_BACK} style={styles.backIcon} resizeMode="contain" />
          </Pressable>

          <Text style={styles.title}>Change Password</Text>

          <Pressable onPress={() => onNext(password)} style={styles.nextWrap}>
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.heading}>Your current password is</Text>

          <View style={{ height: 18 }} />

          <View style={styles.pill}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Current Password"
              placeholderTextColor="#bdbdbd"
              secureTextEntry
              style={styles.input}
              returnKeyType="done"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727", // outer dark frame like screenshot
    alignItems: "center",
  },
  container: {
    width: PAGE_WIDTH,
    flex: 1,
    backgroundColor: "#fefefe",
  },

  /* header */
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

  /* content */
  content: {
    paddingTop: 28,
    alignItems: "center",
    width: "100%",
  },

  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },

  pill: {
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
    height: "100%",
  },
});
