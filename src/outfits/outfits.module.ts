import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { BaseRecord, DataStore } from '../storage/data-store';
import { CreateOutfitDto, OutfitType } from './outfits.dto';

export interface OutfitPick extends BaseRecord {
  name: string;
  outfit: OutfitType;
  color: string;
  accent: string;
  vibe?: string;
}

@Injectable()
export class OutfitsService {
  constructor(private readonly store: DataStore) {}

  async list() {
    const items = await this.store.list<OutfitPick>('outfits');
    const tally = (key: 'outfit' | 'color') =>
      items.reduce<Record<string, number>>((acc, item) => {
        const k = item[key].toLowerCase();
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
    return { items, stats: { byOutfit: tally('outfit'), byColor: tally('color') } };
  }

  create(dto: CreateOutfitDto) {
    // One fit per guest — picking again replaces the previous choice
    return this.store.upsertBy<OutfitPick>('outfits', 'name', {
      name: dto.name.trim(),
      outfit: dto.outfit,
      color: dto.color.toLowerCase(),
      accent: dto.accent.toLowerCase(),
      vibe: dto.vibe?.trim() || undefined,
    });
  }
}

@Controller('outfits')
export class OutfitsController {
  constructor(private readonly outfits: OutfitsService) {}

  @Get()
  list() {
    return this.outfits.list();
  }

  @Post()
  create(@Body() dto: CreateOutfitDto) {
    return this.outfits.create(dto);
  }
}

@Module({ controllers: [OutfitsController], providers: [OutfitsService] })
export class OutfitsModule {}
