import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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
    firstName: "",
    lastName: "",
    plateNumber: "Not Set", // primary plate (for saving appointment)
    plateNumbers: [], // ALL plates for display
    email: ""
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();

  // ✅ Hide Schedule UI if there is already an active appointment (Pending/Approved)
  const hasActiveAppointment = useMemo(() => {
    return pendingAppointments.some(
      (a) => a?.status === "Pending" || a?.status === "Approved"
    );
  }, [pendingAppointments]);

  // Collect ALL plates from: plateNumbers[] -> ebikes[] -> plateNumber
  const getAllPlateNumbers = (ud = {}) => {
    const plates = [];

    // 1) New schema: plateNumbers array
    if (Array.isArray(ud.plateNumbers) && ud.plateNumbers.length > 0) {
      plates.push(...ud.plateNumbers);
    }

    // 2) New schema: ebikes array
    if (Array.isArray(ud.ebikes) && ud.ebikes.length > 0) {
      const ebikePlates = ud.ebikes.map((e) => e?.plateNumber).filter(Boolean);
      plates.push(...ebikePlates);
    }

    // 3) Legacy: single plateNumber
    if (ud.plateNumber) plates.push(ud.plateNumber);

    // normalize: uppercase + unique + remove blanks/"Not Set"
    const cleaned = Array.from(
      new Set(
        plates
          .map((p) => String(p).trim().toUpperCase())
          .filter((p) => p && p !== "NOT SET" && p !== "N/A")
      )
    );

    return cleaned;
  };

  // TIME RULES (30-min picker + SAME HOUR restriction)
  const TIME_SLOT_INTERVAL_MINUTES = 30; // ✅ 00 / 30 only

  const sameDayLocal = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // GENERAL RULE: bawal same hour (kahit anong oras)
  const sameHourLocal = (a, b) =>
    sameDayLocal(a, b) && a.getHours() === b.getHours();

  const fmtTime = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isWithinOfficeHours = (dt) => {
    const totalMinutes = dt.getHours() * 60 + dt.getMinutes();
    const startMinutes = 8 * 60; // 8:00 AM
    const endMinutes = 17 * 60; // 5:00 PM
    return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
  };

  const isWeekday = (dt) => {
    const day = dt.getDay(); // 0=Sun, 6=Sat
    return day !== 0 && day !== 6;
  };

  // force selected time to 00/30 (Android may ignore minuteInterval)
  const snapTo30 = (time) => {
    const t = new Date(time);
    t.setSeconds(0);
    t.setMilliseconds(0);

    const m = t.getMinutes();
    const remainder = m % TIME_SLOT_INTERVAL_MINUTES;

    // snap to nearest 30 mins
    let snapped = m - remainder;
    if (remainder >= TIME_SLOT_INTERVAL_MINUTES / 2) snapped += TIME_SLOT_INTERVAL_MINUTES;

    if (snapped === 60) {
      t.setHours(t.getHours() + 1);
      t.setMinutes(0);
    } else {
      t.setMinutes(snapped);
    }
    return t;
  };

  // align to next 30-min slot (for suggestions)
  const alignToNext30 = (dt) => {
    const d = new Date(dt);
    d.setSeconds(0);
    d.setMilliseconds(0);

    const m = d.getMinutes();
    const remainder = m % TIME_SLOT_INTERVAL_MINUTES;
    if (remainder !== 0) d.setMinutes(m + (TIME_SLOT_INTERVAL_MINUTES - remainder));
    return d;
  };

  const isSlotFree = (candidateDT, busyDTs) => {
    // free only if no one booked within the SAME HOUR
    return busyDTs.every((busy) => !sameHourLocal(candidateDT, busy));
  };

  const findNextVacantTimes = (baseDT, busyDTs, maxSuggestions = 5) => {
    const suggestions = [];

    const start = alignToNext30(baseDT);
    const candidate = new Date(start);

    // scan forward by 30 mins (stop if day changes)
    for (let i = 0; i < 50 && suggestions.length < maxSuggestions; i++) {
      candidate.setMinutes(candidate.getMinutes() + TIME_SLOT_INTERVAL_MINUTES);

      if (!sameDayLocal(candidate, baseDT)) break;
      if (!isWeekday(candidate)) continue;
      if (!isWithinOfficeHours(candidate)) continue;

      if (isSlotFree(candidate, busyDTs)) {
        suggestions.push(new Date(candidate));
      }
    }
    return suggestions;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Try to fetch user document by UID
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const ud = userDoc.data();
            const allPlates = getAllPlateNumbers(ud);
            const primaryPlate =
              allPlates.length > 0 ? allPlates[0] : ud.plateNumber || "Not Set";

            setUserData({
              firstName: ud.firstName || "",
              lastName: ud.lastName || "",
              plateNumber: primaryPlate || "Not Set",
              plateNumbers: allPlates,
              email: currentUser.email || ""
            });
          } else {
            // Fallback: Try to find user by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const udoc = querySnapshot.docs[0];
              const ud = udoc.data();

              const allPlates = getAllPlateNumbers(ud);
              const primaryPlate =
                allPlates.length > 0 ? allPlates[0] : ud.plateNumber || "Not Set";

              setUserData({
                firstName: ud.firstName || "",
                lastName: ud.lastName || "",
                plateNumber: primaryPlate || "Not Set",
                plateNumbers: allPlates,
                email: currentUser.email || ""
              });
            } else {
              setUserData({
                firstName: "",
                lastName: "",
                plateNumber: "Not Set",
                plateNumbers: [],
                email: currentUser.email || ""
              });

              Alert.alert(
                "Profile Incomplete",
                "Please complete your profile in the profile section."
              );
            }
          }

          // Fetch all appointments (Pending, Approved, Rejected)
          const appointmentsQuery = query(
            collection(db, "appointments"),
            where("uid", "==", currentUser.uid)
          );

          const qs = await getDocs(appointmentsQuery);

          const appointments = qs.docs
            .map((d) => ({
              id: d.id,
              ...d.data()
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          setPendingAppointments(appointments);
        } else {
          navigation.replace("Login");
        }
      } catch (error) {
        console.error("Detailed Error:", error);
        Alert.alert("Error", "Failed to fetch user information: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener("focus", fetchUserData);
    fetchUserData();
    return unsubscribe;
  }, [navigation]);

  const handleScheduleAppointment = async () => {
    try {
      // ✅ extra guard: if user already has active appointment, block scheduling
      if (hasActiveAppointment) {
        Alert.alert(
          "Already Scheduled",
          "You already have an appointment. Please cancel your pending appointment first before scheduling a new one."
        );
        return;
      }

      // Basic profile validation
      if (!userData.firstName || !userData.lastName) {
        Alert.alert("Incomplete Profile", "Please complete your profile first");
        return;
      }

      if (!selectedDate || !selectedTime) {
        Alert.alert("Error", "Please select both date and time");
        return;
      }

      // lock time to 00/30 before saving
      const snappedTime = snapTo30(selectedTime);

      // Combine date and time (LOCAL)
      const appointmentDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        snappedTime.getHours(),
        snappedTime.getMinutes(),
        0,
        0
      );

      // Validate day: Monday–Friday only
      if (!isWeekday(appointmentDateTime)) {
        Alert.alert(
          "Unavailable Day",
          "Appointments can only be scheduled from Monday to Friday. Please choose a weekday."
        );
        return;
      }

      // Validate time: 8:00 AM – 5:00 PM only
      if (!isWithinOfficeHours(appointmentDateTime)) {
        Alert.alert(
          "Unavailable Time",
          "Appointments are only available between 8:00 AM and 5:00 PM. Please select a time within office hours."
        );
        return;
      }

      // Validate: must be future time
      const now = new Date();
      if (appointmentDateTime.getTime() <= now.getTime()) {
        Alert.alert("Invalid Time", "Please select a future time.");
        return;
      }

      // GLOBAL CONFLICT CHECK (same day, all riders)
      const dayStartLocal = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0,
        0
      );

      const nextDayStartLocal = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate() + 1,
        0,
        0,
        0,
        0
      );

      const dayQuery = query(
        collection(db, "appointments"),
        where("appointmentDate", ">=", dayStartLocal.toISOString()),
        where("appointmentDate", "<", nextDayStartLocal.toISOString())
      );

      const daySnap = await getDocs(dayQuery);

      // busy = Pending + Approved only (ignore Rejected)
      const busyDTs = daySnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a?.appointmentDate && (a.status === "Pending" || a.status === "Approved"))
        .map((a) => new Date(a.appointmentDate));

      // conflict if SAME HOUR is already taken
      const conflictDT = busyDTs.find((busy) =>
        sameHourLocal(appointmentDateTime, busy)
      );

      if (conflictDT) {
        const suggestions = findNextVacantTimes(appointmentDateTime, busyDTs, 5);

        const suggestionText =
          suggestions.length > 0
            ? suggestions.map((d) => `• ${fmtTime(d)}`).join("\n")
            : "No vacant time left for this day. Please choose another date.";

        Alert.alert(
          "Time Not Available",
          `This hour is already booked.\n\nBooked time in that hour: ${fmtTime(
            conflictDT
          )}\n\nSuggested available times (30-min slots):\n${suggestionText}`
        );
        return;
      }

      // Use primary plate (first from plateNumbers) if exists
      const primaryPlate =
        (Array.isArray(userData.plateNumbers) && userData.plateNumbers.length > 0
          ? userData.plateNumbers[0]
          : userData.plateNumber) || "Not Set";

      // Add appointment to Firestore
      const createdAtISO = new Date().toISOString();
      const appointmentISO = appointmentDateTime.toISOString();

      const newAppointmentRef = await addDoc(collection(db, "appointments"), {
        uid: auth.currentUser.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        plateNumber: primaryPlate,
        appointmentDate: appointmentISO,
        status: "Pending",
        createdAt: createdAtISO
      });

      // Add to UI list
      setPendingAppointments((prev) => [
        {
          id: newAppointmentRef.id,
          uid: auth.currentUser.uid,
          firstName: userData.firstName,
          lastName: userData.lastName,
          plateNumber: primaryPlate,
          appointmentDate: appointmentISO,
          status: "Pending",
          createdAt: createdAtISO
        },
        ...prev
      ]);

      // keep UI snapped
      setSelectedTime(snappedTime);

      Alert.alert(
        "Appointment Scheduled",
        "Your appointment for E-Bike Registration has been scheduled successfully."
      );
    } catch (error) {
      console.error("Appointment scheduling error:", error);
      Alert.alert("Error", "Failed to schedule appointment. Please try again.");
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await deleteDoc(doc(db, "appointments", appointmentId));

      setPendingAppointments((prev) => prev.filter((appt) => appt.id !== appointmentId));

      Alert.alert(
        "Appointment Canceled",
        "Your appointment has been canceled successfully."
      );
    } catch (error) {
      console.error("Appointment cancellation error:", error);
      Alert.alert("Error", "Failed to cancel appointment. Please try again.");
    }
  };

  const renderPendingAppointment = ({ item }) => {
    const appointmentDate = new Date(item.appointmentDate);

    const containerStyle =
      item.status === "Approved"
        ? [styles.appointmentItem, styles.approvedAppointmentItem]
        : item.status === "Rejected"
        ? [styles.appointmentItem, styles.rejectedAppointmentItem]
        : styles.appointmentItem;

    const textStyle =
      item.status === "Approved"
        ? styles.approvedAppointmentText
        : item.status === "Rejected"
        ? styles.rejectedAppointmentText
        : {};

    const cancelButtonVisibility =
      item.status === "Pending"
        ? styles.cancelButton
        : styles.hiddenCancelButton;

    const cancelButtonTextStyle =
      item.status === "Pending"
        ? styles.cancelButtonText
        : styles.hiddenCancelButtonText;

    return (
      <View style={containerStyle}>
        <View style={styles.appointmentDetails}>
          <Text style={[styles.appointmentName, textStyle]}>
            {item.firstName} {item.lastName}
          </Text>

          <Text style={[styles.appointmentText, textStyle]}>
            Date: {appointmentDate.toLocaleDateString()} at{" "}
            {appointmentDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </Text>

          <Text style={[styles.appointmentStatus, textStyle]}>
            Status: {item.status}
          </Text>

          <Text style={[styles.plateNumberText, textStyle]}>
            E-Bike Plate: {item.plateNumber || "Not Set"}
          </Text>
        </View>

        <TouchableOpacity
          style={cancelButtonVisibility}
          onPress={() => {
            Alert.alert(
              "Cancel Appointment",
              "Are you sure you want to cancel this appointment?",
              [
                { text: "No", style: "cancel" },
                { text: "Yes", onPress: () => handleCancelAppointment(item.id) }
              ]
            );
          }}
        >
          <Text style={cancelButtonTextStyle}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const plateDisplay =
    Array.isArray(userData.plateNumbers) && userData.plateNumbers.length > 0
      ? userData.plateNumbers.join(", ")
      : userData.plateNumber && userData.plateNumber !== "Not Set"
      ? userData.plateNumber
      : "Not set – you can still schedule an appointment.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>◂ Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Schedule Appointment</Text>

          <View style={styles.headerRightSpace} />
        </View>
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
                    ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
                    : userData.email || "Not set – please update your profile"}
                </Text>
              </View>

              <View style={styles.userInfoRow}>
                <Text style={styles.labelText}>E-Bike Plate Number:</Text>
                <Text style={styles.valueText}>{plateDisplay}</Text>
              </View>
            </View>

            {/* ✅ Schedule New Appointment (ONLY if NO active appointment + not loading) */}
            {!loading && !hasActiveAppointment ? (
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
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (date) setSelectedDate(date);
                    }}
                  />
                )}

                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.pickerButtonText}>
                    Select Time:{" "}
                    {selectedTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </Text>
                </TouchableOpacity>

                {/* 30-min slots */}
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    minuteInterval={30}
                    onChange={(event, time) => {
                      setShowTimePicker(Platform.OS === "ios");
                      if (Platform.OS === "android" && event?.type === "dismissed") return;
                      if (time) setSelectedTime(snapTo30(time));
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
            ) : null}

            {/* Loading indicator (prevents UI flash) */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading appointments...</Text>
              </View>
            ) : null}

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
          !loading ? <Text style={styles.noAppointmentsText}>No appointments</Text> : null
        }
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },

  /* HEADER FIX */
  header: {
    backgroundColor: "#2e7d32",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16
  },
  backButton: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 6
  },
  backText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "white"
  },
  headerRightSpace: { minWidth: 72 },

  content: { padding: 10, paddingBottom: 50 },

  userInfoContainer: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2e7d32"
  },
  userInfoRow: { flexDirection: "row", marginBottom: 5 },
  labelText: { fontWeight: "bold", marginRight: 10, color: "#333" },
  valueText: { color: "#666", flex: 1, flexWrap: "wrap" },

  appointmentContainer: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  pickerButton: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center"
  },
  pickerButtonText: { color: "#2e7d32", fontWeight: "bold" },
  scheduleButton: {
    backgroundColor: "#2e7d32",
    padding: 15,
    borderRadius: 10,
    alignItems: "center"
  },
  scheduleButtonText: { color: "white", fontWeight: "bold", fontSize: 18 },

  pendingAppointmentsContainer: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10
  },

  appointmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10
  },
  approvedAppointmentItem: {
    backgroundColor: "#e8f5e9",
    borderColor: "#2e7d32",
    borderWidth: 1
  },
  rejectedAppointmentItem: {
    backgroundColor: "#ffebee",
    borderColor: "#d32f2f",
    borderWidth: 1
  },

  appointmentDetails: { flex: 1, marginRight: 10 },
  appointmentName: { color: "#333", fontWeight: "bold" },
  appointmentText: { color: "#333", fontWeight: "bold" },
  approvedAppointmentText: { color: "#2e7d32" },
  rejectedAppointmentText: { color: "#d32f2f" },
  appointmentStatus: { marginTop: 5 },
  plateNumberText: { color: "#666", marginTop: 5 },

  cancelButton: { backgroundColor: "#d32f2f", padding: 10, borderRadius: 5 },
  hiddenCancelButton: { display: "none" },
  cancelButtonText: { color: "white", fontWeight: "bold" },
  hiddenCancelButtonText: { display: "none" },

  noAppointmentsText: { color: "#666", textAlign: "center", marginTop: 10 },

  loadingBox: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: { marginTop: 8, color: "#666" }
});
