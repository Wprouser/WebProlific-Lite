import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateChainDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @IsString()
  subscriptionPlan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
