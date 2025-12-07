
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './navigation/RootNavigator';
import { SQLiteProvider } from 'expo-sqlite';
import { initDbAsync } from './db/sqlite';

export default function App() {
  return (
    <SQLiteProvider databaseName="bookhouse.db" onInit={initDbAsync}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SQLiteProvider>
  );
}
