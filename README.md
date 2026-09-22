# CertiFlow

Digital certificate generation, email delivery, and QR-based verification platform.

## Stack

- **Web:** Next.js, React, TypeScript, Tailwind CSS
- **API:** NestJS, Prisma, PostgreSQL
- **Monorepo:** pnpm workspaces

## Structure

```text
certiflow/
├── apps/
│   ├── web/          # Admin, participant, verification UI
│   └── api/          # NestJS backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI primitives
│   └── config/       # Shared config (eslint, tsconfig, etc.)
├── docs/
└── docker-compose.yml
```

## Getting started

Requirements:

- Node.js 20+
- pnpm 10+
- Docker Desktop

```bash
pnpm install
docker compose up -d
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:3001
```

Or run both apps:

```bash
pnpm dev
```

Copy `.env.example` to `.env` and `apps/api/.env` (ports: web `3000`, api `3001`, postgres `54329`).

```bash
pnpm db:migrate
pnpm db:studio   # optional Prisma UI
```
## License

Private
