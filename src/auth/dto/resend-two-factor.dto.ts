import { IsString } from 'class-validator';

export class ResendTwoFactorDto {
  @IsString()
  pendingTwoFactorToken!: string;
}
