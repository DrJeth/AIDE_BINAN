// frontend/src/navigation/TabNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeRider from "../screens/HomeRider";
import Ordinance from "../screens/Ordinance";
import Transaction from "../screens/Transaction";
import Me from "../screens/Me";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator initialRouteName="HomeRider" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeRider" component={HomeRider} />
      <Tab.Screen name="Ordinance" component={Ordinance} />
      <Tab.Screen name="Transaction" component={Transaction} />
      <Tab.Screen name="Me" component={Me} />
    </Tab.Navigator>
  );
}
