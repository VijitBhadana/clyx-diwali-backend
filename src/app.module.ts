import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { OutfitsModule } from './outfits/outfits.module';
import { PhotosModule } from './photos/photos.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    RsvpModule,
    OutfitsModule,
    PhotosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
