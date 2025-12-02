import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_WIDTH = Math.min(360, SCREEN_WIDTH);
const DRAWER_WIDTH = 262;
const HEADER_HEIGHT = 140;

// ----- Replace these with your actual assets -----
const CITY_SEAL = require("../../assets/city_seal.png");
const AVATAR = require("../../assets/avatar.png");
const ICON_ACCOUNT = require("../../assets/icon_account.png");
const ICON_FAQ = require("../../assets/icon_faq.png");
const ICON_CONTACT = require("../../assets/icon_contact.png");
const ICON_ABOUT = require("../../assets/icon_about.png");
const ICON_TERMS = require("../../assets/icon_terms.png");
const ICON_SETTINGS = require("../../assets/icon_settings.png");
const ICON_CHEVRON = require("../../assets/chevron-right.png");
const ICON_LOGOUT = require("../../assets/icon_logout.png");
// -------------------------------------------------

export default function SidebarRider({ onNavigate = () => {} }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.outer}>
        {/* Drawer */}
        <View style={styles.drawer}>
          {/* Green header with crest */}
          <View style={styles.header}>
            <Image source={CITY_SEAL} style={styles.citySeal} resizeMode="contain" />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <Image source={AVATAR} style={styles.avatar} resizeMode="cover" />
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>Juan Dela Cruz</Text>
                <Text style={styles.profileEmail}>juandelacruz@gmail.com</Text>
              </View>
            </View>

            {/* Highlighted menu: My Account */}
            <Pressable style={[styles.menuRow, styles.menuSelected]} onPress={() => onNavigate("MyAccount")}>
              <View style={styles.menuLeft}>
                <Image source={ICON_ACCOUNT} style={[styles.menuIcon, styles.menuIconGreen]} />
                <Text style={[styles.menuText, styles.menuTextSelected]}>My Account</Text>
              </View>
              <Image source={ICON_CHEVRON} style={styles.chevron} />
            </Pressable>

            {/* FAQ */}
            <Pressable style={styles.menuRow} onPress={() => onNavigate("FAQ")}>
              <View style={styles.menuLeft}>
                <Image source={ICON_FAQ} style={styles.menuIcon} />
                <Text style={styles.menuText}>FAQ</Text>
              </View>
              <Image source={ICON_CHEVRON} style={styles.chevron} />
            </Pressable>

            {/* Contact Us */}
            <Pressable style={styles.menuRow} onPress={() => onNavigate("ContactUs")}>
              <View style={styles.menuLeft}>
                <Image source={ICON_CONTACT} style={styles.menuIcon} />
                <Text style={styles.menuText}>Contact Us</Text>
              </View>
              <Image source={ICON_CHEVRON} style={styles.chevron} />
            </Pressable>

            {/* About */}
            <Pressable style={styles.menuRow} onPress={() => onNavigate("About")}>
              <View style={styles.menuLeft}>
                <Image source={ICON_ABOUT} style={styles.menuIcon} />
                <Text style={styles.menuText}>About</Text>
              </View>
              <Image source={ICON_CHEVRON} style={styles.chevron} />
            </Pressable>

            {/* Terms of Service */}
            <Pressable style={styles.menuRow} onPress={() => onNavigate("TermsOfService")}>
              <View style={styles.menuLeft}>
                <Image source={ICON_TERMS} style={styles.menuIcon} />
                <Text style={styles.menuText}>Terms of Service</Text>
              </View>
              <Image source={ICON_CHEVRON} style={styles.chevron} />
            </Pressable>

            {/* Settings */}
            <Pressable style={styles.menuRow} onPress={() => onNavigate("Settings")}>
              <View style={styles.menuLeft}>
                <Image source={ICON_SETTINGS} style={styles.menuIcon} />
                <Text style={styles.menuText}>Settings</Text>
              </View>
              <Image source={ICON_CHEVRON} style={styles.chevron} />
            </Pressable>

            <View style={{ height: 18 }} />

            {/* Log Out card */}
            <View style={styles.logoutWrapper}>
              <Pressable style={styles.logoutCard} onPress={() => onNavigate("Logout")}>
                <View style={styles.logoutLeft}>
                  <Image source={ICON_LOGOUT} style={styles.menuIcon} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.logoutTitle}>Log Out</Text>
                    <Text style={styles.logoutSubtitle}>Securely log out of Account</Text>
                  </View>
                </View>
                <Image source={ICON_CHEVRON} style={styles.chevron} />
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {/* Shadow area */}
        <View style={styles.appShade} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727",
    alignItems: "center",
  },
  outer: {
    width: PAGE_WIDTH,
    flex: 1,
    flexDirection: "row",
  },

  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: "#fefefe",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
    elevation: 6,
  },

  header: {
    height: HEADER_HEIGHT,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  citySeal: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
  },

  profileCard: {
    width: DRAWER_WIDTH - 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginTop: -40,
    marginBottom: 12,
  },

  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profileText: {
    marginLeft: 12,
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  profileEmail: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 4,
  },

  menuRow: {
    width: DRAWER_WIDTH - 12,
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    width: 22,
    height: 22,
    tintColor: "#2e7d32",
  },
  menuIconGreen: {
    tintColor: "#fff",
  },
  menuText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },

  menuSelected: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  menuTextSelected: {
    color: "#fff",
  },

  chevron: {
    width: 14,
    height: 14,
    tintColor: "#9e9e9e",
    marginLeft: 8,
  },

  logoutWrapper: {
    marginTop: 24,
  },
  logoutCard: {
    width: DRAWER_WIDTH - 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#2e7d32",
    elevation: 4,
  },
  logoutLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  logoutSubtitle: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 4,
  },

  appShade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
