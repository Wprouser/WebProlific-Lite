import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ChainsService } from '../services/chains.service';
import { CreateChainDto } from '../dto/create-chain.dto';
import { UpdateChainDto } from '../dto/update-chain.dto';
import { RequestWithAccess } from '../types/request-with-access';
import { assertEffectiveRole, assertHasAccess } from '../guards/assert-effective-role.util';

@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Post()
  create(@Body() dto: CreateChainDto) {
    // No role gate here: chain creation is internal/admin-provisioning
    // (customer onboarding), not a per-tenant RBAC action — there is no
    // existing chain yet to hold a CHAIN_OWNER grant against (spec: FR-00
    // endpoint table, "internal/admin-provisioning use"). Provisioning-level
    // access control belongs to ops tooling, not FR-11's tenant RBAC.
    return this.chainsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: RequestWithAccess) {
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertHasAccess(request, 'chain', id);
    return this.chainsService.findById(id);
  }

  @Get(':id/hierarchy')
  findHierarchy(@Param('id') id: string, @Req() request: RequestWithAccess) {
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertHasAccess(request, 'chain', id);
    return this.chainsService.findHierarchy(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChainDto,
    @Req() request: RequestWithAccess,
  ) {
    // TODO: replace with @Roles() guard once FR-11 is implemented
    assertEffectiveRole(request, 'chain', id, ['CHAIN_OWNER']);
    return this.chainsService.update(id, dto);
  }
}
