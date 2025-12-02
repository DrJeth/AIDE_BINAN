// simple wrapper that renders children stacked (used by Faq)
import React from "react";
import { View } from "react-native";

export default function UnorderedList({ children, style }) {
  return <View style={style}>{children}</View>;
}
