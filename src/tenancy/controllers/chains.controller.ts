import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ChainsService } from '../services/chains.service';
import { CreateChainDto } from '../dto/create-chain.dto';
import { UpdateChainDto } from '../dto/update-chain.dto';
import { RequestWithAccess } from '../types/request-with-access';
import { Roles } from '../../rbac/decorators/roles.decorator';
import { ResourceScope } from '../../rbac/decorators/resource-scope.decorator';
import { AuditLogService } from '../../rbac/services/audit-log.service';

@Controller('chains')
export class ChainsController {
  constructor(
    private readonly chainsService: ChainsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  async create(@Body() dto: CreateChainDto, @Req() request: RequestWithAccess) {
    // No role gate here: chain creation is internal/admin-provisioning
    // (customer onboarding), not a per-tenant RBAC action — there is no
    // existing chain yet to hold a CHAIN_OWNER grant against (spec: FR-00
    // endpoint table, "internal/admin-provisioning use"). Provisioning-level
    // access control belongs to ops tooling, not FR-11's tenant RBAC.
    const chain = await this.chainsService.create(dto);
    if (request.user?.id) {
      await this.auditLogService.record({
        userId: request.user.id,
        action: 'CREATE_CHAIN',
        entityType: 'Chain',
        entityId: chain.id,
        after: chain,
      });
    }
    return chain;
  }

  @Get(':id')
  @ResourceScope('chain', 'id')
  findOne(@Param('id') id: string) {
    return this.chainsService.findById(id);
  }

  @Get(':id/hierarchy')
  @ResourceScope('chain', 'id')
  findHierarchy(@Param('id') id: string) {
    return this.chainsService.findHierarchy(id);
  }

  @Patch(':id')
  @Roles('CHAIN_OWNER')
  @ResourceScope('chain', 'id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChainDto,
    @Req() request: RequestWithAccess,
  ) {
    const before = await this.chainsService.findById(id);
    const after = await this.chainsService.update(id, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'UPDATE_CHAIN',
      entityType: 'Chain',
      entityId: id,
      before,
      after,
    });
    return after;
  }
}
