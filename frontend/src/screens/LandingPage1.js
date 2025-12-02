import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  ImageBackground
} from 'react-native';

import bgImage from "../../assets/pg1.png";

function LandingPage1({ navigation }) {
  return (
    <View style={styles.container}>
      <ImageBackground 
        source={bgImage} 
        style={styles.bgImage} 
        resizeMode="cover"
      >

        <View style={styles.bottomButton}>
          <Text 
            style={styles.bottomButtonText}
            onPress={() => navigation.navigate("LandingPage2")}
          >
            Get Started
          </Text>
        </View>

      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  bgImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  bottomButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "#1E7D32",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
  },

  bottomButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default LandingPage1;
