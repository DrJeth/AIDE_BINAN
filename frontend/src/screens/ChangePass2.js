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
const CARD_WIDTH = 314;

const ICON_BACK = require("../../assets/ic_back.png"); // replace with your asset

export default function ChangePass2({ onBack = () => {}, onNext = () => {} }) {
  const [password, setPassword] = React.useState("");

  // simple password strength metric (0..4)
  const strength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
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

          {/* Password pill */}
          <View style={styles.pill}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Current Password"
              placeholderTextColor="#bdbdbd"
              secureTextEntry
              style={styles.pillInput}
              returnKeyType="done"
            />
          </View>

          {/* small strength bars row */}
          <View style={styles.barsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  i < strength ? styles.strengthBarActive : styles.strengthBarInactive,
                ]}
              />
            ))}
          </View>

          {/* helper text */}
          <Text style={styles.helper}>
            Use 8 or more characters with a mix of letters, numbers &amp; symbols.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727", // dark frame (screenshot)
    alignItems: "center",
  },

  screen: {
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
    width: "100%",
  },

  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },

  pill: {
    width: CARD_WIDTH,
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
    marginTop: 8,
  },
  pillInput: {
    fontSize: 16,
    color: "#222",
    padding: 0,
    margin: 0,
    height: "100%",
  },

  barsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    gap: 12,
  },

  strengthBar: {
    width: 59,
    height: 5,
    borderRadius: 3,
    marginHorizontal: 6,
    backgroundColor: "#e0e0e0",
  },
  strengthBarActive: {
    backgroundColor: "#2e7d32",
  },
  strengthBarInactive: {
    backgroundColor: "#dcdcdc",
  },

  helper: {
    marginTop: 12,
    width: CARD_WIDTH,
    color: "#9e9e9e",
    fontSize: 14,
    textAlign: "left",
    paddingHorizontal: 2,
  },
});
