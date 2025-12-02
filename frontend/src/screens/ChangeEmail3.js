// frontend/src/screens/ChangeEmail3.js
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

// Replace with your asset paths
const ICON_BACK = require("../../assets/ic_back.png"); // white chevron/back

export default function ChangeEmail3({
  onBack = () => {},
  onNext = () => {},
  email = "(email)",
}) {
  // simple local state for 4 code digits (optional)
  const [code, setCode] = React.useState(["", "", "", ""]);

  const setDigit = (idx, val) => {
    const v = val.replace(/[^0-9]/g, "").slice(0, 1);
    const next = [...code];
    next[idx] = v;
    setCode(next);
  };

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

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.instruction}>
            Enter verification code we sent to
          </Text>
          <Text style={styles.emailText}>{email}</Text>

          <View style={styles.codesRow}>
            {code.map((d, i) => (
              <View key={i} style={styles.codeWrap}>
                <TextInput
                  value={d}
                  onChangeText={(t) => setDigit(i, t)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={styles.codeInput}
                  textAlign="center"
                  placeholder=""
                  placeholderTextColor="#bdbdbd"
                />
              </View>
            ))}
          </View>

          <Text style={styles.resendText}>Resend (secs)</Text>

          <Pressable onPress={() => {}}>
            <Text style={styles.helpText}>Need Help?</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const MODAL_WIDTH = Math.min(320, PAGE_WIDTH - 20);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727",
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
    justifyContent: "center",
  },
  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Body */
  body: {
    flex: 1,
    alignItems: "center",
    paddingTop: 28,
    paddingHorizontal: 12,
  },

  instruction: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 6,
  },
  emailText: {
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    marginBottom: 22,
  },

  codesRow: {
    width: PAGE_WIDTH,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 18,
  },
  codeWrap: {
    width: 59,
    height: 49,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  codeInput: {
    fontSize: 20,
    fontWeight: "700",
    width: "100%",
    height: "100%",
    textAlign: "center",
    color: "#111",
  },

  resendText: {
    marginTop: 6,
    fontSize: 14,
    color: "#000",
    textAlign: "center",
  },
  helpText: {
    marginTop: 8,
    fontSize: 14,
    color: "#283ecc",
    textAlign: "center",
  },
});
