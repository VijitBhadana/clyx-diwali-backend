import { IsHexColor, IsIn, IsOptional, IsString, Length } from 'class-validator';

export const OUTFITS = [
  'lehenga',
  'saree',
  'anarkali',
  'sharara',
  'kurta',
  'sherwani',
  'nehru-jacket',
  'indo-western',
] as const;
export type OutfitType = (typeof OUTFITS)[number];

export class CreateOutfitDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsIn(OUTFITS)
  outfit!: OutfitType;

  @IsHexColor()
  color!: string;

  @IsHexColor()
  accent!: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  vibe?: string;
}
