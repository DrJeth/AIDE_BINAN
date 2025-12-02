// frontend/src/screens/Provision.js
import React from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Image,
  ImageBackground,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// New emblem replacing back icon
const BACK_ICON = require("../../assets/top-emblem.png");

// No card background image
const CARD_BG = null;

const Provision = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* card container */}
        <View style={styles.cardWrapper}>

          {/* Top-Left emblem (back button) */}
          <View style={styles.topLeftCluster}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Image
                source={BACK_ICON}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>

          {/* card body */}
          <ImageBackground
            source={CARD_BG}
            style={styles.card}
            imageStyle={styles.cardImage}
          >
            {/* header label */}
            <View style={styles.headerPill}>
              <Text style={styles.headerText}>Administrative Provision</Text>
            </View>

            {/* content */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.paragraph}>
                <Text style={styles.letter}>a. </Text>
                <Text style={styles.bodyText}>
                  A metal plate and/or sticker shall be provided by the Binan
                  Tricycle Franchising and Regulatory Board (BTFRB) to be paid
                  at cost by the owner.
                </Text>
              </Text>

              <Text style={styles.paragraph}>
                <Text style={styles.letter}>b. </Text>
                <Text style={styles.bodyText}>
                  The BTFRB shall keep a Register of all the electric vehicles
                  including: make, brand, name & address of the owner, and the
                  plate/sticker issued.
                </Text>
              </Text>

              <Text style={styles.paragraph}>
                <Text style={styles.letter}>c. </Text>
                <Text style={styles.bodyText}>
                  BTFRB, POSO, and PNP–Binan are deputized to enforce this
                  ordinance and conduct operations.
                </Text>
              </Text>

              <Text style={styles.paragraph}>
                <Text style={styles.letter}>d. </Text>
                <Text style={styles.bodyText}>
                  An Electric Route (E-Route) with safety reminders will be
                  issued.
                </Text>
              </Text>

              <Text style={styles.paragraph}>
                <Text style={styles.letter}>e. </Text>
                <Text style={styles.bodyText}>
                  A Fare Matrix will be imposed for public-use electric
                  vehicles.
                </Text>
              </Text>

              <Text style={[styles.paragraph, styles.lastParagraph]}>
                <Text style={styles.letter}>f. </Text>
                <Text style={styles.bodyText}>
                  Electric vehicles must use the outermost lane and only
                  Barangay Roads for safe travel.
                </Text>
              </Text>
            </ScrollView>
          </ImageBackground>
        </View>
      </View>
    </SafeAreaView>
  );
};

const CARD_WIDTH = Math.min(360, SCREEN_WIDTH - 32);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#2b2727",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 24,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: "hidden",
    height: 560,
  },

  topLeftCluster: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 5,
  },

  backButton: {
    width: 46,        // enlarged container
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",  // white background for emblem
  },

  backIcon: {
    width: 36,        // emblem size
    height: 36,
  },

  card: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  cardImage: {
    borderRadius: 14,
  },

  headerPill: {
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  scrollArea: {
    flex: 1,
    marginTop: 6,
  },
  scrollContent: {
    paddingBottom: 18,
    paddingHorizontal: 6,
  },

  paragraph: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  lastParagraph: {
    marginBottom: 0,
  },

  letter: {
    fontWeight: "700",
    fontSize: 15,
    marginRight: 6,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#222",
    flexShrink: 1,
  },
});

export default Provision;
