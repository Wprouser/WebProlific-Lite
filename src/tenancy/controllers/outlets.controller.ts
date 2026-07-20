import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { OutletsService } from '../services/outlets.service';
import { CreateOutletDto } from '../dto/create-outlet.dto';
import { UpdateOutletDto } from '../dto/update-outlet.dto';
import { RequestWithAccess } from '../types/request-with-access';
import { assertEffectiveRole, assertHasAccess } from '../guards/assert-effective-role.util';

@Controller()
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Post('properties/:propertyId/outlets')
  create(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateOutletDto,
    @Req() request: RequestWithAccess,
  ) {
    // CHAIN_OWNER or PROPERTY_MANAGER (of this property) can add outlets to
    // it — property-level management authority per spec: FR-00 Business Logic.
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertEffectiveRole(request, 'property', propertyId, [
      'CHAIN_OWNER',
      'PROPERTY_MANAGER',
    ]);
    return this.outletsService.create(propertyId, dto);
  }

  @Get('outlets/:id')
  findOne(@Param('id') id: string, @Req() request: RequestWithAccess) {
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertHasAccess(request, 'outlet', id);
    return this.outletsService.findById(id);
  }

  @Patch('outlets/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOutletDto,
    @Req() request: RequestWithAccess,
  ) {
    // CHAIN_OWNER, PROPERTY_MANAGER (inherited via their property), or
    // OUTLET_MANAGER (of this outlet directly) — spec: FR-00 Business Logic.
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertEffectiveRole(request, 'outlet', id, [
      'CHAIN_OWNER',
      'PROPERTY_MANAGER',
      'OUTLET_MANAGER',
    ]);
    return this.outletsService.update(id, dto);
  }
}
