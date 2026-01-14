// db/sqlite.js
export async function initDbAsync(db) {
  // Grundtabell
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
  `);

  // Skapa tabeller (anpassa om du redan har dessa)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS book_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookId TEXT NOT NULL,
      title TEXT,
      note TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      page INTEGER,
      kind TEXT
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      bookId TEXT PRIMARY KEY,
      lastPage INTEGER,
      lastReflection TEXT,
      updatedAt TEXT NOT NULL
    );
  `);
}
