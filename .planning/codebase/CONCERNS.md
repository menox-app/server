# Codebase Concerns

**Analysis Date:** 2026-04-22

## Tech Debt

**Authentication Service:**
- Issue: Several login methods (Code, Google, Apple) are planned but throw `BadRequestException('not implemented yet')`.
- Files: `src/modules/auth/auth.service.ts`
- Impact: Users cannot use social login or code-based login yet.

**Linting:**
- Issue: `no-explicit-any` is disabled in ESLint.
- Impact: Type safety is compromised in several files (seen in `AuthService` and `BaseRepository`).

## Security Considerations

**Secrets:**
- Ensure `.env` files are in `.gitignore` (Checked: they are).

**JWT Hardcoding:**
- Issue: Expiration times ('1h', '7d') are hardcoded in `AuthService.ts`.
- Fix: Should be moved to `app.config.ts`.

## Scaling Limits

**Database:**
- Uses Knex which is efficient, but ensure connection pool is optimized in production.

## Missing Critical Features

**Social Login:**
- Blocked until implementation in `AuthService`.

## Test Coverage Gaps

**Internal Modules:**
- Focus should be added to `modules/auth` and `modules/users` as they are core features but had few `.spec.ts` files visible in quick check.

---

*Concerns audit: 2026-04-22*
