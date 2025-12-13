import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { 
  getAuth,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc
} from 'firebase/firestore';
import { app } from '../config/firebaseConfig';

export default function EditProfileModal({ 
  visible, 
  onClose, 
  userData,
  onUpdateUser,
  userRole,
  userDocId   // optional, galing sa Me.js kung meron
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const isRider = userRole === "Rider";

  // kapag nag-open yung modal, i-load yung current userData
  useEffect(() => {
    if (visible) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEmail(userData.email || '');
      setContactNumber(userData.contactNumber || '');
      setAddress(userData.address || '');
    }
  }, [visible, userData]);

  const handleUpdateProfile = async () => {
    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    if (!isRider) {
      if (!firstName || !lastName) {
        Alert.alert('Error', 'First Name and Last Name are required');
        return;
      }
    }

    setLoading(true);

    try {
      const auth = getAuth(app);
      const db = getFirestore(app);
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No authenticated user');
      }

      const docIdToUse = userDocId || user.uid;
      const userDocRef = doc(db, 'users', docIdToUse);
      const roleToPersist = userRole || userData.role || 'Rider';

      let emailChanged = false;

      // 1) Kung nagbago ang email, send verification link sa NEW email
      if (email !== user.email) {
        await verifyBeforeUpdateEmail(user, email);
        emailChanged = true;
      }

      // 2) Ihanda yung data na i-sa-save sa Firestore
      let updateData = {};

      if (isRider) {
        updateData = {
          email,
          contactNumber,
          role: roleToPersist,
        };
      } else {
        updateData = {
          firstName,
          lastName,
          email,
          contactNumber,
          address,
          role: roleToPersist,
        };
      }

      console.log('Updating with data:', updateData);

      // 3) Save sa Firestore (merge, para hindi mabura ibang fields)
      await setDoc(userDocRef, updateData, { merge: true });

      // 4) I-update local state sa Me.js
      const updatedUserData = {
        firstName: isRider ? userData.firstName : firstName,
        lastName: isRider ? userData.lastName : lastName,
        email,
        contactNumber,
        address: isRider ? userData.address : address,
        profileImage: userData.profileImage,
        role: roleToPersist,
      };

      onUpdateUser(updatedUserData);

      const successMessage = emailChanged
        ? 'We sent a verification link to your NEW email. Please open that email and click the link before using it to log in.'
        : 'Profile updated successfully';

      Alert.alert('Success', successMessage);
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);

      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Security check needed',
          'For your security, please log out, then log in again with your current email and password, and try changing your email once more.'
        );
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Dark background overlay */}
      <View style={styles.modalContainer}>
        {/* Ito na yung nag-aadjust pag may keyboard */}
        <KeyboardAvoidingView
          style={styles.avoidView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
            </View>

            {/* Scrollable form para di matabunan fields at buttons */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {isRider ? (
                <>
                  {/* Rider: Email + Contact only */}
                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Contact Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Contact Number"
                      value={contactNumber}
                      onChangeText={setContactNumber}
                      keyboardType="phone-pad"
                    />
                  </View>
                </>
              ) : (
                <>
                  {/* Admin: full fields */}
                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="First Name"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>

                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Last Name"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>

                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Contact Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Contact Number"
                      value={contactNumber}
                      onChangeText={setContactNumber}
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Address */}
                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      placeholder="Address"
                      value={address}
                      onChangeText={setAddress}
                      multiline
                    />
                  </View>
                </>
              )}

              {/* Extra spacer para may pagitan sa buttons kapag naka-keyboard */}
              <View style={{ height: 12 }} />
            </ScrollView>

            {/* Buttons – laging visible, aangat kasama ng card */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // dark overlay
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // center yung card, pero nag-aadjust pag may keyboard
  avoidView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  formScroll: {
    maxHeight: 400, // para scrollable yung fields kung maliit screen
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12, // may konting space bago buttons
  },
  fieldWrapper: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2e7d32',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});