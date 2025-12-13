import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform
} from "react-native";
import { Feather } from '@expo/vector-icons';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  orderBy
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function AdminAppointment({ navigation }) {
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ NEW: para perfect center ang title kahit may Back button
  const DEFAULT_HEADER_SIDE_W = 90;
  const [headerLeftW, setHeaderLeftW] = useState(DEFAULT_HEADER_SIDE_W);

  const db = getFirestore();
  const auth = getAuth();

  const fetchPendingAppointments = async () => {
    try {
      setLoading(true);
      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("status", "in", ["Pending", "Approved", "Rejected"])
      );
      
      const querySnapshot = await getDocs(appointmentsQuery);
      
      const appointments = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Sort by creation date, newest first
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setPendingAppointments(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      
      const errorMessage = error.message || "Unknown error";
      const indexCreationLink = error.code === 'permission-denied' 
        ? "https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes"
        : null;

      Alert.alert(
        'Appointment Fetch Error', 
        errorMessage + 
        (indexCreationLink 
          ? "\n\nYou may need to create a Firestore index." 
          : ""),
        indexCreationLink 
          ? [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Index Creation', 
                onPress: () => {
                  console.log("Index Creation Link:", indexCreationLink);
                }
              }
            ]
          : undefined
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAppointments();
    const unsubscribe = navigation.addListener('focus', fetchPendingAppointments);
    return unsubscribe;
  }, [navigation]);

  const handleAppointmentAction = async (appointmentId, status) => {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      
      await updateDoc(appointmentRef, { 
        status: status,
        updatedAt: new Date().toISOString()
      });

      setPendingAppointments(currentAppointments => 
        currentAppointments.map(appt => 
          appt.id === appointmentId 
            ? {...appt, status: status} 
            : appt
        )
      );

      Alert.alert(
        'Appointment Updated', 
        `Appointment has been ${status.toLowerCase()}d successfully.`
      );
    } catch (error) {
      console.error(`Error ${status.toLowerCase()}ing appointment:`, error);
      Alert.alert('Error', `Failed to ${status.toLowerCase()} appointment. Please try again.`);
    }
  };

  const renderAppointmentItem = ({ item }) => {
    const appointmentDate = new Date(item.appointmentDate);
    
    const containerStyle = 
      item.status === 'Approved' 
        ? [styles.appointmentItem, styles.approvedAppointmentItem]
        : item.status === 'Rejected'
        ? [styles.appointmentItem, styles.rejectedAppointmentItem]
        : styles.appointmentItem;
    
    const textStyle = 
      item.status === 'Approved' 
        ? styles.approvedAppointmentText
        : item.status === 'Rejected'
        ? styles.rejectedAppointmentText
        : {};
    
    const actionButtonsVisibility = 
      item.status === 'Pending' 
        ? styles.actionButtons 
        : styles.hiddenActionButtons;
    
    return (
      <View style={containerStyle}>
        <View style={styles.appointmentDetails}>
          <Text style={[styles.appointmentName, textStyle]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[styles.appointmentText, textStyle]}>
            Date: {appointmentDate.toLocaleDateString()} at {appointmentDate.toLocaleTimeString()}
          </Text>
          <Text style={[styles.plateNumberText, textStyle]}>
            E-Bike Plate: {item.plateNumber}
          </Text>
          <Text style={[styles.appointmentStatusText, textStyle]}>
            Status: {item.status}
          </Text>
        </View>
        <View style={actionButtonsVisibility}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAppointmentAction(item.id, 'Approved')}
            disabled={item.status !== 'Pending'}
          >
            <Feather name="check" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleAppointmentAction(item.id, 'Rejected')}
            disabled={item.status !== 'Pending'}
          >
            <Feather name="x" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* ✅ HEADER (centered title + aligned to back button) */}
        <View style={styles.header}>
          {/* Left */}
          <View
            style={styles.headerSideLeft}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w && Math.abs(w - headerLeftW) > 1) setHeaderLeftW(w);
            }}
          >
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              {/* ✅ same style as RiderScreen */}
              <Text style={styles.backArrow}>◂</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Center */}
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Manage Appointments
          </Text>

          {/* Right spacer (same width as left) */}
          <View style={[styles.headerSideRight, { width: headerLeftW || DEFAULT_HEADER_SIDE_W }]} />
        </View>

        <FlatList
          data={pendingAppointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.noAppointmentsText}>
              {loading ? 'Loading...' : 'No pending appointments'}
            </Text>
          }
          contentContainerStyle={styles.content}
          refreshing={loading}
          onRefresh={() => {
            setLoading(true);
            fetchPendingAppointments();
          }}
        />

        {/* Bottom Navigation */}
        <View style={styles.bottomBar}>
          <SafeAreaView style={styles.bottomSafe}>
            <View style={styles.bottomInner}>
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
                <Feather name="user" size={24} color="white" />
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
  // full green sa pinaka-itaas
  safeArea: {
    flex: 1,
    backgroundColor: '#2e7d32',
  },
  container: {
    flex: 1,
    backgroundColor: 'white'
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 45,              // ✅ HINDI BINAGO
    backgroundColor: '#2e7d32',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },

  // ✅ NEW: left/right sides for perfect centering
  headerSideLeft: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSideRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  // ✅ ginaya from RiderScreen
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 4,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // ✅ centered title
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },

  content: {
    padding: 10,
    paddingBottom: 50
  },
  appointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },
  approvedAppointmentItem: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2e7d32',
    borderWidth: 1
  },
  rejectedAppointmentItem: {
    backgroundColor: '#ffebee',
    borderColor: '#d32f2f',
    borderWidth: 1
  },
  appointmentDetails: {
    flex: 1,
    marginRight: 10
  },
  appointmentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5
  },
  approvedAppointmentText: {
    color: '#2e7d32'
  },
  rejectedAppointmentText: {
    color: '#d32f2f'
  },
  appointmentText: {
    color: '#333',
    marginBottom: 3
  },
  plateNumberText: {
    color: '#666'
  },
  appointmentStatusText: {
    marginTop: 5,
    fontWeight: 'bold'
  },
  actionButtons: {
    flexDirection: 'row'
  },
  hiddenActionButtons: {
    display: 'none'
  },
  actionButton: {
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5
  },
  acceptButton: {
    backgroundColor: '#2e7d32'
  },
  rejectButton: {
    backgroundColor: '#d32f2f'
  },
  noAppointmentsText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20
  },
  bottomBar: {
    backgroundColor: '#2e7d32',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  bottomSafe: {
    flex: 1
  },
  bottomInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: Platform.OS === 'ios' ? 90 : 68
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
