import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc
} from "firebase/firestore";

export default function AppointmentScreen({ navigation }) {
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    plateNumber: '',
    email: ''
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Try to fetch user document by UID
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserData({
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              plateNumber: userData.plateNumber || 'Not Set',
              email: currentUser.email || ''
            });
          } else {
            // Fallback: Try to find user by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              const userData = userDoc.data();
              
              setUserData({
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                plateNumber: userData.plateNumber || 'Not Set',
                email: currentUser.email || ''
              });
            } else {
              // If no user document found, set minimal information
              setUserData({
                firstName: '',
                lastName: '',
                plateNumber: 'Not Set',
                email: currentUser.email || ''
              });
              
              Alert.alert(
                'Profile Incomplete', 
                'Please complete your profile in the profile section.'
              );
            }
          }

          // Fetch all appointments (Pending, Approved, Rejected)
          const appointmentsQuery = query(
            collection(db, "appointments"),
            where("uid", "==", currentUser.uid)
          );
          
          const querySnapshot = await getDocs(appointmentsQuery);
          
          const appointments = querySnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          setPendingAppointments(appointments);
        } else {
          navigation.replace("Login");
        }
      } catch (error) {
        console.error("Detailed Error:", error);
        Alert.alert('Error', 'Failed to fetch user information: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener('focus', fetchUserData);
    fetchUserData(); // Initial fetch
    return unsubscribe;
  }, [navigation]);

  const handleScheduleAppointment = async () => {
    try {
      // Basic profile validation
      if (!userData.firstName || !userData.lastName || !userData.plateNumber) {
        Alert.alert('Incomplete Profile', 'Please complete your profile first');
        return;
      }

      if (!selectedDate || !selectedTime) {
        Alert.alert('Error', 'Please select both date and time');
        return;
      }

      // Combine date and time
      const appointmentDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );

      // ✅ Validate day: Monday–Friday only (0=Sun, 6=Sat)
      const day = appointmentDateTime.getDay();
      if (day === 0 || day === 6) {
        Alert.alert(
          'Unavailable Day',
          'Appointments can only be scheduled from Monday to Friday. Please choose a weekday.'
        );
        return;
      }

      // ✅ Validate time: 8:00 AM – 5:00 PM only
      const hours = appointmentDateTime.getHours();
      const minutes = appointmentDateTime.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      const startMinutes = 8 * 60;   // 8:00 AM
      const endMinutes = 17 * 60;    // 5:00 PM

      if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
        Alert.alert(
          'Unavailable Time',
          'Appointments are only available between 8:00 AM and 5:00 PM. Please select a time within office hours.'
        );
        return;
      }

      // Check for existing pending appointments
      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("uid", "==", auth.currentUser.uid),
        where("status", "==", "Pending")
      );
      const existingAppointments = await getDocs(appointmentsQuery);

      if (!existingAppointments.empty) {
        Alert.alert(
          'Existing Appointment', 
          'You already have a pending appointment. Please cancel the existing one first.'
        );
        return;
      }

      // Add appointment to Firestore
      const newAppointmentRef = await addDoc(collection(db, "appointments"), {
        uid: auth.currentUser.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        plateNumber: userData.plateNumber,
        appointmentDate: appointmentDateTime.toISOString(),
        status: 'Pending',
        createdAt: new Date().toISOString()
      });

      // Refresh list
      setPendingAppointments([
        {
          id: newAppointmentRef.id,
          uid: auth.currentUser.uid,
          firstName: userData.firstName,
          lastName: userData.lastName,
          plateNumber: userData.plateNumber,
          appointmentDate: appointmentDateTime.toISOString(),
          status: 'Pending',
          createdAt: new Date().toISOString()
        },
        ...pendingAppointments
      ]);

      Alert.alert(
        'Appointment Scheduled', 
        'Your appointment for E-Bike Registration has been scheduled successfully.'
      );
    } catch (error) {
      console.error("Appointment scheduling error:", error);
      Alert.alert('Error', 'Failed to schedule appointment. Please try again.');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await deleteDoc(doc(db, "appointments", appointmentId));

      setPendingAppointments(
        pendingAppointments.filter(appt => appt.id !== appointmentId)
      );

      Alert.alert('Appointment Canceled', 'Your appointment has been canceled successfully.');
    } catch (error) {
      console.error("Appointment cancellation error:", error);
      Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
    }
  };

  const renderPendingAppointment = ({ item }) => {
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
    
    const cancelButtonVisibility = 
      item.status === 'Pending' 
        ? styles.cancelButton 
        : styles.hiddenCancelButton;
    
    const cancelButtonTextStyle = 
      item.status === 'Pending' 
        ? styles.cancelButtonText 
        : styles.hiddenCancelButtonText;

    return (
      <View style={containerStyle}>
        <View style={styles.appointmentDetails}>
          <Text style={[styles.appointmentName, textStyle]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[styles.appointmentText, textStyle]}>
            Date: {appointmentDate.toLocaleDateString()} at {appointmentDate.toLocaleTimeString()}
          </Text>
          <Text style={[styles.appointmentStatus, textStyle]}>
            Status: {item.status}
          </Text>
          <Text style={[styles.plateNumberText, textStyle]}>
            E-Bike Plate: {item.plateNumber || 'Not Set'}
          </Text>
        </View>
        <TouchableOpacity 
          style={cancelButtonVisibility}
          onPress={() => {
            Alert.alert(
              'Cancel Appointment', 
              'Are you sure you want to cancel this appointment?',
              [
                {
                  text: 'No',
                  style: 'cancel'
                },
                {
                  text: 'Yes',
                  onPress: () => handleCancelAppointment(item.id)
                }
              ]
            );
          }}
        >
          <Text style={cancelButtonTextStyle}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header same style as Me.js */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>◂ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Appointment</Text>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* User Information Section */}
            <View style={styles.userInfoContainer}>
              <Text style={styles.sectionTitle}>Your Information</Text>
              <View style={styles.userInfoRow}>
                <Text style={styles.labelText}>Name:</Text>
                <Text style={styles.valueText}>
                  {userData.firstName || userData.lastName
                    ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
                    : (userData.email || 'Not set – please update your profile')}
                </Text>
              </View>
              <View style={styles.userInfoRow}>
                <Text style={styles.labelText}>E-Bike Plate Number:</Text>
                <Text style={styles.valueText}>
                  {userData.plateNumber && userData.plateNumber !== 'Not Set'
                    ? userData.plateNumber
                    : 'Not set – you can still schedule an appointment.'}
                </Text>
              </View>
            </View>

            {/* Appointment Scheduling Section */}
            <View style={styles.appointmentContainer}>
              <Text style={styles.sectionTitle}>Schedule New Appointment</Text>
              
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  Select Date: {selectedDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      setSelectedDate(date);
                    }
                  }}
                />
              )}

              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  Select Time: {selectedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, time) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (time) {
                      setSelectedTime(time);
                    }
                  }}
                />
              )}

              <TouchableOpacity 
                style={styles.scheduleButton}
                onPress={handleScheduleAppointment}
              >
                <Text style={styles.scheduleButtonText}>Schedule Appointment</Text>
              </TouchableOpacity>
            </View>

            {/* Appointments Section */}
            <View style={styles.pendingAppointmentsContainer}>
              <Text style={styles.sectionTitle}>Your Appointments</Text>
            </View>
          </>
        }
        data={pendingAppointments}
        renderItem={renderPendingAppointment}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.noAppointmentsText}>No appointments</Text>
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  header: {
    height: 72,
    backgroundColor: "#2e7d32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  content: {
    padding: 10,
    paddingBottom: 50
  },
  userInfoContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2e7d32'
  },
  userInfoRow: {
    flexDirection: 'row',
    marginBottom: 5
  },
  labelText: {
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333'
  },
  valueText: {
    color: '#666',
    flex: 1,
    flexWrap: 'wrap'
  },
  appointmentContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  pickerButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center'
  },
  pickerButtonText: {
    color: '#2e7d32',
    fontWeight: 'bold'
  },
  scheduleButton: {
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  scheduleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  },
  pendingAppointmentsContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10
  },
  appointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
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
    color: '#333',
    fontWeight: 'bold'
  },
  appointmentText: {
    color: '#333',
    fontWeight: 'bold'
  },
  approvedAppointmentText: {
    color: '#2e7d32'
  },
  rejectedAppointmentText: {
    color: '#d32f2f'
  },
  appointmentStatus: {
    marginTop: 5
  },
  plateNumberText: {
    color: '#666',
    marginTop: 5
  },
  cancelButton: {
    backgroundColor: '#d32f2f',
    padding: 10,
    borderRadius: 5
  },
  hiddenCancelButton: {
    display: 'none'
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  hiddenCancelButtonText: {
    display: 'none'
  },
  noAppointmentsText: {
    color: '#666',
    textAlign: 'center'
  }
});