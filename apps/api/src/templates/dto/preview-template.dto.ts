import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewTemplateDto {
  @IsOptional()
  @IsString()
  sampleName?: string;

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
}
