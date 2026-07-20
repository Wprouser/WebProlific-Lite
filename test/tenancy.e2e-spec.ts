import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Exercises FR-00's endpoints end-to-end against a real (test) SQL Server
 * database. There is no auth yet (FR-13 hasn't been built), so this test
 * simulates "an upstream auth guard already populated request.user" via a
 * plain header + middleware registered only here in the test — the app
 * itself never contains this shortcut.
 *
 * Requires the docker-compose SQL Server to be up and DATABASE_URL to point
 * at it: `docker compose up -d && npx prisma migrate deploy && npm run test:e2e`.
 */
describe('Tenancy (FR-00) e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.use((req: any, _res: any, next: any) => {
      const userId = req.header('x-test-user-id');
      if (userId) req.user = { id: userId };
      next();
    });
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.userAccess.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.property.deleteMany();
    await prisma.chain.deleteMany();
  });

  it('lets a CHAIN_OWNER view a property with no explicit per-outlet grant', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const property = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });
    await prisma.userAccess.create({
      data: { userId: 'owner-1', scopeType: 'CHAIN', scopeId: chain.id, role: 'CHAIN_OWNER' },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/properties/${property.id}`)
      .set('x-test-user-id', 'owner-1')
      .expect(200);

    expect(res.body.id).toBe(property.id);
  });

  it('blocks a PROPERTY_MANAGER from reaching a sibling property under the same chain', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const propertyA = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });
    const propertyB = await prisma.property.create({
      data: { chainId: chain.id, name: 'Riyadh Hotel', type: 'HOTEL' },
    });
    await prisma.userAccess.create({
      data: { userId: 'mgr-1', scopeType: 'PROPERTY', scopeId: propertyA.id, role: 'PROPERTY_MANAGER' },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/properties/${propertyB.id}`)
      .set('x-test-user-id', 'mgr-1')
      .expect(403);
  });

  it('only lets CHAIN_OWNER create a property under a chain', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    await prisma.userAccess.create({
      data: { userId: 'mgr-1', scopeType: 'PROPERTY', scopeId: 'some-other-property', role: 'PROPERTY_MANAGER' },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/chains/${chain.id}/properties`)
      .set('x-test-user-id', 'mgr-1')
      .send({ name: 'New Branch', type: 'STANDALONE_RESTAURANT' })
      .expect(403);

    await prisma.userAccess.create({
      data: { userId: 'owner-1', scopeType: 'CHAIN', scopeId: chain.id, role: 'CHAIN_OWNER' },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/chains/${chain.id}/properties`)
      .set('x-test-user-id', 'owner-1')
      .send({ name: 'New Branch', type: 'STANDALONE_RESTAURANT' })
      .expect(201);
  });

  it('cascades a property deactivation to its outlets, preserving them (not deleting)', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const property = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });
    const outlet = await prisma.outlet.create({
      data: { propertyId: property.id, chainId: chain.id, name: 'Main Restaurant', type: 'RESTAURANT' },
    });
    await prisma.userAccess.create({
      data: { userId: 'owner-1', scopeType: 'CHAIN', scopeId: chain.id, role: 'CHAIN_OWNER' },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${property.id}`)
      .set('x-test-user-id', 'owner-1')
      .send({ isActive: false })
      .expect(200);

    const reloadedOutlet = await prisma.outlet.findUnique({ where: { id: outlet.id } });
    expect(reloadedOutlet).not.toBeNull();
    expect(reloadedOutlet?.isActive).toBe(false);
  });

  it('returns 403 for a request with no user context at all', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const property = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/properties/${property.id}`)
      .expect(403);
  });
});
