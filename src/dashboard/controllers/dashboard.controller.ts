import { Controller, Get, Param, Req } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';

/**
 * No `@Roles()`/`@ResourceScope()` — flat routes, same reasoning as
 * Transfers/Items/PurchaseOrders: authorization is enforced inside
 * DashboardService via assert*Access once the resource's scope (outlet/
 * property/chain) is known. Read-only, so no AuditLog entries — same as
 * GET /outlets.
 */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('outlet/:outletId')
  getOutlet(@Req() request: RequestWithAccess, @Param('outletId') outletId: string) {
    return this.dashboardService.getOutletDashboard(request, outletId);
  }

  @Get('property/:propertyId')
  getProperty(@Req() request: RequestWithAccess, @Param('propertyId') propertyId: string) {
    return this.dashboardService.getPropertyDashboard(request, propertyId);
  }

  @Get('chain/:chainId')
  getChain(@Req() request: RequestWithAccess, @Param('chainId') chainId: string) {
    return this.dashboardService.getChainDashboard(request, chainId);
  }
}
