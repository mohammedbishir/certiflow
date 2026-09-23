import { IsString, MinLength } from 'class-validator';

export class ImportParticipantsDto {
  @IsString()
  @MinLength(3)
  csv!: string;
}
