# Coding Conventions

**Analysis Date:** 2026-04-22

## Naming Patterns

**Files:**
- [name].[type].ts (e.g., `user.controller.ts`, `create-user.dto.ts`).

**Functions:**
- camelCase (e.g., `login`, `generateTokens`).

**Variables:**
- camelCase.

**Types / Classes:**
- PascalCase (e.g., `AuthService`, `LoginDto`).

## Code Style

**Formatting:**
- Prettier managed.
- Single quotes, semi-colons enabled, trailing commas.

**Linting:**
- ESLint (recommended rules).
- `@typescript-eslint/no-explicit-any` is currently `off` (Concerns).

## Import Organization

**Order:**
1. External libraries (NestJS, Fastify, etc.).
2. Path aliases (`@/*`).
3. Relative imports.

**Path Aliases:**
- Use `@/` to refer to `src/` directory for cleaner imports.

## Error Handling

**Patterns:**
- Throw `HttpException` or its subclasses from Services.
- Do not catch everything in Services; let the Global Exception Filter handle the response format.

## Logging

**Framework:** `nest-winston` (Winston).

**Patterns:**
- Inject the logger using `WINSTON_MODULE_NEST_PROVIDER`.

## Comments

**When to Comment:**
- Complexity: Explain "Why", not "What".
- JSDoc: Used for public API methods in Services.

---

*Convention analysis: 2026-04-22*
