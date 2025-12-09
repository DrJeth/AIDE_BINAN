

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
  FlatList
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Design-matched color palette from HomeAdmin
const COLORS = {
  PRIMARY_GREEN: '#2E7D32',    // Main green
  BACKGROUND_WHITE: '#FFFFFF', // White background
  TEXT_DARK: '#2C3E50',        // Dark text color
  TEXT_LIGHT: '#7F8C8D',       // Light text color
  ICON_GREEN: '#2E7D32',       // Green for icons
  BOTTOM_BAR_GREEN: '#2E7D32'  // Bottom bar green
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 68;

export default function NewsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    description: '',
    type: 'E-bike update'
  });

  useEffect(() => {
    const announcementsRef = collection(db, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const announcementsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAnnouncements(announcementsList);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim()) {
      Alert.alert('Error', 'Please enter an announcement title');
      return;
    }

    try {
      const announcementsRef = collection(db, 'announcements');
      await addDoc(announcementsRef, {
        ...newAnnouncement,
        createdAt: serverTimestamp()
      });

      setNewAnnouncement({ title: '', description: '', type: 'E-bike update' });
      setModalVisible(false);
    } catch (error) {
      console.error('Error creating announcement: ', error);
      Alert.alert('Error', 'Could not create announcement');
    }
  };

  const renderAnnouncementItem = ({ item }) => (
    <TouchableOpacity style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <Text style={styles.announcementTitle}>{item.title}</Text>
        <Text style={styles.announcementType}>{item.type}</Text>
      </View>
      {item.description && (
        <Text style={styles.announcementDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: white background, ◀ Back on left, News centered, + on right */}
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.headerIconLeft}
            >
              <Text style={styles.backArrow}>◀</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.greeting}>News</Text>

            <TouchableOpacity 
              onPress={() => setModalVisible(true)}
              style={styles.headerIconRight}
            >
              <Feather name="plus-circle" size={24} color={COLORS.ICON_GREEN} />
            </TouchableOpacity>
          </View>
    
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
      </SafeAreaView>

      {/* Modal for Creating Announcement */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Announcement</Text>
            <TextInput
              placeholder="Announcement Title"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              style={styles.input}
              value={newAnnouncement.title}
              onChangeText={(text) => setNewAnnouncement(prev => ({...prev, title: text}))}
            />
            <TextInput
              placeholder="Description (Optional)"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              style={[styles.input, styles.textArea]}
              multiline
              value={newAnnouncement.description}
              onChangeText={(text) => setNewAnnouncement(prev => ({...prev, description: text}))}
            />
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newAnnouncement.type === 'E-bike update' && styles.selectedType
                ]}
                onPress={() => setNewAnnouncement(prev => ({...prev, type: 'E-bike update'}))}
              >
                <Text style={styles.typeButtonText}>E-bike Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newAnnouncement.type === 'Register Now' && styles.selectedType
                ]}
                onPress={() => setNewAnnouncement(prev => ({...prev, type: 'Register Now'}))}
              >
                <Text style={styles.typeButtonText}>Register Now</Text>
              </TouchableOpacity>
            </View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_WHITE
  },
  safeArea: {
    flex: 1
  },
  content: {
    padding: 20
  },

  /* HEADER (no green background) */
  headerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 44,
  },
  headerIconLeft: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  headerIconRight: {
    position: 'absolute',
    right: 0,
    justifyContent: 'center',
    height: '100%',
  },
  backArrow: {
    fontSize: 18,
    color: COLORS.TEXT_DARK,
    marginRight: 4,
  },
  backText: {
    fontSize: 16,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    textAlign: 'center',
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
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    flex: 1,
    marginRight: 10
  },
  announcementType: {
    fontSize: 12,
    color: COLORS.PRIMARY_GREEN,
    fontWeight: '500'
  },
  announcementDescription: {
    color: COLORS.TEXT_LIGHT,
    fontSize: 14
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    width: '75%',
    padding: 20,
    borderRadius: 15
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: COLORS.TEXT_DARK
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: COLORS.TEXT_DARK
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  selectedType: {
    backgroundColor: COLORS.PRIMARY_GREEN,
    borderColor: COLORS.PRIMARY_GREEN
  },
  typeButtonText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '500'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  cancelButtonText: {
    textAlign: 'center',
    color: COLORS.TEXT_DARK,
    fontWeight: '500'
  },
  postButton: {
    flex: 1,
    marginLeft: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY_GREEN
  },
  postButtonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '600'
  },
  bottomBar: {
    backgroundColor: COLORS.BOTTOM_BAR_GREEN,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  bottomSafe: {
    flex: 1
  },
  bottomInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  bottomBarItem: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomBarText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5
  }
});


