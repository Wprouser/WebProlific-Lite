import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/services/password.service';
import { TokenService } from '../src/auth/services/token.service';

/**
 * Exercises FR-08's acceptance criteria end-to-end against a real (test) SQL
 * Server database, plus its FR-18 (ActivityLog/TransactionLog) and FR-07
 * (low-stock alert) wiring. Requires: docker compose up -d && npm run
 * prisma:migrate:test && npm run test:e2e (targets webprolific_test via
 * test/env-setup.ts, never the dev database).
 */
describe('Multi-Outlet Transfer (FR-08) e2e', () => {
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
    // FR-07: a stock movement below minimum raises an Alert, whose itemId
    // is a real FK — so alerts clear before the items they point at.
    await prisma.alert.deleteMany();
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
    return { userId: user.id, token: tokenService.signAccessToken(user.id) };
  }

  /** Two outlets under one property, plus one outlet under a second
   * property — enough to exercise both the same-property and
   * cross-property paths from a single fixture. */
  async function twoPropertyFixture() {
    const chain = await prisma.chain.create({ data: { name: `Chain ${++seq}` } });
    const propertyA = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });
    const propertyB = await prisma.property.create({
      data: { chainId: chain.id, name: 'Riyadh Hotel', type: 'HOTEL' },
    });
    const outletA1 = await prisma.outlet.create({
      data: { propertyId: propertyA.id, chainId: chain.id, name: 'Jeddah Main Kitchen', type: 'KITCHEN' },
    });
    const outletA2 = await prisma.outlet.create({
      data: { propertyId: propertyA.id, chainId: chain.id, name: 'Jeddah Poolside Bar', type: 'BAR' },
    });
    const outletB1 = await prisma.outlet.create({
      data: { propertyId: propertyB.id, chainId: chain.id, name: 'Riyadh Main Kitchen', type: 'KITCHEN' },
    });
    return { chain, propertyA, propertyB, outletA1, outletA2, outletB1 };
  }

  async function categoryAndUnit(outletId: string, unitAbbreviation = 'kg') {
    const category = await prisma.category.create({ data: { name: 'Dry Goods', outletId } });
    const unit = await prisma.unitOfMeasure.create({
      data: { name: unitAbbreviation === 'kg' ? 'Kilogram' : 'Litre', abbreviation: unitAbbreviation, outletId },
    });
    return { category, unit };
  }

  async function item(
    outletId: string,
    categoryId: string,
    unitId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return prisma.item.create({
      data: {
        outletId,
        categoryId,
        unitId,
        name: 'Basmati Rice',
        sku: `SKU-${String(++seq).padStart(4, '0')}`,
        minStock: '10.000',
        maxStock: '100.000',
        currentStock: '50.000',
        costPrice: '8.50',
        ...overrides,
      },
    });
  }

  async function stockOf(itemId: string) {
    return (await prisma.item.findUniqueOrThrow({ where: { id: itemId } })).currentStock.toFixed(3);
  }

  // ------------------------------------------------------------------ AC 1

  it('AC: STORE_STAFF cannot create a transfer', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    await categoryAndUnit(ctx.outletA2.id).then(({ category: c, unit: u }) => item(ctx.outletA2.id, c.id, u.id));

    const { token } = await actor('staff@example.com', 'OUTLET', ctx.outletA1.id, 'STORE_STAFF');
    await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(403);
  });

  it('AC: CHEF cannot create a transfer', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    await categoryAndUnit(ctx.outletA2.id).then(({ category: c, unit: u }) => item(ctx.outletA2.id, c.id, u.id));

    const { token } = await actor('chef@example.com', 'OUTLET', ctx.outletA1.id, 'CHEF');
    await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(403);
  });

  it('an OUTLET_MANAGER can create a same-property transfer', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const response = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    expect(response.body).toMatchObject({ status: 'REQUESTED' });
    expect(response.body.lines[0].destItemId).toBeDefined();
  });

  // ------------------------------------------------------------------ AC 2

  it('AC: a transfer across properties is blocked for a plain OUTLET_MANAGER', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletB1.id);
    await item(ctx.outletB1.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const rejected = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletB1.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(403);
    expect(rejected.body.message).toMatch(/insufficient access to destination outlet/i);
  });

  it('AC: a cross-property transfer succeeds for a CHAIN_OWNER whose access spans both outlets', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletB1.id);
    await item(ctx.outletB1.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('owner@example.com', 'CHAIN', ctx.chain.id, 'CHAIN_OWNER');
    await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletB1.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);
  });

  it('a PROPERTY_MANAGER with grants on both properties can cross them', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletB1.id);
    await item(ctx.outletB1.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const user = await prisma.user.create({
      data: { email: 'dual@example.com', passwordHash: await passwordService.hash('Passw0rd!123') },
    });
    await prisma.userAccess.create({
      data: { userId: user.id, scopeType: 'PROPERTY', scopeId: ctx.propertyA.id, role: 'PROPERTY_MANAGER' },
    });
    await prisma.userAccess.create({
      data: { userId: user.id, scopeType: 'PROPERTY', scopeId: ctx.propertyB.id, role: 'PROPERTY_MANAGER' },
    });
    const token = tokenService.signAccessToken(user.id);

    await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletB1.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);
  });

  // ---------------------------------------------------------- destItemId gap

  it('AC (gap-fill): auto-resolves the destination item by name when omitted', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, { name: 'Basmati Rice' });
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    const destItem = await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id, {
      name: 'Basmati Rice',
    });

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const response = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    expect(response.body.lines[0].destItemId).toBe(destItem.id);
  });

  it('AC (gap-fill): rejects a line whose destination item cannot be resolved, naming it', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, { name: 'Truffle Oil' });
    // Destination has no matching catalogue entry at all.
    await categoryAndUnit(ctx.outletA2.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const rejected = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(400);
    expect(rejected.body.message).toContain('Truffle Oil');
  });

  it('AC (gap-fill): rejects a line whose source and destination items use different units', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id, 'kg');
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, { name: 'Basmati Rice' });
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id, 'L');
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id, { name: 'Basmati Rice' });

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const rejected = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(400);
    expect(rejected.body.message).toMatch(/different units/);
  });

  // ------------------------------------------------------------------ AC 3

  it('AC: dispatching decrements source stock; receiving increments destination stock — two independent, auditable rows', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, { currentStock: '50.000' });
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    const destItem = await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id, {
      currentStock: '20.000',
    });

    const { token, userId } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    // Same manager also has access at the destination outlet in this test,
    // via a chain grant, so the same actor can dispatch and receive.
    await prisma.userAccess.create({
      data: { userId, scopeType: 'OUTLET', scopeId: ctx.outletA2.id, role: 'OUTLET_MANAGER' },
    });

    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000', destItemId: destItem.id }],
      })
      .expect(201);
    const transferId = created.body.id;
    const lineId = created.body.lines[0].id;

    const dispatched = await api()
      .patch(`/api/v1/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(dispatched.body.status).toBe('IN_TRANSIT');
    expect(await stockOf(sourceItem.id)).toBe('45.000');
    // Not yet received — destination is untouched.
    expect(await stockOf(destItem.id)).toBe('20.000');

    const received = await api()
      .patch(`/api/v1/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ transferLineId: lineId, actualReceivedQty: '5.000' }] })
      .expect(200);
    expect(received.body.status).toBe('RECEIVED');
    expect(await stockOf(destItem.id)).toBe('25.000');

    // Two independent StockTransaction rows referencing this transfer.
    const postings = await prisma.stockTransaction.findMany({
      where: { referenceType: 'TRANSFER', referenceId: transferId },
      orderBy: { createdAt: 'asc' },
    });
    expect(postings).toHaveLength(2);
    expect(postings[0]).toMatchObject({ type: 'TRANSFER_OUT', itemId: sourceItem.id });
    expect(postings[1]).toMatchObject({ type: 'TRANSFER_IN', itemId: destItem.id });

    // Both auditable: each posting has its own AuditLog entry (FR-11), not
    // just the transfer's own CREATE/DISPATCH/RECEIVE entries.
    const stockAudits = await prisma.auditLog.findMany({ where: { entityType: 'StockTransaction' } });
    expect(stockAudits).toHaveLength(2);
    expect(stockAudits.every((a) => a.userId === userId)).toBe(true);
  });

  it('rejects dispatch when source stock is insufficient', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, { currentStock: '2.000' });
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    await api()
      .patch(`/api/v1/transfers/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(await stockOf(sourceItem.id)).toBe('2.000');
  });

  it('flags variance when the received quantity differs materially from what was dispatched', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    const destItem = await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token, userId } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    await prisma.userAccess.create({
      data: { userId, scopeType: 'OUTLET', scopeId: ctx.outletA2.id, role: 'OUTLET_MANAGER' },
    });

    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '10.000', destItemId: destItem.id }],
      })
      .expect(201);
    await api()
      .patch(`/api/v1/transfers/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Dispatched 10, received 8 — 20% short, past the 10% tolerance.
    await api()
      .patch(`/api/v1/transfers/${created.body.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ transferLineId: created.body.lines[0].id, actualReceivedQty: '8.000' }] })
      .expect(200);

    const line = await prisma.transferLine.findUniqueOrThrow({ where: { id: created.body.lines[0].id } });
    expect(line.varianceFlagged).toBe(true);
    expect(await stockOf(destItem.id)).toBe('58.000'); // 50 + 8
  });

  it('AC (gap-fill): a fully damaged line skips the stock posting but is still recorded received', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    const destItem = await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id, {
      currentStock: '20.000',
    });

    const { token, userId } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    await prisma.userAccess.create({
      data: { userId, scopeType: 'OUTLET', scopeId: ctx.outletA2.id, role: 'OUTLET_MANAGER' },
    });

    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000', destItemId: destItem.id }],
      })
      .expect(201);
    await api().patch(`/api/v1/transfers/${created.body.id}/dispatch`).set('Authorization', `Bearer ${token}`);

    const received = await api()
      .patch(`/api/v1/transfers/${created.body.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ transferLineId: created.body.lines[0].id, actualReceivedQty: '0.000' }] })
      .expect(200);

    expect(received.body.status).toBe('RECEIVED');
    expect(await stockOf(destItem.id)).toBe('20.000'); // unchanged — nothing arrived
    const postings = await prisma.stockTransaction.findMany({
      where: { referenceType: 'TRANSFER', referenceId: created.body.id, type: 'TRANSFER_IN' },
    });
    expect(postings).toHaveLength(0);
  });

  // ---------------------------------------------------------------- FR-18

  it('AC (FR-18 wiring): CREATE_TRANSFER lands in the TRANSFER activity category, not SETTINGS', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    const activity = await prisma.activityLog.findFirstOrThrow({ where: { action: 'CREATE_TRANSFER' } });
    expect(activity.category).toBe('TRANSFER');
  });

  it('AC (FR-18 wiring): dispatch and receive each produce a TransactionLog row for the status change', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    const destItem = await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token, userId } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    await prisma.userAccess.create({
      data: { userId, scopeType: 'OUTLET', scopeId: ctx.outletA2.id, role: 'OUTLET_MANAGER' },
    });

    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000', destItemId: destItem.id }],
      })
      .expect(201);
    await api().patch(`/api/v1/transfers/${created.body.id}/dispatch`).set('Authorization', `Bearer ${token}`);
    await api()
      .patch(`/api/v1/transfers/${created.body.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ transferLineId: created.body.lines[0].id, actualReceivedQty: '5.000' }] });

    const transferEntries = await prisma.transactionLog.findMany({
      where: { entityType: 'Transfer', entityId: created.body.id },
    });
    const operations = transferEntries.map((e) => e.operation);
    // CREATE from POST, plus an UPDATE each for dispatch and receive.
    expect(operations).toContain('CREATE');
    expect(operations.filter((o) => o === 'UPDATE').length).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------- FR-07

  it('AC (FR-07 wiring): dispatching below the source minimum raises a low-stock alert there', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, {
      minStock: '10.000',
      currentStock: '12.000',
    });
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    await api()
      .patch(`/api/v1/transfers/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(await stockOf(sourceItem.id)).toBe('7.000'); // below the 10.000 minimum

    // The alert listener runs off a fire-and-forget event, so poll briefly
    // rather than assuming it has already run when the response returns.
    const deadline = Date.now() + 5000;
    let alert = null;
    while (!alert && Date.now() < deadline) {
      alert = await prisma.alert.findFirst({ where: { itemId: sourceItem.id, type: 'LOW_STOCK' } });
      if (!alert) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(alert).not.toBeNull();
    expect(alert!.outletId).toBe(ctx.outletA1.id);
  });

  it('AC (FR-07 wiring): a transfer landing at the destination auto-resolves an open low-stock alert there', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, { currentStock: '50.000' });
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    // Destination starts already below its own minimum.
    const destItem = await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id, {
      minStock: '10.000',
      currentStock: '3.000',
    });
    await prisma.alert.create({
      data: {
        outletId: ctx.outletA2.id,
        itemId: destItem.id,
        type: 'LOW_STOCK',
        status: 'OPEN',
        message: 'Pre-existing low stock alert',
      },
    });

    const { token, userId } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    await prisma.userAccess.create({
      data: { userId, scopeType: 'OUTLET', scopeId: ctx.outletA2.id, role: 'OUTLET_MANAGER' },
    });

    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        // Enough to push destination stock (3 + 20 = 23) back above its
        // minimum of 10.
        lines: [{ itemId: sourceItem.id, quantity: '20.000', destItemId: destItem.id }],
      })
      .expect(201);
    await api().patch(`/api/v1/transfers/${created.body.id}/dispatch`).set('Authorization', `Bearer ${token}`);
    await api()
      .patch(`/api/v1/transfers/${created.body.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ transferLineId: created.body.lines[0].id, actualReceivedQty: '20.000' }] })
      .expect(200);

    const deadline = Date.now() + 5000;
    let alert = await prisma.alert.findFirst({ where: { itemId: destItem.id, type: 'LOW_STOCK' } });
    while (alert?.status !== 'RESOLVED' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      alert = await prisma.alert.findFirst({ where: { itemId: destItem.id, type: 'LOW_STOCK' } });
    }
    expect(alert?.status).toBe('RESOLVED');
  });

  // ------------------------------------------------------------------ cancel

  it('cancels a REQUESTED transfer without moving any stock', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    const cancelled = await api()
      .patch(`/api/v1/transfers/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(await stockOf(sourceItem.id)).toBe('50.000');
  });

  it('refuses to cancel a transfer that has already been dispatched', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);
    await api().patch(`/api/v1/transfers/${created.body.id}/dispatch`).set('Authorization', `Bearer ${token}`);

    await api()
      .patch(`/api/v1/transfers/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  // -------------------------------------------------------------- list/scope

  it('lists transfers touching an outlet on either side, and does not leak others', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token: sourceToken } = await actor('mgr-a@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const { token: destToken } = await actor('mgr-b@example.com', 'OUTLET', ctx.outletA2.id, 'OUTLET_MANAGER');
    const { token: outsiderToken } = await actor('mgr-c@example.com', 'OUTLET', ctx.outletB1.id, 'OUTLET_MANAGER');

    await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${sourceToken}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    const sourceView = await api().get('/api/v1/transfers').set('Authorization', `Bearer ${sourceToken}`).expect(200);
    expect(sourceView.body).toHaveLength(1);

    // The destination outlet's own manager sees it too — it is inbound to them.
    const destView = await api().get('/api/v1/transfers').set('Authorization', `Bearer ${destToken}`).expect(200);
    expect(destView.body).toHaveLength(1);

    const outsiderView = await api()
      .get('/api/v1/transfers')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(200);
    expect(outsiderView.body).toEqual([]);
  });

  it('a caller with access to neither outlet cannot view a transfer’s detail', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id);
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id);

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000' }],
      })
      .expect(201);

    const { token: outsiderToken } = await actor('outsider@example.com', 'OUTLET', ctx.outletB1.id, 'OUTLET_MANAGER');
    await api()
      .get(`/api/v1/transfers/${created.body.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });

  it('the detail view carries both outlets’ names and both items’ names', async () => {
    const ctx = await twoPropertyFixture();
    const { category, unit } = await categoryAndUnit(ctx.outletA1.id);
    const sourceItem = await item(ctx.outletA1.id, category.id, unit.id, { name: 'Basmati Rice' });
    const destCategoryUnit = await categoryAndUnit(ctx.outletA2.id);
    const destItem = await item(ctx.outletA2.id, destCategoryUnit.category.id, destCategoryUnit.unit.id, {
      name: 'Basmati Rice',
    });

    const { token } = await actor('mgr@example.com', 'OUTLET', ctx.outletA1.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sourceOutletId: ctx.outletA1.id,
        destOutletId: ctx.outletA2.id,
        lines: [{ itemId: sourceItem.id, quantity: '5.000', destItemId: destItem.id }],
      })
      .expect(201);

    const detail = await api()
      .get(`/api/v1/transfers/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detail.body.sourceOutletName).toBe('Jeddah Main Kitchen');
    expect(detail.body.destOutletName).toBe('Jeddah Poolside Bar');
    expect(detail.body.lines[0]).toMatchObject({ itemName: 'Basmati Rice', destItemName: 'Basmati Rice' });
  });
});
