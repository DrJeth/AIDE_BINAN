// frontend/src/screens/ImpositionFee.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";

const { width: WINDOW_W } = Dimensions.get("window");
const CARD_W = Math.min(330, WINDOW_W - 56); // keeps the narrow column look

export default function ImpositionFee() {
  return (
    <SafeAreaView style={styles.screen}>
      {/* header green curved bar */}
      <View style={styles.headerWrap}>
        {/* small left circular back — uncomment and replace with your asset if you have one */}
        {/*
        <Image
          source={require("../../assets/back-circle.png")}
          style={styles.backIcon}
          resizeMode="contain"
        />
        */}
        <Text style={styles.headerTitle}>Imposition Fee</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          {/* right-side green vertical accent */}
          <View style={styles.rightAccent} />

          <Text style={styles.sectionHeading}>SECTION 6. Imposition of Fee.</Text>

          <Text style={styles.preamble}>
            There shall be collected from the owner of an Electric Vehicle operating within the City of Biñan, the following fees:
          </Text>

          {/* Fees for Privately-Owned E-Bike */}
          <Text style={styles.subHeading}>Fees for Privately-Owned E-Bike</Text>

          {/* two-column table-like view (label left, price right) */}
          <View style={styles.table}>
            <View style={styles.colLeft}>
              <Text style={styles.tableItem}>a. Registration Fee for New / Renewal</Text>
              <Text style={styles.tableItem}>b. Permit or License Fee</Text>
              <Text style={styles.tableItem}>c. Metal Plate (One Time Payment)</Text>
              <Text style={styles.tableItem}>d. Sticker (For Validation every Year)</Text>
            </View>

            <View style={styles.colRight}>
              <Text style={styles.price}>P 100.00</Text>
              <Text style={styles.price}>P 150.00</Text>
              <Text style={styles.price}>P 300.00</Text>
              <Text style={styles.price}>P 50.00</Text>
            </View>
          </View>

          {/* Fees for E-Bike for Hire */}
          <Text style={[styles.subHeading, { marginTop: 18 }]}>Fees for E-Bike for Hire</Text>

          <View style={styles.table}>
            <View style={styles.colLeft}>
              <Text style={styles.tableItem}>a. Registration Fee for New / Renewal</Text>
              <Text style={styles.tableItem}>b. Permit or License Fee</Text>
              <Text style={styles.tableItem}>c. Metal Plate (One Time Payment)</Text>
              <Text style={styles.tableItem}>d. Sticker (For Validation every Year)</Text>
            </View>

            <View style={styles.colRight}>
              <Text style={styles.price}>P 200.00</Text>
              <Text style={styles.price}>P 150.00</Text>
              <Text style={styles.price}>P 300.00</Text>
              <Text style={styles.price}>P 50.00</Text>
            </View>
          </View>

          <Text style={styles.footerNote}>
            City Ordinance No. 21-(2023) dated September 4, 2023
          </Text>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fefefe",
    alignItems: "center",
  },

  headerWrap: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    height: 64,
    backgroundColor: "#2e7d32",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    paddingHorizontal: 12,
  },

  backIcon: {
    position: "absolute",
    left: 8,
    top: 12,
    width: 32,
    height: 32,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Karma-Bold",
  },

  scrollArea: {
    paddingTop: 64, // pushes the card down so it overlaps header like screenshot
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: "#f0f0f0",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "flex-start",
    position: "relative",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },

  rightAccent: {
    position: "absolute",
    right: -20,
    bottom: -20,
    width: 60,
    height: 180,
    backgroundColor: "#2e7d32",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },

  sectionHeading: {
    fontFamily: "Karma-Bold",
    fontSize: 14,
    fontWeight: "700",
    color: "#113e21",
    marginBottom: 6,
    textAlign: "left",
    width: "100%",
  },

  preamble: {
    fontFamily: "Karma-Regular",
    fontSize: 13,
    color: "#222",
    marginBottom: 12,
  },

  subHeading: {
    fontFamily: "Karma-Bold",
    fontSize: 14,
    color: "#113e21",
    marginBottom: 8,
  },

  table: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-start",
  },

  colLeft: {
    flex: 1.3,
    paddingRight: 6,
  },

  colRight: {
    flex: 0.6,
    alignItems: "flex-end",
  },

  tableItem: {
    fontFamily: "CrimsonText-Regular",
    fontSize: 13,
    color: "#111",
    marginBottom: 6,
    lineHeight: 18,
  },

  price: {
    fontFamily: "CrimsonText-Bold",
    fontSize: 13,
    color: "#111",
    marginBottom: 6,
    lineHeight: 18,
  },

  footerNote: {
    marginTop: 18,
    fontFamily: "CrimsonText-Regular",
    fontSize: 11,
    color: "#333",
  },
});


