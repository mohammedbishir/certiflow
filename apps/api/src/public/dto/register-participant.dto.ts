import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterParticipantDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
