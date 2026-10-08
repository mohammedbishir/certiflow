import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EventKind,
  EventStatus,
  OrganizationStatus,
  Prisma,
  UserRole,
  type User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { unlink } from 'fs/promises';
import { AuthService } from '../auth/auth.service.js';
import { CertificatesService } from '../certificates/certificates.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DEMO_ORGANIZATION,
  DEMO_SPORTS,
  DEMO_TEMPLATES,
  DEMO_USER_EMAIL,
  DEMO_WORKSHOP,
  demoDate,
} from './demo-data.js';

const RESET_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  /** Serializes demo setup so simultaneous visitors don't seed twice. */
  private preparing: Promise<User> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async login() {
    if (this.config.get<string>('DEMO_ENABLED') !== 'true') {
      throw new NotFoundException('The live demo is not available right now.');
    }

    this.preparing ??= this.prepare().finally(() => {
      this.preparing = null;
    });
    const user = await this.preparing;
    return this.authService.createSession(user, 'Welcome to the CertiFlow demo');
  }

  private async prepare(): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      include: { organization: true },
    });

    // Never treat a real account as the demo, even if the email matches.
    if (user && !user.organization.isDemo) {
      throw new ForbiddenException('Demo account is misconfigured.');
    }

    if (!user) {
      const organization = await this.prisma.organization.create({
        data: {
          ...DEMO_ORGANIZATION,
          status: OrganizationStatus.APPROVED,
          isDemo: true,
        },
      });
      const created = await this.prisma.user.create({
        data: {
          organizationId: organization.id,
          name: 'Demo Admin',
          email: DEMO_USER_EMAIL,
          // Unusable password: the demo is only reachable through /auth/demo.
          password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          role: UserRole.ADMIN,
        },
      });
      user = { ...created, organization };
    }

    const resetAt = user.organization.demoResetAt?.getTime() ?? 0;
    if (Date.now() - resetAt > RESET_AFTER_MS) {
      await this.reset(user.organizationId);
    }

    const { organization: _organization, ...plainUser } = user;
    return plainUser;
  }

  private async reset(organizationId: string) {
    this.logger.log('Rebuilding demo data');

    const oldCertificates = await this.prisma.certificate.findMany({
      where: { event: { organizationId } },
      select: { pdfPath: true },
    });

    await this.prisma.$transaction([
      this.prisma.event.deleteMany({ where: { organizationId } }),
      this.prisma.certificateTemplate.deleteMany({ where: { organizationId } }),
      this.prisma.designAsset.deleteMany({ where: { organizationId } }),
      this.prisma.organization.update({
        where: { id: organizationId },
        data: { ...DEMO_ORGANIZATION, demoResetAt: new Date() },
      }),
    ]);

    await Promise.all(
      oldCertificates.map((c) => unlink(c.pdfPath).catch(() => undefined)),
    );

    await this.seed(organizationId);
  }

  private async seed(organizationId: string) {
    const [workshopTemplate, sportsTemplate] = await Promise.all(
      [DEMO_TEMPLATES.workshop, DEMO_TEMPLATES.sports].map((template) =>
        this.prisma.certificateTemplate.create({
          data: {
            ...template,
            designJson: template.designJson as Prisma.InputJsonValue,
            organizationId,
          },
        }),
      ),
    );

    const workshop = await this.prisma.event.create({
      data: {
        organizationId,
        templateId: workshopTemplate.id,
        name: DEMO_WORKSHOP.name,
        description: DEMO_WORKSHOP.description,
        location: DEMO_WORKSHOP.location,
        date: demoDate(DEMO_WORKSHOP.daysFromNow),
        status: EventStatus.ACTIVE,
        kind: EventKind.WORKSHOP,
        registrationToken: randomBytes(12).toString('hex'),
      },
    });

    // Parallel: certificate numbers are random, and this keeps the first demo visit quick.
    await Promise.all(
      DEMO_WORKSHOP.participants.map(async (person) => {
        const participant = await this.prisma.participant.create({
          data: { ...person, eventId: workshop.id },
        });
        await this.certificatesService.issueForParticipant(participant.id);
      }),
    );

    const sports = await this.prisma.event.create({
      data: {
        organizationId,
        templateId: sportsTemplate.id,
        name: DEMO_SPORTS.name,
        description: DEMO_SPORTS.description,
        location: DEMO_SPORTS.location,
        date: demoDate(DEMO_SPORTS.daysFromNow),
        status: EventStatus.ACTIVE,
        kind: EventKind.SPORTS_MEET,
        registrationToken: randomBytes(12).toString('hex'),
      },
    });

    const athletes = await Promise.all(
      DEMO_SPORTS.athletes.map((athlete) =>
        this.prisma.participant.create({
          data: { ...athlete, eventId: sports.id },
        }),
      ),
    );
    const athleteIds = new Map(athletes.map((a) => [a.email, a.id]));

    await Promise.all(
      DEMO_SPORTS.games.map(async (game, index) => {
        const created = await this.prisma.eventGame.create({
          data: {
            eventId: sports.id,
            name: game.name,
            category: game.category,
            sortOrder: index,
          },
        });
        await Promise.all(
          game.results.map(async (result) => {
            const gameResult = await this.prisma.gameResult.create({
              data: {
                gameId: created.id,
                participantId: athleteIds.get(result.email)!,
                placement: result.placement,
                teamLabel: result.teamLabel,
              },
            });
            await this.certificatesService.issueForGameResult(gameResult.id);
          }),
        );
      }),
    );
  }
}
