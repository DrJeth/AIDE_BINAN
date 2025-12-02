// frontend/src/screens/MyAccount.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_WIDTH = Math.min(360, SCREEN_WIDTH);

const BACK_ICON = require("../../assets/top-emblem.png"); // small back chevron icon (white)
const AVATAR = require("../../assets/me.png"); // circular avatar placeholder
const CHEVRON = require("../../assets/chevron-right.png"); // small chevron
// optional decorative vector in header center (leave null to hide)
const HEADER_DECOR = null; // require("../../assets/header-decor.png");

export default function MyAccount({ onBack = () => {}, employee = {} }) {
  const { name = "(Name)", employeeId = "", email = "", address = "" } = employee;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backWrap}>
            <Image source={BACK_ICON} style={styles.backIcon} resizeMode="contain" />
          </Pressable>

          <Text style={styles.title}>My Account</Text>

          {/* optional decorative element on right to visually match screenshot */}
          <View style={styles.headerRight}>
            {HEADER_DECOR ? (
              <Image source={HEADER_DECOR} style={styles.headerDecor} resizeMode="contain" />
            ) : null}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Image source={AVATAR} style={styles.avatarImage} resizeMode="cover" />
            </View>
            <Text style={styles.nameText}>{name}</Text>
          </View>

          {/* Employee ID pill */}
          <View style={styles.idPillWrap}>
            <Text style={styles.idPillText}>{employeeId || "Employee Id"}</Text>
          </View>

          {/* Account Information heading */}
          <Text style={styles.sectionTitle}>Account Information</Text>

          {/* Info card */}
          <View style={styles.infoCard}>
            {/* Row: Identity */}
            <Pressable style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Identity</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>Admin</Text>
                <Image source={CHEVRON} style={styles.chevron} resizeMode="contain" />
              </View>
            </Pressable>

            {/* Row: Email */}
            <Pressable style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Email</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{email || ""}</Text>
                <Image source={CHEVRON} style={styles.chevron} resizeMode="contain" />
              </View>
            </Pressable>

            {/* Row: Address */}
            <Pressable style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>Address</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{address || ""}</Text>
                <Image source={CHEVRON} style={styles.chevron} resizeMode="contain" />
              </View>
            </Pressable>
          </View>

          {/* small bottom spacer */}
          <View style={{ height: 36 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const HEADER_HEIGHT = 78;
const CARD_WIDTH = 314;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727", // dark screen background like screenshot
  },
  container: {
    width: PAGE_WIDTH,
    flex: 1,
    alignSelf: "center",
    backgroundColor: "#fefefe",
  },

  /* Header */
  header: {
    height: HEADER_HEIGHT,
    width: "100%",
    backgroundColor: "#2e7d32",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  backWrap: {
    position: "absolute",
    left: 12,
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
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
    textAlign: "center",
  },
  headerRight: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 36,
    height: 36,
  },
  headerDecor: {
    width: 36,
    height: 36,
  },

  /* Content */
  content: {
    paddingTop: 18,
    alignItems: "center",
    paddingHorizontal: 12,
  },

  /* Avatar and name */
  avatarWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2e7d32",
    marginBottom: 10,
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  nameText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },

  /* Employee ID pill */
  idPillWrap: {
    width: CARD_WIDTH,
    height: 48,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fff",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  idPillText: {
    color: "#bdbdbd",
    fontSize: 16,
  },

  /* Section title */
  sectionTitle: {
    width: CARD_WIDTH,
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },

  /* Info card */
  infoCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 16,
    color: "#9e9e9e",
    fontWeight: "600",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowValue: {
    color: "#000",
    marginRight: 8,
    fontSize: 15,
  },
  chevron: {
    width: 16,
    height: 16,
    tintColor: "#9e9e9e",
  },
});
