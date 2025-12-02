// frontend/src/screens/ChangeEmail4.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PAGE_WIDTH = Math.min(360, SCREEN_WIDTH);
const HEADER_HEIGHT = 78;

export default function ChangeEmail4({ onOk = () => {} }) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* top green header */}
      <View style={styles.header} />

      {/* dimmed body area */}
      <View style={styles.body}>
        {/* centered dialog */}
        <View style={styles.dialog}>
          {/* title line (split to mimic screenshot: "Your email has been" + "changed.") */}
          <Text style={styles.titleLine}>Your email has been</Text>
          <Text style={styles.titleChanged}>changed.</Text>

          {/* subtitle */}
          <Text style={styles.subtitle}>You need to sign in again</Text>

          {/* divider */}
          <View style={styles.divider} />

          {/* OK button */}
          <Pressable style={styles.okWrap} onPress={onOk}>
            <Text style={styles.okText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const DIALOG_WIDTH = Math.min(320, PAGE_WIDTH - 40);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727", // dark outer frame like screenshot
    alignItems: "center",
  },

  /* header */
  header: {
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
    backgroundColor: "#2e7d32",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 8,
  },

  /* body (dimmed) */
  body: {
    width: PAGE_WIDTH,
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)", // dim overlay
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },

  /* dialog */
  dialog: {
    width: DIALOG_WIDTH,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 16,
    // shadow / elevation to match screenshot
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },

  titleLine: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 6,
    // mimic CrimsonText-Bold feel if available: set fontFamily
    // fontFamily: "CrimsonText-Bold",
  },

  titleChanged: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 6,
    // fontFamily: "CrimsonText-Bold",
  },

  subtitle: {
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
    // fontFamily: "CrimsonText-Regular",
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#9e9e9e",
    opacity: 0.9,
    marginTop: 6,
  },

  okWrap: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  okText: {
    color: "#283ecc", // blue OK like screenshot
    fontSize: 18,
    fontWeight: "700",
    // fontFamily: "CrimsonText-Bold",
  },
});
