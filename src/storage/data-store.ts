/**
 * Storage contract used by every feature module.
 *
 * StorageModule picks SupabaseStore when SUPABASE_URL is set and falls back to
 * local JSON files (JsonFileStore) otherwise — no controller or service has to
 * change either way.
 */
export type Collection = 'rsvps' | 'outfits' | 'photos';

export interface BaseRecord {
  id: string;
  createdAt: string;
}

export type NewRecord<T extends BaseRecord> = Omit<T, 'id' | 'createdAt'>;

export abstract class DataStore {
  abstract list<T extends BaseRecord>(collection: Collection): Promise<T[]>;
  abstract insert<T extends BaseRecord>(collection: Collection, data: NewRecord<T>): Promise<T>;
  /** Inserts, or replaces the row whose `key` matches (case-insensitive). */
  abstract upsertBy<T extends BaseRecord>(
    collection: Collection,
    key: keyof NewRecord<T>,
    data: NewRecord<T>,
  ): Promise<T>;
}

export abstract class FileStore {
  /** Persists an uploaded file and returns its public URL. */
  abstract save(file: Express.Multer.File): Promise<string>;
}
