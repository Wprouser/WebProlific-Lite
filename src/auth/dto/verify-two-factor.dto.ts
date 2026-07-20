import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VerifyTwoFactorDto {
  @IsString()
  pendingTwoFactorToken!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}
