import { registerRootComponent } from 'expo';
import { Alert, Platform } from 'react-native';
import App from './App';

// Conditional Updates import
let Updates;
try {
  Updates = require('expo-updates');
} catch (error) {
  Updates = {
    reload: () => {
      if (Platform.OS === 'web') {
        window.location.reload();
      } else {
        console.log('Manual app restart may be required');
      }
    }
  };
}

// Global error handler
const globalErrorHandler = (error, isFatal) => {
  console.error('Uncaught error', error);
  
  if (isFatal) {
    Alert.alert(
      'Unexpected Error',
      'An unexpected error occurred. Please restart the app.',
      [{ 
        text: 'Restart', 
        onPress: () => {
          try {
            Updates.reload();
          } catch {
            console.log('Update reload failed');
          }
        } 
      }]
    );
  }
};

// Set global error handler
if (ErrorUtils) {
  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Call previous handler if it exists
    if (previousHandler) {
      previousHandler(error, isFatal);
    }
    
    // Call our global error handler
    globalErrorHandler(error, isFatal);
  });
}

// Register the root component
registerRootComponent(App);