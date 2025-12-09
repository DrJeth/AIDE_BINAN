// frontend/src/screens/ImpositionFee.js
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";


const { width: WINDOW_W } = Dimensions.get("window");
const CARD_W = Math.min(330, WINDOW_W - 56); // keeps the narrow column look
const GREEN = "#2e7d32";


export default function ImpositionFee({ navigation }) {
  const body = `
SECTION 6. Imposition of Fee.


There shall be collected from the owner of an Electric Vehicle operating within the City of Biñan, the following fees:


Fees for Privately-Owned E-Bike
a. Registration Fee for New / Renewal - P 100.00
b. Permit or License Fee - P 150.00
c. Metal Plate (One Time Payment) - P 300.00
d. Sticker (For Validation every Year) - P 50.00


Fees for E-Bike for Hire
a. Registration Fee for New / Renewal - P 200.00
b. Permit or License Fee - P 150.00
c. Metal Plate (One Time Payment) - P 300.00
d. Sticker (For Validation every Year) - P 50.00


E-Vehicles under Category L3 (e-Motorcycle) and Category L4 & L5 (e-Tricycle / Three Wheeled Vehicle) shall comply with LTO AO 039-2021 and are required to secure an LTO Driver's License and are subject to limited roads (Barangay and Local Roads). They are also authorized to be used privately or "for hire".


City Ordinance No. 21-(2023) dated September 4, 2023
  `.trim();


  const handleBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate("Ordinance");
  };


  return (
    <SafeAreaView style={styles.screen}>
      {/* HEADER same as Definition screens */}
      <View style={styles.headerGreen}>
        <Pressable
          onPress={handleBack}
          style={styles.backCircle}
          android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>


        <Text style={styles.headerTitle}>Imposition Fee</Text>
      </View>


      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          {/* rightAccent REMOVED */}


          <Text style={styles.sectionHeading}>SECTION 6. Imposition of Fee.</Text>


          <Text style={styles.preamble}>
            There shall be collected from the owner of an Electric Vehicle operating within the City of Biñan, the following fees:
          </Text>


          {/* Fees for Privately-Owned E-Bike */}
          <Text style={styles.subHeading}>Fees for Privately-Owned E-Bike</Text>


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
          <Text style={[styles.subHeading, { marginTop: 18 }]}>
            Fees for E-Bike for Hire
          </Text>


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
    backgroundColor: "#f4f4f4",
    alignItems: "center",
  },


  /* HEADER like Definition1/2/3 */
  headerGreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: GREEN,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 18,
    zIndex: 10,
  },


  // 🔙 updated back button style ONLY
  backCircle: {
    position: "absolute",
    left: 16,
    top: 35,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },


  backIcon: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },


  headerTitle: {
    marginTop: 8,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },


  scrollArea: {
    paddingTop: 130,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
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



