import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export const ATTENDING = ['yes', 'maybe', 'no'] as const;
export type Attending = (typeof ATTENDING)[number];

export class CreateRsvpDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsIn(ATTENDING)
  attending!: Attending;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  plusOnes!: number;

  @IsOptional()
  @IsString()
  @Length(0, 280)
  message?: string;
}
