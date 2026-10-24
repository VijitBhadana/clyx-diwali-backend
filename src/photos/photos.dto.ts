import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export const PHASES = ['before', 'after'] as const;
export type Phase = (typeof PHASES)[number];

/** Text fields that travel alongside the multipart `file` field. */
export class CreatePhotoDto {
  @IsString()
  @Length(1, 60)
  uploader!: string;

  @IsIn(PHASES)
  phase!: Phase;

  @IsOptional()
  @IsString()
  @Length(0, 140)
  caption?: string;
}
