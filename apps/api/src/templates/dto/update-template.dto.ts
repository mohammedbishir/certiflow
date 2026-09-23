import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
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
  @IsBoolean()
  isActive?: boolean;
}
