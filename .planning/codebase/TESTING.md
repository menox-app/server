# Testing Patterns

**Analysis Date:** 2026-04-22

## Test Framework

**Runner:**
- Jest 30.0.0
- Configs: Root `package.json` for unit tests, `./test/jest-e2e.json` for E2E.

**Run Commands:**
```bash
yarn test              # Run unit tests
yarn test:e2e          # Run E2E tests
yarn test:cov          # View coverage
```

## Test File Organization

**Location:**
- Unit tests: Co-located with implementation (e.g., `src/app.controller.spec.ts`).
- E2E tests: Located in `test/` folder.

**Naming:**
- Unit: `[name].spec.ts`.
- E2E: `[name].e2e-spec.ts`.

## Test Structure

**Suite Organization:**
```typescript
describe('FeatureGroup', () => {
  beforeEach(async () => {
    // Setup module reference
  });

  it('should do something', async () => {
    // expect(...)
  });
});
```

## Mocking

**Framework:** Native Jest mocking (`jest.fn()`, `jest.spyOn()`).

**What to Mock:**
- External services (Cloudinary).
- Database connections if not running against a test DB.

## Coverage

**Requirements:** Currently inclusive of all `.ts` files in `src/`.

---

*Testing analysis: 2026-04-22*
