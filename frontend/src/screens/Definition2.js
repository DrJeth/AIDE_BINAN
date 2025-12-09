// frontend/src/screens/Definition2.js
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
const CARD_W = Math.min(340, WINDOW_W - 32);


export default function Definition2({ navigation }) {
  const longText = `
longitudinal median plain. Categories L4 and 15 refers to the asymmetrical and symmetrical versions respectively. Quadricycles.


Category L6 - an e-Quad having an unladen mass of not more than 350 k5 powered solely by electrical energy of up to 4000 W capable of propelling the unit to a maximum of 45 km/hr.


Category L7 - an e-Quad haying an unladen mass of not more than 550 kg powered solely by electrical energy of up to 15000W capable of propelling the unit to more than 45 km/hr.


Category M Electric Vehicles - at least four-whecled electric vehicles solely powered by electric energy and designed to carry heavier passenger loads than quadricycles. They are further classified into M1, M2 and M3.


Category M1 - a category M electric vehicle designed to carry no more than eight (8) seats in addition to the driver and having a maximum gross weight not exceeding 3.5 tons. Common examples under this category include most models of electric cars (e-cars), electric SUVs (e-SUV) and electric vans (e-vans).


Category M2 - a category M electric vehicle designed to carry more than eight (8) seats in addition to the driver and having a maximum gross weight more than 3.5 tons but not exceeding 5 tons. A common example under this category includes public utility e-jeepneys.


Category M3 - a category M electric vehicle designed to carry more than eight (8) seats in addition to the driver and having a maximum gross weight exceeding 5 tons. A common example under this category includes e-buses.


Category N Electric Vehicles - at least four-wheeled electric vehicles solely powered by electric energy and designed to carry heavier goods. They are further classified into N1, N2 and N3.


Category N1 - a category N electric vehicle having a maximum gross weight not exceeding 3.5 tons. A common example includes light trucks and light cargo vans.


Category N2 - a category N electric vehicle having a maximum gross weight more than 3.5 tons but not exceeding 12 tons and used for carriage of goods.


Category N3 - a category N electric vehicle comprising more than eight (8) seats in addition to the driver and having a maximum gross weight exceeding 12 tons. A common example includes heavy trucks.


Accreditation - shall refer to the authority granted by LTO for Manufacturer, Assembler, Importer, Rebuilder and/or Dealer to transact with former relative to stock reporting, sales reporting and registration of motor vehicles and/or its components.


SECTION 4. Type, Category of Electric Vehicles


4.1. Personal Mobility Scooter  
Figuia 1 Examples of Electric Mobility Scooters  
Designed for shorter trips and within communities. Their operation shall be limited within private roads subject to internal regulations on private roads. They may be operated on pedestrian walkways and bicycle lanes or on similar lanes designated by proper authorities with the rider.
`.trim();


  const handleBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else if (navigation?.navigate) navigation.navigate("Ordinance");
  };


  const handleNext = () => {
    if (navigation?.navigate) navigation.navigate("Definition3");
  };


  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerGreen}>
        <Pressable
          onPress={handleBack}
          style={styles.backCircle}
          android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>


        <Text style={styles.headerTitle}>Definition of Terms</Text>
      </View>


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollArea}
      >
        <View style={[styles.card, { width: CARD_W }]}>
          <Text style={styles.bodyText}>
            {longText.split("\n\n").map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
                {"\n\n"}
              </Text>
            ))}
          </Text>
        </View>


        <View style={{ height: 120 }} />
      </ScrollView>


      <Pressable onPress={handleNext} style={styles.nextButton}>
        <Text style={styles.nextText}>Proceed</Text>
      </Pressable>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
  },


  headerGreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: "#2e7d32",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 18,
    zIndex: 10,
  },


  // 🔙 updated back button style to match Purpose / Definition1
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
    color: "#fff",
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },


  card: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },


  bodyText: { width: "100%" },


  paragraph: {
    fontSize: 13.5,
    color: "#222",
    lineHeight: 20,
  },


  nextButton: {
    position: "absolute",
    bottom: 25,
    backgroundColor: "#66bb6a",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 5,
  },


  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});



