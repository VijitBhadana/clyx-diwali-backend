import { Injectable } from '@nestjs/common';
import { FileStore } from './data-store';

/**
 * Multer already writes the file into ./uploads (see PhotosModule), so this
 * only turns it into a public URL. A Supabase version would push the file to
 * a storage bucket and return the bucket's public URL instead.
 */
@Injectable()
export class LocalFileStore extends FileStore {
  async save(file: Express.Multer.File): Promise<string> {
    const base = process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
    return `${base}/uploads/${file.filename}`;
  }
}
