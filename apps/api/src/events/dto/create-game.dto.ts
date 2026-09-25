import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateGameDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
