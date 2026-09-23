# CertiFlow

Digital certificate generation, download, and QR-based verification platform.

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
pnpm dev:web   # http://localhost:3000 (also reachable via LAN IP)
pnpm dev:api   # http://localhost:3001
```

For **phone QR scanning**, set `WEB_URL` and `NEXT_PUBLIC_API_URL` in `.env` / `apps/web/.env.local` to your PC’s LAN IP (e.g. `http://192.168.x.x:3000`), then register again so the new PDF QR uses that URL.

Or run both apps:

```bash
pnpm dev
```

## Auth (API)

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| POST | `/auth/refresh` | No |
| POST | `/auth/logout` | Bearer |
| GET | `/auth/me` | Bearer |
| GET | `/auth/admin-check` | Bearer + ADMIN |
| GET | `/organizations/me` | Bearer |
| GET | `/organizations/me/dashboard` | Bearer |
| PATCH | `/organizations/me` | Bearer + ADMIN |
| GET | `/events` | Bearer |
| POST | `/events` | Bearer + ADMIN |
| GET | `/events/:id/participants` | Bearer |
| POST | `/events/:id/participants/import` | Bearer + ADMIN |
| GET | `/events/:id` | Bearer |
| PATCH | `/events/:id` | Bearer + ADMIN |
| PATCH | `/events/:id/activate` | Bearer + ADMIN |
| PATCH | `/events/:id/deactivate` | Bearer + ADMIN |
| DELETE | `/events/:id` | Bearer + ADMIN |
| GET | `/templates` | Bearer |
| GET | `/templates/active` | Bearer |
| POST | `/templates/seed-defaults` | Bearer + ADMIN |
| POST | `/templates` | Bearer + ADMIN |
| GET | `/templates/:id` | Bearer |
| PATCH | `/templates/:id` | Bearer + ADMIN |
| DELETE | `/templates/:id` | Bearer + ADMIN |
| GET | `/public/events/:token` | Public |
| POST | `/public/events/:token/register` | Public |
| GET | `/events/:id/participants` | Bearer |
| GET | `/events/:eventId/certificates` | Bearer |
| GET | `/public/certificates/:number` | Public |
| GET | `/public/certificates/:number/download` | Public |
| GET | `/public/verify/:code` | Public |
| PATCH | `/certificates/:id/revoke` | Bearer + ADMIN |
| PATCH | `/certificates/:id/restore` | Bearer + ADMIN |

## License

Private
