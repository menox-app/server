# Architecture

**Analysis Date:** 2026-04-22

## Pattern Overview

**Overall:** Modular NestJS (Domain-Driven Design influenced)

**Key Characteristics:**
- Controller-Service-Repository pattern.
- Feature-based modularization (`src/modules/`).
- Infrastructure layer for shared database/repository logic.

## Layers

**Controllers:**
- Purpose: Handle incoming HTTP requests and map them to service calls.
- Location: `src/modules/*/controllers/*.controller.ts`
- Contains: Route definitions, Swagger decorators, DTO validation.

**Services:**
- Purpose: Core business logic and orchestration.
- Location: `src/modules/*/services/*.service.ts`
- Depends on: Repositories, other services.

**Infrastructure / Repositories:**
- Purpose: Data access abstraction.
- Location: `src/infrastructure/repositories/`
- Contains: `BaseRepository` with common CRUD methods.

## Data Flow

**Request Execution:**

1. `main.ts` (Entry) -> `Global Pipes/Filters/Interceptors`.
2. `Controller` (Route matching & validation).
3. `Service` (Business logic).
4. `Repository` (DB interaction via Knex).
5. `Controller` (Format response).

**State Management:**
- Stateless JWT-based authentication.
- Multi-device sessions tracked in `sessions` table.

## Key Abstractions

**BaseRepository:**
- Purpose: Provide standard data access methods (findAll, findById, create, update, delete).
- Examples: `src/infrastructure/repositories/base.repository.ts`.

**Common Filters/Interceptors:**
- Purpose: Transversal concerns like error formatting and response wrapping.
- Examples: `src/common/filters/all-exceptions.filter.ts`.

## Entry Points

**Main Application:**
- Location: `src/main.ts`
- Triggers: Node.js runtime.
- Responsibilities: Bootstrap NestJS, configure Fastify, register global middleware.

## Error Handling

**Strategy:** Global Exception Filter.

**Patterns:**
- Custom exceptions (e.g., `UnauthorizedException`, `ConflictException`) from NestJS Common.
- `AllExceptionsFilter` catches and formats all unhandled errors.

## Cross-Cutting Concerns

**Logging:** Console and file logging via Winston.
**Validation:** `ValidationPipe` with `class-validator` and `class-transformer`.
**Authentication:** JWT Bearer strategy.

---

*Architecture analysis: 2026-04-22*
