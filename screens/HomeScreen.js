// screens/HomeScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import CustomButton from '../components/CustomButton';
import { common } from '../styles/common';
import { searchBooks } from '../services/booksApi';

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);

  const onSearch = async () => {
    if (!query || loading) return;
    // Haptics: tydlig action-känsla vid sök
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setLoading(true);
    try {
      const items = await searchBooks(query, filter);
      setBooks(items);
    } catch (e) {
      console.error(e);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Fel', 'Kunde inte hämta böcker just nu.');
    } finally {
      setLoading(false);
    }
  };

  const onPressFilter = async (f) => {
    setFilter(f);
    // Haptics: mjuk klick-känsla när filter byts
    Haptics.selectionAsync();
  };

  const goFavorites = async () => {
    // Haptics: mjuk klick vid navigation
    Haptics.selectionAsync();
    navigation.navigate('Favorites');
  };

  const openBook = async (item) => {
    Haptics.selectionAsync();
    const info = item.volumeInfo;
    navigation.navigate('BookDetail', { book: { id: item.id, ...info } });
  };

  const renderItem = ({ item }) => {
    const info = item.volumeInfo;
    return (
      <TouchableOpacity style={common.card} onPress={() => openBook(item)}>
        {info.imageLinks?.thumbnail && (
          <Image source={{ uri: info.imageLinks.thumbnail }} style={common.cardImage} />
        )}
        <View style={common.cardContent}>
          <Text style={common.cardTitle}>{info.title}</Text>
          {info.authors && <Text style={common.cardSubtitle}>{info.authors.join(', ')}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={common.container}>
      <Text style={common.header}>📚 Google Books Search</Text>

      <TextInput
        style={common.input}
        placeholder="Sök efter böcker…"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={onSearch} 
      />

      <View style={common.filterRow}>
        {['all', 'title', 'author', 'isbn'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[common.filterButton, filter === f && common.filterButtonActive]}
            onPress={() => onPressFilter(f)}
          >
            <Text style={filter === f ? common.filterTextActive : common.filterText}>
              {f === 'all' ? 'Alla' : f === 'title' ? 'Titel' : f === 'author' ? 'Författare' : 'ISBN'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <CustomButton title="🔎 Sök" onPress={onSearch} />
      <CustomButton title="⭐ Mina böcker" color="#28a745" onPress={goFavorites} />

      {loading && <ActivityIndicator style={{ margin: 16 }} size="large" />}
      <FlatList data={books} keyExtractor={(item) => item.id} renderItem={renderItem} />
    </View>
  );
}