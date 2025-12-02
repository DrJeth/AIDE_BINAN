import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { getAuth } from 'firebase/auth';
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
  userRole
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Update state when modal opens or userData changes
  useEffect(() => {
    if (visible) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEmail(userData.email || '');
      setContactNumber(userData.contactNumber || '');
      setAddress(userData.address || '');
    }
  }, [visible, userData]);

  const isRider = userRole === "Rider";

  const handleUpdateProfile = async () => {
    // Validation
    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    // Non-riders must fill all fields
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

      const userDocRef = doc(db, 'users', user.uid);

      // Prepare update object based on role
      let updateData = {};

      if (isRider) {
        // Riders can only update email and contactNumber
        updateData = {
          email,
          contactNumber,
        };
      } else {
        // Admins can update everything
        updateData = {
          firstName,
          lastName,
          email,
          contactNumber,
          address,
        };
      }

      console.log("Updating with data:", updateData);

      // Use setDoc with merge to create or update document
      // This handles the case where the document doesn't exist yet
      await setDoc(userDocRef, updateData, { merge: true });

      // Update local state
      const updatedUserData = {
        firstName: isRider ? userData.firstName : firstName,
        lastName: isRider ? userData.lastName : lastName,
        email,
        contactNumber,
        address: isRider ? userData.address : address,
        profileImage: userData.profileImage
      };

      onUpdateUser(updatedUserData);

      Alert.alert('Success', 'Profile updated successfully');
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message);
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
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
          </View>

          {/* Form Content */}
          <View style={styles.formContainer}>
            {/* Show different fields based on role */}
            {isRider ? (
              <>
                {/* Riders only see email and contactNumber */}
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
                {/* Admins see all fields */}
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
          </View>

          {/* Buttons */}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
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
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: 400,
  },
  fieldWrapper: {
    marginBottom: 16,
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