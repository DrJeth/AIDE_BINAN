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
  TouchableWithoutFeedback,
  Image
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
  getAuth,
  verifyBeforeUpdateEmail
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  setDoc
} from 'firebase/firestore';

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

import { app } from '../config/firebaseConfig';

const DEFAULT_AVATAR = require('../../assets/me.png');

export default function EditProfileModal({
  visible,
  onClose,
  userData,
  onUpdateUser,
  userRole,
  userDocId // optional
}) {
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Profile photo states
  const [pickedPhotoUri, setPickedPhotoUri] = useState(null); // local uri
  const [previewPhotoUri, setPreviewPhotoUri] = useState(null); // show in UI

  // ✅ Guards to prevent "reset/jump" while typing
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Create a stable "key" for the user (prevents re-init for same user)
  const userKey = useMemo(() => {
    return String(userDocId || userData?.uid || userData?.id || userData?.email || '');
  }, [userDocId, userData?.uid, userData?.id, userData?.email]);

  // ===== VALIDATION HELPERS =====
  const normalizeEmail = (value) => (value || '').trim().toLowerCase();
  const isValidGmail = (value) => /^[a-z0-9._%+-]+@gmail\.com$/.test(normalizeEmail(value));

  const normalizePhone = (value) => (value || '').replace(/\D/g, ''); // digits only
  const isValidPhonePH = (value) => /^09\d{9}$/.test(normalizePhone(value)); // 11 digits, starts 09

  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  const handleSafeClose = () => {
    if (loading) return;
    onClose?.();
  };

  // When modal opens/closes, reset init flags
  useEffect(() => {
    if (visible) {
      setInitialized(false);
      setDirty(false);
    } else {
      setInitialized(false);
      setDirty(false);
      setLoading(false);
      setPickedPhotoUri(null);
    }
  }, [visible]);

  // ✅ Initialize fields ONLY ONCE per modal open, and only if user isn't typing
  useEffect(() => {
    if (!visible) return;
    if (initialized) return;
    if (dirty) return;

    const u = userData || {};
    const hasAny = !!u.email || !!u.contactNumber || !!u.profileImage;

    // If userData is still empty (loading), wait
    if (!hasAny) return;

    setEmail(normalizeEmail(u.email || ''));
    setContactNumber(normalizePhone(u.contactNumber || ''));
    setPreviewPhotoUri(u.profileImage || null);

    setInitialized(true);
  }, [visible, initialized, dirty, userKey, userData]);

  // ✅ Convert local file URI to Blob (reliable in RN/Expo)
  const uriToBlob = async (uri) => {
    return await new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Failed to convert image to blob'));
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      } catch (e) {
        reject(e);
      }
    });
  };

  // ✅ Pick image from gallery
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access to change your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      markDirty();
      setPickedPhotoUri(uri);
      setPreviewPhotoUri(uri);
    } catch (e) {
      console.log('Pick photo error:', e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // ✅ Upload to Firebase Storage (returns downloadURL + path)
  const uploadProfilePhoto = async (localUri, uid) => {
    const storage = getStorage(app);

    const blob = await uriToBlob(localUri);

    const filename = `profile_${Date.now()}.jpg`;
    const path = `profile_images/${uid}/${filename}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);

    try { blob.close?.(); } catch {}

    return { url, path };
  };

  const handleUpdateProfile = async () => {
    // ✅ sanitize values before validate/save
    const nextEmail = normalizeEmail(email);
    const nextPhone = normalizePhone(contactNumber);

    if (!nextEmail) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    if (!isValidGmail(nextEmail)) {
      Alert.alert('Invalid Email', 'Email must be a valid @gmail.com and all lowercase.');
      return;
    }

    if (!nextPhone) {
      Alert.alert('Error', 'Contact Number is required');
      return;
    }

    if (!isValidPhonePH(nextPhone)) {
      Alert.alert('Invalid Number', 'Phone number must start with 09 and must be 11 digits.');
      return;
    }

    setLoading(true);

    try {
      const auth = getAuth(app);
      const db = getFirestore(app);
      const storage = getStorage(app);
      const user = auth.currentUser;

      if (!user) throw new Error('No authenticated user');

      const docIdToUse = userDocId || user.uid;
      const userDocRef = doc(db, 'users', docIdToUse);
      const roleToPersist = userRole || userData?.role || 'Rider';

      let emailChanged = false;

      // ✅ If email changed, send verification link
      if (nextEmail !== ((user.email || '').trim().toLowerCase())) {
        await verifyBeforeUpdateEmail(user, nextEmail);
        emailChanged = true;
      }

      // ✅ If new photo picked, upload and save URL
      let uploadedPhotoUrl = null;
      let uploadedPhotoPath = null;

      if (pickedPhotoUri) {
        const uploaded = await uploadProfilePhoto(pickedPhotoUri, user.uid);
        uploadedPhotoUrl = uploaded.url;
        uploadedPhotoPath = uploaded.path;

        // ✅ OPTIONAL: delete old photo if stored
        if (userData?.profileImagePath) {
          try {
            await deleteObject(ref(storage, userData.profileImagePath));
          } catch (e) {
            console.log('Old photo delete skipped:', e?.message);
          }
        }
      }

      // ✅ ONLY these fields are allowed to change
      const updateData = {
        email: nextEmail,
        contactNumber: nextPhone,
        role: roleToPersist,
      };

      if (uploadedPhotoUrl) {
        updateData.profileImage = uploadedPhotoUrl;
        updateData.profileImagePath = uploadedPhotoPath;
      }

      await setDoc(userDocRef, updateData, { merge: true });

      // ✅ Update local state (Me.js) without changing name/address
      const updatedUserData = {
        ...userData,
        email: nextEmail,
        contactNumber: nextPhone,
        role: roleToPersist,
        profileImage: uploadedPhotoUrl ? uploadedPhotoUrl : userData?.profileImage,
        profileImagePath: uploadedPhotoPath ? uploadedPhotoPath : userData?.profileImagePath,
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

              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ✅ Profile Photo */}
                <View style={styles.photoBlock}>
                  <Image
                    source={
                      previewPhotoUri
                        ? { uri: previewPhotoUri }
                        : (userData?.profileImage ? { uri: userData.profileImage } : DEFAULT_AVATAR)
                    }
                    style={styles.avatar}
                  />
                  <TouchableOpacity
                    style={[styles.photoBtn, loading && { opacity: 0.6 }]}
                    onPress={handlePickPhoto}
                    disabled={loading}
                  >
                    <Text style={styles.photoBtnText}>Change Photo</Text>
                  </TouchableOpacity>
                </View>

                {/* ✅ Email */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="example@gmail.com"
                    value={email}
                    onChangeText={(t) => {
                      markDirty();
                      setEmail(normalizeEmail(t)); // ✅ auto lowercase
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.hint}>Must be @gmail.com (lowercase)</Text>
                </View>

                {/* ✅ Contact Number */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09xxxxxxxxx"
                    value={contactNumber}
                    onChangeText={(t) => {
                      markDirty();
                      setContactNumber(normalizePhone(t)); // ✅ digits only
                    }}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                  <Text style={styles.hint}>Starts with 09, 11 digits</Text>
                </View>

                <View style={{ height: 12 }} />
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

  // ✅ FIXED: no more huge height
  modalContent: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',

    // ✅ keeps it compact
    maxHeight: '62%',
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

  // ✅ FIXED: removed flex:1 so it won’t stretch
  formScroll: {},
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },

  photoBlock: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#f5f5f5',
  },
  photoBtn: {
    marginTop: 10,
    backgroundColor: '#2e7d32',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  photoBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  fieldWrapper: {
    marginBottom: 12,
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
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#777'
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
