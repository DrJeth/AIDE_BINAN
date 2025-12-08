import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import { app } from "../config/firebaseConfig";
import EditProfileModal from "./EditProfileModal";
import TermsService from "./TermsService";
import ContactUs from "./ContactUs";
// ⬇️ gamitin na si SettingRider imbes na Settings (admin)
import SettingsRider from "./SettingRider";

const DEFAULT_AVATAR = require("../../assets/me.png");

export default function Me({ navigation }) {
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    profileImage: null,
    contactNumber: "",
    address: ""
  });
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isContactUsModalVisible, setIsContactUsModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log("User Document Data:", userData);
            
            setUserData({
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              email: user.email || "No Email",
              profileImage: userData.profileImage || null,
              contactNumber: userData.contactNumber || "",
              address: userData.address || ""
            });
            
            const role = userData.role || "Rider";
            console.log("Detected Role:", role);
            setUserRole(role);
            
          } else {
            // Fallback: Search users collection by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0].data();
              
              setUserData({
                firstName: userDoc.firstName || "",
                lastName: userDoc.lastName || "",
                email: user.email || "No Email",
                profileImage: userDoc.profileImage || null,
                contactNumber: userDoc.contactNumber || "",
                address: userDoc.address || ""
              });
              
              const role = userDoc.role || "Rider";
              setUserRole(role);
              
            } else {
              setUserData({
                firstName: "Rider",
                lastName: "",
                email: user.email || "No Email",
                profileImage: null,
                contactNumber: "",
                address: ""
              });
              setUserRole("Rider");
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          Alert.alert("Error", "Could not fetch user data");
          setUserRole("Rider");
        } finally {
          setLoading(false);
        }
      } else {
        navigation.replace("Login");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  const onEditProfile = () => {
    console.log("Edit Profile Pressed - Role:", userRole);
    setIsEditModalVisible(true);
  };

  const onLogout = () => {
    const auth = getAuth(app);
    signOut(auth)
      .then(() => {
        navigation.replace("Login");
      })
      .catch((error) => {
        Alert.alert("Logout Error", error.message);
      });
  };

  const onDeleteAccount = () => {
    if (userRole === "Rider") {
      Alert.alert(
        "Restricted",
        "Riders are not allowed to delete their account.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const auth = getAuth(app);
              const db = getFirestore(app);
              const user = auth.currentUser;

              if (user) {
                await deleteDoc(doc(db, "users", user.uid));
                await user.delete();
                
                Alert.alert("Success", "Account deleted successfully");
                navigation.replace("Login");
              }
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };

  const getFullName = () => {
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    return fullName || "Rider";
  };

  const handleUpdateUser = (updatedData) => {
    console.log("User data updated:", updatedData);
    setUserData(prev => ({ ...prev, ...updatedData }));
    setIsEditModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  const isRider = userRole === "Rider";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with ◂ Back + centered Profile */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>◂ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarWrap}>
          <Image 
            source={
              userData.profileImage 
                ? { uri: userData.profileImage } 
                : DEFAULT_AVATAR
            } 
            style={styles.avatar} 
          />
          <Text style={styles.name}>{getFullName()}</Text>
          <Text style={styles.email}>{userData.email}</Text>
          {userRole && (
            <Text style={[styles.roleTag, isRider && styles.riderTag]}>
              {userRole}
            </Text>
          )}
        </View>

        {/* Account Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Account Details</Text>
          <View style={styles.row}>
            <Text style={styles.rowText}>Contact Number</Text>
            <Text style={styles.chev}>{userData.contactNumber || "Not Set"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowText}>Address</Text>
            <Text style={styles.chev}>{userData.address || "Not Set"}</Text>
          </View>
        </View>

        {/* Account Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Account</Text>
          <TouchableOpacity 
            onPress={onEditProfile}
            style={styles.row}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.rowText}>Edit Profile</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setIsTermsModalVisible(true)}
            style={styles.row}
          >
            <Text style={styles.rowText}>Terms of Service</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setIsContactUsModalVisible(true)}
            style={styles.row}
          >
            <Text style={styles.rowText}>Contact Us</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>App</Text>
          <TouchableOpacity
            onPress={() => setIsSettingsModalVisible(true)}
            style={styles.row}
          >
            <Text style={styles.rowText}>Settings</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>

          {/* Delete Account - Only for non-riders */}
          {!isRider && (
            <TouchableOpacity
              onPress={onDeleteAccount}
              style={[styles.row, styles.rowDanger]}
            >
              <Text style={[styles.rowText, styles.dangerText]}>Delete Account</Text>
              <Text style={[styles.chev, styles.dangerText]}>›</Text>
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity
            onPress={onLogout}
            style={[styles.row, styles.rowDanger]}
          >
            <Text style={[styles.rowText, styles.dangerText]}>Log Out</Text>
            <Text style={[styles.chev, styles.dangerText]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        userData={userData}
        userRole={userRole}
        onUpdateUser={handleUpdateUser}
      />

      {/* Terms of Service Modal */}
      <TermsService
        visible={isTermsModalVisible}
        onClose={() => setIsTermsModalVisible(false)}
      />

      {/* Contact Us Modal */}
      <ContactUs
        visible={isContactUsModalVisible}
        onClose={() => setIsContactUsModalVisible(false)}
      />

      {/* Settings Modal for Rider */}
      <SettingsRider
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        userName={getFullName()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  header: {
    height: 72,
    backgroundColor: "#2e7d32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",   // center si "Profile"
    paddingHorizontal: 16,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "700" 
  },
  content: { 
    padding: 16, 
    paddingBottom: 40 
  },
  
  // Avatar Section
  avatarWrap: { 
    alignItems: "center", 
    marginBottom: 18 
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#eee",
  },
  name: { 
    marginTop: 12, 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#113e21" 
  },
  email: { 
    marginTop: 4, 
    color: "#666" 
  },
  roleTag: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#2e7d32",
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    borderRadius: 12,
  },
  riderTag: {
    backgroundColor: "#1565c0",
  },
  
  // Card Styles
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  cardLabel: {
    fontWeight: "700",
    fontSize: 16,
    color: "#113e21",
    marginBottom: 8,
  },
  
  // Row Styles
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  rowText: { 
    fontSize: 15, 
    color: "#333" 
  },
  chev: { 
    fontSize: 18, 
    color: "#9e9e9e" 
  },
  
  // Danger Styles
  rowDanger: { 
    borderTopColor: "#f7dede" 
  },
  dangerText: { 
    color: "#c21a1a" 
  },
});
