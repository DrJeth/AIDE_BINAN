import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LandingPage1 from "../screens/LandingPage1";
import LandingPage2 from "../screens/LandingPage2";
import LandingPage3 from "../screens/LandingPage3";
import LandingPage4 from "../screens/LandingPage4";
import Login from "../screens/Login";
import RegisterRider from "../screens/RegisterRider";
import RegisterAdmin from "../screens/RegisterAdmin";
import HomeRider from "../screens/HomeRider";
import HomeAdmin from "../screens/HomeAdmin";
import Ordinance from "../screens/Ordinance";
import Me from "../screens/Me";
import Transaction from "../screens/Transaction";
import TermsService from "../screens/TermsService";
import Faq from "../screens/Faq";
import ContactUs from "../screens/ContactUs";
import About from "../screens/About";
import Logout from "../screens/Logout";
import MyAccount from "../screens/MyAccount";
import Settings from "../screens/Settings";
import TabNavigator from "./TabNavigator";
import Purpose from "../screens/Purpose";
import Definition1 from "../screens/Definition1";
import Definition2 from "../screens/Definition2";
import Definition3 from "../screens/Definition3";
import Requirements from "../screens/Requirements";
import Imposition from "../screens/Imposition";
import Provision from "../screens/Provision";
import Penalty from "../screens/Penalty";
import GreenRouteMap from "../screens/GreenRouteMap";
import AdminMap from "../screens/AdminMap";
import Appointment from "../screens/Appointment";
import NewsScreen from "../screens/NewsScreen";
import RiderScreen from "../screens/RiderScreen";
import AdminAppointment from "../screens/AdminAppointment";
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="LandingPage1" 
      screenOptions={{ headerShown: false }}
    >
      
      <Stack.Screen name="LandingPage1" component={LandingPage1} />
      <Stack.Screen name="LandingPage2" component={LandingPage2} />
      <Stack.Screen name="LandingPage3" component={LandingPage3} />
      <Stack.Screen name="LandingPage4" component={LandingPage4} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="RegisterRider" component={RegisterRider} />
      <Stack.Screen name="RegisterAdmin" component={RegisterAdmin} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="GreenRouteMap" component={GreenRouteMap} />
      <Stack.Screen name="AdminMap" component={AdminMap} />
      <Stack.Screen name="HomeRider" component={HomeRider} />
      <Stack.Screen name="HomeAdmin" component={HomeAdmin} />
      <Stack.Screen name="Ordinance" component={Ordinance} />
      <Stack.Screen name="Purpose" component={Purpose} />
      <Stack.Screen name="Definition1" component={Definition1} />
      <Stack.Screen name="Definition2" component={Definition2} />
      <Stack.Screen name="Definition3" component={Definition3} />
      <Stack.Screen name="Requirements" component={Requirements} />
      <Stack.Screen name="Imposition" component={Imposition} />
      <Stack.Screen name="Appointment" component={Appointment} options={{ headerShown: false }}/>
      <Stack.Screen name="Provision" component={Provision} />
      <Stack.Screen name="Penalty" component={Penalty} />
      <Stack.Screen name="Me" component={Me} />
      <Stack.Screen name="Transaction" component={Transaction} />
      <Stack.Screen name="TermsService" component={TermsService} />
      <Stack.Screen name="Faq" component={Faq} />
      <Stack.Screen name="ContactUs" component={ContactUs} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="NewsScreen" component={NewsScreen} />
      <Stack.Screen name="AdminAppointment" component={AdminAppointment} />
      <Stack.Screen name="Logout" component={Logout} />
      <Stack.Screen name="MyAccount" component={MyAccount} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="RiderScreen" component={RiderScreen} />
    </Stack.Navigator>
  );
}