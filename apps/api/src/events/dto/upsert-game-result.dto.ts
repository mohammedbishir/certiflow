import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Placement } from '@prisma/client';

export class UpsertGameResultDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsEnum(Placement)
  placement!: Placement;

  @IsOptional()
  @IsString()
  teamLabel?: string;

  @IsOptional()
  @IsBoolean()
  issueCertificate?: boolean;
}
