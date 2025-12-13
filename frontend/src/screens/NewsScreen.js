import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../config/firebaseConfig';

// Design-matched color palette from HomeAdmin
const COLORS = {
  PRIMARY_GREEN: '#2E7D32',
  BACKGROUND_WHITE: '#FFFFFF',
  TEXT_DARK: '#2C3E50',
  TEXT_LIGHT: '#7F8C8D',
  ICON_GREEN: '#2E7D32',
  BOTTOM_BAR_GREEN: '#2E7D32'
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 68;

// ✅ modal width/height (bigger + not sagad)
const VIEW_MODAL_W = Math.min(460, SCREEN_WIDTH - 24);
const MODAL_H = Math.min(740, SCREEN_HEIGHT * 0.86);

// ✅ adaptive input clamps
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const TITLE_MIN = 56;
const TITLE_MAX = 110;
const DESC_MIN = 190;
const DESC_MAX = 360;

export default function NewsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ View / Edit modal states
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editAnnouncement, setEditAnnouncement] = useState({
    title: '',
    description: '',
    type: 'E-bike update'
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    description: '',
    type: 'E-bike update'
  });

  // ✅ adaptive heights (Create)
  const [createTitleH, setCreateTitleH] = useState(TITLE_MIN);
  const [createDescH, setCreateDescH] = useState(DESC_MIN);

  // ✅ adaptive heights (Edit)
  const [editTitleH, setEditTitleH] = useState(TITLE_MIN);
  const [editDescH, setEditDescH] = useState(DESC_MIN);

  // ✅ auth user
  const auth = getAuth();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsubAuth();
  }, []);

  const currentUid = user?.uid || null;
  const currentEmail = user?.email || null;

  useEffect(() => {
    const announcementsRef = collection(db, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const announcementsList = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setAnnouncements(announcementsList);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateAnnouncement = async () => {
    if (!currentUid) {
      Alert.alert('Not Logged In', 'Please login again, then try posting.');
      return;
    }

    if (!newAnnouncement.title.trim()) {
      Alert.alert('Error', 'Please enter an announcement title');
      return;
    }

    try {
      const announcementsRef = collection(db, 'announcements');
      await addDoc(announcementsRef, {
        ...newAnnouncement,
        createdAt: serverTimestamp(),
        createdBy: currentUid,
        createdByEmail: currentEmail
      });

      setNewAnnouncement({ title: '', description: '', type: 'E-bike update' });
      setCreateTitleH(TITLE_MIN);
      setCreateDescH(DESC_MIN);
      setModalVisible(false);
    } catch (error) {
      console.error('Error creating announcement: ', error);
      Alert.alert('Error', 'Could not create announcement');
    }
  };

  const handleDeleteAnnouncement = (announcementId) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'announcements', announcementId));
            } catch (error) {
              console.error('Error deleting announcement:', error);
              Alert.alert('Error', 'Could not delete announcement');
            }
          }
        }
      ]
    );
  };

  const openAnnouncement = (item) => {
    setSelectedAnnouncement(item);
    setIsEditing(false);

    const title = item?.title || '';
    const desc = item?.description || '';

    setEditAnnouncement({
      title,
      description: desc,
      type: item?.type || 'E-bike update'
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
      Alert.alert('Not Logged In', 'Please login again, then try editing.');
      return;
    }
    if (!selectedAnnouncement?.id) return;

    if (!editAnnouncement.title.trim()) {
      Alert.alert('Error', 'Please enter an announcement title');
      return;
    }

    try {
      await updateDoc(doc(db, 'announcements', selectedAnnouncement.id), {
        title: editAnnouncement.title,
        description: editAnnouncement.description,
        type: editAnnouncement.type,
        updatedAt: serverTimestamp(),
        updatedBy: currentUid,
        updatedByEmail: currentEmail
      });

      setSelectedAnnouncement(prev => ({
        ...prev,
        title: editAnnouncement.title,
        description: editAnnouncement.description,
        type: editAnnouncement.type
      }));

      setIsEditing(false);
      Alert.alert('Success', 'Announcement updated successfully');
    } catch (error) {
      console.error('Error updating announcement:', error);
      const msg = String(error?.message || '');
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        Alert.alert(
          'Permission Denied',
          'Your Firestore rules are blocking updates. Update your rules to allow admin updates.'
        );
      } else {
        Alert.alert('Error', 'Could not update announcement');
      }
    }
  };

  const formatDate = (ts) => {
    try {
      if (!ts) return '';
      if (typeof ts?.toDate === 'function') return ts.toDate().toLocaleString();
      return '';
    } catch {
      return '';
    }
  };

  const renderAnnouncementItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => openAnnouncement(item)}
      style={{ marginBottom: 15 }}
    >
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ✅ Green header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>◂</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>News & Announcements</Text>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          >
            <Feather name="plus-circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No announcements yet</Text>
            </View>
          ) : (
            <FlatList
              data={announcements}
              renderItem={renderAnnouncementItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </ScrollView>

        {/* ✅ Create Announcement Modal (adaptive textboxes) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.modalContentLarge}>
                {/* ❌ REMOVED X button (Create) */}

                <Text style={styles.modalTitle}>Create Announcement</Text>

                <ScrollView
                  style={styles.modalFormScroll}
                  contentContainerStyle={styles.modalFormScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* ✅ TITLE (multiline + adaptive height) */}
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
                    onChangeText={(text) =>
                      setNewAnnouncement(prev => ({ ...prev, title: text }))
                    }
                    onContentSizeChange={(e) =>
                      setCreateTitleH(e.nativeEvent.contentSize.height + 18)
                    }
                    scrollEnabled={createTitleH >= TITLE_MAX}
                  />

                  {/* ✅ DESCRIPTION (multiline + adaptive height) */}
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
                      setNewAnnouncement(prev => ({ ...prev, description: text }))
                    }
                    onContentSizeChange={(e) =>
                      setCreateDescH(e.nativeEvent.contentSize.height + 18)
                    }
                    scrollEnabled={createDescH >= DESC_MAX}
                  />

                  <View style={styles.typeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newAnnouncement.type === 'E-bike update' && styles.selectedType
                      ]}
                      onPress={() =>
                        setNewAnnouncement(prev => ({ ...prev, type: 'E-bike update' }))
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newAnnouncement.type === 'E-bike update' && styles.selectedTypeText
                        ]}
                      >
                        E-bike Update
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newAnnouncement.type === 'Register Now' && styles.selectedType
                      ]}
                      onPress={() =>
                        setNewAnnouncement(prev => ({ ...prev, type: 'Register Now' }))
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newAnnouncement.type === 'Register Now' && styles.selectedTypeText
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
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.postButton}
                    onPress={handleCreateAnnouncement}
                  >
                    <Text style={styles.postButtonText}>Post</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* ✅ View / Edit Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={viewModalVisible}
          onRequestClose={closeViewModal}
        >
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center' }}
            >
              {!isEditing ? (
                // ✅ VIEW MODE
                <View style={styles.viewModalContent}>
                  <View style={styles.viewHeaderRow}>
                    <Text style={styles.viewModalTitle}>View Announcement</Text>

                    {/* ✅ Keep X in VIEW mode */}
                    <TouchableOpacity onPress={closeViewModal} style={styles.closeX}>
                      <Feather name="x" size={22} color={COLORS.TEXT_DARK} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.viewScroll}
                    contentContainerStyle={styles.viewScrollContent}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.viewLabel}>Title</Text>
                    <Text style={styles.viewValue}>{selectedAnnouncement?.title || '-'}</Text>

                    <Text style={styles.viewLabel}>Type</Text>
                    <Text style={styles.viewValue}>{selectedAnnouncement?.type || '-'}</Text>

                    {selectedAnnouncement?.description ? (
                      <>
                        <Text style={styles.viewLabel}>Description</Text>
                        <Text style={[styles.viewValue, styles.viewDescription]}>
                          {selectedAnnouncement.description}
                        </Text>
                      </>
                    ) : null}

                    {selectedAnnouncement?.createdAt ? (
                      <Text style={styles.viewMeta}>
                        Posted: {formatDate(selectedAnnouncement.createdAt)}
                      </Text>
                    ) : null}
                  </ScrollView>

                  {/* ✅ Edit button (only one) */}
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      if (!canEditSelected) {
                        Alert.alert('Not Allowed', 'Please login again.');
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
                // ✅ EDIT MODE (same format as Create + adaptive textboxes)
                <View style={styles.modalContentLarge}>
                  {/* ❌ REMOVED X button (Edit) */}

                  <Text style={styles.modalTitle}>Edit Announcement</Text>

                  <ScrollView
                    style={styles.modalFormScroll}
                    contentContainerStyle={styles.modalFormScrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* ✅ TITLE (multiline + adaptive height) */}
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
                      onChangeText={(text) =>
                        setEditAnnouncement(prev => ({ ...prev, title: text }))
                      }
                      onContentSizeChange={(e) =>
                        setEditTitleH(e.nativeEvent.contentSize.height + 18)
                      }
                      scrollEnabled={editTitleH >= TITLE_MAX}
                    />

                    {/* ✅ DESCRIPTION (multiline + adaptive height) */}
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
                        setEditAnnouncement(prev => ({ ...prev, description: text }))
                      }
                      onContentSizeChange={(e) =>
                        setEditDescH(e.nativeEvent.contentSize.height + 18)
                      }
                      scrollEnabled={editDescH >= DESC_MAX}
                    />

                    <View style={styles.typeContainer}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          editAnnouncement.type === 'E-bike update' && styles.selectedType
                        ]}
                        onPress={() =>
                          setEditAnnouncement(prev => ({ ...prev, type: 'E-bike update' }))
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            editAnnouncement.type === 'E-bike update' && styles.selectedTypeText
                          ]}
                        >
                          E-bike Update
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          editAnnouncement.type === 'Register Now' && styles.selectedType
                        ]}
                        onPress={() =>
                          setEditAnnouncement(prev => ({ ...prev, type: 'Register Now' }))
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            editAnnouncement.type === 'Register Now' && styles.selectedTypeText
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
                          title: selectedAnnouncement?.title || '',
                          description: selectedAnnouncement?.description || '',
                          type: selectedAnnouncement?.type || 'E-bike update'
                        });
                        setEditTitleH(TITLE_MIN);
                        setEditDescH(DESC_MIN);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.postButton}
                      onPress={handleSaveEdit}
                    >
                      <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Bottom Navigation */}
        <View style={[styles.bottomBar, { height: BOTTOM_BAR_HEIGHT }]}>
          <SafeAreaView style={styles.bottomSafe}>
            <View style={[styles.bottomInner, { height: BOTTOM_BAR_HEIGHT }]}>
              <TouchableOpacity
                style={styles.bottomBarItem}
                onPress={() => navigation.navigate("HomeAdmin")}
              >
                <Feather name="home" size={24} color="white" />
                <Text style={styles.bottomBarText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomBarItem}
                onPress={() => navigation.navigate("NewsScreen")}
              >
                <Feather name="file-text" size={24} color="white" />
                <Text style={styles.bottomBarText}>News</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomBarItem}
                onPress={() => navigation.navigate("RiderScreen")}
              >
                <Feather name="users" size={24} color="white" />
                <Text style={styles.bottomBarText}>Rider</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomBarItem}
                onPress={() => navigation.navigate("AdminAppointment")}
              >
                <Feather name="calendar" size={24} color="white" />
                <Text style={styles.bottomBarText}>Appointment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomBarItem}
                onPress={() => navigation.navigate("Me")}
              >
                <Feather name="user" size={24} color="white" />
                <Text style={styles.bottomBarText}>Profile</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 40,
    backgroundColor: COLORS.PRIMARY_GREEN,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.PRIMARY_GREEN
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 4
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1
  },
  addButton: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },

  content: {
    padding: 20,
    paddingBottom: 30
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50
  },
  emptyText: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 16
  },

  announcementCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    flex: 1,
    marginRight: 8
  },
  announcementType: {
    fontSize: 12,
    color: COLORS.PRIMARY_GREEN,
    fontWeight: '500'
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4
  },
  announcementDescription: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 14
  },

  modalContainer: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  modalContentLarge: {
    backgroundColor: 'white',
    width: VIEW_MODAL_W,
    height: MODAL_H,
    padding: 20,
    borderRadius: 16
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
    color: COLORS.TEXT_DARK
  },

  modalFormScroll: { flex: 1 },
  modalFormScrollContent: { paddingBottom: 10 },

  viewModalContent: {
    backgroundColor: 'white',
    width: VIEW_MODAL_W,
    height: MODAL_H,
    padding: 18,
    borderRadius: 16,
    overflow: 'hidden'
  },
  viewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  viewModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_DARK
  },
  closeX: { padding: 6 },

  viewScroll: { flex: 1 },
  viewScrollContent: { paddingBottom: 16 },
  viewLabel: {
    fontSize: 12,
    fontWeight: '700',
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
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_GREEN,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 14
  },

  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  selectedType: {
    backgroundColor: COLORS.PRIMARY_GREEN,
    borderColor: COLORS.PRIMARY_GREEN
  },
  typeButtonText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 14
  },
  selectedTypeText: { color: '#FFFFFF' },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  cancelButtonText: {
    textAlign: 'center',
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
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
    textAlign: 'center',
    color: 'white',
    fontWeight: '800',
    fontSize: 14
  },

  bottomBar: {
    backgroundColor: COLORS.BOTTOM_BAR_GREEN,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  bottomSafe: { flex: 1 },
  bottomInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  bottomBarItem: { alignItems: 'center', justifyContent: 'center' },
  bottomBarText: { color: 'white', fontSize: 12, marginTop: 5 }
});
