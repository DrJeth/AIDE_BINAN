import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView
} from 'react-native';

export default function TermsService({ 
  visible, 
  onClose 
}) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Terms of Service</Text>
          
          <ScrollView style={styles.scrollContent}>
            <Text style={styles.paragraph}>
              {`This summary is provided for convenience. Please review the Terms of Service below for important information and legal conditions that apply to your use of the A.I.D.E. Biñan (AI Detection and Enforcement for Electric Bicycle Compliance) application. The system is intended to assist the City of Biñan in monitoring, detecting, and enforcing e-bike regulations using artificial intelligence to promote public safety and responsible riding.`}
            </Text>

            <Text style={styles.sectionTitle}>1. USE OF APPLICATION</Text>
            <Text style={styles.paragraph}>
              {`By using the A.I.D.E. Biñan app, you agree to these Terms of Service and all applicable laws. You must use the system only for lawful, authorized purposes and avoid any misuse, tampering, or unauthorized data access. All enforcement actions and official decisions remain under the authority of human officers and government agencies.`}
            </Text>

            <Text style={styles.sectionTitle}>2. DATA COLLECTION AND PRIVACY</Text>
            <Text style={styles.paragraph}>
              {`The system may collect images, plate numbers, timestamps, and location details for e-bike compliance and traffic monitoring. All data gathered is handled according to the Data Privacy Act of 2012 (RA 10173) and used only for official enforcement and reporting. Personal or unrelated data is not shared with any third party.`}
            </Text>

            <Text style={styles.sectionTitle}>3. LIMITATIONS AND ACCURACY</Text>
            <Text style={styles.paragraph}>
              {`While the system uses advanced AI detection, performance may vary due to lighting, weather, or camera conditions. A.I.D.E. Biñan does not guarantee 100% accuracy in detection or reporting. The application serves as a tool to support, not replace, official human enforcement.`}
            </Text>

            <Text style={styles.sectionTitle}>4. USER RESPONSIBILITIES</Text>
            <Text style={styles.paragraph}>
              {`Users are required to:
- Comply with local e-bike regulations
- Ensure proper vehicle registration and documentation
- Maintain safe riding practices
- Cooperate with local enforcement authorities
- Report any system malfunctions or inaccuracies`}
            </Text>

            <Text style={styles.sectionTitle}>5. SYSTEM ACCESS</Text>
            <Text style={styles.paragraph}>
              {`Access to the A.I.D.E. Biñan system is a privilege, not a right. The City of Biñan reserves the right to:
- Modify or terminate the service
- Restrict or revoke user access
- Update terms of service without prior notice
- Investigate potential misuse or violations`}
            </Text>

            <Text style={styles.sectionTitle}>6. DISCLAIMER</Text>
            <Text style={styles.paragraph}>
              {`The A.I.D.E. Biñan application is provided "as is" without any warranties. The City of Biñan is not liable for any direct, indirect, incidental, or consequential damages arising from the use of this system.`}
            </Text>

            <Text style={styles.sectionTitle}>7. CONTACT INFORMATION</Text>
            <Text style={styles.paragraph}>
              {`For any questions, concerns, or feedback regarding the A.I.D.E. Biñan system, please contact:
Email: support@binan.gov.ph
Phone: (049) XXX-XXXX
Address: City Hall of Biñan, Laguna`}
            </Text>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '90%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2e7d32',
    textAlign: 'center'
  },
  scrollContent: {
    marginBottom: 20
  },
  paragraph: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
    color: '#333'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginTop: 15,
    marginBottom: 10
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%'
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#2e7d32'
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '500'
  }
});