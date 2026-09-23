import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { TemplateType } from '@prisma/client';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @IsOptional()
  @IsString()
  backgroundUrl?: string;

  @IsOptional()
  @IsString()
  titleText?: string;

  @IsOptional()
  @IsString()
  subtitleText?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  nameXPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  nameYPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(8)
  @Max(120)
  nameFontSize?: number;

  @IsOptional()
  @IsString()
  nameColor?: string;

  @IsOptional()
  @IsObject()
  designJson?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
