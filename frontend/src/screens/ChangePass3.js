import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_WIDTH = Math.min(360, SCREEN_WIDTH);
const HEADER_HEIGHT = 78;

/**
 * Props:
 * - onOk: function called when user taps OK (default noop)
 */
export default function ChangePass3({ onOk = () => {} }) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Top green header */}
      <View style={styles.header} />

      {/* Dimmed content area */}
      <View style={styles.body}>
        <View style={styles.dialog}>
          <Text style={styles.titleLine}>Your password has been</Text>
          <Text style={styles.titleChanged}>changed.</Text>

          <Text style={styles.subtitle}>You need to sign in again</Text>

          <View style={styles.divider} />

          <Pressable onPress={onOk} style={styles.okWrap}>
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
    backgroundColor: "#2b2727", // dark frame like screenshot
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

  /* body */
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
    paddingBottom: 8,
    paddingHorizontal: 16,
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
  },

  titleChanged: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
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
  },
});
