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
  getDocs
} from "firebase/firestore";
import { app } from "../config/firebaseConfig";
import EditProfileModal from "./EditProfileModal";
import TermsService from "./TermsService";
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
  const [userRoleLabel, setUserRoleLabel] = useState(""); // ADDED for display label
  const [userDocId, setUserDocId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  // build role label using Firestore field adminTaskRole
  // adminTaskRole values expected: "processing" | "validator" | "inspector"
  const buildRoleLabel = (data) => {
    const adminTask = (data?.adminTaskRole || "").toString().trim(); // ✅ IMPORTANT FIELD
    const rawRole = (data?.role || (adminTask ? "Admin" : "Rider")).toString().trim();

    // If not admin, show role as-is
    if (rawRole.toLowerCase() !== "admin") return rawRole;

    const typeRaw = adminTask.toLowerCase();

    const typeMap = {
      processing: "Processing",
      validator: "Validator",
      inspector: "Inspector"
    };

    const type = typeMap[typeRaw] || "";

    return type
      ? `Admin - ${type} of E-Bike Registration`
      : "Admin - E-Bike Registration";
  };

  useEffect(() => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const usersRef = collection(db, "users");

          // 1) Try doc with ID = uid
          const userDocRef = doc(usersRef, user.uid);
          const userDocSnap = await getDoc(userDocRef);

          let finalData = null;
          let finalDocId = null;

          if (userDocSnap.exists() && userDocSnap.data()) {
            finalData = userDocSnap.data();
            finalDocId = userDocSnap.id;
          }

          // 2) If missing/no role, find by email and choose doc with role/adminTaskRole
          if (!finalData || (!finalData.role && !finalData.adminTaskRole)) {
            const q = query(usersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              // PRIORITY: choose document that has adminTaskRole (best indicator of admin type)
              const docWithAdminTaskRole = querySnapshot.docs.find(d => {
                const dt = d.data() || {};
                return !!dt.adminTaskRole;
              });

              const docWithRole = querySnapshot.docs.find(d => !!(d.data() || {}).role);
              const chosenDoc = docWithAdminTaskRole || docWithRole || querySnapshot.docs[0];

              finalData = chosenDoc.data();
              finalDocId = chosenDoc.id;
            }
          }

          if (finalData) {
            const resolvedEmail = finalData.email || user.email || "No Email";

            setUserData({
              firstName: finalData.firstName || "",
              lastName: finalData.lastName || "",
              email: resolvedEmail,
              profileImage: finalData.profileImage || null,
              contactNumber: finalData.contactNumber || "",
              address: finalData.address || ""
            });

            // role fallback: if adminTaskRole exists, treat as Admin
            const role = finalData.role || (finalData.adminTaskRole ? "Admin" : "Rider");
            setUserRole(role);

            // label uses adminTaskRole
            setUserRoleLabel(buildRoleLabel({ ...finalData, role }));

            setUserDocId(finalDocId || user.uid);
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
            setUserRoleLabel("Rider");
            setUserDocId(user.uid);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          Alert.alert("Error", "Could not fetch user data");
          setUserRole("Rider");
          setUserRoleLabel("Rider");
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
    setIsEditModalVisible(true);
  };

  const onLogout = () => {
    const auth = getAuth(app);
    signOut(auth)
      .then(() => navigation.replace("Login"))
      .catch((error) => Alert.alert("Logout Error", error.message));
  };

  const getFullName = () => {
    const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
    return fullName || "Rider";
  };

  const handleUpdateUser = (updatedData) => {
    setUserData(prev => ({ ...prev, ...updatedData }));

    // update role too (supports role/adminTaskRole updates)
    const role = updatedData.role || userRole || (updatedData.adminTaskRole ? "Admin" : "Rider");
    if (updatedData.role) setUserRole(updatedData.role);
    else if (updatedData.adminTaskRole && userRole !== "Admin") setUserRole("Admin");

    // rebuild label after update
    const merged = { ...userData, ...updatedData, role };
    setUserRoleLabel(buildRoleLabel(merged));

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
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>◂</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          <View style={styles.headerSide} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarWrap}>
            <Image
              source={userData.profileImage ? { uri: userData.profileImage } : DEFAULT_AVATAR}
              style={styles.avatar}
            />
            <Text style={styles.name}>{getFullName()}</Text>
            <Text style={styles.email}>{userData.email}</Text>

            {!!userRoleLabel && (
              <Text style={[styles.roleTag, isRider && styles.riderTag]}>
                {userRoleLabel}
              </Text>
            )}
          </View>

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

            <TouchableOpacity onPress={() => setIsTermsModalVisible(true)} style={styles.row}>
              <Text style={styles.rowText}>Terms of Service</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>


          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>App</Text>

            <TouchableOpacity onPress={() => setIsSettingsModalVisible(true)} style={styles.row}>
              <Text style={styles.rowText}>Settings</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>

            {/* Delete Account REMOVED for BOTH Rider and Admin */}

            <TouchableOpacity onPress={onLogout} style={[styles.row, styles.rowDanger]}>
              <Text style={[styles.rowText, styles.dangerText]}>Log Out</Text>
              <Text style={[styles.chev, styles.dangerText]}>›</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#2e7d32"
  },
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 10,
    backgroundColor: "#2e7d32",
    borderBottomWidth: 1,
    borderBottomColor: "#2e7d32"
  },
  headerSide: {
    width: 80,
    justifyContent: "center"
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4
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
    fontWeight: "700"
  },

  content: {
    padding: 16,
    paddingBottom: 40
  },

  avatarWrap: {
    alignItems: "center",
    marginBottom: 18
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#eee"
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
    textAlign: "center"
  },
  riderTag: {
    backgroundColor: "#1565c0"
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2
  },
  cardLabel: {
    fontWeight: "700",
    fontSize: 16,
    color: "#113e21",
    marginBottom: 8
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0"
  },
  rowText: {
    fontSize: 15,
    color: "#333"
  },
  chev: {
    fontSize: 18,
    color: "#9e9e9e"
  },

  rowDanger: {
    borderTopColor: "#f7dede"
  },
  dangerText: {
    color: "#c21a1a"
  }
});
