// frontend/src/screens/Ordinance.js
import React, { useLayoutEffect, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebaseConfig"; // ✅ same Firebase project as Admin

// ✅ Default rows (Firestore will override title/section/description when available)
const DEFAULT_ROWS = [
  {
    id: 1,
    title: "Electrical Vehicle Registration Ordinance in the City Of Binan",
    section: "Section 1",
    hasDetails: false,
    description: ""
  },
  { id: 2, title: "Purpose and Scope", section: "Section 2", hasDetails: true, description: "" },
  { id: 3, title: "Definition of Terms", section: "Section 3/4", hasDetails: true, description: "" },
  {
    id: 4,
    title: "Requirement for Registration of Electric Vehicles",
    section: "Section 5",
    hasDetails: true,
    description: ""
  },
  { id: 5, title: "Imposition of Fee", section: "Section 6", hasDetails: true, description: "" },

  // Section 7 with dropdown description
  {
    id: 6,
    title: "Time of payment",
    section: "Section 7",
    hasDetails: false,
    description:
      "The fee imposed herein shall be due and payable to the City Treasurer's Office within the first twenty (20) days of January every year. For all the electric vehicles under Section 4 acquired after January 20, the permit fee shall be paid without penalty within the first twenty (20) days following its acquisition."
  },

  { id: 7, title: "Administrative Provision", section: "Section 8", hasDetails: true, description: "" },
  { id: 8, title: "Penalty", section: "Section 9", hasDetails: true, description: "" },

  {
    id: 9,
    title: "Appropriation",
    section: "Section 10",
    hasDetails: false,
    description:
      "The City Government shall appropriate Two Hundred Thousand Pesos (Php200,000.00) from the Annual Budget of the Binan Tricycle Franchising and Regulatory Board (BTFRB) Office and other sources that may be tapped or appropriated from concerned agencies and from all other sources of funds that might be available for the implementation of the same."
  },

  {
    id: 10,
    title: "Separability Clause",
    section: "Section 11",
    hasDetails: false,
    description:
      "If for any reason any section or provision of this Ordinance is declared unconstitutional or invalid, the other sections or provisions hereof which are not affected thereby shall continue to be in full force and effect."
  },

  {
    id: 11,
    title: "Repealing Clause",
    section: "Section 12",
    hasDetails: false,
    description:
      "All Ordinances, local issuances or rules inconsistent with the provisions of this Ordinance are hereby repealed or modified accordingly."
  },

  {
    id: 12,
    title: "Effectivity Clause",
    section: "Section 13",
    hasDetails: false,
    description:
      "This Ordinance shall take effect upon approval and after publication in the newspapers of general circulation. UNANIMOUSLY APPROVED."
  }
];

// Responsive values based on screen width
const getResponsiveValues = (width) => {
  if (width < 360) {
    return {
      cardWidth: width - 28,
      topTitleSize: 36,
      topTitleLineHeight: 40,
      topPaddingHorizontal: 12,
      topPaddingVertical: 4,
      topMarginTop: 45,
      cardMinHeight: 78,
      cardFontSize: 13,
      cardLineHeight: 18,
      cardPaddingH: 12,
      cardPaddingV: 10,
      badgeFontSize: 9,
      badgePaddingH: 8,
      badgePaddingV: 4,
      panelPaddingTop: 12,
      marginBottom: 10,
      borderRadius: 12
    };
  } else if (width < 380) {
    return {
      cardWidth: width - 28,
      topTitleSize: 40,
      topTitleLineHeight: 44,
      topPaddingHorizontal: 14,
      topPaddingVertical: 6,
      topMarginTop: 55,
      cardMinHeight: 80,
      cardFontSize: 14,
      cardLineHeight: 19,
      cardPaddingH: 13,
      cardPaddingV: 11,
      badgeFontSize: 10,
      badgePaddingH: 9,
      badgePaddingV: 4,
      panelPaddingTop: 14,
      marginBottom: 11,
      borderRadius: 13
    };
  } else if (width < 430) {
    return {
      cardWidth: Math.min(340, width - 30),
      topTitleSize: 44,
      topTitleLineHeight: 48,
      topPaddingHorizontal: 16,
      topPaddingVertical: 8,
      topMarginTop: 60,
      cardMinHeight: 84,
      cardFontSize: 15,
      cardLineHeight: 20,
      cardPaddingH: 14,
      cardPaddingV: 12,
      badgeFontSize: 11,
      badgePaddingH: 10,
      badgePaddingV: 5,
      panelPaddingTop: 16,
      marginBottom: 12,
      borderRadius: 14
    };
  } else {
    return {
      cardWidth: Math.min(360, width - 40),
      topTitleSize: 50,
      topTitleLineHeight: 54,
      topPaddingHorizontal: 18,
      topPaddingVertical: 10,
      topMarginTop: 70,
      cardMinHeight: 90,
      cardFontSize: 16,
      cardLineHeight: 21,
      cardPaddingH: 15,
      cardPaddingV: 13,
      badgeFontSize: 11,
      badgePaddingH: 11,
      badgePaddingV: 6,
      panelPaddingTop: 18,
      marginBottom: 13,
      borderRadius: 15
    };
  }
};

const GREEN = "#2e7d32";

export default function Ordinance({ navigation }) {
  const { width } = useWindowDimensions();
  const responsive = getResponsiveValues(width);
  const dynamicStyles = useMemo(() => createDynamicStyles(responsive), [responsive]);

  const [expandedId, setExpandedId] = useState(null);

  // ✅ realtime ordinances from Firestore
  const [rows, setRows] = useState(DEFAULT_ROWS);

  useLayoutEffect(() => {
    try {
      navigation?.setOptions?.({
        headerShown: false,
        headerBackVisible: false,
        headerLeft: () => null
      });
    } catch (e) {}

    try {
      let parent = navigation.getParent?.();
      while (parent) {
        try {
          parent.setOptions?.({
            headerShown: false,
            headerBackVisible: false,
            headerLeft: () => null
          });
        } catch (err) {}
        parent = parent.getParent?.();
      }
    } catch (e) {}
  }, [navigation]);

  // ✅ Read ordinances from Firestore (reflect admin edits)
  useEffect(() => {
    const colRef = collection(db, "ordinance");

    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          map[d.id] = d.data();
        });

        const merged = DEFAULT_ROWS.map((r) => {
          const saved = map[String(r.id)];
          if (!saved) return r;

          return {
            ...r,
            title: typeof saved.title === "string" ? saved.title : r.title,
            section: typeof saved.section === "string" ? saved.section : r.section,
            description: typeof saved.description === "string" ? saved.description : r.description
          };
        });

        setRows(merged);
      },
      (err) => {
        console.log("Ordinance snapshot error:", err);
        setRows(DEFAULT_ROWS);

        Alert.alert(
          "Ordinance Not Synced",
          "Rider app cannot read ordinances from Firestore. Check Firestore rules and confirm the collection name is 'ordinance'."
        );
      }
    );

    return () => unsub();
  }, []);

  // Navigation to detail screens
  const handleArrowPress = (row) => {
    switch (row.id) {
      case 2:
        return navigation.navigate("Purpose");
      case 3:
        return navigation.navigate("Definition1");
      case 4:
        return navigation.navigate("Requirements");
      case 5:
        return navigation.navigate("Imposition");
      case 7:
        return navigation.navigate("Provision");
      case 8:
        return navigation.navigate("Penalty");
      default:
        return;
    }
  };

  const toggleExpand = (row) => {
    if (!row.description) return;
    setExpandedId((prev) => (prev === row.id ? null : row.id));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.topSafe}>
        <View style={dynamicStyles.topBand}>
          <Text style={dynamicStyles.topTitle}>
            find about the{"\n"}City Ordinance!
          </Text>
          {/* ✅ Removed: "Updated ordinances are live ✅" */}
        </View>
      </SafeAreaView>

      <View style={dynamicStyles.panel}>
        <ScrollView
          contentContainerStyle={dynamicStyles.list}
          showsVerticalScrollIndicator={false}
        >
          {rows.map((r) => {
            const isExpanded = expandedId === r.id && r.description;

            return (
              <View
                key={r.id}
                style={[
                  dynamicStyles.card,
                  { width: responsive.cardWidth, minHeight: responsive.cardMinHeight }
                ]}
              >
                <View style={styles.cardAccent} />

                {/* Dropdown / main body */}
                <Pressable
                  onPress={() => toggleExpand(r)}
                  android_ripple={r.description ? { color: "#00000008" } : undefined}
                  style={[
                    dynamicStyles.cardBody,
                    r.hasDetails ? dynamicStyles.cardBodyPadRightWithArrow : dynamicStyles.cardBodyPadRightNoArrow
                  ]}
                >
                  <Text style={dynamicStyles.cardTitle} numberOfLines={3}>
                    {r.title}
                  </Text>

                  {isExpanded && (
                    <Text style={dynamicStyles.descriptionText}>{r.description}</Text>
                  )}
                </Pressable>

                {/* ✅ Section Badge stays TOP-RIGHT like original */}
                <View style={dynamicStyles.badge}>
                  <Text style={dynamicStyles.badgeText}>{r.section}</Text>
                </View>

                {/* Arrow button for detail screens */}
                {r.hasDetails && (
                  <Pressable
                    onPress={() => handleArrowPress(r)}
                    android_ripple={{ color: "#00000008", radius: 20 }}
                    style={dynamicStyles.arrowLowerRight}
                  >
                    <Image
                      source={require("../../assets/down-arrow.png")}
                      style={dynamicStyles.arrowIcon}
                      resizeMode="contain"
                    />
                  </Pressable>
                )}
              </View>
            );
          })}

          <View style={{ height: 36 }} />
        </ScrollView>
      </View>

      <Image
        source={require("../../assets/binan-seal-large.png")}
        style={[styles.seal, { opacity: 0.06 }]}
        resizeMode="cover"
      />
    </View>
  );
}

const createDynamicStyles = (responsive) =>
  StyleSheet.create({
    topBand: {
      paddingHorizontal: responsive.topPaddingHorizontal,
      paddingTop: responsive.topPaddingVertical,
      paddingBottom: responsive.topPaddingVertical
    },

    topTitle: {
      color: "#fff",
      fontSize: responsive.topTitleSize,
      fontWeight: "700",
      lineHeight: responsive.topTitleLineHeight,
      marginTop: responsive.topMarginTop
    },

    panel: {
      flex: 1,
      backgroundColor: "#fff",
      marginTop: -10,
      borderTopLeftRadius: responsive.borderRadius + 10,
      borderTopRightRadius: responsive.borderRadius + 10,
      paddingTop: responsive.panelPaddingTop,
      elevation: 6
    },

    list: {
      alignItems: "center",
      paddingBottom: 20,
      paddingTop: 6,
      paddingHorizontal: 10
    },

    card: {
      backgroundColor: "#f6f6f6",
      borderRadius: responsive.borderRadius,
      marginBottom: responsive.marginBottom,
      flexDirection: "row",
      position: "relative",
      elevation: 2,
      overflow: "hidden"
    },

    cardBody: {
      flex: 1,
      paddingHorizontal: responsive.cardPaddingH,
      paddingVertical: responsive.cardPaddingV
    },

    // ✅ IMPORTANT: add right padding so badge won't cover TITLE/DESCRIPTION
    // Badge is top-right absolute, so we reserve space on the right.
    cardBodyPadRightNoArrow: {
      paddingRight: responsive.cardPaddingH + 120
    },

    // ✅ If arrow exists, reserve even more space on the right + bottom
    cardBodyPadRightWithArrow: {
      paddingRight: responsive.cardPaddingH + 160,
      paddingBottom: responsive.cardPaddingV + 14
    },

    cardTitle: {
      fontSize: responsive.cardFontSize,
      fontWeight: "700",
      color: "#222",
      lineHeight: responsive.cardLineHeight
    },

    descriptionText: {
      marginTop: 6,
      fontSize: responsive.cardFontSize - 1,
      lineHeight: responsive.cardLineHeight + 2,
      color: "#444"
    },

    // ✅ Badge position SAME as original (absolute top-right)
    badge: {
      position: "absolute",
      top: 6,
      right: 6,
      backgroundColor: "#0f3d12",
      paddingHorizontal: responsive.badgePaddingH,
      paddingVertical: responsive.badgePaddingV,
      borderRadius: 10
    },

    badgeText: {
      fontSize: responsive.badgeFontSize,
      color: "#fff",
      fontWeight: "700"
    },

    arrowLowerRight: {
      position: "absolute",
      right: 6,
      bottom: 4,
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#d0d0d0",
      backgroundColor: "#fff",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
      marginBottom: 4
    },

    arrowIcon: {
      width: 16,
      height: 16,
      tintColor: "#000"
    }
  });

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GREEN
  },
  topSafe: {
    backgroundColor: GREEN
  },

  cardAccent: {
    width: 12,
    height: "100%",
    backgroundColor: "#ee4700"
  },
  seal: {
    position: "absolute",
    width: 420,
    height: 420,
    right: -30,
    top: 8
  }
});
