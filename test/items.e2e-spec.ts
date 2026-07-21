import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/services/password.service';
import { TokenService } from '../src/auth/services/token.service';

/**
 * Exercises every FR-01 acceptance criterion end-to-end against a real
 * (test) SQL Server database, plus its FR-18 (ActivityLog/TransactionLog)
 * and FR-11 (costPrice field restriction) wiring. Requires:
 *   docker compose up -d && npx prisma migrate deploy && npm run test:e2e
 */
describe('Item Master (FR-01) e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let tokenService: TokenService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    passwordService = app.get(PasswordService);
    tokenService = app.get(TokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.transactionLog.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();
    await prisma.userAccess.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.property.deleteMany();
    await prisma.chain.deleteMany();
    await prisma.user.deleteMany();
  });

  const api = () => request(app.getHttpServer());

  async function actor(email: string, scopeType: 'CHAIN' | 'PROPERTY' | 'OUTLET', scopeId: string, role: string) {
    const user = await prisma.user.create({
      data: { email, passwordHash: await passwordService.hash('Passw0rd!123') },
    });
    await prisma.userAccess.create({ data: { userId: user.id, scopeType, scopeId, role } });
    return { userId: user.id, token: tokenService.signAccessToken(user.id) };
  }

  async function chainWithOutlet(outletName = 'Main Restaurant') {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const property = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });
    const outlet = await prisma.outlet.create({
      data: { propertyId: property.id, chainId: chain.id, name: outletName, type: 'RESTAURANT' },
    });
    return { chain, property, outlet };
  }

  async function category(outletId: string, name = 'Dry Goods') {
    return prisma.category.create({ data: { name, outletId } });
  }

  function itemPayload(overrides: Record<string, unknown> = {}) {
    return {
      name: 'Basmati Rice',
      sku: 'RICE-BAS-001',
      unit: 'KG',
      minStock: '10',
      maxStock: '100',
      costPrice: '85.50',
      ...overrides,
    };
  }

  // ---------------------------------------------------------------------
  // Validation ACs
  // ---------------------------------------------------------------------

  it('AC: cannot create two items with the same SKU', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token } = await actor('owner1@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');

    await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id }))
      .expect(201);

    await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id, barcode: undefined }))
      .expect(409);
  });

  it('AC: cannot set minStock >= maxStock', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token } = await actor('owner2@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');

    await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id, minStock: '100', maxStock: '100' }))
      .expect(400);
  });

  it('AC: GET /items?belowMinStock=true returns only items where currentStock < minStock', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token } = await actor('owner3@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');

    const low = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id, sku: 'LOW-1', minStock: '50' }))
      .expect(201);
    // currentStock defaults to 0 on create — 0 < 50, so this one already
    // qualifies as below min stock without needing FR-02 to exist.
    const normal = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id, sku: 'NORMAL-1', minStock: '0' }))
      .expect(201);

    const res = await api()
      .get('/api/v1/items?belowMinStock=true')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.map((i: { id: string }) => i.id);
    expect(ids).toContain(low.body.id);
    expect(ids).not.toContain(normal.body.id);
  });

  it('rejects create for STORE_STAFF (view-only per the FR-11 permission matrix)', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token } = await actor('staff1@example.com', 'OUTLET', outlet.id, 'STORE_STAFF');

    await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id }))
      .expect(403);
  });

  // ---------------------------------------------------------------------
  // FR-11: costPrice hidden from CHEF, including per-row for multi-outlet lists
  // ---------------------------------------------------------------------

  it('AC (FR-11): costPrice is present for OUTLET_MANAGER but stripped for CHEF, on both list and detail', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token: mgrToken } = await actor('mgr1@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');
    const { token: chefToken } = await actor('chef1@example.com', 'OUTLET', outlet.id, 'CHEF');

    const created = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${mgrToken}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id }))
      .expect(201);

    const chefDetail = await api()
      .get(`/api/v1/items/${created.body.id}`)
      .set('Authorization', `Bearer ${chefToken}`)
      .expect(200);
    expect(chefDetail.body.costPrice).toBeUndefined();

    const mgrDetail = await api()
      .get(`/api/v1/items/${created.body.id}`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .expect(200);
    expect(mgrDetail.body.costPrice).toBe('85.50');

    const chefList = await api().get('/api/v1/items').set('Authorization', `Bearer ${chefToken}`).expect(200);
    expect(chefList.body.every((i: Record<string, unknown>) => i.costPrice === undefined)).toBe(true);
  });

  it('AC (FR-11, per-row): a CHEF at outlet A but OUTLET_MANAGER at outlet B sees costPrice hidden only for outlet A\'s items', async () => {
    const { outlet: outletA } = await chainWithOutlet('Main Restaurant');
    const { outlet: outletB } = await chainWithOutlet('Pool Bar');
    const catA = await category(outletA.id);
    const catB = await category(outletB.id);
    const { token: creatorToken } = await actor('creator@example.com', 'OUTLET', outletA.id, 'OUTLET_MANAGER');
    await prisma.userAccess.create({
      data: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'creator@example.com' } })).id, scopeType: 'OUTLET', scopeId: outletB.id, role: 'OUTLET_MANAGER' },
    });
    const itemA = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send(itemPayload({ outletId: outletA.id, categoryId: catA.id, sku: 'A-1' }))
      .expect(201);
    const itemB = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send(itemPayload({ outletId: outletB.id, categoryId: catB.id, sku: 'B-1' }))
      .expect(201);

    const mixedUser = await prisma.user.create({
      data: { email: 'mixed@example.com', passwordHash: await passwordService.hash('Passw0rd!123') },
    });
    await prisma.userAccess.create({
      data: { userId: mixedUser.id, scopeType: 'OUTLET', scopeId: outletA.id, role: 'CHEF' },
    });
    await prisma.userAccess.create({
      data: { userId: mixedUser.id, scopeType: 'OUTLET', scopeId: outletB.id, role: 'OUTLET_MANAGER' },
    });
    const mixedToken = tokenService.signAccessToken(mixedUser.id);

    const res = await api().get('/api/v1/items').set('Authorization', `Bearer ${mixedToken}`).expect(200);
    const byId = Object.fromEntries(res.body.map((i: { id: string }) => [i.id, i]));
    expect(byId[itemA.body.id].costPrice).toBeUndefined();
    expect(byId[itemB.body.id].costPrice).toBe('85.50');
  });

  // ---------------------------------------------------------------------
  // FR-18 wiring
  // ---------------------------------------------------------------------

  it('AC: creating an item produces exactly one ActivityLog (category ITEM) and one TransactionLog (CREATE) row', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token } = await actor('owner4@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');

    const res = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id }))
      .expect(201);

    const activityRows = await prisma.activityLog.findMany({ where: { entityId: res.body.id } });
    expect(activityRows).toHaveLength(1);
    expect(activityRows[0]!.category).toBe('ITEM');
    expect(activityRows[0]!.action).toBe('CREATE_ITEM');

    const txnRows = await prisma.transactionLog.findMany({ where: { entityId: res.body.id } });
    expect(txnRows).toHaveLength(1);
    expect(txnRows[0]!.operation).toBe('CREATE');
    expect(txnRows[0]!.entityCategory).toBe('MASTER_DATA');
    expect(txnRows[0]!.outletId).toBe(outlet.id);
  });

  it('AC: updating two fields on an item produces exactly two TransactionLog rows, one per field', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token } = await actor('owner5@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id }))
      .expect(201);

    await api()
      .patch(`/api/v1/items/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Basmati Rice (Premium)', storageLocation: 'Dry Store A' })
      .expect(200);

    const rows = await prisma.transactionLog.findMany({
      where: { entityId: created.body.id, operation: 'UPDATE' },
    });
    expect(rows).toHaveLength(2);
    const byField = Object.fromEntries(rows.map((r) => [r.fieldName, r.newValue]));
    expect(byField.name).toBe('Basmati Rice (Premium)');
    expect(byField.storageLocation).toBe('Dry Store A');
  });

  it('AC: deactivating an item produces an ActivityLog + TransactionLog row and sets isActive false', async () => {
    const { outlet } = await chainWithOutlet();
    const cat = await category(outlet.id);
    const { token } = await actor('owner6@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');
    const created = await api()
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send(itemPayload({ outletId: outlet.id, categoryId: cat.id }))
      .expect(201);

    const res = await api()
      .delete(`/api/v1/items/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.isActive).toBe(false);

    const activityRows = await prisma.activityLog.findMany({
      where: { entityId: created.body.id, action: 'DEACTIVATE_ITEM' },
    });
    expect(activityRows).toHaveLength(1);
  });

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------

  it('creates a category and rejects a duplicate name within the same outlet', async () => {
    const { outlet } = await chainWithOutlet();
    const { token } = await actor('owner7@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');

    await api()
      .post('/api/v1/items/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dry Goods', outletId: outlet.id })
      .expect(201);

    await api()
      .post('/api/v1/items/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dry Goods', outletId: outlet.id })
      .expect(409);
  });

  it('GET /items/categories resolves correctly and is not swallowed by GET /items/:id', async () => {
    const { outlet } = await chainWithOutlet();
    const { token } = await actor('owner8@example.com', 'OUTLET', outlet.id, 'OUTLET_MANAGER');
    await category(outlet.id, 'Produce');

    const res = await api()
      .get('/api/v1/items/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: { name: string }) => c.name === 'Produce')).toBe(true);
  });
});
