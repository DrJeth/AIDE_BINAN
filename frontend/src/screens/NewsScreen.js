// frontend/src/screens/NewsScreen.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  BackHandler
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  setDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../config/firebaseConfig";
import { useFocusEffect } from "@react-navigation/native";

// Design-matched color palette from HomeAdmin
const COLORS = {
  PRIMARY_GREEN: "#2E7D32",
  BACKGROUND_WHITE: "#FFFFFF",
  TEXT_DARK: "#2C3E50",
  TEXT_LIGHT: "#7F8C8D",
  ICON_GREEN: "#2E7D32",
  BOTTOM_BAR_GREEN: "#2E7D32"
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ✅ modal width/height (bigger + not sagad)
const VIEW_MODAL_W = Math.min(460, SCREEN_WIDTH - 24);
const MODAL_H = Math.min(740, SCREEN_HEIGHT * 0.86);

// ✅ adaptive input clamps
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const TITLE_MIN = 56;
const TITLE_MAX = 110;
const DESC_MIN = 190;
const DESC_MAX = 360;

// ✅ Fix: Android sometimes doesn't fire onContentSizeChange on initial mount (prefilled text)
// so we estimate a safe starting height to prevent “glitch” (cannot scroll / cut text).
const estimateHeight = (text, minH, maxH, charsPerLine = 28, lineH = 22) => {
  const s = String(text || "");
  const lines = Math.max(1, Math.ceil(s.length / charsPerLine));
  const h = minH + (lines - 1) * lineH;
  return clamp(h, minH, maxH);
};

// ✅ Default ordinances (used as fallback + merge base)
const DEFAULT_ORDINANCES = [
  {
    id: 1,
    section: "Section 1",
    title: "Electrical Vehicle Registration Ordinance in the City Of Binan",
    description: ""
  },
  { id: 2, section: "Section 2", title: "Purpose and Scope", description: "" },
  { id: 3, section: "Section 3/4", title: "Definition of Terms", description: "" },
  {
    id: 4,
    section: "Section 5",
    title: "Requirement for Registration of Electric Vehicles",
    description: ""
  },
  { id: 5, section: "Section 6", title: "Imposition of Fee", description: "" },

  {
    id: 6,
    section: "Section 7",
    title: "Time of payment",
    description:
      "The fee imposed herein shall be due and payable to the City Treasurer's Office within the first twenty (20) days of January every year. For all the electric vehicles under Section 4 acquired after January 20, the permit fee shall be paid without penalty within the first twenty (20) days following its acquisition."
  },

  { id: 7, section: "Section 8", title: "Administrative Provision", description: "" },
  { id: 8, section: "Section 9", title: "Penalty", description: "" },

  {
    id: 9,
    section: "Section 10",
    title: "Appropriation",
    description:
      "The City Government shall appropriate Two Hundred Thousand Pesos (Php200,000.00) from the Annual Budget of the Binan Tricycle Franchising and Regulatory Board (BTFRB) Office and other sources that may be tapped or appropriated from concerned agencies and from all other sources of funds that might be available for the implementation of the same."
  },

  {
    id: 10,
    section: "Section 11",
    title: "Separability Clause",
    description:
      "If for any reason any section or provision of this Ordinance is declared unconstitutional or invalid, the other sections or provisions hereof which are not affected thereby shall continue to be in full force and effect."
  },

  {
    id: 11,
    section: "Section 12",
    title: "Repealing Clause",
    description:
      "All Ordinances, local issuances or rules inconsistent with the provisions of this Ordinance are hereby repealed or modified accordingly."
  },

  {
    id: 12,
    section: "Section 13",
    title: "Effectivity Clause",
    description:
      "This Ordinance shall take effect upon approval and after publication in the newspapers of general circulation. UNANIMOUSLY APPROVED."
  }
];

export default function NewsScreen({ navigation, route }) {
  // ✅ get adminTask from navigation params (passed from HomeAdmin/Login)
  const adminTask = (route?.params?.adminTask || "processing").toLowerCase().trim();

  // ✅ tabs
  const [activeTab, setActiveTab] = useState("announcements"); // "announcements" | "ordinances"

  // =========================
  // ANNOUNCEMENTS (existing)
  // =========================
  const [announcements, setAnnouncements] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ View / Edit modal states
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editAnnouncement, setEditAnnouncement] = useState({
    title: "",
    description: "",
    type: "E-bike update"
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    description: "",
    type: "E-bike update"
  });

  // ✅ adaptive heights (Create)
  const [createTitleH, setCreateTitleH] = useState(TITLE_MIN);
  const [createDescH, setCreateDescH] = useState(DESC_MIN);

  // ✅ adaptive heights (Edit)
  const [editTitleH, setEditTitleH] = useState(TITLE_MIN);
  const [editDescH, setEditDescH] = useState(DESC_MIN);

  // =========================
  // ORDINANCES (new)
  // =========================
  const [ordinances, setOrdinances] = useState(DEFAULT_ORDINANCES);
  const [ordinanceViewModalVisible, setOrdinanceViewModalVisible] = useState(false);
  const [selectedOrdinance, setSelectedOrdinance] = useState(null);
  const [isEditingOrdinance, setIsEditingOrdinance] = useState(false);

  const [editOrdinance, setEditOrdinance] = useState({
    id: null,
    section: "",
    title: "",
    description: ""
  });

  const [ordTitleH, setOrdTitleH] = useState(TITLE_MIN);
  const [ordDescH, setOrdDescH] = useState(DESC_MIN);

  // ✅ auth user
  const auth = getAuth();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsubAuth();
  }, [auth]);

  const currentUid = user?.uid || null;
  const currentEmail = user?.email || null;

  // =========================
  // ANNOUNCEMENTS LISTENER
  // =========================
  useEffect(() => {
    const announcementsRef = collection(db, "announcements");
    const q = query(announcementsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const announcementsList = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setAnnouncements(announcementsList);
    });

    return () => unsubscribe();
  }, []);

  // =========================
  // ORDINANCES LISTENER (reflects Rider app)
  // Firestore: collection "ordinance", docs "1".."12"
  // =========================
  useEffect(() => {
    const colRef = collection(db, "ordinance");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          map[String(d.id)] = d.data();
        });

        const merged = DEFAULT_ORDINANCES.map((base) => {
          const saved = map[String(base.id)];
          if (!saved) return base;

          return {
            ...base,
            section: typeof saved.section === "string" ? saved.section : base.section,
            title: typeof saved.title === "string" ? saved.title : base.title,
            description:
              typeof saved.description === "string"
                ? saved.description
                : base.description || "",
            updatedAt: saved.updatedAt || null,
            updatedBy: saved.updatedBy || null,
            updatedByEmail: saved.updatedByEmail || null
          };
        });

        setOrdinances(merged);
      },
      () => {
        // offline / rules block => keep defaults
        setOrdinances(DEFAULT_ORDINANCES);
      }
    );

    return () => unsub();
  }, []);

  // ✅ ALWAYS back to HomeAdmin (and also handle Android hardware back)
  const goHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: "HomeAdmin", params: { adminTask } }]
    });
  }, [navigation, adminTask]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        goHome();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [goHome])
  );

  // =========================
  // ANNOUNCEMENTS CRUD
  // =========================
  const handleCreateAnnouncement = async () => {
    if (!currentUid) {
      Alert.alert("Not Logged In", "Please login again, then try posting.");
      return;
    }

    if (!newAnnouncement.title.trim()) {
      Alert.alert("Error", "Please enter an announcement title");
      return;
    }

    try {
      const announcementsRef = collection(db, "announcements");
      await addDoc(announcementsRef, {
        ...newAnnouncement,
        createdAt: serverTimestamp(),
        createdBy: currentUid,
        createdByEmail: currentEmail
      });

      setNewAnnouncement({ title: "", description: "", type: "E-bike update" });
      setCreateTitleH(TITLE_MIN);
      setCreateDescH(DESC_MIN);
      setModalVisible(false);
    } catch (error) {
      console.error("Error creating announcement: ", error);
      Alert.alert("Error", "Could not create announcement");
    }
  };

  const handleDeleteAnnouncement = (announcementId) => {
    Alert.alert("Delete Announcement", "Are you sure you want to delete this announcement?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "announcements", announcementId));
          } catch (error) {
            console.error("Error deleting announcement:", error);
            Alert.alert("Error", "Could not delete announcement");
          }
        }
      }
    ]);
  };

  const openAnnouncement = (item) => {
    setSelectedAnnouncement(item);
    setIsEditing(false);

    const title = item?.title || "";
    const desc = item?.description || "";

    setEditAnnouncement({
      title,
      description: desc,
      type: item?.type || "E-bike update"
    });

    setEditTitleH(TITLE_MIN);
    setEditDescH(DESC_MIN);

    setViewModalVisible(true);
  };

  const closeViewModal = () => {
    setViewModalVisible(false);
    setSelectedAnnouncement(null);
    setIsEditing(false);
  };

  // ✅ ALL ADMINS can edit ANY post (as long as logged in)
  const canEditSelected = !!currentUid;

  const handleSaveEdit = async () => {
    if (!currentUid) {
      Alert.alert("Not Logged In", "Please login again, then try editing.");
      return;
    }
    if (!selectedAnnouncement?.id) return;

    if (!editAnnouncement.title.trim()) {
      Alert.alert("Error", "Please enter an announcement title");
      return;
    }

    try {
      await updateDoc(doc(db, "announcements", selectedAnnouncement.id), {
        title: editAnnouncement.title,
        description: editAnnouncement.description,
        type: editAnnouncement.type,
        updatedAt: serverTimestamp(),
        updatedBy: currentUid,
        updatedByEmail: currentEmail
      });

      setSelectedAnnouncement((prev) => ({
        ...prev,
        title: editAnnouncement.title,
        description: editAnnouncement.description,
        type: editAnnouncement.type
      }));

      setIsEditing(false);
      Alert.alert("Success", "Announcement updated successfully");
    } catch (error) {
      console.error("Error updating announcement:", error);
      const msg = String(error?.message || "");
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient")) {
        Alert.alert(
          "Permission Denied",
          "Your Firestore rules are blocking updates. Update your rules to allow admin updates."
        );
      } else {
        Alert.alert("Error", "Could not update announcement");
      }
    }
  };

  // =========================
  // ORDINANCES EDIT (reflect Rider app)
  // =========================
  const openOrdinance = (item) => {
    const ord = {
      id: item?.id ?? null,
      section: item?.section || "",
      title: item?.title || "",
      description: item?.description || ""
    };

    setSelectedOrdinance(item);
    setIsEditingOrdinance(false);
    setEditOrdinance(ord);

    // ✅ FIX: set good initial height for prefilled text (prevents glitch)
    setOrdTitleH(estimateHeight(ord.title, TITLE_MIN, TITLE_MAX, 22, 22));
    setOrdDescH(estimateHeight(ord.description, DESC_MIN, DESC_MAX, 36, 22));

    setOrdinanceViewModalVisible(true);
  };

  const closeOrdinanceModal = () => {
    setOrdinanceViewModalVisible(false);
    setSelectedOrdinance(null);
    setIsEditingOrdinance(false);
  };

  const handleSaveOrdinance = async () => {
    if (!currentUid) {
      Alert.alert("Not Logged In", "Please login again, then try editing ordinances.");
      return;
    }
    if (!editOrdinance?.id) return;

    if (!String(editOrdinance.section || "").trim()) {
      Alert.alert("Error", "Section is required.");
      return;
    }
    if (!String(editOrdinance.title || "").trim()) {
      Alert.alert("Error", "Title is required.");
      return;
    }

    try {
      const docId = String(editOrdinance.id);

      // ✅ setDoc with merge so it works even if the doc doesn't exist yet
      await setDoc(
        doc(db, "ordinance", docId),
        {
          section: editOrdinance.section,
          title: editOrdinance.title,
          description: editOrdinance.description || "",
          updatedAt: serverTimestamp(),
          updatedBy: currentUid,
          updatedByEmail: currentEmail
        },
        { merge: true }
      );

      // local UI update (listener will also update, but this avoids delay)
      setSelectedOrdinance((prev) =>
        prev
          ? {
              ...prev,
              section: editOrdinance.section,
              title: editOrdinance.title,
              description: editOrdinance.description || ""
            }
          : prev
      );

      setIsEditingOrdinance(false);
      Alert.alert("Success", "Ordinance updated successfully. Riders will see the update.");
    } catch (error) {
      console.error("Error updating ordinance:", error);
      const msg = String(error?.message || "");
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient")) {
        Alert.alert(
          "Permission Denied",
          "Your Firestore rules are blocking ordinance updates. Allow Super Admin/Admin updates to collection: ordinance."
        );
      } else {
        Alert.alert("Error", "Could not update ordinance.");
      }
    }
  };

  const formatDate = (ts) => {
    try {
      if (!ts) return "";
      if (typeof ts?.toDate === "function") return ts.toDate().toLocaleString();
      return "";
    } catch {
      return "";
    }
  };

  // =========================
  // RENDERERS
  // =========================
  const renderAnnouncementItem = ({ item }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={() => openAnnouncement(item)} style={{ marginBottom: 15 }}>
      <View style={styles.announcementCard}>
        <View style={styles.announcementHeader}>
          <Text style={styles.announcementTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.announcementType}>{item.type}</Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e?.stopPropagation?.();
              handleDeleteAnnouncement(item.id);
            }}
          >
            <Feather name="trash-2" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={styles.announcementDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderOrdinanceItem = ({ item }) => {
    const hasDesc = !!String(item?.description || "").trim();
    const preview = hasDesc
      ? String(item.description).trim().slice(0, 120) + (String(item.description).trim().length > 120 ? "…" : "")
      : "No posted text yet.";

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => openOrdinance(item)} style={{ marginBottom: 15 }}>
        <View style={styles.ordinanceCard}>
          <View style={styles.ordinanceHeaderRow}>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>{item.section}</Text>
            </View>

            <View style={styles.editPill}>
              <Feather name="edit-2" size={14} color={COLORS.PRIMARY_GREEN} />
              <Text style={styles.editPillText}>Edit</Text>
            </View>
          </View>

          <Text style={styles.ordinanceTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.ordinancePreview} numberOfLines={3}>
            {preview}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const headerRight = useMemo(() => {
    // announcements => + button (create)
    if (activeTab === "announcements") {
      return (
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Feather name="plus-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      );
    }
    // ordinances => no create, just a spacer to keep title centered
    return <View style={{ width: 32 }} />;
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ✅ Green header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goHome} style={styles.backButton}>
            <Text style={styles.backArrow}>◂</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {activeTab === "announcements" ? "News & Announcements" : "Ordinances"}
          </Text>

          {headerRight}
        </View>

        {/* ✅ Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setActiveTab("announcements")}
            style={[styles.tabBtn, activeTab === "announcements" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === "announcements" && styles.tabTextActive]}>
              Announcements
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setActiveTab("ordinances")}
            style={[styles.tabBtn, activeTab === "ordinances" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === "ordinances" && styles.tabTextActive]}>
              Ordinances
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* =========================
              TAB: ANNOUNCEMENTS
          ========================= */}
          {activeTab === "announcements" ? (
            announcements.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No announcements yet</Text>
              </View>
            ) : (
              <FlatList
                data={announcements}
                renderItem={renderAnnouncementItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )
          ) : null}

          {/* =========================
              TAB: ORDINANCES
          ========================= */}
          {activeTab === "ordinances" ? (
            <View>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Sync with Rider App</Text>
                <Text style={styles.infoText}>
                  Editing here updates Firestore collection <Text style={styles.infoBold}>ordinance</Text> (docs{" "}
                  <Text style={styles.infoBold}>1–12</Text>). Riders will see changes immediately.
                </Text>
              </View>

              <FlatList
                data={ordinances}
                renderItem={renderOrdinanceItem}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
              />
            </View>
          ) : null}
        </ScrollView>

        {/* =========================
            CREATE ANNOUNCEMENT MODAL
        ========================= */}
        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ width: "100%", alignItems: "center" }}
            >
              <View style={styles.modalContentLarge}>
                <Text style={styles.modalTitle}>Create Announcement</Text>

                <ScrollView
                  style={styles.modalFormScroll}
                  contentContainerStyle={styles.modalFormScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <TextInput
                    placeholder="Announcement Title"
                    placeholderTextColor={COLORS.TEXT_LIGHT}
                    style={[
                      styles.input,
                      styles.titleInput,
                      { height: clamp(createTitleH, TITLE_MIN, TITLE_MAX) }
                    ]}
                    multiline
                    textAlignVertical="top"
                    value={newAnnouncement.title}
                    onChangeText={(text) => setNewAnnouncement((prev) => ({ ...prev, title: text }))}
                    onContentSizeChange={(e) => setCreateTitleH(e.nativeEvent.contentSize.height + 18)}
                    scrollEnabled={true}
                  />

                  <TextInput
                    placeholder="Description (Optional)"
                    placeholderTextColor={COLORS.TEXT_LIGHT}
                    style={[
                      styles.input,
                      styles.descInput,
                      { height: clamp(createDescH, DESC_MIN, DESC_MAX) }
                    ]}
                    multiline
                    textAlignVertical="top"
                    value={newAnnouncement.description}
                    onChangeText={(text) =>
                      setNewAnnouncement((prev) => ({ ...prev, description: text }))
                    }
                    onContentSizeChange={(e) => setCreateDescH(e.nativeEvent.contentSize.height + 18)}
                    scrollEnabled={true}
                  />

                  <View style={styles.typeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newAnnouncement.type === "E-bike update" && styles.selectedType
                      ]}
                      onPress={() => setNewAnnouncement((prev) => ({ ...prev, type: "E-bike update" }))}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newAnnouncement.type === "E-bike update" && styles.selectedTypeText
                        ]}
                      >
                        E-bike Update
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newAnnouncement.type === "Register Now" && styles.selectedType
                      ]}
                      onPress={() => setNewAnnouncement((prev) => ({ ...prev, type: "Register Now" }))}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newAnnouncement.type === "Register Now" && styles.selectedTypeText
                        ]}
                      >
                        Register Now
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 6 }} />
                </ScrollView>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.postButton} onPress={handleCreateAnnouncement}>
                    <Text style={styles.postButtonText}>Post</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* =========================
            VIEW / EDIT ANNOUNCEMENT MODAL
        ========================= */}
        <Modal animationType="fade" transparent visible={viewModalVisible} onRequestClose={closeViewModal}>
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ width: "100%", alignItems: "center" }}
            >
              {!isEditing ? (
                <View style={styles.viewModalContent}>
                  <View style={styles.viewHeaderRow}>
                    <Text style={styles.viewModalTitle}>View Announcement</Text>

                    <TouchableOpacity onPress={closeViewModal} style={styles.closeX}>
                      <Feather name="x" size={22} color={COLORS.TEXT_DARK} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.viewScroll}
                    contentContainerStyle={styles.viewScrollContent}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.viewLabel}>Title</Text>
                    <Text style={styles.viewValue}>{selectedAnnouncement?.title || "-"}</Text>

                    <Text style={styles.viewLabel}>Type</Text>
                    <Text style={styles.viewValue}>{selectedAnnouncement?.type || "-"}</Text>

                    {selectedAnnouncement?.description ? (
                      <>
                        <Text style={styles.viewLabel}>Description</Text>
                        <Text style={[styles.viewValue, styles.viewDescription]}>
                          {selectedAnnouncement.description}
                        </Text>
                      </>
                    ) : null}

                    {selectedAnnouncement?.createdAt ? (
                      <Text style={styles.viewMeta}>Posted: {formatDate(selectedAnnouncement.createdAt)}</Text>
                    ) : null}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      if (!canEditSelected) {
                        Alert.alert("Not Allowed", "Please login again.");
                        return;
                      }
                      setIsEditing(true);
                    }}
                  >
                    <Feather name="edit-2" size={16} color="#fff" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalContentLarge}>
                  <Text style={styles.modalTitle}>Edit Announcement</Text>

                  <ScrollView
                    style={styles.modalFormScroll}
                    contentContainerStyle={styles.modalFormScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <TextInput
                      placeholder="Announcement Title"
                      placeholderTextColor={COLORS.TEXT_LIGHT}
                      style={[
                        styles.input,
                        styles.titleInput,
                        { height: clamp(editTitleH, TITLE_MIN, TITLE_MAX) }
                      ]}
                      multiline
                      textAlignVertical="top"
                      value={editAnnouncement.title}
                      onChangeText={(text) => setEditAnnouncement((prev) => ({ ...prev, title: text }))}
                      onContentSizeChange={(e) => setEditTitleH(e.nativeEvent.contentSize.height + 18)}
                      scrollEnabled={true}
                    />

                    <TextInput
                      placeholder="Description (Optional)"
                      placeholderTextColor={COLORS.TEXT_LIGHT}
                      style={[
                        styles.input,
                        styles.descInput,
                        { height: clamp(editDescH, DESC_MIN, DESC_MAX) }
                      ]}
                      multiline
                      textAlignVertical="top"
                      value={editAnnouncement.description}
                      onChangeText={(text) =>
                        setEditAnnouncement((prev) => ({ ...prev, description: text }))
                      }
                      onContentSizeChange={(e) => setEditDescH(e.nativeEvent.contentSize.height + 18)}
                      scrollEnabled={true}
                    />

                    <View style={styles.typeContainer}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          editAnnouncement.type === "E-bike update" && styles.selectedType
                        ]}
                        onPress={() => setEditAnnouncement((prev) => ({ ...prev, type: "E-bike update" }))}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            editAnnouncement.type === "E-bike update" && styles.selectedTypeText
                          ]}
                        >
                          E-bike Update
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          editAnnouncement.type === "Register Now" && styles.selectedType
                        ]}
                        onPress={() => setEditAnnouncement((prev) => ({ ...prev, type: "Register Now" }))}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            editAnnouncement.type === "Register Now" && styles.selectedTypeText
                          ]}
                        >
                          Register Now
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ height: 6 }} />
                  </ScrollView>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setIsEditing(false);
                        setEditAnnouncement({
                          title: selectedAnnouncement?.title || "",
                          description: selectedAnnouncement?.description || "",
                          type: selectedAnnouncement?.type || "E-bike update"
                        });
                        setEditTitleH(TITLE_MIN);
                        setEditDescH(DESC_MIN);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.postButton} onPress={handleSaveEdit}>
                      <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* =========================
            VIEW / EDIT ORDINANCE MODAL (GLITCH-FIXED)
        ========================= */}
        <Modal
          animationType="fade"
          transparent
          visible={ordinanceViewModalVisible}
          onRequestClose={closeOrdinanceModal}
        >
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ width: "100%", alignItems: "center" }}
            >
              {!isEditingOrdinance ? (
                <View
                  key={String(selectedOrdinance?.id || "ord")}
                  style={styles.viewModalContent}
                >
                  <View style={styles.viewHeaderRow}>
                    <Text style={styles.viewModalTitle}>View Ordinance</Text>

                    <TouchableOpacity onPress={closeOrdinanceModal} style={styles.closeX}>
                      <Feather name="x" size={22} color={COLORS.TEXT_DARK} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.viewScroll}
                    contentContainerStyle={styles.viewScrollContent}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.viewLabel}>Section</Text>
                    <Text style={styles.viewValue}>{selectedOrdinance?.section || "-"}</Text>

                    <Text style={styles.viewLabel}>Title</Text>
                    <Text style={styles.viewValue}>{selectedOrdinance?.title || "-"}</Text>

                    <Text style={styles.viewLabel}>Ordinance Text</Text>
                    {/* ✅ FIXED JSX (no more “glitch text”) */}
                    <Text style={[styles.viewValue, styles.viewDescription]}>
                      {String(selectedOrdinance?.description || "").trim()
                        ? selectedOrdinance?.description
                        : "—"}
                    </Text>

                    {selectedOrdinance?.updatedAt ? (
                      <Text style={styles.viewMeta}>
                        Updated: {formatDate(selectedOrdinance.updatedAt)}
                      </Text>
                    ) : null}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      if (!currentUid) {
                        Alert.alert("Not Allowed", "Please login again.");
                        return;
                      }
                      // refresh edit fields from selected
                      const ord = {
                        id: selectedOrdinance?.id ?? null,
                        section: selectedOrdinance?.section || "",
                        title: selectedOrdinance?.title || "",
                        description: selectedOrdinance?.description || ""
                      };
                      setEditOrdinance(ord);
                      setOrdTitleH(estimateHeight(ord.title, TITLE_MIN, TITLE_MAX, 22, 22));
                      setOrdDescH(estimateHeight(ord.description, DESC_MIN, DESC_MAX, 36, 22));
                      setIsEditingOrdinance(true);
                    }}
                  >
                    <Feather name="edit-2" size={16} color="#fff" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  key={String(selectedOrdinance?.id || "ordEdit")}
                  style={styles.modalContentLarge}
                >
                  <Text style={styles.modalTitle}>Edit Ordinance</Text>

                  <ScrollView
                    style={styles.modalFormScroll}
                    contentContainerStyle={styles.modalFormScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <TextInput
                      placeholder="Section (e.g., Section 7)"
                      placeholderTextColor={COLORS.TEXT_LIGHT}
                      style={[styles.input, { height: 52 }]}
                      value={editOrdinance.section}
                      onChangeText={(text) => setEditOrdinance((p) => ({ ...p, section: text }))}
                    />

                    <TextInput
                      placeholder="Ordinance Title"
                      placeholderTextColor={COLORS.TEXT_LIGHT}
                      style={[
                        styles.input,
                        styles.titleInput,
                        { height: clamp(ordTitleH, TITLE_MIN, TITLE_MAX) }
                      ]}
                      multiline
                      textAlignVertical="top"
                      scrollEnabled={true} // ✅ FIX: always scrollable
                      value={editOrdinance.title}
                      onChangeText={(text) => setEditOrdinance((p) => ({ ...p, title: text }))}
                      onContentSizeChange={(e) => setOrdTitleH(e.nativeEvent.contentSize.height + 18)}
                    />

                    <TextInput
                      placeholder="Ordinance Text (What riders will see)"
                      placeholderTextColor={COLORS.TEXT_LIGHT}
                      style={[
                        styles.input,
                        styles.descInput,
                        { height: clamp(ordDescH, DESC_MIN, DESC_MAX) }
                      ]}
                      multiline
                      textAlignVertical="top"
                      scrollEnabled={true} // ✅ FIX: always scrollable
                      value={editOrdinance.description}
                      onChangeText={(text) => setEditOrdinance((p) => ({ ...p, description: text }))}
                      onContentSizeChange={(e) => setOrdDescH(e.nativeEvent.contentSize.height + 18)}
                    />

                    <View style={{ height: 6 }} />
                  </ScrollView>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setIsEditingOrdinance(false);
                        // reset edit fields to selected
                        const ord = {
                          id: selectedOrdinance?.id ?? null,
                          section: selectedOrdinance?.section || "",
                          title: selectedOrdinance?.title || "",
                          description: selectedOrdinance?.description || ""
                        };
                        setEditOrdinance(ord);
                        setOrdTitleH(estimateHeight(ord.title, TITLE_MIN, TITLE_MAX, 22, 22));
                        setOrdDescH(estimateHeight(ord.description, DESC_MIN, DESC_MAX, 36, 22));
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.postButton} onPress={handleSaveOrdinance}>
                      <Text style={styles.postButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* ✅ REMOVED: footer/bottom bar here
            HomeAdmin lang dapat ang may footer para walang double Profile */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_GREEN
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_WHITE
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 40,
    backgroundColor: COLORS.PRIMARY_GREEN,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.PRIMARY_GREEN
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10
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
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1
  },
  addButton: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },

  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F7F9F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E7EDE7"
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    marginHorizontal: 6
  },
  tabBtnActive: {
    borderColor: COLORS.PRIMARY_GREEN,
    backgroundColor: "#E9F6EC"
  },
  tabText: {
    fontWeight: "800",
    color: COLORS.TEXT_DARK,
    fontSize: 13
  },
  tabTextActive: {
    color: COLORS.PRIMARY_GREEN
  },

  content: {
    padding: 20,
    paddingBottom: 30
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50
  },
  emptyText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 16
  },

  announcementCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT_DARK,
    flex: 1,
    marginRight: 8
  },
  announcementType: {
    fontSize: 12,
    color: COLORS.PRIMARY_GREEN,
    fontWeight: "500"
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4
  },
  announcementDescription: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 14
  },

  infoBox: {
    borderWidth: 1,
    borderColor: "#DDEBDD",
    backgroundColor: "#F1FBF4",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14
  },
  infoTitle: {
    fontWeight: "900",
    color: "#1E3B27",
    marginBottom: 4
  },
  infoText: {
    color: "#2F4A39",
    fontSize: 12,
    lineHeight: 18
  },
  infoBold: { fontWeight: "900" },

  ordinanceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },
  ordinanceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  sectionPill: {
    backgroundColor: "#0F3D12",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  sectionPillText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#DDEBDD",
    backgroundColor: "#F1FBF4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  editPillText: { color: COLORS.PRIMARY_GREEN, fontWeight: "900", fontSize: 11, marginLeft: 6 },
  ordinanceTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.TEXT_DARK,
    marginBottom: 6
  },
  ordinancePreview: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 13,
    lineHeight: 19
  },

  modalContainer: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },

  modalContentLarge: {
    backgroundColor: "white",
    width: VIEW_MODAL_W,
    height: MODAL_H,
    padding: 20,
    borderRadius: 16
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center",
    color: COLORS.TEXT_DARK
  },

  modalFormScroll: { flex: 1 },
  modalFormScrollContent: { paddingBottom: 10 },

  viewModalContent: {
    backgroundColor: "white",
    width: VIEW_MODAL_W,
    height: MODAL_H,
    padding: 18,
    borderRadius: 16,
    overflow: "hidden"
  },
  viewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  viewModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.TEXT_DARK
  },
  closeX: { padding: 6 },

  viewScroll: { flex: 1 },
  viewScrollContent: { paddingBottom: 16 },
  viewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.TEXT_LIGHT,
    marginTop: 10,
    marginBottom: 4
  },
  viewValue: {
    fontSize: 15,
    color: COLORS.TEXT_DARK,
    lineHeight: 22
  },
  viewDescription: { marginTop: 2, lineHeight: 22 },
  viewMeta: { marginTop: 12, fontSize: 12, color: COLORS.TEXT_LIGHT },

  editBtn: {
    marginTop: 12,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.PRIMARY_GREEN,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  editBtnText: {
    color: "#fff",
    fontWeight: "800",
    marginLeft: 8,
    fontSize: 14
  },

  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    color: COLORS.TEXT_DARK,
    fontSize: 16
  },
  titleInput: {},
  descInput: {},

  typeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },
  selectedType: {
    backgroundColor: COLORS.PRIMARY_GREEN,
    borderColor: COLORS.PRIMARY_GREEN
  },
  typeButtonText: {
    color: COLORS.TEXT_DARK,
    fontWeight: "700",
    fontSize: 14
  },
  selectedTypeText: { color: "#FFFFFF" },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0"
  },
  cancelButtonText: {
    textAlign: "center",
    color: COLORS.TEXT_DARK,
    fontWeight: "800",
    fontSize: 14
  },
  postButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY_GREEN
  },
  postButtonText: {
    textAlign: "center",
    color: "white",
    fontWeight: "800",
    fontSize: 14
  }
});
