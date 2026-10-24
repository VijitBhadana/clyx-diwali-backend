import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { BaseRecord, Collection, DataStore, NewRecord } from './data-store';

@Injectable()
export class JsonFileStore extends DataStore {
  private readonly dir = join(process.cwd(), 'data');
  // Writes are chained per collection so concurrent requests never clobber the file
  private queues = new Map<Collection, Promise<unknown>>();

  private file(collection: Collection) {
    return join(this.dir, `${collection}.json`);
  }

  private async read<T>(collection: Collection): Promise<T[]> {
    try {
      return JSON.parse(await fs.readFile(this.file(collection), 'utf8')) as T[];
    } catch {
      return [];
    }
  }

  private async write<T>(collection: Collection, rows: T[]) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file(collection), JSON.stringify(rows, null, 2));
  }

  private enqueue<R>(collection: Collection, task: () => Promise<R>): Promise<R> {
    const next = (this.queues.get(collection) ?? Promise.resolve()).then(task, task);
    this.queues.set(collection, next.catch(() => undefined));
    return next;
  }

  private stamp<T extends BaseRecord>(data: NewRecord<T>): T {
    return { ...data, id: randomUUID(), createdAt: new Date().toISOString() } as T;
  }

  async list<T extends BaseRecord>(collection: Collection): Promise<T[]> {
    const rows = await this.read<T>(collection);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  insert<T extends BaseRecord>(collection: Collection, data: NewRecord<T>): Promise<T> {
    return this.enqueue(collection, async () => {
      const rows = await this.read<T>(collection);
      const row = this.stamp<T>(data);
      rows.push(row);
      await this.write(collection, rows);
      return row;
    });
  }

  upsertBy<T extends BaseRecord>(
    collection: Collection,
    key: keyof NewRecord<T>,
    data: NewRecord<T>,
  ): Promise<T> {
    return this.enqueue(collection, async () => {
      const rows = await this.read<T>(collection);
      const wanted = String(data[key]).trim().toLowerCase();
      const idx = rows.findIndex(
        (r) => String((r as NewRecord<T>)[key]).trim().toLowerCase() === wanted,
      );
      const row = idx === -1 ? this.stamp<T>(data) : { ...rows[idx], ...data };
      if (idx === -1) rows.push(row);
      else rows[idx] = row;
      await this.write(collection, rows);
      return row;
    });
  }
}
