import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/services/password.service';
import { TokenService } from '../src/auth/services/token.service';

/**
 * FR-11 acceptance criterion: "every endpoint listed with a role restriction
 * ... actually enforces it, resolved per-resource via effectiveRole
 * (integration test matrix covering all 5 roles x key endpoints x at least
 * one cross-property/cross-chain negative test)." Exercises the real
 * @Roles()/@ResourceScope() wiring on FR-00's controllers end-to-end,
 * through the actual global guard chain (JwtAuthGuard -> ScopeResolutionGuard
 * -> RolesGuard) — not a RolesGuard unit test in isolation.
 *
 * Cross-property/cross-chain negative cases already covered by
 * tenancy.e2e-spec.ts ("blocks a PROPERTY_MANAGER from reaching a sibling
 * property under the same chain") are not repeated here; this file adds the
 * outlet-level and cross-CHAIN cases, plus the remaining roles
 * (OUTLET_MANAGER, STORE_STAFF, CHEF) that file doesn't touch.
 */
describe('RBAC (FR-11) role matrix e2e', () => {
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
    await prisma.auditLog.deleteMany();
    await prisma.userAccess.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.property.deleteMany();
    await prisma.chain.deleteMany();
    await prisma.user.deleteMany();
  });

  const api = () => request(app.getHttpServer());

  async function actor(email: string, scopeType: 'CHAIN' | 'PROPERTY' | 'OUTLET', scopeId: string, role: string) {
    const user = await prisma.user.create({
      data: { email, passwordHash: await passwordService.hash('irrelevant') },
    });
    await prisma.userAccess.create({ data: { userId: user.id, scopeType, scopeId, role } });
    return tokenService.signAccessToken(user.id);
  }

  async function fixtures() {
    const chainA = await prisma.chain.create({ data: { name: 'Chain A' } });
    const chainB = await prisma.chain.create({ data: { name: 'Chain B' } });
    const propertyA = await prisma.property.create({
      data: { chainId: chainA.id, name: 'Property A', type: 'HOTEL' },
    });
    const outletA = await prisma.outlet.create({
      data: { propertyId: propertyA.id, chainId: chainA.id, name: 'Outlet A', type: 'RESTAURANT' },
    });
    return { chainA, chainB, propertyA, outletA };
  }

  it('CHAIN_OWNER can update their chain; a non-owner role at that chain cannot', async () => {
    const { chainA } = await fixtures();
    const ownerToken = await actor('owner@example.com', 'CHAIN', chainA.id, 'CHAIN_OWNER');
    const staffToken = await actor('staff@example.com', 'CHAIN', chainA.id, 'STORE_STAFF');

    await api()
      .patch(`/api/v1/chains/${chainA.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Chain A Renamed' })
      .expect(200);

    await api()
      .patch(`/api/v1/chains/${chainA.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Should not apply' })
      .expect(403);
  });

  it('OUTLET_MANAGER can update their own outlet; STORE_STAFF at the same outlet cannot', async () => {
    const { outletA } = await fixtures();
    const managerToken = await actor('mgr@example.com', 'OUTLET', outletA.id, 'OUTLET_MANAGER');
    const staffToken = await actor('staff2@example.com', 'OUTLET', outletA.id, 'STORE_STAFF');

    await api()
      .patch(`/api/v1/outlets/${outletA.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Outlet A Renamed' })
      .expect(200);

    await api()
      .patch(`/api/v1/outlets/${outletA.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Should not apply' })
      .expect(403);
  });

  it('CHEF cannot create an outlet under a property they have CHEF access to', async () => {
    const { propertyA } = await fixtures();
    const chefToken = await actor('chef@example.com', 'PROPERTY', propertyA.id, 'CHEF');

    await api()
      .post(`/api/v1/properties/${propertyA.id}/outlets`)
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ name: 'New Outlet', type: 'KITCHEN' })
      .expect(403);
  });

  it('cross-chain negative: a CHAIN_OWNER of Chain B cannot touch a property under Chain A', async () => {
    const { chainB, propertyA } = await fixtures();
    const otherOwnerToken = await actor('owner-b@example.com', 'CHAIN', chainB.id, 'CHAIN_OWNER');

    await api()
      .patch(`/api/v1/properties/${propertyA.id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ name: 'Should not apply' })
      .expect(403);

    await api()
      .get(`/api/v1/properties/${propertyA.id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .expect(403);
  });

  it('PROPERTY_MANAGER inherits access to outlets within their own property', async () => {
    const { propertyA, outletA } = await fixtures();
    const pmToken = await actor('pm@example.com', 'PROPERTY', propertyA.id, 'PROPERTY_MANAGER');

    await api()
      .patch(`/api/v1/outlets/${outletA.id}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ name: 'Updated via inherited property grant' })
      .expect(200);
  });
});
