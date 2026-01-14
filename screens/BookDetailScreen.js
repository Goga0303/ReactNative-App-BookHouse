import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Keyboard,
  Switch,
  Vibration,
} from "react-native";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import CustomButton from "../components/CustomButton";
import { common } from "../styles/common";

export default function BookDetailScreen({ route }) {
  const { book } = route.params;
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  // ---- Anteckningar ----
  const [noteText, setNoteText] = useState("");
  const [notePage, setNotePage] = useState(""); // valfritt
  const [noteKind, setNoteKind] = useState("note"); // 'note' | 'highlight' | 'reflection'
  const [notes, setNotes] = useState([]);

  
  const [savingNote, setSavingNote] = useState(false);

  // ---- Senaste läsning (accordion) ----
  const [progressOpen, setProgressOpen] = useState(true);
  const [lastPage, setLastPage] = useState(""); // valfritt
  const [lastReflection, setLastReflection] = useState(""); // valfritt
  const [alsoCreateNote, setAlsoCreateNote] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [savingProgress, setSavingProgress] = useState(false);

  // Hämta anteckningar
  const loadNotes = useCallback(async () => {
    const rows = await db.getAllAsync(
      "SELECT id, note, createdAt, page, kind FROM book_notes WHERE bookId = ? ORDER BY id DESC;",
      [book.id]
    );
    setNotes(rows || []);
  }, [db, book.id]);

  // Hämta progress/reflektion
  const loadProgress = useCallback(async () => {
    const row = await db.getFirstAsync(
      "SELECT lastPage, lastReflection, updatedAt FROM reading_progress WHERE bookId = ?;",
      [book.id]
    );

    if (row) {
      setLastPage(row.lastPage ? String(row.lastPage) : "");
      setLastReflection(row.lastReflection || "");
      setLastUpdated(row.updatedAt || null);
    } else {
      setLastPage("");
      setLastReflection("");
      setLastUpdated(null);
    }
  }, [db, book.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      loadProgress();
    }, [loadNotes, loadProgress])
  );

  //  Spara anteckning i TRANSACTION + blockera dubbeltryck
  const saveNote = async () => {
    const text = noteText.trim();
    if (!text || savingNote) return;

    setSavingNote(true);
    try {
      const pageNum = notePage ? Number(notePage) : null;

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "INSERT INTO book_notes (bookId, title, note, createdAt, page, kind) VALUES (?, ?, ?, ?, ?, ?);",
          [book.id, book.title || "", text, new Date().toISOString(), pageNum, noteKind]
        );
      });

     
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setNoteText("");
      setNotePage("");
      setNoteKind("note");
      await loadNotes();
      Keyboard.dismiss();
    } catch (err) {
      console.error(err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Fel", "Kunde inte spara anteckning.");
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (id) => {
    try {
      await db.runAsync("DELETE FROM book_notes WHERE id = ?;", [id]);
      await loadNotes();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Fel", "Kunde inte ta bort anteckning.");
    }
  };

  // Spara senaste läsning 
  const saveProgress = async () => {
    try {
      setSavingProgress(true);
      const pageNum = lastPage ? Number(lastPage) : null;
      const nowIso = new Date().toISOString();

      
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `
          INSERT INTO reading_progress (bookId, lastPage, lastReflection, updatedAt)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(bookId) DO UPDATE SET
            lastPage = excluded.lastPage,
            lastReflection = excluded.lastReflection,
            updatedAt = excluded.updatedAt;
          `,
          [book.id, pageNum, lastReflection.trim() || null, nowIso]
        );

        if (alsoCreateNote && lastReflection.trim()) {
          await db.runAsync(
            "INSERT INTO book_notes (bookId, title, note, createdAt, page, kind) VALUES (?, ?, ?, ?, ?, ?);",
            [book.id, book.title || "", lastReflection.trim(), nowIso, pageNum, "reflection"]
          );
        }
      });

      await loadNotes();
      await loadProgress();

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.error(e);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Fel", "Kunde inte spara senaste läsning.");
    } finally {
      setSavingProgress(false);
      Keyboard.dismiss();
    }
  };

  // Favorit + TTS
  const saveToFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem("favorites");
      const favorites = stored ? JSON.parse(stored) : [];
      const exists = favorites.some((f) => f.id === book.id);

      if (!exists) {
        favorites.push(book);
        await AsyncStorage.setItem("favorites", JSON.stringify(favorites));

        // RN vibration
        if (Platform.OS === "android") Vibration.vibrate(60);
        else Vibration.vibrate();

        Alert.alert("Klart", "Boken sparad i favoriter!");
      } else {
        Alert.alert("Obs", "Boken finns redan i favoriter");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Fel", "Kunde inte spara boken.");
    }
  };

  const readBook = () => {
    let text = `${book.title}`;
    if (book.authors) text += `, av ${book.authors.join(", ")}`;
    if (book.description) text += `. Beskrivning: ${book.description}`;
    Speech.speak(text, { language: "sv-SE" });
  };

  // UI helpers
  const KindButton = ({ value, label }) => (
    <TouchableOpacity
      onPress={() => {
        setNoteKind(value);
        Haptics.selectionAsync();
      }}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: noteKind === value ? "#007BFF" : "#ccc",
        backgroundColor: noteKind === value ? "#E8F1FF" : "#fff",
        marginRight: 8,
      }}
    >
      <Text style={{ color: "#111", fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );

  const KindBadge = ({ kind }) => {
    const map = {
      highlight: { bg: "#FFF3CD", label: "Highlight" },
      reflection: { bg: "#E0F7FA", label: "Reflektion" },
      note: { bg: "#E7F5E6", label: "Anteckning" },
    };
    const { bg, label } = map[kind] || map.note;
    return (
      <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
        <Text style={{ fontSize: 12, color: "#333" }}>{label}</Text>
      </View>
    );
  };

  const PageBadge = ({ page }) =>
    page != null ? (
      <View style={{ backgroundColor: "#F0F0F0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
        <Text style={{ fontSize: 12, color: "#333" }}>s. {page}</Text>
      </View>
    ) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
          {/* ===== BOOK META ===== */}
          <Text style={common.detailTitle}>{book.title}</Text>
          {book.imageLinks?.thumbnail && <Image source={{ uri: book.imageLinks.thumbnail }} style={common.detailImage} />}
          {book.authors && <Text style={common.detailText}>👤 {book.authors.join(", ")}</Text>}
          {book.publishedDate && <Text style={common.detailText}>📅 Utgiven: {book.publishedDate}</Text>}
          {book.publisher && <Text style={common.detailText}>🏢 Förlag: {book.publisher}</Text>}
          {book.description && <Text style={common.detailDescription}>{book.description}</Text>}

          {/* ===== SENASTE LÄSNING (Accordion) ===== */}
          <TouchableOpacity
            onPress={() => {
              setProgressOpen((v) => !v);
              Haptics.selectionAsync();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
              paddingVertical: 8,
            }}
          >
            <Text style={common.header}>📖 Senaste läsning</Text>
            <Text style={{ fontSize: 20 }}>{progressOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>

          {progressOpen && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  style={[common.input, { flex: 0.35 }]}
                  placeholder="Senaste sida (valfritt)"
                  value={lastPage}
                  onChangeText={setLastPage}
                  keyboardType="numeric"
                />
                <Text style={{ color: "#555" }}>Sida</Text>
              </View>

              <TextInput
                style={[common.noteInput, { minHeight: 60 }]}
                placeholder="Reflektion (valfritt)…"
                value={lastReflection}
                onChangeText={setLastReflection}
                multiline
              />

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 6 }}>
                <Switch
                  value={alsoCreateNote}
                  onValueChange={(v) => {
                    setAlsoCreateNote(v);
                    Haptics.selectionAsync();
                  }}
                />
                <Text style={{ marginLeft: 8 }}>Skapa anteckning av reflektionen</Text>
              </View>

              {(lastPage || lastReflection || lastUpdated) ? (
                <View
                  style={{
                    marginTop: 6,
                    backgroundColor: "#F5F5FA",
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#E3E3EE",
                  }}
                >
                  <Text style={{ fontWeight: "700", marginBottom: 6 }}>
                    Senast sparat
                    {lastUpdated ? ` • ${new Date(lastUpdated).toLocaleString()}` : ""}
                  </Text>
                  <Text style={{ marginBottom: 4 }}>📄 Sida: {lastPage ? `s. ${lastPage}` : "—"}</Text>
                  {lastReflection ? <Text style={{ color: "#333" }}>💭 {lastReflection}</Text> : null}
                </View>
              ) : null}

              <CustomButton
                title={savingProgress ? "Sparar..." : "Spara senaste läsning"}
                onPress={saveProgress}
                color="#7952b3"
                disabled={savingProgress}
              />
            </>
          )}

          {/* ===== NY ANTECKNING ===== */}
          <Text style={[common.header, { marginTop: 24 }]}>📝 Ny anteckning</Text>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <KindButton value="note" label="Anteckning" />
            <KindButton value="highlight" label="Highlight" />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput
              style={[common.input, { flex: 0.35 }]}
              placeholder="Sida (valfritt)"
              value={notePage}
              onChangeText={setNotePage}
              keyboardType="numeric"
            />
            <Text style={{ color: "#555" }}>Sida</Text>
          </View>

          <TextInput
            style={common.noteInput}
            placeholder={noteKind === "highlight" ? "Citat / text du vill markera…" : "Din anteckning…"}
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />

          {/* knappen blir disabled + "Sparar..." */}
          <CustomButton
            title={savingNote ? "Sparar..." : "Spara anteckning"}
            onPress={saveNote}
            color="#6f42c1"
            disabled={savingNote}
          />

          {/* ===== LISTA ANTECKNINGAR ===== */}
          <Text style={[common.header, { marginTop: 24 }]}>📚 Dina anteckningar</Text>
          {notes.length === 0 ? (
            <Text style={{ opacity: 0.6 }}>Inga anteckningar ännu.</Text>
          ) : (
            notes.map((n) => (
              <View key={n.id} style={common.noteCard}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <KindBadge kind={n.kind || "note"} />
                  <PageBadge page={n.page} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={common.noteText}>{n.note}</Text>
                  <Text style={common.noteMeta}>{new Date(n.createdAt).toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteNote(n.id)}
                  style={{ backgroundColor: "#dc3545", padding: 8, borderRadius: 6, marginLeft: 8 }}
                >
                  <Text style={{ color: "#fff" }}>❌</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* ===== FIXED FOOTER BUTTONS ===== */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 5,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <CustomButton title="⭐ Favorit" onPress={saveToFavorites} color="#28a745" />
          <CustomButton title="🔊 Läs upp" onPress={readBook} color="#007BFF" />
          <CustomButton title="⏹ Stoppa" onPress={() => Speech.stop()} color="#dc3545" />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}