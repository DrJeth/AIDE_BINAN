// frontend/src/screens/Camera.js
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  ScrollView,
} from "react-native";

/*
  Optional: To enable real camera and gallery upload use one of:
  - expo-image-picker
  - react-native-image-picker
*/

export default function Camera() {
  const [plate, setPlate] = useState("");
  const [fileName, setFileName] = useState("No file chosen");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedUri, setCapturedUri] = useState(null);
  const [isCapturedSaved, setIsCapturedSaved] = useState(false);

  const openFilePicker = async () => {
    setFileName("example.jpg");
    setCapturedUri(null);
    setIsCapturedSaved(false);
    Alert.alert("File picker", "Simulated file chosen: example.jpg");
  };

  const toggleCamera = () => {
    setCameraOpen((v) => !v);
    setCapturedUri(null);
    setIsCapturedSaved(false);
  };

  const captureAndSave = () => {
    if (!cameraOpen) {
      Alert.alert("Camera", "Open the camera first.");
      return;
    }
    setCapturedUri(null);
    setIsCapturedSaved(true);
    Alert.alert("Capture", "Simulated capture saved.");
  };

  const onSubmit = () => {
    const payload = {
      plate: plate.trim(),
      file:
        fileName !== "No file chosen"
          ? fileName
          : capturedUri
          ? "camera-photo"
          : null,
      cameraOpen,
      saved: isCapturedSaved,
    };

    Alert.alert("Submitted", JSON.stringify(payload, null, 2));

    setPlate("");
    setFileName("No file chosen");
    setCapturedUri(null);
    setCameraOpen(false);
    setIsCapturedSaved(false);
  };

  const onCancel = () => {
    setPlate("");
    setFileName("No file chosen");
    setCapturedUri(null);
    setCameraOpen(false);
    setIsCapturedSaved(false);
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.outer}>
        <View style={s.card}>
          <Text style={s.title}>Report Plate</Text>

          <Text style={s.label}>Plate number (manual)</Text>
          <TextInput
            value={plate}
            onChangeText={setPlate}
            placeholder="e.g. ABC-1234"
            placeholderTextColor="#9a9a9a"
            style={s.input}
          />

          <Text style={[s.label, { marginTop: 12 }]}>Upload photo (optional)</Text>

          <View style={s.fileRow}>
            <TouchableOpacity style={s.chooseBtn} onPress={openFilePicker}>
              <Text style={s.chooseTxt}>Choose File</Text>
            </TouchableOpacity>
            <Text style={s.fileName}>{fileName}</Text>
            <TouchableOpacity style={s.openCamBtn} onPress={toggleCamera}>
              <Text style={s.openCamTxt}>
                {cameraOpen ? "Close Camera" : "Open Camera"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.orText}>Or capture using camera</Text>

          <View style={s.cameraBox}>
            {cameraOpen ? (
              capturedUri ? (
                <View style={s.cameraInner}>
                  <Text style={s.cameraText}>(Simulated live camera view)</Text>
                </View>
              ) : isCapturedSaved ? (
                <View style={s.cameraInner}>
                  <Text style={s.cameraText}>Photo captured & saved</Text>
                </View>
              ) : (
                <View style={s.cameraInner}>
                  <Text style={s.cameraText}>Camera ready — press Capture & Save</Text>
                </View>
              )
            ) : (
              <View style={s.cameraInner}>
                <Text style={s.cameraText}>Camera closed</Text>
              </View>
            )}
          </View>

          <View style={s.captureRow}>
            <TouchableOpacity style={s.captureBtn} onPress={captureAndSave}>
              <Text style={s.captureTxt}>Capture & Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.submitBtn} onPress={onSubmit}>
              <Text style={s.submitTxt}>Submit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            If your device has no camera or access denied, use the upload option or
            type the plate number manually.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },

  outer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    width: Math.min(360, 360),
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#fafafa",
    color: "#111",
  },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  chooseBtn: {
    backgroundColor: "#efefef",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chooseTxt: { color: "#333", fontWeight: "700" },

  fileName: { marginLeft: 8, color: "#666", flex: 1 },

  openCamBtn: {
    marginLeft: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#bbb",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openCamTxt: { color: "#333" },

  orText: { marginTop: 6, marginBottom: 6, color: "#666", fontSize: 12 },

  cameraBox: {
    backgroundColor: "#000",
    height: 180,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cameraInner: { alignItems: "center", justifyContent: "center" },
  cameraText: { color: "#fff", fontSize: 14 },

  captureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  captureBtn: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 6,
    alignItems: "center",
  },
  captureTxt: { color: "#fff", fontWeight: "700" },

  submitBtn: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  submitTxt: { color: "#fff", fontWeight: "700" },

  cancelBtn: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  cancelTxt: { color: "#333", fontWeight: "700" },

  hint: { marginTop: 8, color: "#666", fontSize: 12 },
});
