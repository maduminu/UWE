# UWE Platform - Master Audit Report

> **Project**: Unity Warriors Empire (UWE)
> **Audit date**: August 25, 2026
> **Audit type**: Repository-grounded static security, architecture, data-integrity, API, frontend, and test audit
> **Repository**: UWE
> **Status**: Findings below are based on the source present in this workspace. They are not a production certification or a substitute for a controlled penetration test.

---

## Executive Summary

UWE is a full-stack education and student-engagement platform. It combines a public course catalog and marketing site with student accounts, gated program videos, progress tracking, gamification, certificates, payment-slip submission, recruitment, staff content, and an authenticated Command HQ administration area.

The codebase has a solid foundation: TypeScript is used across the backend and frontend, Prisma provides a shared PostgreSQL data layer, admin roles are explicit, sensitive admin routes use server-side middleware, request validation uses Zod on several public boundaries, the API has Helmet, CORS allowlisting, rate limits, body-size limits, Redis caching, OpenAPI documentation, and a meaningful integration test suite.

The most important residual risks are concentrated in authorization freshness, credential lifecycle, sensitive data exposure, input validation consistency, and concurrent state changes:

| Priority | Finding | Status |
|---|---|---|
| P0 | Refresh tokens are stateless and are not checked against the current account or a revocation record | Open |
| P0 | Student progress and XP mutation accept a caller-supplied `userId`; route-level ownership enforcement is not visible on those mutation paths | Open / verify in runtime |
| P1 | Admin and user controllers return complete database records, including password hashes for user-management responses | Open |
| P1 | Production error handling still returns `err.message`, which may disclose implementation or database details | Open |
| P1 | Admin-created users receive a plaintext default password and are not passed through bcrypt hashing | Open |
| P1 | Payment-slip image/data URLs are publicly accepted and stored without type, size, or malware validation at the field boundary | Open |
| P2 | Coupon usage validation is not a reservation or redemption transaction, enabling race-condition overuse | Open |
| P2 | Course seat updates and hiring counters are vulnerable to lost updates and inconsistent derived state under concurrency | Open |
| P2 | Several mutation endpoints rely on `as any` and controller parsing instead of shared schemas | Open |

No claim of “all issues resolved” is made in this report. The attached example reports are treated as a formatting reference; this document records what is supported by the current UWE repository.

---

## 1. Scope and Method

### Reviewed surfaces

- `prisma/schema.prisma`: data model, relationships, enums, uniqueness, indexes, and stored sensitive fields.
- `backend/src/index.ts`: server startup, middleware ordering, CORS, headers, parsers, rate limits, health endpoints, route registration, and error handling.
- Authentication and authorization: `authController.ts`, `authenticate.ts`, `optionalAuth.ts`, `requireAdmin.ts`, `requireRole.ts`, route guards, and frontend session services.
- API routes and controllers covering courses, batches, users, leads, jobs, payment slips, videos, progress, coupons, reviews, instructors, certificates, mastermind, gamification, banners, staff, and documentation.
- Frontend routing, protected pages, admin layout/auth flow, API wrapper, and local session persistence.
- Tests under `backend/src/__tests__` and `src/__tests__`.
- Package scripts and deployment/build configuration.

### Method limitations

- This is primarily a source review. Database contents, deployed environment variables, reverse-proxy configuration, object-storage policy, Redis configuration, backups, and provider dashboards were not independently inspected.
- A static route review cannot prove that a deployed route behaves exactly like the checked-in source.
- Runtime tests and build/lint commands should be run in the target environment before treating a status as verified.

---

## 2. Technology and System Inventory

| Layer | Current implementation |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Router 6, Framer Motion, Tailwind CSS, Lucide React, React Helmet Async |
| Backend | Node.js, Express 5, TypeScript, ES modules, `tsx`/Nodemon development flow |
| Database | PostgreSQL through Prisma 6 |
| Caching | Upstash Redis wrapper in `backend/src/config/redis.ts` |
| Authentication | JWT access tokens (15 minutes) plus JWT refresh tokens (7 days), bcryptjs for new credentials |
| Validation | Zod middleware on selected routes; several controllers still perform manual parsing or use unchecked enum casts |
| Security middleware | Helmet, CORS allowlist, global API rate limit, auth rate limit, public submission rate limit, body limits |
| Documents | OpenAPI/Swagger route and PDF/QR generation service |
| Deployment targets | Vercel/serverless bundle, Netlify/Vercel configuration files, local standalone Express server |

---

## 3. Product and Feature Audit

### 3.1 Public experience

The frontend exposes public routes for the home experience, About, Vision, programs, course detail, demos, careers, contact, social posters, and the admin login entry point. Public API resources include courses, active banners, demos, program videos, jobs, instructors, reviews, certificates, and lead/payment-slip submission flows.

### 3.2 Student portal

Authenticated students can access:

- Student dashboard and enrolled-course state.
- Program video content and watch progress.
- Course detail and program metadata.
- Gamification profile, XP, ranks, streaks, badges, and leaderboard data.
- Mastermind questions and coach feedback flows.
- Certificate lookup/creation flows.
- Student profile and cohort/coach assignment data where exposed by the API.

### 3.3 Command HQ administration

Admin users are modeled separately as `AdminUser` records with four roles:

| Role | Intended clearance |
|---|---|
| `SUPER_ADMIN` | Full administrative access through the role bypass |
| `COMMANDER` | Core content, user, and operational administration |
| `COACH` | Coaching-oriented administrative access on selected routes |
| `RECRUITER` | Recruitment and payment-slip operational access on selected routes |

The admin UI contains tabs for series, coupons, banners, mastermind, users, demos, leads, batches, slips, jobs, reviews, instructors, staff, and analytics. Route-level access is enforced by `AdminRoute` on the frontend and `authenticate`, `requireAdmin`, and `requireRole` on the backend for most administrative endpoints.

### 3.4 Data-domain inventory

The Prisma schema contains 17 primary model areas:

| Domain | Model(s) | Main purpose |
|---|---|---|
| Admin identity | `AdminUser`, `Role` | Command HQ accounts and clearance |
| Student identity | `User` | Enrollment, profile, progress summary, coach/cohort data |
| Learning catalog | `Course`, `CourseBatch` | Programs, schedules, seats, and Zoom links |
| CRM | `Lead` | Public inquiries and payment-slip lead synchronization |
| Public media | `DemoVideo`, `AnnouncementBanner` | Public video and live announcement content |
| Gated learning | `ProgramVideoSeries`, `ProgramVideoModule` | Course-linked video curriculum |
| Recruitment | `JobVacancy`, `JobApplication` | Public applications and hiring state |
| Learning progress | `VideoProgress` | Module completion and progress percentage |
| Payments | `PaymentSlip`, `SlipStatus` | Bank-transfer receipt intake and verification |
| People | `StaffMember`, `Instructor` | Public/internal personnel directories |
| Promotions | `Coupon` | Discount rules and usage counters |
| Social proof | `CourseReview` | Course ratings and reviews |
| Credentials | `Certificate` | Verifiable completion certificates |
| Community | `MastermindQuestion` | Questions, answers, pins, and upvotes |

---

## 4. Security and Authorization Audit

### SEC-1: Refresh tokens have no server-side revocation or account-state check

**Severity**: Critical

**Evidence**: `refreshAuthToken` verifies the JWT signature and `isRefreshToken` flag, then immediately issues a new token pair from the decoded payload. There is no refresh-token identifier, database session, token version, password-change invalidation, account lookup, or role refresh before issuance.

**Impact**: A stolen seven-day refresh token remains usable after logout, account deletion, enrollment removal, password change, or role change. The new access token also inherits the old role and identity claims.

**Recommendation**:

1. Store a hashed refresh-token record or a per-user token version in the database.
2. Rotate refresh tokens on every refresh and revoke the previous token.
3. Re-check the referenced `AdminUser` or `User` before issuing a new access token.
4. Invalidate all refresh sessions on logout, password change, account disablement, and administrative deletion.

### SEC-2: Student identity is caller-controlled on progress mutation

**Severity**: Critical pending runtime confirmation

**Evidence**: `saveProgress` reads `userId` from the request body and upserts progress for that ID. The route/controller evidence reviewed does not show an ownership check comparable to the user dashboard route.

**Impact**: If the endpoint is reachable by a student token, a student may write completion and progress records for another student. This can corrupt certificates, course completion reporting, XP, and analytics.

**Recommendation**: Derive the student ID from `req.user.id` for student requests. Permit an explicit target ID only for a narrowly defined admin role after `requireAdmin` and `requireRole` checks. Add tests for cross-user write attempts.

### SEC-3: XP award mutation accepts arbitrary user and XP values

**Severity**: High pending route confirmation

**Evidence**: `awardXp` accepts `userId`, `actionType`, and optional `xpAmount` from the body. It adds a caller-supplied numeric XP amount when present. The reviewed implementation does not show a server-side ownership or allowed-action authorization check.

**Impact**: A caller could award XP to another account or inflate XP/rank/badges if this route is not protected by an appropriate trusted event boundary.

**Recommendation**: Remove client-supplied XP amounts. Map trusted server-side actions to fixed awards, derive the user from the token, enforce idempotency for completion events, and restrict administrative award operations separately.

### SEC-4: User management responses include sensitive credential fields

**Severity**: High

**Evidence**: `getAllUsers`, `getUserById`, `createUser`, and update/delete flows operate on full Prisma `User` records. The create and read responses do not use an explicit `select` that excludes `passwordHash`.

**Impact**: A compromised admin session, browser extension, proxy log, or frontend error could expose password hashes. Hashes are not plaintext, but they remain valuable for offline cracking and credential reuse attacks.

**Recommendation**: Define a safe user projection and use explicit `select` objects for every response. Never serialize `passwordHash`, internal credential fields, or unnecessary personal data.

### SEC-5: Admin-created student accounts can receive plaintext default credentials

**Severity**: High

**Evidence**: `createUser` stores `passwordHash: password || 'password123'`. Unlike public registration, this path does not bcrypt-hash the supplied password.

**Impact**: Accounts created by the CMS may contain plaintext passwords in the database. The fallback credential is predictable and may be reused across many accounts.

**Recommendation**: Require a password or issue a one-time invitation/reset flow. Hash with bcrypt before persistence. Force a password change on first login if temporary credentials remain necessary. Migrate and invalidate any legacy plaintext values.

### SEC-6: Password compatibility code still permits plaintext credential comparison

**Severity**: High

**Evidence**: Both student and admin login paths support non-bcrypt stored values and compare them directly before rehashing.

**Impact**: The system remains compatible with plaintext secrets and continues to handle them in application memory. A database leak therefore has greater impact until migration is complete.

**Recommendation**: Perform a controlled migration, reject non-bcrypt hashes after the migration window, and instrument an alert for any legacy credential encountered.

### SEC-7: Predictable fallback JWT secret exists outside production

**Severity**: High if a non-production deployment is internet-reachable

**Evidence**: `getJwtSecret` falls back to a hardcoded development secret whenever `JWT_SECRET` is absent and the process is not marked production/Vercel.

**Impact**: Any exposed development, preview, staging, or misclassified deployment could allow attackers to forge admin or student tokens.

**Recommendation**: Fail closed whenever the API is not explicitly local development. Require a strong secret in staging and preview environments, and add startup validation for minimum length and entropy.

### SEC-8: Production error responses expose raw exception messages

**Severity**: High

**Evidence**: `errorHandler` returns `err.message` in every environment. Only the stack is nulled in production.

**Impact**: Prisma errors, filesystem paths, validation internals, provider responses, or operational terminology can be disclosed to clients.

**Recommendation**: Log the detailed error server-side with a request ID. Return a stable generic message and safe error code in production. Map known validation/not-found/conflict errors explicitly.

### SEC-9: Payment-slip uploads accept unbounded content by schema and store it in the database

**Severity**: High

**Evidence**: The route allows 10 MB JSON/urlencoded bodies, and `slipUrl` is only validated as a non-empty string. The OpenAPI example explicitly uses a base64 data URL. The controller stores the value directly in `PaymentSlip.slipUrl`.

**Impact**: Database bloat, expensive response payloads, denial-of-service pressure, privacy exposure, and possible unsafe rendering if consumers treat the value as trusted markup or a URL.

**Recommendation**: Prefer object storage with private keys and short-lived signed URLs. Validate MIME type, decoded byte size, image dimensions, and file signature. Reject SVG unless sanitized. Keep admin list responses metadata-only and authorize media retrieval separately.

### SEC-10: Public submission endpoints have anti-spam controls but no abuse identity or verification layer

**Severity**: Medium

**Evidence**: Lead, job, and API-wide rate limits exist, which is good, but public leads and payment slips can still create records with no CAPTCHA, email/phone verification, duplicate throttling, or application-level idempotency key.

**Impact**: Attackers can consume database capacity, create CRM noise, and submit fraudulent or repeated payment records from distributed IPs.

**Recommendation**: Add per-field normalization, duplicate windows, CAPTCHA/Turnstile for public forms, request IDs/idempotency keys, and monitoring for submission spikes.

---

## 5. Data Integrity and Business Logic Audit

### DATA-1: Coupon validation is not coupon redemption

**Severity**: High

**Evidence**: `validateCoupon` checks `usedCount` against `maxUses` and calculates a discount, but the reviewed implementation does not atomically reserve or increment usage as part of a successful purchase.

**Impact**: Concurrent checkout requests can all observe available uses. A coupon can exceed its configured limit, and discount validation is not bound to a completed payment.

**Recommendation**: Separate preview from redemption. At checkout, run a transaction that verifies expiry/course/limit, atomically increments usage with a conditional update, and records the order/payment reference. Never trust a client-provided `originalPrice` for final billing.

### DATA-2: Course seat updates lack invariant enforcement

**Severity**: Medium

**Evidence**: Batch update endpoints parse `availableSeats` and `totalSeats`, but do not visibly enforce `0 <= availableSeats <= totalSeats` or prevent negative/NaN values after parsing.

**Impact**: Public course availability can become impossible or misleading. Concurrent seat changes can overwrite one another.

**Recommendation**: Validate integer ranges with Zod, enforce database/application invariants, and use atomic conditional updates for reservations and releases.

### DATA-3: Hiring counter/status transitions are multi-step and non-transactional

**Severity**: Medium

**Evidence**: Application status is updated, then the vacancy is read and its `hiredCount` is recalculated and updated separately.

**Impact**: Concurrent status changes can lose increments, double-count hires, or leave `hiringStatus` inconsistent with `hiredCount`.

**Recommendation**: Use a transaction with a conditional state transition and atomic counter update. Record the previous and next application status so repeated requests are idempotent.

### DATA-4: Gamification writes are vulnerable to lost updates and replay

**Severity**: Medium

**Evidence**: `awardXp` reads a user, computes new XP/streak/badge JSON in application memory, and then writes the full user record. No idempotency event key is shown.

**Impact**: Two simultaneous completions can overwrite XP/streak changes. Retried client requests can award XP multiple times.

**Recommendation**: Use atomic numeric increments, transactionally update progression, and record unique reward events keyed by user/action/source object.

### DATA-5: JSON-in-string fields reduce enforceability

**Severity**: Medium

**Evidence**: `enrolledCourseSlugs`, `badges`, `upvotedUserIds`, `requirements`, and related fields are stored as comma-separated or JSON strings.

**Impact**: Malformed values, duplicate entries, inefficient filtering, and race-prone read-modify-write behavior are possible.

**Recommendation**: Use PostgreSQL arrays/JSONB with constraints where appropriate, or normalize many-to-many relationships such as enrollments, badges, and votes.

### DATA-6: Money is stored as `Float`

**Severity**: Medium

**Evidence**: `Course.price`, `PaymentSlip.amount`, `Coupon.discountPercent`, `Coupon.discountAmount`, and instructor rating use `Float` in Prisma.

**Impact**: Binary floating-point representation can create rounding differences in discounts, displayed prices, reconciliation, and reporting.

**Recommendation**: Store monetary amounts as `Decimal(precision, scale)` and use integer minor units where suitable. Keep ratings/percentages separately typed and bounded.

### DATA-7: Certificate records are denormalized and not visibly tied to completion authorization

**Severity**: Medium pending workflow confirmation

**Evidence**: `Certificate` stores student name, course title, grade, and signature as independent strings. The schema does not have a relation to `Course` or an immutable completion event.

**Impact**: Course renames or account changes can create mismatches. Certificate issuance may be replayed or created without a server-verified completion condition unless enforced in controller logic.

**Recommendation**: Add a unique issuance rule per user/course/version, retain an issuance event, and generate certificates only after server-side completion and enrollment checks.

---

## 6. API and Backend Architecture Audit

### Strengths verified in source

- Helmet is installed early and configured before route registration.
- CORS uses an explicit origin list plus controlled Vercel preview matching.
- `app.set('trust proxy', 1)` supports proxy-aware rate limiting.
- Authentication, submission, and general API rate limiters are present.
- Body parsing has explicit limits, with a larger limit isolated to media/slip routes.
- Prisma is shared through a global singleton in non-production development.
- Public and privileged route groups are clearly separated in the main application.
- OpenAPI documentation is registered under `/api/docs` and `/docs`.
- Health endpoints exist for operational checks.
- Redis caching is used for course catalog and leaderboard reads, with cache invalidation on course mutation.

### API-1: Validation coverage is inconsistent

**Severity**: Medium

**Evidence**: Zod schemas are applied to registration, login, refresh, leads, job applications, payment slips, coupons, reviews, and banners. Other mutation routes parse fields directly and cast arbitrary input with `as any`, including status, category, employment type, and admin update payloads.

**Impact**: Invalid enum values, negative numbers, oversized strings, malformed dates, and unexpected fields may reach Prisma or create inconsistent data.

**Recommendation**: Add route-specific Zod schemas for every POST/PUT/PATCH endpoint. Use `.strict()` or an explicit unknown-key policy, coercion with bounds, enum validation, date validation, and shared response DTOs.

### API-2: Duplicate route prefixes increase maintenance risk

**Severity**: Low/Medium

**Evidence**: Many route groups are mounted both under `/api/...` and a root alias such as `/courses`, `/users`, `/slips`, and `/auth`.

**Impact**: Every route has two externally reachable surfaces, which increases documentation, CORS, rate-limit, monitoring, and security-test coverage requirements.

**Recommendation**: Keep aliases only when required for compatibility, document them explicitly, and ensure both paths have identical middleware and telemetry behavior.

### API-3: Unhandled process failures are logged but the server remains running

**Severity**: Medium

**Evidence**: `uncaughtException` and `unhandledRejection` handlers log the failure without terminating or triggering a controlled restart.

**Impact**: The process may continue in an unknown state after a fatal exception, especially around database or asynchronous resource corruption.

**Recommendation**: For uncaught exceptions, fail closed: log, stop accepting traffic, close resources, and let the process supervisor restart. For unhandled rejections, apply the same policy unless the error is explicitly safe.

### API-4: Sensitive operational endpoints should use audit events

**Severity**: Medium

**Evidence**: Admin mutations exist for users, courses, batches, slips, jobs, coupons, banners, staff, and content. The reviewed schema has no general immutable admin action/audit model.

**Impact**: It may be difficult to answer who changed a price, verified a payment, altered seat counts, edited a course, or deleted a record.

**Recommendation**: Add an append-only audit event model containing actor, role, action, entity, before/after summary, request ID, IP metadata, and timestamp. Avoid storing secrets or full payment images in the audit record.

---

## 7. Frontend Security and UX Audit

### FRONT-1: Frontend route guards are not authorization

**Severity**: Informational/architectural

**Evidence**: `AdminRoute` checks local admin-session state, and `ProtectedRoute` checks local session state plus legacy localStorage keys. The backend does enforce authorization on protected API routes, which is the controlling security boundary.

**Impact**: Local storage can be edited, stale user metadata can remain visible, and UI gating can diverge from the server. This is expected for client-side guards and must not be relied upon for access control.

**Recommendation**: Keep backend authorization authoritative. On app bootstrap, call a current-session endpoint, refresh identity/role from the server, and remove legacy bypass keys after migration. Handle unauthorized API responses consistently by clearing both the session and cached user data.

### FRONT-2: Refresh tokens are stored in localStorage

**Severity**: High

**Evidence**: `authService` stores admin and student sessions, including refresh tokens, in localStorage.

**Impact**: Any successful XSS can read long-lived refresh credentials and maintain access after the page is closed.

**Recommendation**: Prefer an HttpOnly, Secure, SameSite refresh-token cookie, with CSRF protection where needed. Keep short-lived access tokens in memory when practical. Strengthen CSP rather than disabling it globally for Swagger compatibility.

### FRONT-3: Legacy authentication keys broaden the apparent trust surface

**Severity**: Medium

**Evidence**: `ProtectedRoute` accepts `uwe_user_account` and `uwe_user` in addition to the structured auth sessions. Student session setup and logout also maintain compatibility keys.

**Impact**: Stale or manually inserted data can make protected UI render before an API call rejects it. It also complicates logout and incident response.

**Recommendation**: Use one canonical session source. Treat profile-only localStorage data as display cache, never as authentication, and delete legacy keys after a controlled migration.

### FRONT-4: API error handling discards backend detail

**Severity**: Low/Medium

**Evidence**: Many API helper methods throw generic errors such as “Failed to update course” instead of preserving structured response codes/messages.

**Impact**: Operators and students receive less useful feedback, and security incidents are harder to correlate with server request IDs.

**Recommendation**: Parse a stable backend error envelope, display safe user-facing messages, and attach a request ID for support diagnostics.

### FRONT-5: Public media and external URLs require rendering review

**Severity**: Medium pending component confirmation

**Evidence**: The schema contains externally supplied `posterUrl`, `videoUrl`, `zoomLink`, `linkUrl`, and slip data URLs.

**Impact**: Unsafe protocols, malicious redirects, tracking, or unsafe HTML/media behavior may result if these fields are rendered without URL policy checks.

**Recommendation**: Allow only `https:` (and narrowly scoped trusted hosts where needed), sanitize rendered text, reject `javascript:`, `data:` except for explicitly validated image uploads, and test all admin-editable content paths.

---

## 8. Testing and Verification Audit

### Existing tests

The repository contains backend integration/security tests in `backend/src/__tests__` and frontend unit tests for authentication and price formatting in `src/__tests__`. The backend security test covers health/public access, missing and invalid bearer tokens, expired tokens, student-to-admin rejection, admin access, public lead submission, and cross-user dashboard denial.

### Verification run for this report

| Check | Result | Notes |
|---|---|---|
| `npm test` | Passed | 6 test files, 44 tests passed, including frontend and backend suites |
| `npm run lint` | Completed with warnings | No blocking lint exit observed; existing warnings include `any` usage, unused variables, and React hook dependency warnings |
| `npm run build` | Not run | The build tool invocation was skipped in the current session |
| `npm run build:server` | Not run | Not independently executed in the current session |

The passing tests demonstrate the behavior covered by the existing suite only. They do not close the open findings in this report, particularly refresh-token revocation, sensitive response projections, mutation ownership, upload validation, and concurrency behavior.

### Coverage gaps

The following high-risk behaviors are not visibly covered by the reviewed tests:

- Refresh-token replay, rotation, revocation, account deletion, and role changes.
- Cross-user writes to video progress and XP award endpoints.
- Password hashing for admin-created users and rejection of plaintext legacy values.
- Response projections proving `passwordHash` never leaves the backend.
- Coupon concurrency, expiry boundary, course restriction, and redemption atomicity.
- Course seat invariants and concurrent reservations.
- Hiring counter idempotency and concurrent HIRED transitions.
- Payment-slip MIME/type/size validation and private media access.
- Production error sanitization.
- CORS denial and preview-origin behavior.
- Rate-limit behavior and proxy/IP correctness.
- Admin audit event creation for destructive or financial operations.

### Recommended verification commands

Run from the repository root:

```bash
npm run lint
npm test
npm run build
npm run build:server
```

For the database-backed integration suite, provide a test database and required environment variables. Do not point destructive test cleanup at production.

---

## 9. Deployment and Operations Audit

### Positive controls

- Vercel/serverless mode avoids starting a persistent listener.
- Production/Vercel startup fails if `JWT_SECRET` is missing.
- Prisma client generation is part of install/build flows.
- Separate frontend and bundled server build scripts exist.
- Health endpoints provide a basic liveness signal.

### Operational gaps

| Area | Risk | Recommendation |
|---|---|---|
| Secrets | No visible rotation or secret-strength policy | Use managed secrets, rotation, minimum entropy, and environment separation |
| Database | No migration/backup/restore evidence in reviewed files | Define migration ownership, PITR backups, restore drills, and least-privilege DB credentials |
| Observability | Logger exists, but request correlation and security alerting are not established in the reviewed code | Add request IDs, structured fields, latency/error metrics, and alerts for auth/submission anomalies |
| Media | Base64 slips are persisted in relational rows | Move binary media to private object storage with lifecycle and malware scanning |
| CSP | Helmet CSP is explicitly disabled for Swagger UI | Serve Swagger assets safely or apply a scoped CSP to documentation only |
| Availability | In-memory rate limiter state is process-local | Use a shared limiter store for multi-instance/serverless deployments |
| Privacy | User, lead, application, and payment information are retained without visible retention policy | Define retention, deletion/anonymization, access logging, and data-subject workflows |

---

## 10. Prioritized Remediation Plan

### Immediate: before handling sensitive production traffic

1. Fix student ownership checks for progress and gamification mutation paths; add negative integration tests.
2. Remove `passwordHash` from every API response and eliminate plaintext/default password persistence.
3. Implement refresh-token rotation, revocation, and live account/role checks.
4. Replace production raw error messages with generic responses plus server-side request IDs.
5. Put payment slips in private object storage with strict upload validation and signed retrieval URLs.
6. Require strong JWT secrets in every deployed environment, not only production/Vercel.

### Next hardening cycle

1. Apply Zod schemas to every mutation endpoint and remove unsafe `as any` input casts.
2. Make coupon redemption, seat changes, gamification rewards, and hiring transitions transactional/idempotent.
3. Convert money fields from `Float` to `Decimal` with a migration and reconciliation plan.
4. Add append-only administrative audit events.
5. Consolidate canonical frontend session storage and move refresh credentials to HttpOnly cookies.

### Assurance cycle

1. Add end-to-end tests for public checkout, admin verification, enrollment, video completion, certificate issuance, and logout/refresh behavior.
2. Run dependency, secret, SAST, DAST, and authorization tests in CI.
3. Perform a staging penetration test with separate accounts for every admin role and student ownership boundary.
4. Test backup restoration, rate limiting across multiple instances, and incident response procedures.

---

## 11. Final Assessment

UWE is feature-rich and has several mature engineering choices already in place, particularly its route separation, role middleware, validation foundation, caching strategy, health checks, OpenAPI documentation, and frontend code-splitting. The main challenge is consistency: some high-value paths use strong controls while neighboring paths still trust caller-supplied identity, return broad records, accept loosely typed input, or perform multi-step writes without transactions.

The project should be considered **feature-complete in breadth but not yet audit-complete for production assurance**. Addressing the immediate remediation items will materially improve account security, student data isolation, credential hygiene, payment-slip privacy, and operational recoverability.

---

## Appendix A: Key Source Anchors

- Backend entrypoint and middleware: `backend/src/index.ts`
- Authentication controller: `backend/src/controllers/authController.ts`
- JWT middleware: `backend/src/middlewares/authenticate.ts`
- Role enforcement: `backend/src/middlewares/requireAdmin.ts`, `backend/src/middlewares/requireRole.ts`
- Request validation: `backend/src/middlewares/validate.ts`
- Student/admin session storage: `src/services/auth.ts`
- API wrapper and refresh flow: `src/services/api.ts`
- Frontend route guards: `src/components/auth/ProtectedRoute.tsx`, `src/components/auth/AdminRoute.tsx`
- Data model: `prisma/schema.prisma`
- Security tests: `backend/src/__tests__/auth_and_security.test.ts`

## Appendix B: Audit Status Legend

| Status | Meaning |
|---|---|
| Verified | Directly supported by the reviewed source or test evidence |
| Open | A concrete weakness is visible and remediation is recommended |
| Pending runtime confirmation | The source indicates risk, but route mounting/deployment behavior should be tested before final severity assignment |
| Informational | Architectural context or defense-in-depth recommendation |