import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Placement } from '@prisma/client';

export class UpdateCertificateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /** Sports placement certificates only */
  @IsOptional()
  @IsEnum(Placement)
  placement?: Placement;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  teamLabel?: string | null;
}
