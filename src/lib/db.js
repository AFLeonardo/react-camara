export const DB_NAME = 'apuntes.db';

/** Se ejecuta en <SQLiteProvider onInit> antes de mostrar las pantallas. */
export async function migrateDb(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS analisis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      image_uri TEXT,
      titulo TEXT NOT NULL,
      data TEXT NOT NULL,
      puntaje INTEGER,
      total INTEGER
    );
  `);
}

export async function saveAnalysis(db, { imageUri, data }) {
  const result = await db.runAsync(
    'INSERT INTO analisis (fecha, image_uri, titulo, data) VALUES (?, ?, ?, ?)',
    [new Date().toISOString(), imageUri ?? null, data.titulo, JSON.stringify(data)]
  );
  return result.lastInsertRowId;
}

export async function getAnalysis(db, id) {
  const row = await db.getFirstAsync('SELECT * FROM analisis WHERE id = ?', [Number(id)]);
  if (!row) return null;
  try {
    return { ...row, data: JSON.parse(row.data) };
  } catch {
    return null;
  }
}

export function listAnalyses(db) {
  return db.getAllAsync(
    'SELECT id, fecha, image_uri, titulo, puntaje, total FROM analisis ORDER BY id DESC',
    []
  );
}

export function saveScore(db, id, puntaje, total) {
  return db.runAsync('UPDATE analisis SET puntaje = ?, total = ? WHERE id = ?', [
    puntaje,
    total,
    Number(id),
  ]);
}

export function deleteAnalysis(db, id) {
  return db.runAsync('DELETE FROM analisis WHERE id = ?', [Number(id)]);
}
