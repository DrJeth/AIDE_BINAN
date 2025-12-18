import React, { useState, useEffect, useMemo } from 'react';
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
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback
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
  userDocId // optional
}) {
  const isRider = userRole === 'Rider';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Guards to prevent "reset/jump" while typing
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Create a stable "key" for the user (prevents re-init for same user)
  const userKey = useMemo(() => {
    return String(userDocId || userData?.uid || userData?.id || userData?.email || '');
  }, [userDocId, userData?.uid, userData?.id, userData?.email]);

  // When modal opens/closes, reset init flags
  useEffect(() => {
    if (visible) {
      setInitialized(false);
      setDirty(false);
    } else {
      setInitialized(false);
      setDirty(false);
      setLoading(false);
    }
  }, [visible]);

  // ✅ Initialize fields ONLY ONCE per modal open, and only if user isn't typing
  useEffect(() => {
    if (!visible) return;
    if (initialized) return;
    if (dirty) return;

    const u = userData || {};
    const hasAny =
      !!u.email ||
      !!u.firstName ||
      !!u.lastName ||
      !!u.contactNumber ||
      !!u.address;

    // If userData is still empty (loading), wait a bit (do not initialize yet)
    if (!hasAny) return;

    setFirstName(u.firstName || '');
    setLastName(u.lastName || '');
    setEmail(u.email || '');
    setContactNumber(u.contactNumber || '');
    setAddress(u.address || '');

    setInitialized(true);
  }, [visible, initialized, dirty, userKey, userData]);

  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  const handleSafeClose = () => {
    if (loading) return;
    onClose?.();
  };

  const handleUpdateProfile = async () => {
    if (!email?.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    if (!isRider) {
      if (!firstName?.trim() || !lastName?.trim()) {
        Alert.alert('Error', 'First Name and Last Name are required');
        return;
      }
    }

    setLoading(true);

    try {
      const auth = getAuth(app);
      const db = getFirestore(app);
      const user = auth.currentUser;

      if (!user) throw new Error('No authenticated user');

      const docIdToUse = userDocId || user.uid;
      const userDocRef = doc(db, 'users', docIdToUse);
      const roleToPersist = userRole || userData?.role || 'Rider';

      const nextEmail = email.trim();
      let emailChanged = false;

      // ✅ Send verification link only if email actually changed
      if (nextEmail !== (user.email || '')) {
        await verifyBeforeUpdateEmail(user, nextEmail);
        emailChanged = true;
      }

      // ✅ Data to merge into Firestore
      const updateData = isRider
        ? {
            email: nextEmail,
            contactNumber: contactNumber || '',
            role: roleToPersist,
          }
        : {
            firstName: firstName || '',
            lastName: lastName || '',
            email: nextEmail,
            contactNumber: contactNumber || '',
            address: address || '',
            role: roleToPersist,
          };

      await setDoc(userDocRef, updateData, { merge: true });

      // ✅ Update local state (Me.js)
      const updatedUserData = {
        firstName: isRider ? (userData?.firstName || '') : firstName,
        lastName: isRider ? (userData?.lastName || '') : lastName,
        email: nextEmail,
        contactNumber: contactNumber || '',
        address: isRider ? (userData?.address || '') : address,
        profileImage: userData?.profileImage,
        role: roleToPersist,
      };

      onUpdateUser?.(updatedUserData);

      Alert.alert(
        'Success',
        emailChanged
          ? 'We sent a verification link to your NEW email. Please open that email and click the link before using it to log in.'
          : 'Profile updated successfully'
      );

      onClose?.();
    } catch (error) {
      console.error('Profile update error:', error);

      if (error?.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Security check needed',
          'For your security, please log out, then log in again with your current email and password, and try changing your email once more.'
        );
      } else {
        Alert.alert('Error', error?.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleSafeClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={styles.avoidView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
              </View>

              {/* ✅ Scroll area (no hard maxHeight) */}
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {isRider ? (
                  <>
                    <View style={styles.fieldWrapper}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={(t) => {
                          markDirty();
                          setEmail(t);
                        }}
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
                        onChangeText={(t) => {
                          markDirty();
                          setContactNumber(t);
                        }}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.fieldWrapper}>
                      <Text style={styles.label}>First Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="First Name"
                        value={firstName}
                        onChangeText={(t) => {
                          markDirty();
                          setFirstName(t);
                        }}
                      />
                    </View>

                    <View style={styles.fieldWrapper}>
                      <Text style={styles.label}>Last Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Last Name"
                        value={lastName}
                        onChangeText={(t) => {
                          markDirty();
                          setLastName(t);
                        }}
                      />
                    </View>

                    <View style={styles.fieldWrapper}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={(t) => {
                          markDirty();
                          setEmail(t);
                        }}
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
                        onChangeText={(t) => {
                          markDirty();
                          setContactNumber(t);
                        }}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <View style={styles.fieldWrapper}>
                      <Text style={styles.label}>Address</Text>
                      <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Address"
                        value={address}
                        onChangeText={(t) => {
                          markDirty();
                          setAddress(t);
                        }}
                        multiline
                      />
                    </View>
                  </>
                )}

                {/* ✅ extra padding so last field isn’t cramped near buttons */}
                <View style={{ height: 18 }} />
              </ScrollView>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleSafeClose}
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
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  avoidView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    height: '85%',
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
  },

  formScroll: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
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
