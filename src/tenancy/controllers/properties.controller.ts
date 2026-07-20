import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PropertiesService } from '../services/properties.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { RequestWithAccess } from '../types/request-with-access';
import { assertEffectiveRole, assertHasAccess } from '../guards/assert-effective-role.util';

@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post('chains/:chainId/properties')
  create(
    @Param('chainId') chainId: string,
    @Body() dto: CreatePropertyDto,
    @Req() request: RequestWithAccess,
  ) {
    // Only CHAIN_OWNER can create properties (spec: FR-00 Business Logic).
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertEffectiveRole(request, 'chain', chainId, ['CHAIN_OWNER']);
    return this.propertiesService.create(chainId, dto);
  }

  @Get('properties/:id')
  findOne(@Param('id') id: string, @Req() request: RequestWithAccess) {
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertHasAccess(request, 'property', id);
    return this.propertiesService.findById(id);
  }

  @Patch('properties/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @Req() request: RequestWithAccess,
  ) {
    // CHAIN_OWNER (any property in their chain) or PROPERTY_MANAGER (their
    // own property only, via roleForProperty) — spec: FR-00 Business Logic.
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertEffectiveRole(request, 'property', id, ['CHAIN_OWNER', 'PROPERTY_MANAGER']);
    return this.propertiesService.update(id, dto);
  }
}
