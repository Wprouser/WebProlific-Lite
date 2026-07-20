import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TokenService } from '../src/auth/services/token.service';
import { PasswordService } from '../src/auth/services/password.service';

/**
 * Exercises FR-00's endpoints end-to-end against a real (test) SQL Server
 * database. Now that FR-13 exists, `request.user` is populated by the real
 * JwtAuthGuard from a Bearer token — the old `x-test-user-id` header
 * shortcut (used before any auth existed) is gone. Each test seeds a real
 * `User` row (UserAccess.userId is now a real FK) and mints a genuine access
 * token via TokenService.
 *
 * Requires the docker-compose SQL Server to be up and DATABASE_URL to point
 * at it: `docker compose up -d && npx prisma migrate deploy && npm run test:e2e`.
 */
describe('Tenancy (FR-00) e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  let passwordService: PasswordService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    tokenService = app.get(TokenService);
    passwordService = app.get(PasswordService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.auditLog.deleteMany(); // FR-11: chain/property mutations now write these
    await prisma.userAccess.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.property.deleteMany();
    await prisma.chain.deleteMany();
    await prisma.user.deleteMany();
  });

  /** Seeds a real User row and returns its id plus a valid Bearer access token. */
  async function createAuthedUser(email: string): Promise<{ userId: string; token: string }> {
    const user = await prisma.user.create({
      data: { email, passwordHash: await passwordService.hash('irrelevant-for-this-suite') },
    });
    return { userId: user.id, token: tokenService.signAccessToken(user.id) };
  }

  it('lets a CHAIN_OWNER view a property with no explicit per-outlet grant', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const property = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });
    const { userId, token } = await createAuthedUser('owner-1@example.com');
    await prisma.userAccess.create({
      data: { userId, scopeType: 'CHAIN', scopeId: chain.id, role: 'CHAIN_OWNER' },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/properties/${property.id}`)
      .set('Authorization', `Bearer ${token}`)
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
    const { userId, token } = await createAuthedUser('mgr-1@example.com');
    await prisma.userAccess.create({
      data: { userId, scopeType: 'PROPERTY', scopeId: propertyA.id, role: 'PROPERTY_MANAGER' },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/properties/${propertyB.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('only lets CHAIN_OWNER create a property under a chain', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const mgr = await createAuthedUser('mgr-1@example.com');
    await prisma.userAccess.create({
      data: {
        userId: mgr.userId,
        scopeType: 'PROPERTY',
        scopeId: 'some-other-property',
        role: 'PROPERTY_MANAGER',
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/chains/${chain.id}/properties`)
      .set('Authorization', `Bearer ${mgr.token}`)
      .send({ name: 'New Branch', type: 'STANDALONE_RESTAURANT' })
      .expect(403);

    const owner = await createAuthedUser('owner-1@example.com');
    await prisma.userAccess.create({
      data: { userId: owner.userId, scopeType: 'CHAIN', scopeId: chain.id, role: 'CHAIN_OWNER' },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/chains/${chain.id}/properties`)
      .set('Authorization', `Bearer ${owner.token}`)
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
    const { userId, token } = await createAuthedUser('owner-1@example.com');
    await prisma.userAccess.create({
      data: { userId, scopeType: 'CHAIN', scopeId: chain.id, role: 'CHAIN_OWNER' },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${property.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
      .expect(200);

    const reloadedOutlet = await prisma.outlet.findUnique({ where: { id: outlet.id } });
    expect(reloadedOutlet).not.toBeNull();
    expect(reloadedOutlet?.isActive).toBe(false);
  });

  it('returns 401 for a request with no bearer token at all', async () => {
    const chain = await prisma.chain.create({ data: { name: 'Al Waha Group' } });
    const property = await prisma.property.create({
      data: { chainId: chain.id, name: 'Jeddah Hotel', type: 'HOTEL' },
    });

    // Now that JwtAuthGuard is global, a missing token never reaches
    // ScopeResolutionGuard's "no access" check — it's rejected at the auth
    // layer (401), distinct from an authenticated-but-unauthorized 403.
    await request(app.getHttpServer())
      .get(`/api/v1/properties/${property.id}`)
      .expect(401);
  });
});
