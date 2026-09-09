import * as SQLite from "expo-sqlite";
import { SCHEMA_SQL } from "./schema";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync("junixpulse.db");
  await db.execAsync(SCHEMA_SQL);

  dbInstance = db;
  return dbInstance;
}