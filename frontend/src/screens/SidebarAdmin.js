import * as React from "react";
import {StyleSheet, View, Text, Image, Pressable} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Component from "../assets/"
import Component1 from "../assets/"
import Component2 from "../assets/"
import Component3 from "../assets/"
import Component4 from "../assets/"
import Component5 from "../assets/"
import Component6 from "../assets/"
import Component7 from "../assets/"
import Component8 from "../assets/"
import Component9 from "../assets/"
import Component10 from "../assets/"
import Component11 from "../assets/"
import Component12 from "../assets/"
import Component13 from "../assets/"
import Component14 from "../assets/"
import Component15 from "../assets/"
import Component16 from "../assets/"
import Component17 from "../assets/"
import Component18 from "../assets/"
import Component19 from "../assets/"
import Component20 from "../assets/"

const SidebarAdmin = () => {
  	
  	return (
    		<SafeAreaView style={styles.sidebarAdmin}>
      			<View style={styles.view}>
        				<View style={[styles.child, styles.childLayout]} />
        				<View style={styles.greet}>
          					<Text style={styles.hiAdmin}>Hi, admin</Text>
        				</View>
        				<Component style={[styles.headerIcon, styles.itemLayout]} width={360} height={79} />
        				<View style={styles.rectangleParent}>
          					<View style={styles.groupChild} />
          					<Text style={[styles.search, styles.searchLayout]}>Search</Text>
          					<Component1 style={[styles.vectorIcon, styles.vectorIconLayout1]} />
        				</View>
        				<View style={[styles.ndBox, styles.boxLayout1]}>
          					<View style={[styles.ndBoxChild, styles.boxBorder]} />
        				</View>
        				<View style={[styles.dashboardAdmin1NdBox, styles.boxLayout1]}>
          					<View style={[styles.ndBoxChild, styles.boxBorder]} />
        				</View>
        				<View style={[styles.ndBox2, styles.boxLayout]}>
          					<View style={[styles.ndBoxInner, styles.boxLayout]} />
        				</View>
        				<View style={[styles.ndBox3, styles.boxLayout]}>
          					<View style={[styles.ndBoxInner, styles.boxLayout]} />
          					<View style={[styles.ndBox4, styles.boxLayout]}>
            						<View style={[styles.ndBoxInner, styles.boxLayout]} />
          					</View>
        				</View>
        				<Text style={[styles.recentViolation, styles.ixaboutIconLayout]}>Recent Violation</Text>
        				<Text style={[styles.registeredRiders, styles.ixaboutIconLayout]}>Registered Riders</Text>
        				<Text style={[styles.activeUser, styles.news2Layout]}>Active User</Text>
        				<Text style={[styles.unregistered, styles.newUserTypo]}>Unregistered</Text>
        				<Text style={[styles.newUser, styles.newUserTypo]}>New User</Text>
        				<Image style={[styles.binanCitySeal3Icon, styles.binanIconLayout]} resizeMode="cover" />
        				<View style={[styles.me, styles.childLayout]}>
          					<View style={[styles.meChild, styles.childLayout]} />
          					<Component2 style={[styles.dashboardAdmin1VectorIcon, styles.vectorIconLayout1]} />
          					<Text style={[styles.dashboardAdmin1Me, styles.dashboardTypo]}>Me</Text>
        				</View>
        				<View style={[styles.item, styles.itemLayout]} />
        				<View style={styles.violationParent}>
          					<View style={styles.violation}>
            						<View style={[styles.meChild, styles.childLayout]} />
            						<Component3 style={[styles.dashboardAdmin1VectorIcon, styles.vectorIconLayout1]} />
            						<Text style={[styles.dashboardAdmin1Violation, styles.dashboardTypo]}>Violation</Text>
          					</View>
          					<View style={styles.home}>
            						<View style={[styles.homeChild, styles.childLayout]} />
            						<Component4 style={[styles.dashboardAdmin1VectorIcon, styles.vectorIconLayout1]} />
            						<Text style={[styles.dashboardAdmin1Home, styles.dashboardTypo]}>Home</Text>
          					</View>
          					<View style={[styles.news2, styles.news2Layout]}>
            						<Text style={[styles.newsUpdateHeadline, styles.newsUpdateHeadlineTypo]}>News Update Headline</Text>
            						<Text style={[styles.someDetails, styles.sept9Typo]}>some details</Text>
            						<Text style={[styles.sept9, styles.sept9Typo]}>Sept 9</Text>
          					</View>
          					<View style={styles.dashboardAdmin1Greet}>
            						<Text style={[styles.hiJuan, styles.aideTypo]}>
              							<Text style={styles.hi}>Hi,</Text>
              							<Text style={styles.juanTypo}> Juan</Text>
              							<Text style={styles.hi}>{` `}</Text>
            						</Text>
            						<Text style={[styles.quoteOrGreetings, styles.quoteOrGreetingsTypo]}>Quote or greetings</Text>
          					</View>
          					<View style={styles.header}>
            						<Component5 style={[styles.vectorIcon4, styles.vectorIconLayout]} />
            						<View style={[styles.notification, styles.vectorIcon6Position]}>
              							<Component6 style={[styles.vectorIcon5, styles.vectorIconLayout1]} />
              							<Component7 style={[styles.vectorIcon6, styles.vectorIcon6Position]} />
            						</View>
          					</View>
          					<View style={styles.aideParent}>
            						<Text style={[styles.aide, styles.juanTypo]}>AIDE</Text>
            						<Image style={styles.transparentLogo1Icon} resizeMode="cover" />
          					</View>
          					<View style={[styles.groupItem, styles.groupLayout]} />
          					<View style={[styles.groupInner, styles.groupLayout]} />
          					<Image style={styles.transparentLogo2Icon} resizeMode="cover" />
          					<Image style={[styles.binanCitySeal2Icon, styles.binanIconLayout]} resizeMode="cover" />
        				</View>
        				<Component8 style={[styles.inner, styles.innerPosition]} width={132} height={31} />
        				<Component9 style={[styles.vectorIcon7, styles.vectorIconLayout1]} />
        				<Pressable style={[styles.logout, styles.innerPosition]} onPress={()=>{}}>
          					<Text style={styles.dashboardAdmin1Logout}>Logout</Text>
        				</Pressable>
        				<View style={[styles.profile, styles.profileLayout]}>
          					<View style={[styles.profileChild, styles.childBorder]} />
          					<Text style={[styles.juandelacruzgmailcom, styles.quoteOrGreetingsTypo]}>juandelacruz@gmail.com</Text>
          					<Text style={[styles.dashboardAdmin1Text, styles.newsUpdateHeadlineTypo]}>Juan Dela Cruz</Text>
          					<Component10 style={[styles.vectorIcon8, styles.vectorIconLayout1]} />
        				</View>
        				<View style={styles.logOutParent}>
          					<View style={[styles.logOut, styles.logLayout]}>
            						<View style={[styles.logOutChild, styles.logLayout]} />
            						<Text style={[styles.securelyLogOut, styles.sept9Typo]}>Securely log out of Account</Text>
            						<Text style={[styles.text2, styles.textTypo1]}>Log Out</Text>
            						<Component11 style={[styles.vectorIcon9, styles.vectorIconClr]} />
          					</View>
          					<View style={[styles.ndBox5, styles.boxPosition]}>
            						<View style={[styles.ndBoxChild2, styles.boxPosition]} />
            						<Component12 style={styles.weuiarrowFilledIcon} width={12} height={24} />
            						<Component13 style={[styles.dashboardAdmin1WeuiarrowFilledIcon, styles.weuiarrowIconPosition]} width={12} height={24} />
            						<Component14 style={[styles.profileIcon, styles.groupLayout]} width={262} height={56} />
            						<Component15 style={[styles.weuiarrowFilledIcon2, styles.weuiarrowIconPosition]} width={12} height={24} />
            						<Text style={[styles.text3, styles.textTypo]}>My Account</Text>
            						<Text style={[styles.text4, styles.textTypo]}>Settings</Text>
          					</View>
          					<View style={styles.about}>
            						<Text style={[styles.text5, styles.textTypo1]}>About</Text>
            						<Component16 style={[styles.ixaboutIcon, styles.ixaboutIconLayout]} width={25} height={25} />
          					</View>
          					<Component17 style={styles.weuiarrowFilledIcon3} width={13} height={25} />
        				</View>
        				<Component18 style={[styles.mdiaccountOutlineIcon, styles.iconLayout]} width={24} height={24} />
        				<Component19 style={[styles.materialSymbolssettingsOutlIcon, styles.iconLayout]} width={24} height={24} />
        				<View style={styles.termsOfService}>
          					<Component20 style={[styles.vectorIcon10, styles.vectorIconLayout]} />
          					<Text style={[styles.text6, styles.textTypo1]}>Terms of Service</Text>
        				</View>
      			</View>
    		</SafeAreaView>);
};

const styles = StyleSheet.create({
  	sidebarAdmin: {
    		backgroundColor: "#fefefe",
    		flex: 1
  	},
  	childLayout: {
    		height: 66,
    		position: "absolute"
  	},
  	itemLayout: {
    		width: 360,
    		left: 0
  	},
  	searchLayout: {
    		height: 18,
    		fontSize: 16
  	},
  	vectorIconLayout1: {
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden"
  	},
  	boxLayout1: {
    		height: 138,
    		width: 314,
    		position: "absolute"
  	},
  	boxBorder: {
    		borderWidth: 1,
    		borderColor: "#fff",
    		backgroundColor: "#f0f0f0",
    		borderRadius: 10,
    		borderStyle: "solid",
    		top: 0,
    		left: 0
  	},
  	boxLayout: {
    		height: 82,
    		position: "absolute"
  	},
  	ixaboutIconLayout: {
    		height: 25,
    		position: "absolute"
  	},
  	news2Layout: {
    		height: 81,
    		position: "absolute"
  	},
  	newUserTypo: {
    		width: 81,
    		top: 241,
    		height: 17,
    		fontSize: 13,
    		color: "#000",
    		textAlign: "left",
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600",
    		position: "absolute"
  	},
  	binanIconLayout: {
    		width: 273,
    		height: 192,
    		position: "absolute"
  	},
  	dashboardTypo: {
    		fontSize: 12,
    		top: 39,
    		color: "#f0f0f0",
    		textAlign: "left",
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600",
    		position: "absolute"
  	},
  	newsUpdateHeadlineTypo: {
    		fontFamily: "Inter-Medium",
    		letterSpacing: 0.1,
    		fontSize: 20,
    		fontWeight: "500",
    		textAlign: "left",
    		color: "#333",
    		position: "absolute"
  	},
  	sept9Typo: {
    		color: "#9e9e9e",
    		fontFamily: "Inter-Medium",
    		letterSpacing: 0.1,
    		fontWeight: "500",
    		fontSize: 16,
    		textAlign: "left",
    		position: "absolute"
  	},
  	aideTypo: {
    		fontSize: 30,
    		textAlign: "left",
    		top: 0,
    		position: "absolute"
  	},
  	quoteOrGreetingsTypo: {
    		top: 44,
    		color: "#9e9e9e",
    		fontFamily: "Inter-Medium",
    		letterSpacing: 0.1,
    		fontWeight: "500",
    		textAlign: "left",
    		position: "absolute"
  	},
  	vectorIconLayout: {
    		left: "0%",
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden"
  	},
  	vectorIcon6Position: {
    		top: "0%",
    		right: "0%",
    		position: "absolute"
  	},
  	juanTypo: {
    		fontFamily: "CrimsonText-Bold",
    		fontWeight: "700"
  	},
  	groupLayout: {
    		width: 262,
    		position: "absolute"
  	},
  	innerPosition: {
    		top: 709,
    		position: "absolute"
  	},
  	profileLayout: {
    		height: 86,
    		width: 260,
    		position: "absolute"
  	},
  	childBorder: {
    		borderColor: "#2e7d32",
    		borderWidth: 1,
    		backgroundColor: "#f0f0f0",
    		borderRadius: 10,
    		borderStyle: "solid"
  	},
  	logLayout: {
    		height: 84,
    		width: 260,
    		left: 0,
    		position: "absolute"
  	},
  	textTypo1: {
    		height: 22,
    		fontFamily: "Inter-Medium",
    		letterSpacing: 0.1,
    		fontSize: 20,
    		fontWeight: "500",
    		textAlign: "left",
    		color: "#333",
    		position: "absolute"
  	},
  	vectorIconClr: {
    		color: "#000",
    		position: "absolute"
  	},
  	boxPosition: {
    		height: 345,
    		top: 0,
    		position: "absolute"
  	},
  	weuiarrowIconPosition: {
    		left: 237,
    		height: 24,
    		width: 12,
    		position: "absolute"
  	},
  	textTypo: {
    		height: 20,
    		fontFamily: "Inter-Medium",
    		letterSpacing: 0.1,
    		fontSize: 20,
    		fontWeight: "500",
    		textAlign: "left",
    		color: "#333",
    		position: "absolute"
  	},
  	iconLayout: {
    		width: 24,
    		height: 24,
    		position: "absolute"
  	},
  	view: {
    		overflow: "hidden",
    		height: 800,
    		width: "100%",
    		backgroundColor: "#fefefe",
    		flex: 1
  	},
  	child: {
    		top: 734,
    		width: 360,
    		left: 0,
    		backgroundColor: "#2e7d32"
  	},
  	greet: {
    		top: 97,
    		width: 144,
    		height: 47,
    		left: 24,
    		position: "absolute"
  	},
  	hiAdmin: {
    		fontSize: 36,
    		textAlign: "left",
    		color: "#333",
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600",
    		top: 0,
    		left: 0,
    		position: "absolute"
  	},
  	headerIcon: {
    		height: 79,
    		top: 0,
    		position: "absolute"
  	},
  	rectangleParent: {
    		marginLeft: -156,
    		top: 144,
    		width: 325,
    		height: 46,
    		left: "50%",
    		position: "absolute"
  	},
  	groupChild: {
    		marginLeft: -163.5,
    		top: -1,
    		borderColor: "#d2d2d2",
    		borderWidth: 2,
    		width: 327,
    		height: 48,
    		borderStyle: "solid",
    		borderRadius: 20,
    		left: "50%",
    		position: "absolute"
  	},
  	search: {
    		top: 16,
    		left: 46,
    		fontFamily: "Roboto-Medium",
    		width: 56,
    		fontWeight: "500",
    		height: 18,
    		fontSize: 16,
    		textAlign: "left",
    		color: "#333",
    		position: "absolute"
  	},
  	vectorIcon: {
    		height: "38.26%",
    		width: "5.42%",
    		top: "34.78%",
    		right: "88.12%",
    		bottom: "26.96%",
    		left: "6.46%",
    		color: "#333",
    		position: "absolute"
  	},
  	ndBox: {
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
    		top: 380,
    		left: 24
  	},
  	ndBoxChild: {
    		height: 138,
    		width: 314,
    		position: "absolute"
  	},
  	dashboardAdmin1NdBox: {
    		top: 571,
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
    		left: 24
  	},
  	ndBox2: {
    		width: 90,
    		left: 30,
    		top: 221,
    		height: 82,
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)"
  	},
  	ndBoxInner: {
    		width: 90,
    		borderWidth: 1,
    		borderColor: "#fff",
    		backgroundColor: "#f0f0f0",
    		borderRadius: 10,
    		borderStyle: "solid",
    		top: 0,
    		left: 0
  	},
  	ndBox3: {
    		left: 135,
    		width: 203,
    		top: 221,
    		height: 82,
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)"
  	},
  	ndBox4: {
    		left: 113,
    		width: 90,
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
    		top: 0
  	},
  	recentViolation: {
    		top: 583,
    		left: 17,
    		width: 194,
    		height: 25,
    		color: "#000",
    		fontSize: 24,
    		textAlign: "left",
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600"
  	},
  	registeredRiders: {
    		top: 347,
    		width: 194,
    		height: 25,
    		color: "#000",
    		fontSize: 24,
    		textAlign: "left",
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600",
    		left: 24
  	},
  	activeUser: {
    		top: 238,
    		left: 45,
    		width: 63,
    		fontSize: 13,
    		height: 81,
    		color: "#000",
    		textAlign: "left",
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600"
  	},
  	unregistered: {
    		left: 144,
    		height: 17
  	},
  	newUser: {
    		left: 271,
    		height: 17
  	},
  	binanCitySeal3Icon: {
    		top: -2,
    		left: -11,
    		height: 192
  	},
  	me: {
    		top: 740,
    		left: 267,
    		width: 90
  	},
  	meChild: {
    		width: 90,
    		top: 0,
    		backgroundColor: "#2e7d32",
    		left: 0
  	},
  	dashboardAdmin1VectorIcon: {
    		height: "37.88%",
    		width: "27.78%",
    		top: "21.21%",
    		right: "36.67%",
    		bottom: "40.91%",
    		left: "35.56%",
    		color: "#f0f0f0",
    		position: "absolute"
  	},
  	dashboardAdmin1Me: {
    		left: 38
  	},
  	item: {
    		borderRadius: 30,
    		backgroundColor: "rgba(51, 51, 51, 0.7)",
    		top: 0,
    		position: "absolute",
    		height: 800
  	},
  	violationParent: {
    		top: -13,
    		left: -10,
    		width: 349,
    		height: 813,
    		position: "absolute"
  	},
  	violation: {
    		left: 100,
    		top: 747,
    		width: 90,
    		height: 66,
    		position: "absolute"
  	},
  	dashboardAdmin1Violation: {
    		left: 21
  	},
  	home: {
    		left: 10,
    		top: 747,
    		width: 90,
    		height: 66,
    		position: "absolute"
  	},
  	homeChild: {
    		backgroundColor: "#113e21",
    		width: 90,
    		top: 0,
    		left: 0
  	},
  	dashboardAdmin1Home: {
    		left: 30
  	},
  	news2: {
    		top: 625,
    		left: 65,
    		width: 222
  	},
  	newsUpdateHeadline: {
    		left: 1,
    		top: 0
  	},
  	someDetails: {
    		top: 24,
    		left: 1
  	},
  	sept9: {
    		top: 62,
    		left: 0
  	},
  	dashboardAdmin1Greet: {
    		top: 110,
    		left: 32,
    		width: 181,
    		height: 68,
    		position: "absolute"
  	},
  	hiJuan: {
    		left: 2,
    		color: "#333"
  	},
  	hi: {
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600"
  	},
  	quoteOrGreetings: {
    		fontSize: 20,
    		top: 44,
    		left: 0
  	},
  	header: {
    		height: "3.08%",
    		width: "90.54%",
    		top: "6.4%",
    		bottom: "90.53%",
    		left: "9.46%",
    		right: "0%",
    		position: "absolute"
  	},
  	vectorIcon4: {
    		height: "68%",
    		width: "5.7%",
    		top: "20%",
    		right: "94.3%",
    		bottom: "12%",
    		color: "#f0f0f0",
    		position: "absolute"
  	},
  	notification: {
    		height: "100%",
    		width: "7.91%",
    		bottom: "0%",
    		left: "92.09%"
  	},
  	vectorIcon5: {
    		height: "7.2%",
    		width: "17.6%",
    		top: "92.97%",
    		right: "41.22%",
    		bottom: "-0.17%",
    		left: "41.18%",
    		color: "#f0f0f0",
    		position: "absolute"
  	},
  	vectorIcon6: {
    		height: "89.6%",
    		bottom: "10.4%",
    		left: "0%",
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden",
    		color: "#f0f0f0",
    		width: "100%",
    		top: "0%"
  	},
  	aideParent: {
    		top: 46,
    		left: 136,
    		width: 98,
    		height: 39,
    		position: "absolute"
  	},
  	aide: {
    		left: 28,
    		color: "#fff",
    		fontSize: 30,
    		textAlign: "left",
    		top: 0,
    		position: "absolute"
  	},
  	transparentLogo1Icon: {
    		top: 5,
    		width: 28,
    		height: 28,
    		left: 0,
    		position: "absolute"
  	},
  	groupItem: {
    		backgroundColor: "#d9d9d9",
    		top: 13,
    		width: 262,
    		left: 10,
    		height: 800
  	},
  	groupInner: {
    		top: 13,
    		width: 262,
    		left: 10,
    		height: 192,
    		backgroundColor: "#2e7d32"
  	},
  	transparentLogo2Icon: {
    		top: 69,
    		left: 67,
    		width: 123,
    		height: 123,
    		position: "absolute"
  	},
  	binanCitySeal2Icon: {
    		height: 192,
    		top: 0,
    		left: 0
  	},
  	inner: {
    		left: 114,
    		width: 132,
    		height: 31,
    		borderRadius: 20,
    		top: 709
  	},
  	vectorIcon7: {
    		height: "2.38%",
    		width: "4.17%",
    		top: "89.38%",
    		right: "60%",
    		bottom: "8.25%",
    		left: "35.83%",
    		color: "#fff",
    		position: "absolute"
  	},
  	logout: {
    		left: 157
  	},
  	dashboardAdmin1Logout: {
    		width: 71,
    		height: 16,
    		color: "#fff",
    		fontSize: 24,
    		textAlign: "left",
    		fontFamily: "CrimsonText-SemiBold",
    		fontWeight: "600"
  	},
  	profile: {
    		top: 192,
    		left: 2,
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)"
  	},
  	profileChild: {
    		height: 86,
    		width: 260,
    		position: "absolute",
    		top: 0,
    		left: 0
  	},
  	juandelacruzgmailcom: {
    		left: 74,
    		width: 169,
    		height: 18,
    		fontSize: 16,
    		top: 44
  	},
  	dashboardAdmin1Text: {
    		width: 160,
    		height: 23,
    		left: 69,
    		top: 21
  	},
  	vectorIcon8: {
    		height: "54.32%",
    		width: "15.73%",
    		top: "22.83%",
    		right: "79.24%",
    		bottom: "22.84%",
    		left: "5.03%",
    		color: "#113e21",
    		position: "absolute"
  	},
  	logOutParent: {
    		top: 303,
    		width: 265,
    		height: 464,
    		left: 0,
    		position: "absolute"
  	},
  	logOut: {
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
    		top: 380
  	},
  	logOutChild: {
    		borderColor: "#2e7d32",
    		borderWidth: 1,
    		backgroundColor: "#f0f0f0",
    		borderRadius: 10,
    		borderStyle: "solid",
    		top: 0
  	},
  	securelyLogOut: {
    		top: 43,
    		left: 58,
    		width: 178,
    		height: 17
  	},
  	text2: {
    		left: 60,
    		width: 139,
    		top: 21
  	},
  	vectorIcon9: {
    		height: "27.2%",
    		width: "7.85%",
    		top: "31.53%",
    		right: "84.92%",
    		bottom: "41.28%",
    		left: "7.23%",
    		maxHeight: "100%",
    		maxWidth: "100%",
    		overflow: "hidden"
  	},
  	ndBox5: {
    		width: 264,
    		left: 1,
    		elevation: 4,
    		boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)"
  	},
  	ndBoxChild2: {
    		borderColor: "#2e7d32",
    		borderWidth: 1,
    		backgroundColor: "#f0f0f0",
    		borderRadius: 10,
    		borderStyle: "solid",
    		width: 260,
    		height: 345,
    		left: 0
  	},
  	weuiarrowFilledIcon: {
    		top: 212,
    		height: 24,
    		width: 12,
    		left: 233,
    		position: "absolute"
  	},
  	dashboardAdmin1WeuiarrowFilledIcon: {
    		top: 152
  	},
  	profileIcon: {
    		top: 1,
    		height: 56,
    		left: 2
  	},
  	weuiarrowFilledIcon2: {
    		top: 21
  	},
  	text3: {
    		top: 15,
    		left: 56,
    		width: 131
  	},
  	text4: {
    		top: 215,
    		width: 127,
    		left: 69
  	},
  	about: {
    		top: 96,
    		left: 22,
    		width: 104,
    		height: 27,
    		position: "absolute"
  	},
  	text5: {
    		left: 41,
    		width: 64,
    		top: 0
  	},
  	ixaboutIcon: {
    		top: 2,
    		width: 25,
    		left: 0
  	},
  	weuiarrowFilledIcon3: {
    		top: 94,
    		width: 13,
    		left: 233,
    		height: 25,
    		position: "absolute"
  	},
  	mdiaccountOutlineIcon: {
    		top: 321,
    		left: 19
  	},
  	materialSymbolssettingsOutlIcon: {
    		top: 518,
    		left: 29
  	},
  	termsOfService: {
    		height: "3.09%",
    		width: "56.94%",
    		top: "57.5%",
    		right: "36.94%",
    		bottom: "39.41%",
    		left: "6.11%",
    		position: "absolute"
  	},
  	vectorIcon10: {
    		height: "92.71%",
    		width: "12.73%",
    		top: "7.41%",
    		right: "87.27%",
    		bottom: "-0.12%",
    		color: "#000",
    		position: "absolute"
  	},
  	text6: {
    		left: 35,
    		width: 170,
    		top: 0
  	}
});

export default SidebarAdmin;
