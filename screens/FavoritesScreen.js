// screens/FavoritesScreen.js
import React, { useState, useCallback } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, Platform, Vibration, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import CustomButton from "../components/CustomButton";
import { common } from "../styles/common";

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const db = useSQLiteContext();

  const loadFavorites = useCallback(async () => {
    const stored = await AsyncStorage.getItem("favorites");
    const list = stored ? JSON.parse(stored) : [];

    // hämta progress för varje bok
    const withProgress = await Promise.all(
      list.map(async (b) => {
        const row = await db.getFirstAsync(
          "SELECT lastPage, updatedAt FROM reading_progress WHERE bookId = ?;",
          [b.id]
        );
        return { ...b, _lastPage: row?.lastPage ?? null, _lastUpdated: row?.updatedAt ?? null };
      })
    );

    setFavorites(withProgress);
  }, [db]);

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  const removeFavorite = async (id) => {
    try {
      // liten premium-klick
      Haptics.selectionAsync();

      const updated = favorites.filter((book) => book.id !== id);
      setFavorites(updated);
      // spara tillbaka utan de extra fälten
      await AsyncStorage.setItem(
        "favorites",
        JSON.stringify(updated.map(({ _lastPage, _lastUpdated, ...b }) => b))
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Fel", "Kunde inte ta bort boken.");
    }
  };

  const clearFavorites = async () => {
    try {
      await AsyncStorage.removeItem("favorites");
      setFavorites([]);

      // 🔔 Samma känsla som när du sparar bok i favoriter
      if (Platform.OS === "android") {
        Vibration.vibrate(60); // kort buzz
      } else {
        Vibration.vibrate();   // iOS: standard "tap"
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Fel", "Kunde inte rensa listan.");
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={common.card}
      onPress={() => navigation.navigate("BookDetail", { book: item })}
    >
      {item.imageLinks?.thumbnail && (
        <Image source={{ uri: item.imageLinks.thumbnail }} style={common.cardImage} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={common.cardTitle}>{item.title}</Text>
        {/* Visa fortsätt-info om finns */}
        {item._lastPage != null && (
          <Text style={common.cardSubtitle}>Fortsätt på s. {item._lastPage}</Text>
        )}
      </View>
      <TouchableOpacity
        style={{ backgroundColor: "#dc3545", padding: 8, borderRadius: 6, marginLeft: 8 }}
        onPress={() => removeFavorite(item.id)}
      >
        <Text style={{ color: "white" }}>Ta bort</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={common.container}>
      <Text style={common.header}>⭐ Mina böcker</Text>
      <CustomButton title="🗑️ Rensa alla" onPress={clearFavorites} color="#dc3545" />
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ opacity: 0.6, marginTop: 12 }}>Inga favoriter ännu.</Text>}
      />
    </View>
  );
}