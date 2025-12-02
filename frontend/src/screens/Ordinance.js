// frontend/src/screens/Ordinance.js
import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: WINDOW_W } = Dimensions.get("window");
const CARD_W = Math.min(340, WINDOW_W - 40);

const rows = [
  {
    id: 1,
    title: "Electrical Vehicle Registration Ordinance in the City Of Binan",
    section: "Section 1",
    hasDetails: true,
    category: "intro",
    content: "ELECTRIC VEHICLE REGISTRATION ORDINANCE IN THE CITY OF BINAN"
  },
  {
    id: 2,
    title: "Purpose and Scope",
    section: "Section 2",
    hasDetails: true,
    category: "general",
    content: "To adopt a uniform system for the Registration and Operation of all Electric Vehicles (Bicycle, Tricycle, 4-Cycle and Scooters) being used as a mode of transportation within the territorial jurisdiction of the City of Binan, Laguna."
  },
  {
    id: 3,
    title: "Definition of Terms",
    section: "Section 3/4",
    hasDetails: true,
    category: "general",
    content: `DEFINITION OF TERMS:

• Electric Vehicle - a motor vehicle powered by electric motors with power storage charge directly from external sources. The definition excludes hybrid vehicles.

• Curb Weight - total unloaded mass of a vehicle with standard equipment and all necessary operating consumables such as fluids, oils, coolant, refrigerant and batteries.

• Category - shall refer to vehicle category as specified in the Philippine National Standards (PS) on Road Vehicles-Classification and Definition PNS 1891:2008.

• Electric Mobility Scooter - a two, three, or four-wheeled vehicle, with or without operable pedals, powered by electrical energy with less than 300 wattage capable of propelling the unit up to a maximum speed of 12.5 km/hr.

• Category L Electric Vehicle - a motor vehicles with less than four wheels and including 4 wheeled vehicles with restrictions on maximum speed, maximum mass and maximum rated power.

• Category L1 (e-Moped 2w) - a two-wheeled vehicle, with or without pedals, powered by electrical energy capable of propelling the unit up to a maximum speed of 50 km/hr.

• Category L2 (e-Moped 3w) - a three-wheeled vehicle, with or without pedals, powered by electrical energy capable of propelling the unit up to a maximum speed of 50 km/hr.

• Category L3 (e-Motorcycle) - a two-wheeled vehicle, powered solely by electrical energy capable of propelling the unit more than 50 km/hr.

• Category L4 and L5 (e-Tricycle/e-Three Wheeled Vehicle) - a three-wheeled motor vehicle powered solely by electrical energy with a minimum rated power of 1000 W capable of propelling the unit to no more than 50 km/hr and having a maximum curb weight of 600 kg.

• Category M Electric Vehicles - at least four-wheeled electric vehicles solely powered by electric energy and designed to carry heavier passenger loads than quadricycles.

• Category N Electric Vehicles - at least four-wheeled electric vehicles solely powered by electric energy and designed to carry heavier goods.

• Accreditation - shall refer to the authority granted by LTO for Manufacturer, Assembler, Importer, Rebuilder and/or Dealer to transact with former relative to stock reporting, sales reporting and registration of motor vehicles and/or its components.`
  },
  {
    id: 4,
    title: "Type, Category of Electric Vehicles",
    section: "Section 4",
    hasDetails: true,
    category: "general",
    content: `TYPE AND CATEGORY OF ELECTRIC VEHICLES:

4.1. PERSONAL MOBILITY SCOOTER
Designed for shorter trips within communities. Operation limited within private roads subject to internal regulations. May be operated on pedestrian walkways and bicycle lanes or similar lanes designated by proper authorities. Riders required to wear protective helmet similar to bicycle riders. Driver's license and registration NOT required.

4.2. ELECTRIC KICK SCOOTER
Operation limited within barangay roads only. May be operated on bicycle lanes or similar lanes designated by proper authorities. Riders required to wear protective helmet similar to motorcycle riders. Driver's license and registration NOT required.

4.3. CATEGORY L1a - Maximum speed of 25 km/hr
Operation limited within barangay local roads. Can pass national roads and other type of roads for purposes of crossing only when road/lane is allowed to traverse. May be operated on bicycle lanes and similar lanes designated by proper authorities. Riders required to wear protective helmet similar to bicycle riders. These shall not be used for public transport purposes. Driver's license and registration NOT required.

4.4. CATEGORY L1b - Maximum speed of 26 to 50 km/hr
Operation may be allowed to go beyond barangay roads to cover other local roads provided it will take the outermost part of the road close to the edge. Can pass main thoroughfares and national roads for purposes of crossing only when road/lane is allowed to traverse. Riders required to wear motorcycle protective helmet. This type shall not be used for public transport purposes due to their lighter construction. Driver's license and registration NOT required.

4.5. CATEGORY L2a - Maximum speed of 25 km/hr
Operation limited within or along private and barangay roads only. Can pass main thoroughfares and national road for purposes of crossing only. May be operated on bicycle lanes considering their limited speed. Riders required to wear protective helmet similar to bicycle riders. They shall not be used for public transport purposes. Driver's license and registration NOT required.

4.6. CATEGORY L2b - Maximum speed of 26 to 50 km/hr
Operation may be allowed to go beyond barangay roads to cover other local roads provided it will take the outermost part of the road close to the edge. Can pass main thoroughfares and national roads for purposes of crossing only. Riders required to wear motorcycle protective helmet. This type shall not be used for public transport purposes. Driver's license and registration NOT required.

4.7. CATEGORY L3 (e-MOTORCYCLE)
Operation allowed in all types of roads except in limited access highways where vehicle speeds are normally faster. All drivers and riders required to wear duly approved motorcycle helmets and should have a valid motorcycle driving license. Category 3 vehicles may be used for public transport subject to existing laws and regulations.

4.8. CATEGORY L4 and L5 (e-TRICYCLE/THREE-WHEELED VEHICLE)
Operation may be allowed to go beyond barangay roads to cover other local roads and tertiary national roads and the driver is a bearer of appropriate driver's license. Can pass main thoroughfares and national roads for purposes of crossing only when road is allowed to traverse. Local Government Units (LGUs) may authorize these types of vehicles to traverse national highways or main thoroughfares through the passage of an ordinance but shall be constrained to the outermost lane/part of the highway. Both are prohibited along limited-access highways. Similar to a regular motorcycle tricycle, a helmet is not required.

4.9. CATEGORY L6 and L7 (e-QUAD)
Operation may be allowed to go beyond private and barangay roads to cover other local roads and tertiary national roads and the driver is a bearer of appropriate driver's license. Can pass main thoroughfares and national roads for purposes of crossing only when road is allowed to traverse. Local Government Units (LGUs) may authorize these types of vehicles to traverse national highways or main thoroughfares through the passage of an ordinance but shall be constrained to the outermost lane/part of the highway. Both are prohibited along limited access highways. Similar to a regular motorcycle-tricycle, helmet is not required.

4.10. CATEGORY M1, M2, M3 (e-CAR, e-SUV, e-UTILITY VEHICLE, e-JEEPNEY, e-BUS)
Existing rules and regulations governing the operation of Category M and N vehicles with diesel/gas fuel type shall be adopted for the electric vehicle counterpart.

4.11. CATEGORY N1, N2, N3 (e-TRUCK)
Existing rules and regulations governing the operation of Category N vehicles with diesel/gas fuel type shall be adopted for the electric vehicle counterpart.`
  },
  {
    id: 5,
    title: "Requirements for Registration of Electric Vehicles",
    section: "Section 5",
    hasDetails: true,
    category: "requirements",
    content: `REQUIREMENTS FOR REGISTRATION OF ELECTRIC VEHICLES:

a. Any person residing within the City of Binan (18 years old and above) who owned and possessed an E-Bike / E-Vehicle shall first secure a Permit from the Binan Tricycle Franchising and Regulatory Board (BTFRB) Office as a pre-requisite for operating an electric vehicle. This shall be applicable to those individuals who owned/purchased said e-vehicle before the effectivity of this Ordinance.

b. All electric vehicles that will be purchased after the approval of this Ordinance, shall be registered by the Marketing / Distributor before its release to the buyer.

c. E-Bikes / E-Vehicles are subject to comply with Administrative Order No. 039-2021 of the Land Transportation Office are only allowed / limited to pass Private Roads / Barangay Roads and need not to secure LTO License are as follows:
   • Personal Mobility Vehicle
   • Electric Kick Scooter
   • Category L1a – Capable of propelling the unit up to a maximum speed of 25 km/hr
   • Category L2a - Capable of propelling the unit up to a maximum speed of 25 km/hr
   • Category L2b - Capable of propelling the unit up to a maximum speed of 26 - 50 km/hr

d. E-Bikes / E-Vehicles are subject to comply to use standard protective helmet, and shall not be used for public transport purposes are as follows:
   • Category L1b - Capable of propelling the unit up to a maximum speed of 26 - 50 km/hr
   • Category L2a - Capable of propelling the unit up to a maximum speed of 25 km/hr

e. E-Vehicles under Category L3 Electric Vehicle (e-Motorcycle) and Category L4 and L5 Electric Vehicle (e-Tricycle/Three Wheeled Vehicle) shall comply with LTO AO 039-2021 are required to secure LTO Driver's License and are subject to limited roads like Barangay and Local Roads. They are also authorized to be used privately or "for hire".`
  },
  {
    id: 6,
    title: "Imposition of Fee",
    section: "Section 6",
    hasDetails: true,
    category: "requirements",
    content: `IMPOSITION OF FEE:

There shall be collected from the owner of an Electric Vehicle operating within the City of Binan, the following fees:

FEES FOR PRIVATELY-OWNED E-BIKE:
a. Registration Fee for New / Renewal          ₱100.00
b. Permit or License Fee                       ₱150.00
c. Metal Plate (One Time Payment)              ₱300.00
d. Sticker (For Validation every Year)         ₱50.00

FEES FOR E-BIKE FOR HIRE:
a. Registration Fee for New / Renewal          ₱200.00
b. Permit or License Fee                       ₱150.00
c. Metal Plate (One Time Payment)              ₱300.00
d. Sticker (For Validation every Year)         ₱50.00

NOTE: Owners of E-Vehicle that were previously purchased (2020 and below) shall be waived from paying the Registration Fee but would still be required to secure a Metal Plate / Sticker for their units.`
  },
  {
    id: 7,
    title: "Time of Payment",
    section: "Section 7",
    hasDetails: true,
    category: "requirements",
    content: `TIME OF PAYMENT:

The fee imposed herein shall be due and payable to the City Treasurer's Office within the first twenty (20) days of January every year. For all the electric vehicles under Section 4 acquired after January 20, the permit fee shall be paid without penalty within the first twenty (20) days following its acquisition.`
  },
  {
    id: 8,
    title: "Administrative Provisions",
    section: "Section 8",
    hasDetails: true,
    category: "admin",
    content: `ADMINISTRATIVE PROVISIONS:

a. A metal plate and/or sticker shall be provided by the Binan Tricycle Franchising and Regulatory Board (BTFRB) to be paid at cost by the owner.

b. The Binan Tricycle Franchising and Regulatory Board (BTFRB) shall keep a Register of all the electric vehicles which shall include information such as: its make and brand, the name and address of the owner, and the number of the plate or sticker issued.

c. The Binan Tricycle Franchising and Regulatory Board (BTFRB), Public Order and Safety Office (POSO), and Philippine National Police - Binan shall be deputized and will have the authority to enforce the said ordinance and conduct operations relative to the registration of the above-mentioned vehicles.

d. An Electric Route (E-Route) or a Designated Road Lanes will be issued which also includes reminders of wearing appropriate protective gear and adherence to the maximum speed levels.

e. Fare Matrix will be imposed on those Electric Vehicles for Hire and/or used as passenger utility vehicles and will be regulated by the Binan Tricycle Franchising and Regulatory Board (BTFRB).

f. All electric vehicles shall only be allowed to use the outermost lane of major thoroughfares of the city and will only be limited to Barangay Roads to ensure a safe ride.`
  },
  {
    id: 9,
    title: "Penalty",
    section: "Section 9",
    hasDetails: true,
    category: "enforcement",
    content: `PENALTY:

Any person found riding an unregistered E-Bike or E-Scooters shall be punished with the following fines:

a. First Offense                           Five Hundred Pesos (₱500.00)
b. Second Offense                          One Thousand Pesos (₱1,000.00)
c. Third Offense                           Two Thousand Pesos (₱2,000.00)
d. Fourth / Subsequent Offenses:           Confiscation of License / Impoundment of Unit

For unregistered e-vehicle units driven by riders with no license, the penalty shall be based on the City of Binan's Traffic Code with an Impoundable Procedure.

For those who failed to install an authorized metal plate/sticker, a penalty of Five Hundred Pesos (₱500.00) shall be imposed.

Non-residents of the City of Binan who shall pass the city's road and will frequently visit due to unavoidable circumstances (only mode of transportation) such as but not limited to: school and work service, use for livelihood and purchase of basic needs (food, medicine and other necessities) shall also be required to register their e-vehicle to BTFRB.

PENALTY FOR DISTRIBUTOR / MARKETING WHO FAILED TO COMPLY HERETO:
a. First Offense                           Five Hundred Pesos (₱500.00) / Unit
b. Second Offense                          One Thousand Pesos (₱1,000.00) / Unit
c. Third Offense                           Two Thousand Pesos (₱2,000.00) / Unit
d. Fourth / Subsequent Offenses:           Revocation of Business Permit`
  },
  {
    id: 10,
    title: "Appropriation",
    section: "Section 10",
    hasDetails: true,
    category: "closure",
    content: `APPROPRIATION:

The City Government shall appropriate Two Hundred Thousand Pesos (₱200,000.00) from the Annual Budget of the Binan Tricycle Franchising and Regulatory Board (BTFRB) Office and other sources that may be tapped or appropriated from concerned agencies and from all other sources of funds that might be available for the implementation of the same.`
  },
  {
    id: 11,
    title: "Separability Clause",
    section: "Section 11",
    hasDetails: true,
    category: "closure",
    content: `SEPARABILITY CLAUSE:

If for any reason any section or provision of this Ordinance is declared unconstitutional or invalid, the other sections or provisions hereof which are not affected thereby shall continue to be in full force and effect.`
  },
  {
    id: 12,
    title: "Repealing Clause",
    section: "Section 12",
    hasDetails: true,
    category: "closure",
    content: `REPEALING CLAUSE:

All Ordinances, local issuances or rules inconsistent with the provisions of this Ordinance are hereby repealed or modified accordingly.`
  },
  {
    id: 13,
    title: "Effectivity Clause",
    section: "Section 13",
    hasDetails: true,
    category: "closure",
    content: `EFFECTIVITY CLAUSE:

This Ordinance shall take effect upon approval and after publication in the newspapers of general circulation.

UNANIMOUSLY APPROVED.

Dated: September 4, 2023
City of Binan, Province of Laguna`
  },
];

const categoryLabels = {
  intro: "Introduction",
  general: "General Provisions",
  requirements: "Registration & Fees",
  admin: "Administration",
  enforcement: "Enforcement",
  closure: "Closure",
};

export default function Ordinance({ navigation }) {
  const [searchText, setSearchText] = useState("");
  const [filteredRows, setFilteredRows] = useState(rows);
  const [selectedSection, setSelectedSection] = useState(null);

  useLayoutEffect(() => {
    try {
      navigation?.setOptions?.({
        headerShown: false,
        headerBackVisible: false,
        headerLeft: () => null,
      });
    } catch (e) {}
    try {
      let parent = navigation.getParent?.();
      while (parent) {
        try {
          parent.setOptions?.({
            headerShown: false,
            headerBackVisible: false,
            headerLeft: () => null,
          });
        } catch (err) {}
        parent = parent.getParent?.();
      }
    } catch (e) {}
  }, [navigation]);

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim() === "") {
      setFilteredRows(rows);
    } else {
      const filtered = rows.filter(
        (row) =>
          row.title.toLowerCase().includes(text.toLowerCase()) ||
          row.section.toLowerCase().includes(text.toLowerCase()) ||
          row.content.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredRows(filtered);
    }
  };

  const parentNav = navigation.getParent?.();

  const handleEmblemPress = () => {
    if (parentNav?.navigate) {
      parentNav.navigate("HomeRider");
      return;
    }
    if (navigation?.navigate) {
      navigation.navigate("HomeRider");
      return;
    }
    if (navigation?.goBack) navigation.goBack();
  };

  const ICON_SIZE = Math.min(34, Math.round(WINDOW_W * 0.08));
  const TOUCH_SIZE = 56;

  const groupedRows = filteredRows.reduce((acc, row) => {
    const category = row.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(row);
    return acc;
  }, {});

  const orderedCategories = ["intro", "general", "requirements", "admin", "enforcement", "closure"];

  if (selectedSection) {
    return (
      <DetailView
        section={selectedSection}
        onBack={() => setSelectedSection(null)}
        navigation={navigation}
        handleEmblemPress={handleEmblemPress}
        ICON_SIZE={ICON_SIZE}
        TOUCH_SIZE={TOUCH_SIZE}
      />
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.topSafe}>
        <View style={styles.topBand}>
          <Text style={styles.topTitle}>find about the{'\n'}City Ordinance!</Text>
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search ordinance..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={handleSearch}
          />
          {searchText !== "" && (
            <Pressable onPress={() => handleSearch("")}>
              <Text style={styles.clearBtn}>✕</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      <Pressable
        onPress={handleEmblemPress}
        style={[
          styles.absEmblem,
          {
            width: TOUCH_SIZE,
            height: TOUCH_SIZE,
            right: 12,
            top: Platform.OS === "android" ? 10 : 10,
          },
        ]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        android_ripple={{ color: "#00000010", borderless: true }}
        accessibilityRole="button"
        accessibilityLabel="Go to Home"
      >
        <Image
          source={require("../../assets/top-emblem.png")}
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
          resizeMode="contain"
        />
      </Pressable>

      <View style={styles.panel}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {orderedCategories.map((category) => {
            const categoryRows = groupedRows[category];
            if (!categoryRows || categoryRows.length === 0) return null;

            return (
              <View key={category}>
                {category !== "intro" && (
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryDot} />
                    <Text style={styles.categoryTitle}>{categoryLabels[category]}</Text>
                  </View>
                )}

                {categoryRows.map((r) => (
                  <OrdinanceCard
                    key={r.id}
                    row={r}
                    onPress={() => setSelectedSection(r)}
                  />
                ))}
              </View>
            );
          })}

          {filteredRows.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try different keywords</Text>
            </View>
          )}

          <View style={{ height: 36 }} />
        </ScrollView>
      </View>

      <Image
        source={require("../../assets/binan-seal-large.png")}
        style={styles.seal}
        resizeMode="cover"
      />
    </View>
  );
}

function OrdinanceCard({ row, onPress }) {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        styles.cardWrapper,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: "#00000008", borderRadius: 14 }}
        style={styles.cardPressable}
      >
        <View style={styles.card}>
          <View style={styles.cardAccent} />

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{row.title}</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{row.section}</Text>
          </View>

          <View style={styles.arrowLowerRight}>
            <Image
              source={require("../../assets/down-arrow.png")}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function DetailView({ section, onBack, navigation, handleEmblemPress, ICON_SIZE, TOUCH_SIZE }) {
  return (
    <View style={styles.detailRoot}>
      <SafeAreaView style={styles.detailTopSafe}>
        <View style={styles.detailTopBand}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.detailTopTitle} numberOfLines={2}>{section.title}</Text>
        </View>
      </SafeAreaView>

      <Pressable
        onPress={handleEmblemPress}
        style={[
          styles.absEmblem,
          {
            width: TOUCH_SIZE,
            height: TOUCH_SIZE,
            right: 12,
            top: Platform.OS === "android" ? 10 : 10,
          },
        ]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        android_ripple={{ color: "#00000010", borderless: true }}
      >
        <Image
          source={require("../../assets/top-emblem.png")}
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
          resizeMode="contain"
        />
      </Pressable>

      <View style={styles.detailPanel}>
        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{section.section}</Text>
            </View>
          </View>

          <Text style={styles.detailText}>{section.content}</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      <Image
        source={require("../../assets/binan-seal-large.png")}
        style={styles.detailSeal}
        resizeMode="cover"
      />
    </View>
  );
}

const GREEN = "#2e7d32";
const GREEN_DARK = "#1b5e20";
const ORANGE = "#ee4700";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GREEN },
  topSafe: { backgroundColor: GREEN },

  topBand: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },

  topTitle: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "700",
    lineHeight: 50,
    marginTop: 70,
    marginBottom: 20,
  },

  searchContainer: {
    marginHorizontal: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
  },

  clearBtn: {
    fontSize: 18,
    color: "#999",
    fontWeight: "500",
    padding: 4,
  },

  absEmblem: {
    position: "absolute",
    zIndex: 999,
    elevation: 999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 100,
  },

  panel: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -10,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 18,
    elevation: 6,
  },

  list: {
    paddingBottom: 20,
    paddingTop: 16,
    paddingHorizontal: (Dimensions.get("window").width - CARD_W) / 2,
  },

  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 12,
    paddingLeft: 4,
  },

  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
    marginRight: 10,
  },

  categoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  cardWrapper: {
    marginBottom: 12,
    width: CARD_W,
  },

  cardPressable: {
    borderRadius: 14,
  },

  card: {
    width: "100%",
    minHeight: 120,
    backgroundColor: "#f6f6f6",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    elevation: 3,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  cardAccent: {
    width: 12,
    height: "100%",
    backgroundColor: ORANGE,
    elevation: 2,
  },

  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    lineHeight: 20,
  },

  badge: {
    backgroundColor: GREEN_DARK,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
  },

  badgeText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },

  arrowLowerRight: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },

  arrowIcon: {
    width: 14,
    height: 14,
    tintColor: "#fff",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },

  seal: {
    position: "absolute",
    width: 420,
    height: 420,
    opacity: 0.06,
    right: -30,
    top: 8,
  },

  // Detail View Styles
  detailRoot: {
    flex: 1,
    backgroundColor: GREEN,
  },

  detailTopSafe: {
    backgroundColor: GREEN,
  },

  detailTopBand: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 24,
    marginTop: 70,
  },

  backButton: {
    paddingVertical: 8,
    paddingRight: 10,
    marginBottom: 12,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  detailTopTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },

  detailPanel: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -10,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 18,
    elevation: 6,
  },

  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },

  sectionHeader: {
    marginBottom: 20,
  },

  sectionBadge: {
    alignSelf: "flex-start",
    backgroundColor: GREEN_DARK,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  sectionBadgeText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },

  detailText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#333",
    fontWeight: "400",
  },

  detailSeal: {
    position: "absolute",
    width: 420,
    height: 420,
    opacity: 0.06,
    right: -30,
    top: 8,
  },
});