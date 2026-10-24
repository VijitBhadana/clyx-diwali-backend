import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { BaseRecord, Collection, DataStore, FileStore, NewRecord } from './data-store';

const BUCKET = 'party-photos';

let client: SupabaseClient | undefined;

/** One shared client, authenticated with the secret key so it bypasses RLS. */
function supabase() {
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

// Missing optional fields go in as null so an upsert clears them, and come back
// out as absent so the API responses look exactly like the JSON store's
function toRow(data: object) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [toSnake(k), v ?? null]));
}

function fromRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [toCamel(k), v]),
  ) as T;
}

/** Escapes LIKE wildcards so `ilike` acts as a case-insensitive equals. */
const exact = (value: string) => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class SupabaseStore extends DataStore {
  async list<T extends BaseRecord>(collection: Collection): Promise<T[]> {
    const { data, error } = await supabase()
      .from(collection)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((row) => fromRow<T>(row));
  }

  async insert<T extends BaseRecord>(collection: Collection, data: NewRecord<T>): Promise<T> {
    const { data: row, error } = await supabase()
      .from(collection)
      .insert(toRow(data))
      .select()
      .single();
    if (error) throw error;
    return fromRow<T>(row);
  }

  async upsertBy<T extends BaseRecord>(
    collection: Collection,
    key: keyof NewRecord<T>,
    data: NewRecord<T>,
    retried = false,
  ): Promise<T> {
    const column = toSnake(String(key));
    const { data: existing, error } = await supabase()
      .from(collection)
      .select('id')
      .ilike(column, exact(String(data[key]).trim()))
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (existing) {
      const { data: row, error: updateError } = await supabase()
        .from(collection)
        .update(toRow(data))
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError) throw updateError;
      return fromRow<T>(row);
    }

    try {
      return await this.insert<T>(collection, data);
    } catch (e) {
      // Someone with the same name got in between the lookup and the insert
      // (unique index on lower(name)) — go round once more as an update
      if (!retried && (e as { code?: string }).code === '23505') {
        return this.upsertBy<T>(collection, key, data, true);
      }
      throw e;
    }
  }
}

/** Pushes the file Multer wrote to ./uploads into the public bucket, then removes the local copy. */
@Injectable()
export class SupabaseFileStore extends FileStore {
  async save(file: Express.Multer.File): Promise<string> {
    const storage = supabase().storage.from(BUCKET);
    const { error } = await storage.upload(file.filename, await fs.readFile(file.path), {
      contentType: file.mimetype,
    });
    await fs.rm(file.path, { force: true });
    if (error) throw error;
    return storage.getPublicUrl(file.filename).data.publicUrl;
  }
}
