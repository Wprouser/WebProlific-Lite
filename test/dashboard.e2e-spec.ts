import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/services/password.service';
import { TokenService } from '../src/auth/services/token.service';

/**
 * Exercises FR-08's consolidated-dashboard acceptance criteria end-to-end
 * against a real (test) SQL Server database — in particular the literal
 * reconciliation criterion ("property figures = sum of its outlets'
 * figures; chain figures = sum of its properties' figures") and the
 * source-side-only "transfers in transit" design that makes that criterion
 * actually hold for a transfer between two outlets of the same property
 * (see TransferRepository.countInTransitFromOutlets).
 */
describe('Consolidated Dashboard (FR-08) e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let tokenService: TokenService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    passwordService = app.get(PasswordService);
    tokenService = app.get(TokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.transferLine.deleteMany();
    await prisma.stockTransfer.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.pOLineTaxComponent.deleteMany();
    await prisma.pOLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.transactionLog.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.stockTransaction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.unitOfMeasure.deleteMany();
    await prisma.category.deleteMany();
    await prisma.userAccess.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.property.deleteMany();
    await prisma.chain.deleteMany();
    await prisma.user.deleteMany();
  });

  const api = () => request(app.getHttpServer());
  let seq = 0;

  async function actor(email: string, scopeType: 'CHAIN' | 'PROPERTY' | 'OUTLET', scopeId: string, role: string) {
    const user = await prisma.user.create({
      data: { email, passwordHash: await passwordService.hash('Passw0rd!123') },
    });
    await prisma.userAccess.create({ data: { userId: user.id, scopeType, scopeId, role } });
    return tokenService.signAccessToken(user.id);
  }

  /** Two outlets under propertyA, one outlet under propertyB, all under one
   * chain — enough to exercise outlet/property/chain reconciliation. */
  async function fixture(outletABaseCurrency = 'SAR') {
    const chain = await prisma.chain.create({ data: { name: `Chain ${++seq}`, baseCurrency: 'SAR' } });
    const propertyA = await prisma.property.create({ data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' } });
    const propertyB = await prisma.property.create({ data: { chainId: chain.id, name: 'Riyadh Hotel', type: 'HOTEL' } });
    const outletA1 = await prisma.outlet.create({
      data: { propertyId: propertyA.id, chainId: chain.id, name: 'Jeddah Main Kitchen', type: 'KITCHEN', baseCurrency: outletABaseCurrency },
    });
    const outletA2 = await prisma.outlet.create({
      data: { propertyId: propertyA.id, chainId: chain.id, name: 'Jeddah Poolside Bar', type: 'BAR' },
    });
    const outletB1 = await prisma.outlet.create({
      data: { propertyId: propertyB.id, chainId: chain.id, name: 'Riyadh Main Kitchen', type: 'KITCHEN' },
    });
    return { chain, propertyA, propertyB, outletA1, outletA2, outletB1 };
  }

  const categoryAndUnitByOutlet = new Map<string, Promise<{ categoryId: string; unitId: string }>>();

  /** Category/UnitOfMeasure names are unique per outlet — cached so
   * multiple items at the same outlet don't collide on a second insert. */
  function categoryAndUnit(outletId: string) {
    let cached = categoryAndUnitByOutlet.get(outletId);
    if (!cached) {
      cached = (async () => {
        const category = await prisma.category.create({ data: { name: 'Dry Goods', outletId } });
        const unit = await prisma.unitOfMeasure.create({ data: { name: 'Kilogram', abbreviation: 'kg', outletId } });
        return { categoryId: category.id, unitId: unit.id };
      })();
      categoryAndUnitByOutlet.set(outletId, cached);
    }
    return cached;
  }

  async function item(outletId: string, overrides: Record<string, unknown> = {}) {
    const { categoryId: catId, unitId: unId } = await categoryAndUnit(outletId);
    return prisma.item.create({
      data: {
        outletId,
        categoryId: catId,
        unitId: unId,
        name: 'Basmati Rice',
        sku: `SKU-${String(++seq).padStart(4, '0')}`,
        minStock: '10.000',
        maxStock: '100.000',
        currentStock: '10.000',
        costPrice: '8.50',
        ...overrides,
      },
    });
  }

  async function supplier(outletId: string) {
    return prisma.supplier.create({ data: { outletId, name: 'Al-Fahad Trading' } });
  }

  // -------------------------------------------------------------- access

  it('AC: OUTLET_MANAGER, PROPERTY_MANAGER and CHAIN_OWNER can view an outlet dashboard; STORE_STAFF and CHEF cannot', async () => {
    const { outletA1 } = await fixture();
    for (const role of ['OUTLET_MANAGER', 'PROPERTY_MANAGER', 'CHAIN_OWNER']) {
      const token = await actor(`${role.toLowerCase()}@example.com`, 'OUTLET', outletA1.id, role);
      await api().get(`/api/v1/dashboard/outlet/${outletA1.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    }
    for (const role of ['STORE_STAFF', 'CHEF']) {
      const token = await actor(`${role.toLowerCase()}@example.com`, 'OUTLET', outletA1.id, role);
      await api().get(`/api/v1/dashboard/outlet/${outletA1.id}`).set('Authorization', `Bearer ${token}`).expect(403);
    }
  });

  it('AC: property dashboard requires PROPERTY_MANAGER-or-above; an OUTLET_MANAGER (even at every outlet) is refused', async () => {
    const { propertyA, outletA1, outletA2 } = await fixture();
    const outletManagerToken = await actor('om@example.com', 'OUTLET', outletA1.id, 'OUTLET_MANAGER');
    await prisma.userAccess.create({ data: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'om@example.com' } })).id, scopeType: 'OUTLET', scopeId: outletA2.id, role: 'OUTLET_MANAGER' } });
    await api().get(`/api/v1/dashboard/property/${propertyA.id}`).set('Authorization', `Bearer ${outletManagerToken}`).expect(403);

    const pmToken = await actor('pm@example.com', 'PROPERTY', propertyA.id, 'PROPERTY_MANAGER');
    await api().get(`/api/v1/dashboard/property/${propertyA.id}`).set('Authorization', `Bearer ${pmToken}`).expect(200);
  });

  it('AC: chain dashboard requires CHAIN_OWNER; a PROPERTY_MANAGER is refused', async () => {
    const { chain, propertyA } = await fixture();
    const pmToken = await actor('pm2@example.com', 'PROPERTY', propertyA.id, 'PROPERTY_MANAGER');
    await api().get(`/api/v1/dashboard/chain/${chain.id}`).set('Authorization', `Bearer ${pmToken}`).expect(403);

    const ownerToken = await actor('owner@example.com', 'CHAIN', chain.id, 'CHAIN_OWNER');
    await api().get(`/api/v1/dashboard/chain/${chain.id}`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
  });

  // -------------------------------------------------------------- metrics

  it('reports real stock valuation and active item count for an outlet', async () => {
    const { outletA1 } = await fixture();
    await item(outletA1.id, { currentStock: '10.000', costPrice: '8.50' }); // 85.00
    await item(outletA1.id, { currentStock: '4.000', costPrice: '25.00' }); // 100.00
    await item(outletA1.id, { currentStock: '2.000', costPrice: '5.00', isActive: false }); // 10.00, inactive

    const token = await actor('om3@example.com', 'OUTLET', outletA1.id, 'OUTLET_MANAGER');
    const res = await api().get(`/api/v1/dashboard/outlet/${outletA1.id}`).set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.activeItemCount).toBe(2);
    expect(res.body.stockValuation).toBe('195.00'); // inactive item's stock still counts toward valuation
    expect(res.body.currency).toBe('SAR');
    expect(res.body.isConverted).toBe(false);
  });

  it('reflects a real open low-stock alert and a real pending PO approval', async () => {
    const { outletA1 } = await fixture();
    const lowStockItem = await item(outletA1.id, { currentStock: '2.000', minStock: '10.000' });
    const sup = await supplier(outletA1.id);
    const token = await actor('om4@example.com', 'OUTLET', outletA1.id, 'OUTLET_MANAGER');

    // Nudge the FR-07 listener: a stock-out transaction below minimum
    // raises the alert (fire-and-forget), so poll briefly for it.
    await api()
      .post('/api/v1/stock-transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemId: lowStockItem.id, type: 'USAGE_OUT', quantity: '1.000' })
      .expect(201);
    for (let i = 0; i < 20; i++) {
      const count = await prisma.alert.count({ where: { outletId: outletA1.id, status: 'OPEN' } });
      if (count > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    await api()
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ outletId: outletA1.id, supplierId: sup.id, lines: [{ itemId: lowStockItem.id, orderedQty: '20', expectedPrice: '8.50' }] })
      .expect(201);
    const po = await prisma.purchaseOrder.findFirstOrThrow({ where: { outletId: outletA1.id } });
    await api()
      .patch(`/api/v1/purchase-orders/${po.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await api().get(`/api/v1/dashboard/outlet/${outletA1.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.openLowStockAlerts).toBe(1);
    expect(res.body.pendingPoApprovals).toBe(1);
  });

  // ------------------------------------------------------- reconciliation

  it('AC: property-level figures equal the sum of its outlets\' figures, even across an intra-property transfer in transit', async () => {
    const { propertyA, outletA1, outletA2 } = await fixture();
    await item(outletA1.id, { currentStock: '10.000', costPrice: '10.00' }); // 100.00 at A1
    const a2Item = await item(outletA2.id, { currentStock: '5.000', costPrice: '4.00' }); // 20.00 at A2

    const ownerToken = await actor('owner2@example.com', 'PROPERTY', propertyA.id, 'PROPERTY_MANAGER');
    // A transfer between two outlets of the SAME property — this is the
    // scenario that would double-count under an "either side" definition.
    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ sourceOutletId: outletA2.id, destOutletId: outletA1.id, lines: [{ itemId: a2Item.id, quantity: '2.000' }] })
      .expect(201);
    await api()
      .patch(`/api/v1/transfers/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const [dashA1, dashA2, dashProperty] = await Promise.all([
      api().get(`/api/v1/dashboard/outlet/${outletA1.id}`).set('Authorization', `Bearer ${ownerToken}`),
      api().get(`/api/v1/dashboard/outlet/${outletA2.id}`).set('Authorization', `Bearer ${ownerToken}`),
      api().get(`/api/v1/dashboard/property/${propertyA.id}`).set('Authorization', `Bearer ${ownerToken}`),
    ]);

    // A2 dispatched it (source) -> 1; A1 is only the destination -> 0.
    expect(dashA1.body.transfersInTransit).toBe(0);
    expect(dashA2.body.transfersInTransit).toBe(1);
    expect(dashProperty.body.transfersInTransit).toBe(dashA1.body.transfersInTransit + dashA2.body.transfersInTransit);

    expect(dashProperty.body.activeItemCount).toBe(dashA1.body.activeItemCount + dashA2.body.activeItemCount);
    expect(Number(dashProperty.body.stockValuation)).toBeCloseTo(
      Number(dashA1.body.stockValuation) + Number(dashA2.body.stockValuation),
      2,
    );
    expect(dashProperty.body.openLowStockAlerts).toBe(dashA1.body.openLowStockAlerts + dashA2.body.openLowStockAlerts);
    expect(dashProperty.body.pendingPoApprovals).toBe(dashA1.body.pendingPoApprovals + dashA2.body.pendingPoApprovals);
  });

  it('AC: chain-level figures equal the sum of its properties\' figures', async () => {
    const { chain, propertyA, propertyB, outletA1, outletB1 } = await fixture();
    await item(outletA1.id, { currentStock: '10.000', costPrice: '10.00' });
    await item(outletB1.id, { currentStock: '3.000', costPrice: '6.00' });

    const ownerToken = await actor('owner3@example.com', 'CHAIN', chain.id, 'CHAIN_OWNER');
    const [dashPropertyA, dashPropertyB, dashChain] = await Promise.all([
      api().get(`/api/v1/dashboard/property/${propertyA.id}`).set('Authorization', `Bearer ${ownerToken}`),
      api().get(`/api/v1/dashboard/property/${propertyB.id}`).set('Authorization', `Bearer ${ownerToken}`),
      api().get(`/api/v1/dashboard/chain/${chain.id}`).set('Authorization', `Bearer ${ownerToken}`),
    ]);

    expect(dashChain.body.activeItemCount).toBe(dashPropertyA.body.activeItemCount + dashPropertyB.body.activeItemCount);
    expect(Number(dashChain.body.stockValuation)).toBeCloseTo(
      Number(dashPropertyA.body.stockValuation) + Number(dashPropertyB.body.stockValuation),
      2,
    );
    expect(dashChain.body.transfersInTransit).toBe(
      dashPropertyA.body.transfersInTransit + dashPropertyB.body.transfersInTransit,
    );
  });

  // --------------------------------------------------------------- FX

  it('AC: converts a member outlet\'s valuation to the chain reporting currency and flags it as converted', async () => {
    const { propertyA, outletA1 } = await fixture('AED');
    await prisma.exchangeRate.create({
      data: { baseCurrency: 'AED', targetCurrency: 'SAR', rate: '1.020000', source: 'MANUAL' },
    });
    await item(outletA1.id, { currentStock: '10.000', costPrice: '10.00' }); // 100.00 AED

    const ownerToken = await actor('owner4@example.com', 'PROPERTY', propertyA.id, 'PROPERTY_MANAGER');
    const res = await api()
      .get(`/api/v1/dashboard/property/${propertyA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(res.body.currency).toBe('SAR');
    expect(res.body.isConverted).toBe(true);
    expect(res.body.stockValuation).toBe('102.00'); // 100.00 AED * 1.02
  });
});
