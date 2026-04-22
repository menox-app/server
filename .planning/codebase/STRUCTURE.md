# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```
src/
├── common/             # Shared filters, interceptors, guards
├── configs/            # Configuration loaders
├── constants/          # Application-wide constants
├── infrastructure/     # DB, Repositories, external clients
│   ├── knex/           # Knex configuration and migrations
│   └── repositories/   # Persistence logic abstractions
├── modules/            # Feature-based modules (Domain logic)
│   ├── auth/           # Login, registration, tokens
│   └── users/          # Profile management, user data
├── shared/             # Reusable internal modules/utils
├── app.module.ts       # Root module
└── main.ts             # Application entry point
test/                   # E2E tests and configurations
```

## Directory Purposes

**modules/:**
- Purpose: Contains the domain logic organized by features.
- Contains: Controllers, Services, DTOs, Modules for each feature.

**infrastructure/:**
- Purpose: Low-level logic related to external systems (DB, external APIs).

**common/:**
- Purpose: Cross-cutting NestJS components (Filters, Guards, Interceptors).

## Key File Locations

**Entry Points:**
- `src/main.ts`: Bootstrap and global configuration.

**Configuration:**
- `nest-cli.json`: CLI settings.
- `tsconfig.json`: TS settings and path aliases.
- `knexfile.ts`: Database migration setings.

**Core Logic:**
- `src/modules/auth/auth.service.ts`: Security and token management.

## Naming Conventions

**Files:**
- Feature-based: `[feature].controller.ts`, `[feature].service.ts`, `[name].dto.ts`.
- Files should be lowercase with dashes if multi-word.

**Directories:**
- Use plural for modules/collections: `modules`, `repositories`.

## Where to Add New Code

**New Feature (e.g., "products"):**
- Create `src/modules/products/` with controller, service, and module.

**New Shared Logic:**
- If it's a NestJS filter/guard: `src/common/`.
- If it's a business utility: `src/shared/`.

**New Persistence logic:**
- Create repository in `src/infrastructure/repositories/`.

---

*Structure analysis: 2026-04-22*
