import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { GrantDto } from './grant.dto';

export class UpdateAccessDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrantDto)
  add?: GrantDto[];

  /** UserAccess row ids to remove. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeGrantIds?: string[];
}
