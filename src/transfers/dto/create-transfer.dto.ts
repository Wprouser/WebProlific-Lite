import { Type } from 'class-transformer';
import { ArrayMinSize, IsString, ValidateNested } from 'class-validator';
import { CreateTransferLineDto } from './create-transfer-line.dto';

export class CreateTransferDto {
  @IsString()
  sourceOutletId!: string;

  @IsString()
  destOutletId!: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransferLineDto)
  lines!: CreateTransferLineDto[];
}
