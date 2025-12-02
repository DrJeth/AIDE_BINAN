import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Dimensions,
  Platform 
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RESPONSIVE = {
  width: SCREEN_WIDTH / 375,
  height: SCREEN_HEIGHT / 812
};

const RiderDetails = ({ route, navigation }) => {
  const { rider } = route.params;

  const detailItems = [
    { icon: 'user', label: 'Full Name', value: rider.name },
    { icon: 'phone', label: 'Contact Number', value: rider.contactNumber || 'Not provided' },
    { icon: 'mail', label: 'Email', value: rider.email || 'Not provided' },
    { icon: 'truck', label: 'Plate Number', value: rider.plateNumber || 'Not assigned' },
    { icon: 'calendar', label: 'Registration Date', value: rider.registrationDate || 'Unknown' },
    { icon: 'check-circle', label: 'Status', value: rider.status || 'Pending' }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rider Profile</Text>
      </View>

      {/* Profile Image */}
      <View style={styles.profileImageContainer}>
        <Image 
          source={{ uri: rider.profileImage || 'https://via.placeholder.com/150' }}
          style={styles.profileImage}
        />
        <Text style={styles.riderName}>{rider.name}</Text>
      </View>

      {/* Details */}
      <ScrollView 
        style={styles.detailsContainer}
        showsVerticalScrollIndicator={false}
      >
        {detailItems.map((item, index) => (
          <View key={index} style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Feather name={item.icon} size={20} color="#2D8E5F" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {rider.status === 'Pending' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.verifyButton]}
          >
            <Feather name="check" size={20} color="white" />
            <Text style={styles.actionButtonText}>Verify Rider</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.actionButton, styles.messageButton]}
        >
          <Feather name="message-circle" size={20} color="white" />
          <Text style={styles.actionButtonText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15 * RESPONSIVE.width,
    paddingBottom: 15 * RESPONSIVE.height,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  backButton: {
    marginRight: 15 * RESPONSIVE.width
  },
  headerTitle: {
    fontSize: 20 * RESPONSIVE.width,
    fontWeight: '700',
    color: '#2C3E50'
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20 * RESPONSIVE.height
  },
  profileImage: {
    width: 150 * RESPONSIVE.width,
    height: 150 * RESPONSIVE.width,
    borderRadius: 75 * RESPONSIVE.width,
    borderWidth: 3,
    borderColor: '#2D8E5F'
  },
  riderName: {
    marginTop: 10 * RESPONSIVE.height,
    fontSize: 22 * RESPONSIVE.width,
    fontWeight: '600',
    color: '#2C3E50'
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 15 * RESPONSIVE.width
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15 * RESPONSIVE.height,
    paddingBottom: 15 * RESPONSIVE.height,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  detailIconContainer: {
    marginRight: 15 * RESPONSIVE.width,
    width: 40 * RESPONSIVE.width,
    height: 40 * RESPONSIVE.width,
    borderRadius: 20 * RESPONSIVE.width,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  detailTextContainer: {
    flex: 1
  },
  detailLabel: {
    fontSize: 14 * RESPONSIVE.width,
    color: '#7F8C8D',
    marginBottom: 5 * RESPONSIVE.height
  },
  detailValue: {
    fontSize: 16 * RESPONSIVE.width,
    color: '#2C3E50',
    fontWeight: '500'
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15 * RESPONSIVE.width,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12 * RESPONSIVE.height,
    borderRadius: 10,
    marginHorizontal: 5 * RESPONSIVE.width
  },
  verifyButton: {
    backgroundColor: '#4CAF50'
  },
  messageButton: {
    backgroundColor: '#2D8E5F'
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 10 * RESPONSIVE.width,
    fontSize: 16 * RESPONSIVE.width,
    fontWeight: '600'
  }
});

export default RiderDetails;