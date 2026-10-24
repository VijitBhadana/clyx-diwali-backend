import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BaseRecord, DataStore, FileStore } from '../storage/data-store';
import { CreatePhotoDto, Phase, PHASES } from './photos.dto';

export interface Photo extends BaseRecord {
  url: string;
  uploader: string;
  phase: Phase;
  caption?: string;
}

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^image\/(jpe?g|png|webp|gif|heic|heif)$/;

@Injectable()
export class PhotosService {
  constructor(
    private readonly store: DataStore,
    private readonly files: FileStore,
  ) {}

  async list(phase?: Phase) {
    const rows = await this.store.list<Photo>('photos');
    return phase ? rows.filter((p) => p.phase === phase) : rows;
  }

  async create(file: Express.Multer.File, dto: CreatePhotoDto) {
    const url = await this.files.save(file);
    return this.store.insert<Photo>('photos', {
      url,
      uploader: dto.uploader.trim(),
      phase: dto.phase,
      caption: dto.caption?.trim() || undefined,
    });
  }
}

@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get()
  list(@Query('phase') phase?: string) {
    if (phase && !PHASES.includes(phase as Phase)) {
      throw new BadRequestException('phase must be "before" or "after"');
    }
    return this.photos.list(phase as Phase | undefined);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase() || '.jpg'}`),
      }),
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) =>
        ALLOWED.test(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Only image files are allowed'), false),
    }),
  )
  create(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: CreatePhotoDto) {
    if (!file) throw new BadRequestException('Attach an image in the "file" field');
    return this.photos.create(file, dto);
  }
}

@Module({ controllers: [PhotosController], providers: [PhotosService] })
export class PhotosModule {}
