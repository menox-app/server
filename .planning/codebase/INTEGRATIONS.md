# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**Media Storage:**
- Cloudinary - Used for image/file uploads.
  - SDK/Client: `cloudinary` 2.9.0
  - Auth: Likely `CLOUDINARY_URL` or equivalent in `.env`.

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` or detailed params in `.env`.
  - Client: `knex` (query builder) and `pg` (driver).
  - Integration: `src/infrastructure/knex/knex.module.ts`.

## Authentication & Identity

**Auth Provider:**
- Custom JWT - Built into the application.
  - Implementation: `src/modules/auth/auth.service.ts` using `@nestjs/jwt`.
  - Strategy: Bearer Token (JWT).

## Monitoring & Observability

**Logs:**
- Winston - Advanced logging framework.
  - Integration: `nest-winston`.
  - Transports: Likely console and daily rotate files (`winston-daily-rotate-file`).

## CI/CD & Deployment

**Hosting:**
- Render / Generic Node Hosting (based on conversation history).

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` / `DB_HOST`, `DB_PORT`, etc.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`.
- `API_PREFIX` (default: `api`).
- `APP_PORT` (default: `3000`).

---

*Integration audit: 2026-04-22*
