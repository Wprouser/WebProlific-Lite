import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PropertiesService } from '../services/properties.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { RequestWithAccess } from '../types/request-with-access';
import { Roles } from '../../rbac/decorators/roles.decorator';
import { ResourceScope } from '../../rbac/decorators/resource-scope.decorator';
import { AuditLogService } from '../../rbac/services/audit-log.service';

@Controller()
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('chains/:chainId/properties')
  @Roles('CHAIN_OWNER')
  @ResourceScope('chain', 'chainId')
  async create(
    @Param('chainId') chainId: string,
    @Body() dto: CreatePropertyDto,
    @Req() request: RequestWithAccess,
  ) {
    const property = await this.propertiesService.create(chainId, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'CREATE_PROPERTY',
      entityType: 'Property',
      entityId: property.id,
      after: property,
    });
    return property;
  }

  @Get('properties/:id')
  @ResourceScope('property', 'id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findById(id);
  }

  @Patch('properties/:id')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER')
  @ResourceScope('property', 'id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @Req() request: RequestWithAccess,
  ) {
    const before = await this.propertiesService.findById(id);
    const after = await this.propertiesService.update(id, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'UPDATE_PROPERTY',
      entityType: 'Property',
      entityId: id,
      before,
      after,
    });
    return after;
  }
}
