/**
 * Client SQLite avec système de migrations versionnées.
 *
 * Principe : chaque migration est numérotée et exécutée exactement une fois.
 * La table `_migrations` conserve l'historique des migrations appliquées.
 * Une migration déjà appliquée ne sera jamais réexécutée (idempotence garantie).
 *
 * BR-022 : les changements de schéma passent par migration.
 * BR-018 : les données locales doivent survivre au redémarrage de l'application.
 */

import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Retourne l'instance SQLite unique de l'application.
 * Initialise la base et applique les migrations manquantes au premier appel.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync('junixpulse.db');

  // Activer les clés étrangères (SQLite les désactive par défaut)
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Activer le WAL mode pour de meilleures performances en lecture concurrente
  await db.execAsync('PRAGMA journal_mode = WAL;');

  await runMigrations(db);

  dbInstance = db;
  return dbInstance;
}

/**
 * Réinitialise l'instance (utile pour les tests uniquement).
 * Ne doit jamais être appelé en production.
 */
export function resetDatabaseInstance(): void {
  dbInstance = null;
}

/**
 * Exécute toutes les migrations non encore appliquées, dans l'ordre.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Créer la table de suivi des migrations si elle n'existe pas
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Récupérer les versions déjà appliquées
  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(applied.map(r => r.version));

  // Appliquer les migrations manquantes dans l'ordre
  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.runAsync(
        'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        new Date().toISOString()
      );
    });
  }
}
