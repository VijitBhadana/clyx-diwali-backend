import { Global, Module } from '@nestjs/common';
import { DataStore, FileStore } from './data-store';
import { JsonFileStore } from './json-file.store';
import { LocalFileStore } from './local-file.store';
import { SupabaseFileStore, SupabaseStore } from './supabase.store';

// Factories run after ConfigModule has loaded .env, so the check sees SUPABASE_URL
const useSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

@Global()
@Module({
  providers: [
    // Supabase when it is configured, local JSON files + ./uploads otherwise
    {
      provide: DataStore,
      useFactory: () => (useSupabase() ? new SupabaseStore() : new JsonFileStore()),
    },
    {
      provide: FileStore,
      useFactory: () => (useSupabase() ? new SupabaseFileStore() : new LocalFileStore()),
    },
  ],
  exports: [DataStore, FileStore],
})
export class StorageModule {}
