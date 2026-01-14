
import React from 'react';
import { View, Text, Image } from 'react-native';
import CustomButton from '../components/CustomButton';
import { common } from '../styles/common';


export default function StartScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Image source={require('../assets/logabookhouse.png')} style={{ width: 400, height: 400, marginBottom: 20, resizeMode: 'contain' }} />
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#007BFF', marginBottom: 6 }}>Hitta dina favorit böcker</Text>
      <Text style={{ fontSize: 16, color: '#555', marginBottom: 20 }}>Google Books</Text>
      <CustomButton title="🚀 Leta Böcker" onPress={() => navigation.replace('Home')} />
    </View>
  );
}
