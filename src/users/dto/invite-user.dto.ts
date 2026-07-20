import { Type } from 'class-transformer';
import { ArrayMinSize, IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';
import { GrantDto } from './grant.dto';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrantDto)
  grants!: GrantDto[];
}
