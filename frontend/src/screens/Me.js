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
  const [userDocId, setUserDocId] = useState(null);
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
          const usersRef = collection(db, "users");

          // 1) Try doc na may ID = uid
          const userDocRef = doc(usersRef, user.uid);
          const userDocSnap = await getDoc(userDocRef);

          let finalData = null;
          let finalDocId = null;

          if (userDocSnap.exists() && userDocSnap.data()) {
            finalData = userDocSnap.data();
            finalDocId = userDocSnap.id;
          }

          // 2) Kung wala / walang role, hanap by email, piliin may role
          if (!finalData || !finalData.role) {
            const q = query(usersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const docWithRole = querySnapshot.docs.find(d => !!d.data().role);
              const chosenDoc = docWithRole || querySnapshot.docs[0];

              finalData = chosenDoc.data();
              finalDocId = chosenDoc.id;
            }
          }

          if (finalData) {
            console.log("User Document Data:", finalData);

            setUserData({
              firstName: finalData.firstName || "",
              lastName: finalData.lastName || "",
              email: user.email || "No Email",
              profileImage: finalData.profileImage || null,
              contactNumber: finalData.contactNumber || "",
              address: finalData.address || ""
            });

            const role = finalData.role || "Rider";
            console.log("Detected Role:", role);
            setUserRole(role);
            setUserDocId(finalDocId);
          } else {
            // No doc sa Firestore → treat as Rider
            setUserData({
              firstName: "Rider",
              lastName: "",
              email: user.email || "No Email",
              profileImage: null,
              contactNumber: "",
              address: ""
            });
            setUserRole("Rider");
            setUserDocId(user.uid);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          Alert.alert("Error", "Could not fetch user data");
          setUserRole("Rider");
          setUserDocId(user?.uid ?? null);
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

    if (updatedData.role) {
      setUserRole(updatedData.role);
    }

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ✅ Full green header: Back left, Profile centered */}
        <View style={styles.header}>
          {/* Left side: Back */}
          <View style={styles.headerSide}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backArrow}>◂</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Center: Title */}
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* Right side: empty placeholder para tunay na center si Profile */}
          <View style={styles.headerSide} />
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

            {!isRider && (
              <TouchableOpacity
                onPress={onDeleteAccount}
                style={[styles.row, styles.rowDanger]}
              >
                <Text style={[styles.rowText, styles.dangerText]}>Delete Account</Text>
                <Text style={[styles.chev, styles.dangerText]}>›</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onLogout}
              style={[styles.row, styles.rowDanger]}
            >
              <Text style={[styles.rowText, styles.dangerText]}>Log Out</Text>
              <Text style={[styles.chev, styles.dangerText]}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modals */}
        <EditProfileModal
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          userData={userData}
          userRole={userRole}
          userDocId={userDocId}
          onUpdateUser={handleUpdateUser}
        />

        <TermsService
          visible={isTermsModalVisible}
          onClose={() => setIsTermsModalVisible(false)}
        />

        <ContactUs
          visible={isContactUsModalVisible}
          onClose={() => setIsContactUsModalVisible(false)}
        />

        <SettingsRider
          visible={isSettingsModalVisible}
          onClose={() => setIsSettingsModalVisible(false)}
          userName={getFullName()}
        />
      </View>
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
  // para full green hanggang status bar
  safeArea: {
    flex: 1,
    backgroundColor: '#2e7d32'
  },
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },

  // 🔹 HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,         // layo sa oras/notif
    paddingBottom: 10,
    backgroundColor: "#2e7d32",
    borderBottomWidth: 1,
    borderBottomColor: "#2e7d32",
  },
  headerSide: {
    width: 80,              // fixed width para sa Back at placeholder
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  backArrow: {
    color: "#FFFFFF",
    fontSize: 16,
    marginRight: 4
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600"
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "700",
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
