import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { BaseRecord, DataStore } from '../storage/data-store';
import { Attending, CreateRsvpDto } from './rsvp.dto';

export interface Rsvp extends BaseRecord {
  name: string;
  attending: Attending;
  plusOnes: number;
  message?: string;
}

@Injectable()
export class RsvpService {
  constructor(private readonly store: DataStore) {}

  async summary() {
    const rows = await this.store.list<Rsvp>('rsvps');
    const going = rows.filter((r) => r.attending === 'yes');
    return {
      total: rows.length,
      headcount: going.reduce((sum, r) => sum + 1 + r.plusOnes, 0),
      counts: {
        yes: going.length,
        maybe: rows.filter((r) => r.attending === 'maybe').length,
        no: rows.filter((r) => r.attending === 'no').length,
      },
      // Only names + notes go public, never anything else people typed
      wall: rows
        .filter((r) => r.attending !== 'no')
        .slice(0, 40)
        .map(({ id, name, attending, message, createdAt }) => ({ id, name, attending, message, createdAt })),
    };
  }

  create(dto: CreateRsvpDto) {
    // Same name RSVPing again just updates their answer
    return this.store.upsertBy<Rsvp>('rsvps', 'name', {
      name: dto.name.trim(),
      attending: dto.attending,
      plusOnes: dto.plusOnes,
      message: dto.message?.trim() || undefined,
    });
  }
}

@Controller('rsvp')
export class RsvpController {
  constructor(private readonly rsvp: RsvpService) {}

  @Get()
  summary() {
    return this.rsvp.summary();
  }

  @Post()
  create(@Body() dto: CreateRsvpDto) {
    return this.rsvp.create(dto);
  }
}

@Module({ controllers: [RsvpController], providers: [RsvpService] })
export class RsvpModule {}
