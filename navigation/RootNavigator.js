
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StartScreen from '../screens/StartScreen';
import HomeScreen from '../screens/HomeScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Start">
      <Stack.Screen name="Start" component={StartScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Book House' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Detaljer' }} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Mina böcker' }} />
    </Stack.Navigator>
  );
}
