import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateChainDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @IsString()
  subscriptionPlan?: string;
}
