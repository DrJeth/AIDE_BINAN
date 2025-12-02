// a single bullet + content line used in FAQ
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ListItem({ children, bullet = "•", style, textStyle }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.bullet}>{bullet}</Text>
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bullet: {
    width: 18,
    fontSize: 14,
    marginRight: 6,
    lineHeight: 20,
    color: "#222",
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#222",
  },
});
