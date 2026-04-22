# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- TypeScript 5.7.3 - Used for the entire backend application.

## Runtime

**Environment:**
- Node.js >=20.0.0

**Package Manager:**
- Yarn (Enforced via `preinstall` script in `package.json`)
- Lockfile: `yarn.lock` (present)

## Frameworks

**Core:**
- NestJS 11.0.1 - Main application framework.
- Fastify 5.8.4 - Underlying HTTP server (via `@nestjs/platform-fastify`).

**Testing:**
- Jest 30.0.0 - Test runner and assertion library.

**Build/Dev:**
- Nest CLI 11.0.0 - Build and development tooling.

## Key Dependencies

**Critical:**
- `knex` 3.1.0 - SQL query builder for database interactions.
- `@nestjs/jwt` 11.0.2 - JWT authentication handling.
- `bcryptjs` 3.0.3 - Password hashing.

**Infrastructure:**
- `pg` 8.20.0 - PostgreSQL driver.
- `joi` 18.1.2 - Schema validation for configuration.
- `nest-winston` 1.10.2 - Logging integration.

## Configuration

**Environment:**
- Configured using `@nestjs/config` from `.env` files.
- `src/configs/app.config.ts` - Likely centralizes app configuration.

**Build:**
- `tsconfig.json` - TypeScript configuration with `@/*` path aliases.
- `nest-cli.json` - CLI configuration.

---

*Stack analysis: 2026-04-22*
