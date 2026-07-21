import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  // Same rationale as CreateItemDto.outletId — no route param to source it
  // from, so it belongs in the body.
  @IsString()
  outletId!: string;
}
