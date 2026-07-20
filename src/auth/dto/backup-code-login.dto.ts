import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class BackupCodeLoginDto {
  @IsString()
  pendingTwoFactorToken!: string;

  @IsString()
  backupCode!: string;

  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}
