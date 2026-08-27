# UWE Platform - Updated Master Audit Report

> **Project**: Unity Warriors Empire (UWE)
> **Audit revision**: 3
> **Audit date**: August 26, 2026
> **Review type**: Static security, authorization, architecture, data-integrity, performance, and test review
> **Compared with**: `MASTER_AUDIT_REPORT.md`

---

## Executive Verdict

UWE is a broad education platform with public marketing and enrollment workflows, a student learning portal, gated video content, progress tracking, gamification, certificates, recruitment, payment-slip intake, and a role-based Command HQ admin console.

The new verification pass is positive in two respects: the complete automated suite is green, and both frontend and backend production compilation succeed. The review also found additional issues that were not closed by the first report. The platform should therefore be classified as:

> **Feature-rich and operationally testable, but not yet production-assurance complete.**

### Current risk summary

| Severity | Open findings | Highest concern |
|---|---:|---|
| Critical | 1 | Certificate integrity risk if the demo feature is enabled or advertised |
| High | 8 | Password exposure, plaintext defaults, raw errors, upload/privacy, token freshness, unsafe URL/content handling |
| Medium | 8 | Race conditions, weak invariants, inconsistent validation, privacy/retention, bundle size |
| Low | 2 | Duplicate route surfaces and legacy browser-session compatibility |

Counts are an audit prioritization, not a vulnerability-scanner score. Several findings require staging confirmation before final severity assignment.

## Latest Project State Update - August 26, 2026

### Recent application fixes verified

| Area | Current state | Verification |
|---|---|---|
| Student login | Navbar login now persists the canonical student session and updates the visible user state without requiring a refresh. Legacy compatibility keys are still also written/read elsewhere. | Source review of `Navbar.tsx`, `auth.ts`, and `ProtectedRoute.tsx` |
| Public banners | Active banners are rendered below the public navbar. | `ActiveBannerBar.tsx` and `App.tsx` source review |
| Banner editing | Admin banner values are normalized to the backend-supported `URGENT`, `PROMO`, and `INFO` enum values. | `BannerTab.tsx` and backend validation review |
| About-page image | The inaccessible Google-hosted image was replaced with the local `uwe_hero_emblem.png` asset. | External URL returned HTTP 403; local asset import verified by build |
| Admin name search | Search remains substring-based, so a query such as `la` can match a name containing `la`, including `Dilani`. | `UsersTab.tsx` source review |

### Concurrent-user simulation

A test-only HTTP simulation was run against the local frontend (`http://localhost:5174`) and backend (`http://localhost:5005`). No application code or data model changes were made for the simulation. Each simulated user requested the frontend repeatedly and queried the health, active-banner, and courses endpoints.

| Scenario | Concurrent users | Requests per user | Result |
|---|---:|---:|---|
| Normal | 50 | 3 frontend requests plus 3 API requests | Service remained responsive; no functional crash observed |
| Peak | 200 | 4 frontend requests plus 3 API requests | Service remained available; the single-IP API limiter was exceeded and returned HTTP `429` responses |
| Burst | 500 | 5 frontend requests plus 3 API requests | Service remained available, but rate limiting produced HTTP `429` responses |

The `429` responses are expected from the global API limiter in `backend/src/index.ts`, configured for **300 requests per 15 minutes per IP**. Since each run sends approximately 150, 600, and 1,500 API requests respectively from one local IP, both the peak and burst scenarios are expected to exceed that fixed window. This confirms that the limiter is active, but the simulation is not a production-capacity or distributed-load test because it did not model authenticated writes, database contention, uploads, or multiple deployment instances.

### Current operational conclusion

The platform is currently suitable for continued testing and supervised demo use. The frontend build passes, the recent user-facing fixes are present, the local service stayed available during the simulated normal, peak, and burst traffic, and token rotation plus database-backed revocation are verified. DATA-1, DATA-2, and DATA-3 are now also verified for the exercised concurrent redemption, seat-verification, and hiring-transition paths. The platform should not yet be described as production-assurance complete because upload validation/privacy, legacy credentials, audit coverage, broader commerce workflow coverage, and other findings listed later remain.

### Authentication and revocation verification - August 27, 2026

The current implementation was checked against the claimed dual-layer refresh-token design:

| Check | Result | Evidence |
|---|---|---|
| Durable refresh-token model | **Confirmed** | `prisma.RefreshToken` exists with unique `jti`, revocation state, token version, expiry, and indexes. |
| Dual-layer persistence | **Confirmed in source** | `tokenService.ts` writes refresh-token state to PostgreSQL and Upstash Redis; Redis has a process-local fallback when credentials are absent. |
| Rotation and replay detection | **Confirmed** | The old token is marked revoked/deleted before a new JTI is issued; reuse returns `401` and revokes the user sessions. |
| Live identity checks | **Confirmed** | Refresh checks the current student/admin record, enrollment state, token version, and live admin role. |
| Revoke-all | **Confirmed** | Database token version is incremented, refresh-token rows are marked revoked, and matching cache keys are purged. |
| Focused automated verification | **Passed** | `backend/src/__tests__/phase7.test.ts`: 12/12 tests passed, including rotation, replay rejection, and revoke-all. |
| Prisma schema verification | **Passed** | `npx prisma validate` completed successfully. |

Remaining caveats are operational rather than an absent feature: database/cache write failures are currently logged in some revocation paths, and production must provide Upstash Redis rather than using the process-local fallback. Already-issued access tokens can also remain valid until their short access-token expiry.

### Transactional commerce and state verification - August 27, 2026

The current implementation and dedicated race-condition suite were checked for the three commerce/state findings:

| Area | Current status | Evidence |
|---|---|---|
| `DATA-1` Coupons | **Verified** | `POST /api/coupons/redeem` uses a transaction and a database conditional `updateMany` requiring `isActive` and `usedCount < maxUses`; the dedicated race test produced exactly 1 winner from 5 requests for a one-use coupon and left `usedCount` at 1. |
| `DATA-2` Seats | **Verified with scope caveat** | Slip verification runs in a transaction and conditionally decrements a batch only when `availableSeats > 0`; the dedicated race test produced exactly 1 successful verification from 5 requests and left the batch at 0 seats. Admin batch update paths also clamp availability against total seats. |
| `DATA-3` Hiring counters | **Verified with transition scope caveat** | Hiring uses a transaction and conditional atomic `hiredCount` increment/decrement guards; the dedicated race test produced exactly 1 hire from 5 requests, with `hiredCount = 1` and `HIRING_FINISHED`. |

The tests prove the exercised one-use/one-seat/one-position races against the configured PostgreSQL test database. They do not prove every possible state transition, retry policy, or business rule. In particular, repeated verification of an already-verified slip and broader coupon-to-order binding should remain covered by future tests.

### Fresh verification evidence - August 27, 2026

| Check | Result |
|---|---|
| `npx vitest run backend/src/__tests__/concurrency_and_races.test.ts` | **Passed: 3/3** |
| `npm test` | **Passed: 7 test files, 48/48 tests** |
| `npx prisma validate` | **Passed** |
| `npm run build:server` | **Passed: 0 errors** |
| `npm run build` / `npx vite build` | **Passed: 0 errors** |

---

## 1. Fresh Verification Results

The following commands were run from the repository root during the August 26, 2026 verification refresh:

| Check | Result | Evidence |
|---|---|---|
| `npm test` | **Passed** | 6 test files, 45 tests passed |
| `npm run build` | **Passed** | Vite production build completed successfully |
| `npm run build:server` | **Passed** | esbuild completed successfully; generated server bundle is approximately 3.3 MB |
| `npm run lint` | Completed with warnings | Existing warnings include explicit `any`, unused variables, hook dependencies, and generated bundle directives |

The tests provide useful coverage for authentication barriers, role checks, OpenAPI, public resources, leads, mastermind, gamification, and frontend utilities. They do not establish that all production security boundaries are safe.

### Important test correction

The first report described student progress mutation ownership as pending. The current route source confirms that `videoProgressRoutes.ts` applies `authenticate` globally and checks `req.user.id === req.body.userId` for student writes. This specific progress ownership path is therefore **verified at the route level**. It should still be hardened to derive the ID from the token rather than trusting a matching body value.

---

## 1A. Status Reconciliation of the First Master Audit

This section checks every finding in `MASTER_AUDIT_REPORT.md` against the current source reviewed during this second audit.

| Original ID | Area | New status | Current conclusion |
|---|---|---|---|
| `SEC-1` | Refresh-token revocation | **Fixed with operational caveats** | Refresh tokens rotate with unique JTIs, are persisted in PostgreSQL and Redis, detect replay, and check live account/token-version state. Some failure paths log database errors instead of failing closed, and production must use shared Upstash Redis. |
| `SEC-2` | Progress ownership | **Fixed for student requests** | Student progress uses `req.user.id`; admin-targeted access remains intentionally privileged behind authenticated route checks. |
| `SEC-3` | XP award authorization | **Partially fixed** | Student awards use caller identity and fixed action values. Admins can intentionally target a student and provide up to 1,000 XP; the route does not visibly use role middleware. |
| `SEC-4` | Password hash responses | **Fixed for reviewed endpoints** | `SAFE_USER_SELECT` and explicit dashboard selection exclude `passwordHash` from reviewed user responses. |
| `SEC-5` | Admin default/legacy password handling | **Partially fixed** | CMS-created passwords are bcrypt-hashed and missing passwords use a random temporary value. Legacy plaintext login compatibility remains. |
| `SEC-6` | Legacy plaintext login | **Still open** | Student and admin login still directly compare non-bcrypt values before upgrading them. |
| `SEC-7` | JWT fallback secret | **Partially fixed** | Minimum length and production/Vercel fail-closed checks exist, but local/non-production still has a hardcoded fallback. |
| `SEC-8` | Raw production errors | **Partially fixed** | HTTP 500 production errors are generic with an `errorId`; non-500 errors can still expose `err.message`. |
| `SEC-9` | Payment-slip upload controls | **Still open** | Prefix and length checks exist, but decoded file signature, MIME, dimensions, malware, and private storage controls are not implemented. |
| `SEC-10` | Public abuse prevention | **Partially addressed** | IP rate limits exist, but CAPTCHA/verification/idempotency/distributed abuse controls are not visible. |
| `DATA-1` | Coupon redemption | **Fixed for implemented redemption path** | Redemption uses a transaction and a database conditional usage increment; broader final-order/payment binding is not implemented. |
| `DATA-2` | Seat invariants | **Fixed for exercised reservation path** | Slip verification conditionally decrements available seats inside a transaction, and the race test confirms the count never drops below zero; broader reservation workflows still need coverage. |
| `DATA-3` | Hiring counters | **Fixed for exercised hiring transition path** | Hiring count changes use conditional atomic updates inside a transaction; broader transition permutations still need coverage. |
| `DATA-4` | Gamification replay/lost update | **Partially fixed** | Numeric XP now uses a transactional atomic increment; streak/badge state still uses pre-transaction values and reward events are not idempotent. |
| `DATA-5` | JSON string state | **Still open** | Enrollment, badges, and voter state remain encoded in strings. |
| `DATA-6` | Float money fields | **Still open** | Course and payment/coupon monetary fields remain `Float` in Prisma. |
| `DATA-7` | Certificate integrity | **Still open** | Certificate issuance is not visibly tied to completion, and the schema remains denormalized. |
| `API-1` | Validation coverage | **Partially fixed** | Staff, instructor, and full batch routes use schemas; the seat-only batch route and several other mutations still rely on manual parsing/casts. |
| `API-2` | Duplicate route prefixes | **Still open** | `/api/...` and root aliases remain registered. |
| `API-3` | Fatal process handling | **Confirmed in current source** | Both fatal-process handlers now exit outside tests; this is fail-fast handling rather than graceful draining. |
| `API-4` | Admin audit events | **Partially fixed** | An append-only model/service exists and selected mutations are wired, but failures are swallowed and coverage is incomplete. |
| `FRONT-1` | Frontend guards | **Partially addressed** | Backend guards are authoritative; frontend guards use canonical sessions, but local profile/session compatibility data remains elsewhere. |
| `FRONT-2` | Refresh token storage | **Still open** | Refresh tokens remain in localStorage. |
| `FRONT-3` | Legacy auth keys | **Partially fixed** | `ProtectedRoute` no longer accepts legacy keys for authentication, but other frontend components still read/write them. |
| `FRONT-4` | API error detail | **Still open** | Many API methods still replace structured backend errors with generic thrown messages. |
| `FRONT-5` | External URL safety | **Partially fixed** | A sanitizer exists and is used in reviewed frontend paths, but it permits additional protocols and is not visibly applied to every external URL field. |
| `PERF-1` | Bundle size | **Still open** | Fresh build confirms a 2.2 MB shield image, large frontend chunks, and a 3.3 MB server bundle. |
| `PERF-2` | Admin pagination | **Still open** | Reviewed admin list controllers still return complete collections without visible bounded pagination. |
| `ROUTE-1` | Duplicate aliases | **Still open** | Duplicate route exposure remains unchanged and is also tracked as `API-2`. |
| `OPS-1` | Cache fallback | **Still open** | In-memory cache fallback remains process-local and unsuitable as the production shared cache. |
| `OPS-2` | Fatal process events | **Fixed for fail-fast shutdown** | This duplicates `API-3`; both fatal process handlers now exit outside tests. Graceful draining is not implemented. |

### Reconciliation summary

| State | Count | Meaning |
|---|---:|---|
| Still open | 13 | The original weakness remains visible in current source. |
| Partially addressed | 14 | Some defense exists, but the original risk is not fully closed. |
| Confirmed fully fixed | 4 | The current source supports the fixed status for `SEC-2`, `SEC-4`, `API-3`, and `OPS-2`. |
| Duplicate tracking items | 2 | `ROUTE-1`/`API-2` and `OPS-2`/`API-3` describe the same underlying risks. |

The first report’s list contains 31 rows because two operational/API findings are duplicates. The counts above describe the visible reconciliation table, while duplicate tracking items should not be added as separate risks. Later sections contain historical remediation-claim checks and must not override this current reconciliation.

---

## 1B. Verification of the Remediation TODO Claims

> **Historical verification note:** This section records earlier remediation claims and is retained for traceability. Where it conflicts with the August 26 source verification in this report, the later current-source findings take precedence.

The attached remediation summary marks these items complete. A second source review gives the following independent verdict. A checkbox in `AUDIT_REMEDIATION_TODO.md` is not treated as proof by itself.

| Claim | Verdict | Evidence-based conclusion |
|---|---|---|
| `SEC-1` token version and live account checks | **Partially true** | `tokenVersion` exists and refresh checks live admin/student records. However, the comparison is guarded by `if (decoded.tokenVersion && ...)`, so a signed legacy refresh token without `tokenVersion` bypasses the version check. Admin role is also copied from the old token rather than refreshed from the database. |
| `SEC-2` progress identity is strictly derived from token | **Partially true** | Student route ownership is enforced, and the controller uses the caller ID for students. Admin requests may still intentionally target a body/URL ID; the claim is too broad when it says identity is strictly derived for every caller. |
| `SEC-3` arbitrary XP is rejected | **False as written** | Student XP uses fixed action values, but admins can submit a caller-selected `xpAmount` up to 1,000 and target another user. The route only requires authentication, not a role middleware. |
| `SEC-4` password hash never serialized | **Confirmed** | `SAFE_USER_SELECT` is used by the user controller, and the dashboard selects a safe user subset. This claim is supported for the reviewed user/dashboard responses; other future endpoints still need a regression test. |
| `SEC-5/6` admin-created users are bcrypt hashed | **Partially true** | `createUser` now bcrypt-hashes the value and uses a random temporary value when omitted; both login flows retain plaintext compatibility branches. Legacy credential hygiene is not fully resolved. |
| `SEC-7` JWT secret enforcement across all environments | **False as written** | A minimum 32-character check exists when a secret is supplied and production/Vercel fails closed when it is missing. Non-production environments still use the hardcoded fallback secret, so “all environments” is not true. |
| `SEC-8` production errors are generic with an error ID | **Partially true** | 500 responses in production are generic and include a UUID. Non-500 errors can still return `err.message`, so the claim that production responses are universally clean is too broad. |
| `SEC-9` payment slips validate real image signatures | **False as written** | The Zod rule checks string prefixes such as `data:image/png` and permits `http://localhost`; it does not decode bytes, inspect magic numbers, enforce decoded file size, validate dimensions, scan malware, or reject all unsafe remote targets. |
| `SEC-10` public form abuse/idempotency is resolved | **False as written** | Lead deduplication exists, but there is no general idempotency key and no equivalent robust protection shown for job applications or payment slips. IP rate limits are not the same as idempotent submission handling. |
| `DATA-1` atomic coupon reservation/redemption | **False** | `validateCoupon` can use the authoritative course price when a valid course is supplied, but it does not increment/reserve usage or bind a discount to a completed order. |
| `DATA-2` seat range invariants | **Partially true** | Both batch paths clamp available seats against the relevant total, but malformed values are not rejected consistently and concurrency-safe reservations are not shown. |
| `DATA-3` atomic hiring counters | **Partially true** | The status transition and counter update now share one Prisma transaction. The transaction still performs read-modify-write counter logic without an atomic increment or explicit concurrency guard, so lost-update risk remains. |
| `DATA-4` synchronized gamification updates | **False as a concurrency fix** | XP, streak, and badges are calculated from a read and written as a full record; no transaction, atomic increment, or unique reward-event idempotency key is visible. |
| `DATA-7` certificate issuance is gated | **Partially true** | Student claims use the authenticated caller and check `isEnrolled`. Admins can target a body `userId`, and no completion/module eligibility check is visible. This does not fully prove certificate entitlement. |
| `API-3` controlled crash handling | **Confirmed with caveat** | Both fatal handlers now log and call `process.exit(1)` outside tests, which supports supervisor restart. This is fail-fast rather than graceful draining. |
| `API-4` immutable admin audit trail | **Partially true** | `AdminAuditLog` and `recordAdminAudit` exist and are wired into user creation/update/delete, coach assignment, and slip verification. The service swallows audit-write failures, does not make the primary mutation and audit event atomic, and coverage is not universal across all privileged mutations. |
| `FRONT-5` URL protocol sanitization | **Partially true** | `urlSecurity.ts` blocks obvious dangerous schemes and allows HTTPS/WhatsApp plus `http:`, `mailto:`, and `tel:`. It does not enforce only HTTPS/`wa.me`, and `ActiveBannerBar` still renders its banner link without the sanitizer. |

### Claim verification conclusion

| Verdict | Count |
|---|---:|
| Confirmed as claimed | 2 |
| Partially true | 9 |
| False or materially overstated | 6 |

The remediation TODO is useful as an implementation checklist, but its completed checkboxes currently overstate closure. For a paid launch, the most urgent corrections are fail-closed token-service error handling, coupon redemption, actual upload validation, XP authorization/concurrency, and removal of predictable seed/legacy credential risks. Certificate entitlement is urgent only if the demo certificate feature is enabled or marketed as a real credential.

### Latest remediation claim re-check: August 26, 2026

The newer remediation summary is **partly supported by the current source and tests**. The current `npm test` run passes **48/48 tests**, including the dedicated concurrency suite. Passing tests still do not prove every production workflow or deployment condition.

| Claimed fix | Latest verdict | Why |
|---|---|---|
| Strict token-version check and live admin role refresh | **Confirmed in source** | `decodedVersion` defaults to `1`, the live database version is compared, and admin role is now read from the live admin record. The claim is supported for the current implementation. |
| Progress identity derived from authenticated caller | **Partially confirmed** | Student requests use `req.user.id`; admin requests intentionally retain an admin-selected target user. This is appropriate only when the route is admin-authorized. |
| XP uses only fixed server-side awards | **Not confirmed** | Student awards use fixed action values, but admins can still supply `xpAmount` up to `1000` and choose a target user. The route has authentication but no visible admin role middleware. |
| Safe user projection | **Confirmed for reviewed user endpoints** | `SAFE_USER_SELECT` excludes `passwordHash` in user controller responses, and the dashboard uses an explicit safe user select. |
| CMS passwords use random temporary values | **Confirmed** | Missing passwords use `crypto.randomBytes(6).toString('hex')` before bcrypt hashing. Seed/test plaintext credentials remain separate fixture hygiene concerns. |
| JWT secret is enforced across all environments | **Partially confirmed** | A 32-character minimum is enforced when a secret exists, and production/Vercel fails closed when absent. Local/non-production still has a hardcoded fallback. |
| Production errors are clean and correlated | **Partially confirmed** | HTTP 500 production errors are generic with `errorId`; non-500 errors can still return `err.message`. |
| Payment slips validate strict MIME/signatures | **Not confirmed** | The schema checks string prefixes and length, including `http://localhost`; it does not inspect decoded bytes, magic numbers, dimensions, malware, or remote-host trust. |
| Public lead abuse/idempotency is resolved | **Partially confirmed** | Lead deduplication exists, but no general idempotency key or equivalent robust protection for slips/jobs is visible. |
| Coupon validation is authoritative and redeemed atomically | **Not confirmed** | Course lookup overrides the client price when a valid course is found, but the endpoint still does not reserve/increment usage or create a completed purchase record. |
| Seat bounds are enforced | **Partially confirmed** | `updateBatchSeats` checks the existing total, but `updateBatch` can update `totalSeats` downward without clamping an existing `availableSeats` when only total is supplied. |
| Hiring transition is atomic | **Confirmed transaction boundary, not full concurrency hardening** | Status and counter writes share a transaction, but counter logic remains read-modify-write and lacks a conditional/atomic increment guard. |
| Gamification is synchronized | **Not confirmed as concurrency-safe** | XP, streak, and badges still use read-modify-write; no unique reward event or atomic increment is visible. |
| Certificate claim is authenticated and enrollment-gated | **Confirmed for authentication/enrollment** | The claim route requires authentication, derives student identity, checks active enrollment, and checks course enrollment. Completion eligibility remains absent, which is acceptable only while the feature is demo-only. |
| Admin audit log is complete and immutable | **Partially confirmed** | The model/service and selected wiring exist, but audit failures are swallowed and many privileged mutations are not visibly logged. |
| URL sanitization is complete | **Partially confirmed** | A sanitizer exists and is used in at least one student dashboard path, but it allows `http:`, `mailto:`, and `tel:` and is not shown on every external URL rendering path. |
| Uncaught process restart handling | **Confirmed for fail-fast policy** | Both `uncaughtException` and `unhandledRejection` exit outside tests. This is fail-fast rather than graceful draining. |
| Admin abandoned-lead badge fix | **Confirmed in source** | The badge now uses `isAbandoned` or the 24-hour `hoursPending` condition instead of counting every `NEW` lead. |

**Latest conclusion**: the remediation work is real and materially improves the project. Token rotation/revocation, safe user projections, random CMS temporary passwords, certificate authentication/enrollment gating, lead badge logic, and the DATA-1/2/3 race-tested paths are supported by the current source and tests. The main remaining technical gaps are XP authorization/idempotency, actual upload signature validation, complete audit coverage, broader commerce workflow binding, and deployment/configuration hardening.

### Final pasted-claim verification: August 26, 2026

The latest reconciliation claims were checked against the current TypeScript source, Prisma schema, frontend source, and generated server bundle. The result is not “all fixed”:

| Latest claim | Verdict | Current evidence |
|---|---|---|
| `SEC-1` strict token-version and live-role refresh | **Confirmed in TypeScript source** | Refresh uses `decoded.tokenVersion || 1`, compares it with the live record, and refreshes the admin role from the database. |
| `SEC-2` progress identity hardening | **Confirmed for student caller identity** | Student controller paths use `req.user.id`; admin-targeted access remains intentionally privileged. |
| `SEC-3` fixed XP awards and strict role gating | **Partially true** | Student awards use fixed action values, but authenticated admins can still provide a custom amount up to 1,000 and target another user. The route has `authenticate` but no visible `requireAdmin`/`requireRole`. |
| `SEC-4` safe user response projection | **Confirmed for reviewed user endpoints** | `SAFE_USER_SELECT` excludes `passwordHash`, and the dashboard user select is also explicit. |
| `SEC-5/6` random CMS temporary password | **Confirmed for current CMS creation path** | Missing passwords use `crypto.randomBytes(6).toString('hex')` and are bcrypt-hashed. Seed fixtures and legacy plaintext login compatibility remain separate risks. |
| `SEC-7` JWT secret enforcement | **Partially true** | Supplied secrets shorter than 32 characters fail, and production/Vercel fails when absent. Non-production still has a hardcoded fallback secret. |
| `SEC-8` production error sanitization | **Partially true** | 500 errors are generic with an `errorId`; non-500 errors can still return `err.message`. |
| `SEC-9` valid signatures and 5 MB payload limit | **False as written** | The schema limits the string to 7,000,000 characters, not a decoded 5 MB file, and checks textual prefixes rather than JPEG/PNG/WEBP/PDF magic bytes. It permits HTTPS URLs, which are not file-signature validation. |
| `SEC-10` public abuse/idempotency | **Partially true** | Lead deduplication exists, but payment-slip/job idempotency and broader distributed abuse controls are not shown. |
| `DATA-1` authoritative coupon price | **Verified for implemented redemption path** | Preview can use the authoritative course price, and `/api/coupons/redeem` atomically guards usage with a conditional database increment. Final order/payment binding remains outside the implemented scope. |
| `DATA-2` seat range invariant | **Verified for exercised verification path** | Slip verification uses a transaction and conditional decrement; the dedicated race test confirms one winner for one remaining seat. Admin input validation and broader reservation workflows still need coverage. |
| `DATA-3` atomic hiring transitions | **Verified for exercised hiring path** | Hiring uses a transaction and conditional atomic counter updates; the dedicated race test confirms one winner for one open position. Other status-transition permutations still need coverage. |
| Lead abandoned badge correction | **Confirmed in source** | The current badge formula uses `isAbandoned` or `hoursPending >= 24`; it no longer counts every new lead. |
| `API-3/OPS-2` both process handlers exit | **Confirmed in current source** | Both handlers call `process.exit(1)` outside tests. This is a fail-fast policy, not graceful draining. |
| `NEW-01/NEW-04` certificate authentication/enrollment | **Confirmed partially** | Anonymous claims are blocked and student enrollment/course membership is checked. Completion/viva eligibility is not checked, which is acceptable while the feature remains demo-only. |
| `NEW-02/NEW-03` mastermind identity | **Partially true** | Posting is authenticated and author identity is derived from the database. Upvotes use authenticated IDs, but the voter list is still JSON read-modify-write and is not transaction-safe. |
| `API-4` admin audit trail | **Partially true** | The model and service exist, but audit failures are swallowed and only selected mutation paths are wired. |

#### Generated deployment artifact verification

Before this check, the generated `api/index.js` did contain older bundled implementations than the TypeScript source. Running `npm run build:server` regenerated the artifact successfully at approximately 3.3 MB. A follow-up search confirmed the bundle now contains the current token-version checks, random CMS temporary-password generation, seat-bound logic, and fatal unhandled-rejection handling. Rebuilding and checking the deployment artifact must remain part of release verification because source changes do not automatically update the bundle.

### Latest remediation claims: DATA-3 through FRONT-5

The following claims were checked against the current TypeScript source, route wiring, frontend components, and generated `api/index.js` bundle:

| Claimed item | Verdict | Current evidence |
|---|---|---|
| `DATA-3` job hiring audit trail | **Partially confirmed** | `jobController.ts` imports `recordAdminAudit` and records application status changes after the transaction. This is present for that mutation, but the audit service can swallow write failures and the broader job create/update/delete paths are not all visibly audited. |
| `DATA-4` atomic XP increment | **Partially confirmed** | `awardXp` uses `prisma.$transaction` and `xp: { increment: xpToAdd }`, protecting the numeric increment. Streak and badge state still come from a pre-transaction read, there is no unique reward-event idempotency key, and admins can intentionally provide up to 1,000 XP. |
| `API-1` staff/instructor/batch validation | **Partially confirmed** | `staffSchema` and `instructorSchema` are applied to create/update routes, and `batchUpdateSchema` is applied to the full batch update route. The dedicated `/batches/:batchId/seats` route has no `validate(batchUpdateSchema)` middleware and relies on controller parsing. |
| `API-4` course/coupon/job audit logging | **Partially confirmed** | Audit imports/calls exist in course, coupon, and job controllers. The service catches and suppresses database errors, and audit writes occur after primary mutations rather than in the same transaction. |
| `FRONT-2/3` legacy session bypass removal | **Partially true** | `ProtectedRoute` now trusts only `authService` sessions, so the old direct bypass was removed there. However, `uwe_user_account` and `uwe_user` are still read or written by other frontend components, including login, navigation, contact, videos, dashboard, profile, and users UI. |
| `FRONT-5` URL sanitization across named tabs | **Confirmed for named links** | `DemosTab`, `BatchesTab`, `SeriesTab`, and `SlipsTab` apply the sanitizer to their reviewed video, Zoom, module, slip, and image links. The sanitizer still allows `http:`, `mailto:`, and `tel:` and must be reviewed for other URL fields. |

### Remaining issues after this remediation pass

1. The seat-only endpoint now clamps values against `totalSeats` and the exercised reservation path uses a conditional atomic decrement; route-level validation and broader malformed-input coverage remain.
2. XP numeric increments are atomic, but streak/badge updates are still based on a pre-transaction read and reward events can still be replayed; admin custom XP remains intentional.
3. Audit logging is present in course, coupon, job, user, coach, and slip paths, but a swallowed audit failure means a successful privileged mutation can lack an audit record and coverage is not universal.
4. The legacy localStorage cleanup claim is incomplete: `ProtectedRoute` no longer uses fallback keys for its authentication decision, but other application code still persists and reads them.
5. Payment-slip “signature validation” remains a textual prefix check, not binary file-signature verification; the 7,000,000-character limit is not a decoded 5 MB file limit.
6. Coupon preview remains separate from redemption; the implemented redemption endpoint now performs transactional conditional usage increments, but final purchase binding is not implemented.
7. Non-production deployments still have a hardcoded JWT fallback secret.
8. Certificate issuance checks authentication and enrollment, but not completion; this remains deferred while certificates are demo-only.

The latest remediation is therefore substantial but should be described as **partially hardened**, not fully resolved.

### Authoritative unresolved-problem list

The following is the current final list after applying all verified remediation claims. Items marked conditional are not launch blockers for the owner’s demo-only product decisions.

| ID | Current status | Remaining problem |
|---|---|---|
| `SEC-1` | Fixed with operational caveats | Refresh tokens rotate with unique JTIs and are stored/revoked through PostgreSQL plus Redis. Some database failure paths are logged rather than failing closed, and production must use shared Upstash Redis. |
| `SEC-3` | Partially resolved | Students use fixed awards, but admins can target users and submit custom XP; no reward-event idempotency is visible. |
| `SEC-5/6` | Partially resolved | CMS values are randomly generated and hashed, but legacy plaintext login compatibility remains; seed credentials must not enter production. |
| `SEC-7` | Partially resolved | Production fails closed and supplied secrets require 32 characters, but a hardcoded fallback remains for non-production deployments. |
| `SEC-8` | Partially resolved | HTTP 500 errors are sanitized, but non-500 production errors may still expose `err.message`. |
| `SEC-9` | Open | Payment slips use textual prefix/length checks rather than decoded file-signature validation; storage is still database-backed and requires privacy/size controls. |
| `SEC-10` | Partially resolved | Lead deduplication and rate limiting exist, but job/slip idempotency, CAPTCHA/verification, and distributed abuse controls are absent. |
| `DATA-1` | Fixed for implemented redemption paths | Coupon redemption now has a transaction and conditional database increment; broader final-order/payment binding is not implemented. |
| `DATA-2` | Fixed for exercised verification/update paths | Seat decrements and batch updates use transactional conditional/clamped logic; broader reservation workflows still need coverage. |
| `DATA-3` | Fixed for exercised hiring transition paths | Hiring count changes use transactional conditional atomic updates; broader transition permutations still need coverage. |
| `DATA-4` | Partially resolved | XP increment is atomic, but streak/badge calculations use pre-transaction state and awards can be replayed. Low business risk while viva/WhatsApp review is authoritative. |
| `DATA-5` | Open | Enrollment, badges, and voter lists remain JSON/comma-separated strings with weak relational constraints. |
| `DATA-6` | Open | Monetary fields remain Prisma `Float` rather than Decimal/minor units. |
| `DATA-7` | Deferred | Certificate authentication/enrollment gates exist, but completion/viva eligibility is not enforced. This is acceptable only while certificates remain demo-only. |
| `API-1` | Partially resolved | Staff, instructor, and full batch validation exists; the seat-only route and several other mutations still lack schemas. |
| `API-2` | Open | Duplicate `/api/...` and root route aliases remain. |
| `API-4` | Partially resolved | Audit logging is wired into selected course, coupon, job, user, coach, and slip paths, but coverage is incomplete and audit failures are swallowed. |
| `FRONT-2` | Open | Refresh tokens remain in localStorage. |
| `FRONT-3` | Partially resolved | ProtectedRoute no longer trusts legacy keys, but other components still read/write `uwe_user_account` and `uwe_user`. |
| `FRONT-4` | Open | Many frontend API methods replace structured backend errors with generic messages. |
| `FRONT-5` | Partially resolved | Named admin links are sanitized, but the sanitizer allows additional protocols and universal application is not proven. |
| `PERF-1` | Open | The build still contains a roughly 2.2 MB shield image, large frontend chunks, and a roughly 3.3 MB server bundle. |
| `PERF-2` | Open | Several admin list endpoints return complete collections without visible bounded pagination. |
| `OPS-1` | Open | In-memory cache fallback is process-local and unsuitable as the shared production cache. |
| `OPS-2` | Fixed for fail-fast policy | Both fatal process handlers exit outside tests; graceful draining and shutdown cleanup are not implemented. |

**Not unresolved after verification**: reviewed user responses no longer expose `passwordHash`; student progress ownership is protected; named Demos/Batches/Series/Slips links use URL sanitizers; job application status changes are transactional; and the abandoned-lead badge logic is corrected.

### Product-context adjustment: certificates and seed data

The project owner clarified that certificates are currently a demonstration feature intended to be redesigned later, not a claim of real accreditation or an operational credential service. This reduces the immediate commercial priority of the certificate findings:

- Treat `NEW-01` and `NEW-04` as **deferred feature-security work**, not evidence that the core course-selling workflow is broken.
- Do not advertise certificates as verified qualifications until completion rules, issuance authorization, revocation, and public verification have been implemented.
- Keep the endpoint disabled, admin-only, or clearly marked as demo-only in any paid launch until that work is complete.

The owner also plans to clear seeded demo records before production use. That will reduce the risk from the sample names and credentials, but the cleanup is not yet independently verified in this audit. Before deployment, confirm that the production database is separate from the seed/test database, no seeded credentials remain, and all production accounts use unique bcrypt hashes and non-default passwords. The runtime CMS fallback now uses a random temporary value; the remaining credential issue is legacy plaintext compatibility and secure delivery/reset of temporary passwords.

### Product-context adjustment: hybrid payment-slip verification

The project owner clarified that payment slips are intended to support a hybrid workflow: the website collects the receipt, while staff manually verify the payment through WhatsApp before confirming enrollment. This is a reasonable operating model for a demo or early-stage launch and lowers the risk of automatic false enrollment because a human remains in the approval loop.

Manual WhatsApp verification does **not** replace technical upload protections. The site still receives and stores untrusted content before staff review, so the following remain necessary:

- Restrict file type and decoded size, rather than checking only a text prefix.
- Store receipts privately and expose them only to authorized staff.
- Avoid returning full receipt payloads in broad list/dashboard responses.
- Record who verified or rejected each slip and when.
- Protect the WhatsApp/manual process from duplicate slips, impersonation, and social-engineering mistakes.

With manual approval, `SEC-9` is best classified as **medium operational risk for the current demo workflow**, but it becomes high risk if receipts are automatically trusted, publicly accessible, or allowed to grow the database without limits.

### Product-context adjustment: live viva and WhatsApp-supervised progression

The project owner clarified that student progression is primarily established through live viva sessions, not by watching videos alone. Administrators review students during those sessions and communicate through separate WhatsApp groups for each student or cohort. Video progress and XP are therefore organizational support tools rather than the sole source of attendance, assessment, or certification decisions.

This lowers the immediate business impact of the XP/progress findings for the current hybrid workflow:

- A manipulated video-completion value does not by itself prove that a student attended or passed a viva.
- Admin staff can cross-check progress against the live session and WhatsApp record.
- XP award authorization is **low operational severity for the current demo** if XP has no cash value, access-control value, or certificate authority.
- The technical endpoint should still derive identity from the authenticated session, restrict admin overrides, and record the reason for manual awards so the system remains trustworthy and organized.

Do not use client-controlled progress or XP as the only basis for certificates, paid entitlements, rank benefits, refunds, or formal student outcomes. If those features are introduced later, the current XP/progress findings return to high priority and require authoritative server-side completion events.

### Admin WhatsApp lead workflow verification

The lead workflow in the admin panel is a **manual WhatsApp launcher**, not an automated WhatsApp integration. The current behavior is:

1. `getAllLeads` loads lead records and calculates server-side abandoned status for `NEW` leads older than 24 hours.
2. The admin panel maps those records into the Leads tab.
3. `REPLY` opens a prefilled `https://wa.me/<number>?text=...` browser link.
4. `RETENTION WA` opens a different prefilled message for abandoned leads.
5. The panel updates normal replies to `CONTACTED` and calls the abandoned-reminder endpoint, which records `lastReminderSentAt`, appends a note, and changes a `NEW` lead to `CONTACTED`.

### Lead workflow issues found

| Finding | Severity | Result |
|---|---|---|
| Abandoned badge count is calculated as `isAbandoned || status === 'NEW'` in `LeadsTab.tsx` | Medium | The badge labeled `ABANDONED SLIPS (>24H)` counts every new lead, including leads created less than 24 hours ago. The filter itself applies the 24-hour test, so the badge and filtered list can disagree. |
| WhatsApp is not programmatically sending messages | Informational / expected hybrid behavior | `window.open()` only opens WhatsApp Web/app. Delivery, read status, failure, and group membership are not known to the site. This is correct for manual outreach but should not be described as an automated notification engine. |
| Separate WhatsApp groups are not represented in the application | Low / process gap | No group ID, cohort/group mapping, message log, or group-management integration is visible. Group organization remains an external manual process. |
| Retention reminders can be repeated | Low/Medium | `lastReminderSentAt` is recorded but the endpoint/UI does not visibly block or warn on repeated reminders. Add a cooldown and display the last reminder time. |
| Lead conversion uses a hardcoded `password: 'password123'` from the admin UI | High | The CMS hashes it before storage, but every converted lead receives the same predictable password unless changed later. Use a one-time invitation/reset flow instead. |

**Conclusion**: The basic admin lead workflow works for a supervised demo: staff can see leads, click to contact them manually, and update CRM status. It is not an automated WhatsApp system, and the abandoned-count badge plus predictable lead-conversion password should be corrected before describing the workflow as production-ready.

### Intended CRM scope adjustment

The project owner clarified that this feature is mainly intended to track contact numbers and the current state of each prospect, including:

- Name and phone number.
- Interested program or inquiry type.
- Lead state such as `NEW`, `CONTACTED`, `ENROLLED`, or `REJECTED`.
- Whether the person has been converted into a student account.
- Whether a follow-up reminder has been recorded.
- Manual WhatsApp contact as an operator action.

Against that intended scope, the **lead/WhatsApp module** is appropriately designed as a lightweight lead-status tracker with WhatsApp shortcuts. Automated WhatsApp delivery receipts, WhatsApp group membership, message history, and provider webhooks are not required for the current product definition and should be treated as future enhancements rather than launch defects. This scope judgment applies only to lead handling, not to the Admin Panel as a whole.

The remaining in-scope corrections are narrower:

1. Make the abandoned counter match the actual 24-hour abandoned filter.
2. Store normalized phone numbers consistently so the same person is not duplicated by formatting differences.
3. Add a visible follow-up timestamp/cooldown so staff know when a reminder was last recorded.
4. Replace the hardcoded lead-conversion password with a one-time invitation or reset flow.
5. Preserve the CRM status change and operator identity in the admin audit log.

### Overall Admin Panel scope clarification

The Admin Panel is broader than the lead tracker. It is an operational CMS and student-management console that also supports:

- Creating and editing courses, prices, batches, schedules, seats, and Zoom links.
- Adding and managing demo videos, program video series, and learning modules.
- Managing student access, enrollment, course assignments, progress, XP, and certificates.
- Managing registered users, coaches, instructors, staff, and role-based access.
- Publishing and moderating job posts, applications, reviews, banners, coupons, and mastermind content.
- Reviewing payment slips and deciding whether a student should be enrolled.
- Viewing analytics and exporting operational records.

These broader administrative capabilities remain subject to the security and data-integrity findings elsewhere in this report. In particular, payment verification, user access changes, course pricing, seat counts, content publication, and staff actions deserve server-side authorization, safe input validation, audit logging, and concurrency protection even when WhatsApp communication remains manual.

### Seed and test credential clarification

The repository does contain intentional demo/test credentials. `prisma/seed.ts` inserts student records with `password123` and admin records with plaintext values such as `admin1234`, `commander123`, `coach123`, `recruiter123`. Backend tests also create fixture users with `password123`.

This explains why those strings appear in the repository, but it does not make the original security claim fully true:

| Credential location | Audit interpretation | Risk |
|---|---|---|
| `prisma/seed.ts` demo records | **Test/development fixture** | Safe only when the seed database is isolated, inaccessible from the internet, and never used as production data. Plaintext seed values should still be hashed or clearly isolated behind a development-only guard. |
| Backend test fixtures | **Test fixture** | Acceptable for isolated tests, but should not share production credentials or production database configuration. |
| `userController.ts` missing-password fallback | **Runtime behavior** | The current path generates a random temporary value and bcrypt-hashes it. Predictable `password123` remains in seed/test fixtures and the lead-conversion UI, while legacy plaintext login compatibility remains a separate risk. |
| Login compatibility branches | **Runtime behavior** | The application still permits legacy plaintext database values and compares them directly before upgrading them. |

Therefore, the accurate verdict for `SEC-5/SEC-6` is: **bcrypt hashing was added to CMS-created users, but predictable runtime fallback and legacy plaintext compatibility remain; seed credentials are a separate environment-hygiene risk, not proof that the runtime path is safe.**

---

## 2. System Inventory

| Area | Current implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router 6, Framer Motion, Tailwind CSS |
| Backend | Express 5, TypeScript, ES modules, `tsx`, Nodemon |
| Database | PostgreSQL via Prisma 6 |
| Cache | Upstash Redis with in-memory fallback |
| Authentication | Separate student/admin JWT identities; 15-minute access token and 7-day refresh token |
| Passwords | bcryptjs for public registration; legacy plaintext compatibility remains |
| Validation | Zod on selected routes plus manual controller validation |
| Protection | Helmet, CORS allowlist, rate limits, body limits, role middleware |
| Deployment | Local Express mode and Vercel bundled server mode |
| Documentation | OpenAPI/Swagger endpoint at `/api/docs` and `/docs` |

The Prisma schema contains student and admin identities plus courses, batches, leads, demos, program videos, job vacancies/applications, banners, video progress, payment slips, staff, coupons, reviews, instructors, certificates, and mastermind questions.

---

## 3. New Findings From This Audit

### NEW-01: Certificate claim still needs completion eligibility

**Severity**: Critical

**Source**: `backend/src/routes/certificateRoutes.ts`, `backend/src/controllers/certificateController.ts`

**Evidence**: `POST /api/certificates/claim` uses `authenticate`, and the controller derives student identity from the authenticated request. The current route blocks anonymous claims and checks enrollment, but the source review does not show a server-side course-completion or viva-approval requirement.

**Impact**: An authenticated enrolled user may be able to claim a certificate before completing the course if the demo endpoint is enabled. This remains a deferred integrity risk while certificates are explicitly demo-only.

**Required fix**:

1. Require a server-side completion/viva eligibility rule before issuing a production certificate.
2. Keep target-user overrides limited to authorized admin roles.
3. Add a unique constraint on `(userId, courseSlug)` if one certificate per course is intended.
4. Retain tests for anonymous claims, another-student claims, incomplete courses, and repeated claims.

### NEW-02: Mastermind question creation is authenticated but broadly authorized

**Severity**: High

**Source**: `backend/src/routes/mastermindRoutes.ts`, `backend/src/controllers/mastermindController.ts`

**Evidence**: `POST /api/mastermind/questions` uses `authenticate`, and the controller derives author identity from the authenticated account rather than trusting client-supplied identity fields.

**Impact**: Anonymous impersonation is blocked, but any authenticated account can use the feature and the report does not show stronger student enrollment, content moderation, or abuse controls.

**Required fix**: Require student authentication for normal question creation, derive `userId`, name, and badge from the account, and use a separate moderated guest-submission flow if public questions are a product requirement. Add length, course-enrollment, profanity/abuse, and rate-limit controls.

### NEW-03: Mastermind upvotes are identity-protected but race-prone

**Severity**: High

**Source**: `backend/src/controllers/mastermindController.ts`

**Evidence**: Upvotes require authentication and use `req.user.id`. The JSON string of voter IDs and numeric count are still read and written in separate operations.

**Impact**: User-ID spoofing is blocked by the current route, but concurrent requests can still cause lost updates and the JSON voter list remains difficult to constrain relationally.

**Required fix**: Require authentication, derive the voter ID from the token, normalize proxy trust, and replace the JSON list with a unique `QuestionVote(questionId, userId)` table. Update counts transactionally or calculate them from the vote relation.

### NEW-04: Certificate issuance does not visibly require course completion

**Severity**: High

**Source**: `backend/src/controllers/certificateController.ts`

**Evidence**: After finding a user, `claimCertificate` checks only `isEnrolled`. It does not visibly verify completed modules, course ownership, an approved assessment, or a trusted completion event before issuing the certificate.

**Impact**: A valid enrolled account may be able to claim a certificate without completing the program. This affects credential integrity and public verification trust.

**Required fix**: Centralize certificate eligibility in a server-side service. Verify the requested course is enrolled, calculate completion from authoritative progress, record the issuance reason/version, and prevent client-supplied `courseTitle`, grade, and signer values from determining the credential.

### NEW-05: User response projections are protected in reviewed endpoints

**Severity**: High

**Source**: `backend/src/controllers/userController.ts`

**Evidence**: The reviewed user list, profile, create, update, and coach-related paths use `SAFE_USER_SELECT`, which excludes `passwordHash`.

**Impact**: This specific exposure was not reproduced in the reviewed endpoints. New endpoints should continue using an explicit safe projection and regression tests.

**Required assurance**: Keep the explicit projection and add an integration assertion that every user-management response omits the hash.

### NEW-06: Legacy and lead-conversion credentials remain predictable risks

**Severity**: High

**Source**: `backend/src/controllers/userController.ts`

**Evidence**: `createUser` now bcrypt-hashes the selected value and generates a random temporary value when the administrator omits a password. Predictable `password123` remains in seed/test fixtures and the lead-conversion UI, while student/admin login retains compatibility branches for legacy plaintext values.

**Impact**: The current missing-password path no longer creates a shared guessable credential. Legacy plaintext values and the lead-conversion default remain credential-hygiene risks, and temporary credentials require a secure delivery/reset process.

**Required fix**: Keep hashing all passwords, deliver temporary credentials through a one-time reset invitation, and migrate/reject legacy plaintext records. Monitor for legacy values during the transition.

### NEW-07: Refresh tokens remain bearer credentials without rotation

**Severity**: Critical

**Source**: `backend/src/controllers/authController.ts`

**Evidence**: The refresh endpoint verifies the JWT, checks the live account and token version, and refreshes the admin role from the database. It still does not rotate refresh tokens or maintain a server-side refresh-session record.

**Impact**: A stolen refresh token can remain replayable until expiry or token-version invalidation because logout/session revocation is not represented by a server-side refresh session.

**Required fix**: Use rotating refresh tokens stored as hashes server-side, revoke the predecessor, check the live account and role, and invalidate sessions on logout/password change/disablement.

### NEW-08: Non-500 production errors may expose raw exception messages

**Severity**: High

**Source**: `backend/src/middlewares/errorHandler.ts`

**Evidence**: Production 500/database errors are replaced with a generic message and an `errorId`, while some non-500 errors can still return `err.message`.

**Impact**: Controlled production failures are sanitized, but non-500 validation/provider/implementation messages may still disclose internal details.

**Required fix**: Return stable safe error codes and generic production messages. Log full details server-side with the existing request ID and map expected errors to controlled status codes.

### NEW-09: Payment slip data URLs are persisted without strict media validation

**Severity**: High

**Source**: `backend/src/index.ts`, `backend/src/middlewares/validate.ts`, `backend/src/controllers/paymentSlipController.ts`, `prisma/schema.prisma`

**Evidence**: Slip routes permit 10 MB request bodies; `slipUrl` is only a non-empty string; the OpenAPI example uses a base64 image data URL; the entire value is stored in a relational text field and returned by admin/dashboard queries.

**Impact**: Database growth, expensive list responses, privacy leakage, image/polyglot payload risks, and denial-of-service pressure.

**Required fix**: Upload validated files to private object storage, validate decoded size/MIME/signature/dimensions, reject unsafe SVG, return metadata-only list rows, and use short-lived signed URLs for authorized viewing.

---

## 4. Previously Recorded Findings Still Open

### AUTH-01: Development JWT fallback secret is predictable

**Severity**: High for internet-reachable staging/preview

`getJwtSecret` falls back to a hardcoded value outside production/Vercel. Require a secret in every deployed environment and fail closed except for explicitly local development.

### AUTH-02: Frontend refresh credentials are stored in localStorage

**Severity**: High

`src/services/auth.ts` persists refresh tokens in localStorage. XSS can steal them and retain access beyond a page session. Prefer HttpOnly, Secure, SameSite cookies with rotation and CSRF protection as appropriate.

### AUTH-03: Legacy localStorage keys broaden frontend trust behavior

**Severity**: Medium

`ProtectedRoute` now uses canonical `authService` sessions for its authentication decision. Other frontend components still read or write `uwe_user_account` and `uwe_user`, so session state remains duplicated and should be consolidated.

### API-01: Validation coverage remains inconsistent

**Severity**: Medium

Several mutations use manual parsing and `as any` for status, categories, employment types, dates, prices, seats, and assignments. Add Zod schemas to every mutation route with bounds, enums, strict unknown-key policy, and safe coercion.

### DATA-01: Coupon validation is not atomic redemption

**Severity**: High

`validateCoupon` checks `usedCount` but does not visibly bind usage to a completed order or atomically reserve a use. A final checkout price must be server-calculated, and redemption must be transactional/idempotent.

### DATA-02: Seat availability invariants are not enforced

**Severity**: Medium

Batch mutation paths do not visibly enforce `0 <= availableSeats <= totalSeats`, finite integer values, or concurrency-safe reservations.

### DATA-03: Hiring counters update in multiple non-transactional steps

**Severity**: Medium

Application status and vacancy hired-count updates are separate reads/writes. Concurrent transitions can lose increments or double-count hires. Use transactional conditional transitions.

### DATA-04: Gamification uses read-modify-write without event idempotency

**Severity**: Medium

XP, streaks, and JSON badge state are calculated from a read and then written. Retries and simultaneous actions can award duplicate XP or lose updates. Use fixed server-side reward events, unique event IDs, and atomic increments.

### DATA-05: Financial and discount amounts use Float

**Severity**: Medium

`Course.price`, `PaymentSlip.amount`, and coupon amounts use floating-point Prisma fields. Use Decimal or integer minor units for money and define explicit rounding rules.

### DATA-06: JSON and comma-separated state is stored as strings

**Severity**: Medium

Enrollment slugs, badges, requirements, and upvoter IDs are string-encoded. Normalize relationships or use constrained PostgreSQL arrays/JSONB to avoid malformed and race-prone updates.

### API-02: Admin audit coverage is incomplete

**Severity**: Medium

An append-only audit model/service exists and selected changes record actor, action, and entity. Coverage is incomplete, and audit-write failures are swallowed. Sensitive changes to users, prices, seats, slips, jobs, coupons, content, and enrollment should consistently record actor, role, action, entity, before/after summary, request ID, and timestamp.

### OPS-01: In-memory fallback cache is not shared across instances

**Severity**: Medium

The fallback cache is process-local. In multi-instance/serverless deployment, cache behavior and invalidation differ between instances. Require Upstash in deployed environments or treat fallback as local-only.

### OPS-02: Fatal process events use fail-fast shutdown

**Severity**: Medium

The uncaught-exception and unhandled-rejection handlers log and call `process.exit(1)` outside tests. This supports supervisor restart, but graceful draining and shutdown cleanup are not implemented.

### PERF-01: Production asset footprint is larger than intended

**Severity**: Medium

The fresh Vite build produced a 2.2 MB shield image, a roughly 272 KB uncompressed initial JS chunk, and a roughly 212 KB admin chunk. The server bundle is approximately 3.3 MB. Optimize images, audit dependencies, and split admin-only code/resources further.

### PERF-02: Large admin list endpoints have no visible pagination

**Severity**: Medium

User, lead, application, payment-slip, and other admin listing endpoints return complete collections in the reviewed controllers. Add bounded pagination, filters, field projection, and maximum page sizes.

### ROUTE-01: Duplicate API aliases increase security surface

**Severity**: Low

Most route groups are mounted under both `/api/...` and root aliases. Keep compatibility aliases only when necessary and test both surfaces identically.

---

## 5. Controls Confirmed Working

- `npm test`: 45/45 tests passed on August 26, 2026.
- Frontend and server builds compile successfully.
- Helmet is registered early in the Express app.
- CORS uses an explicit allowlist and controlled Vercel preview matching.
- API, auth, and public-submission rate limiters are configured.
- Body-size limits are present, with a larger limit isolated to media/slip routes.
- Production/Vercel startup checks for a missing JWT secret.
- Admin role middleware distinguishes `SUPER_ADMIN`, `COMMANDER`, `COACH`, and `RECRUITER`.
- User, dashboard, certificate-list, and progress route wrappers include ownership checks for student requests.
- Student progress routes require authentication.
- Public and admin route groups are visibly separated.
- Course catalog and leaderboard reads use cache layers with course invalidation on relevant writes.
- OpenAPI documentation and health endpoints are available.
- Password hashing is correctly used for new public registration and legacy values are upgraded on successful login, although plaintext compatibility still needs to be removed.

---

## 6. Recommended Remediation Order

### P0: Close before production assurance

1. Harden the verified refresh-token system so database/cache failures fail closed, require shared Upstash Redis in deployed environments, and invalidate access tokens as required by the session policy.
2. Require authenticated student identity for mastermind posting and voting; replace JSON voter identity with a unique relation.
3. Migrate plaintext seed/legacy credentials, use a secure one-time delivery/reset flow for temporary passwords, and exclude password hashes from every response.
4. Secure payment-slip uploads with private object storage, validation, and signed access.
5. Replace raw production exception messages with safe error envelopes.
6. If certificates are enabled, lock claims to authenticated, enrolled, completed users and prevent arbitrary target IDs. Otherwise disable or label the demo endpoint.

### P1: Next engineering cycle

1. Require strong JWT secrets in staging and preview deployments.
2. Add schemas to every mutation endpoint and remove unchecked enum casts.
3. Extend transaction/idempotency coverage to the remaining commerce, XP, and upvote workflows; DATA-1/2/3 core race paths are now verified.
4. Convert money fields to Decimal/minor units and define rounding/reconciliation rules.
5. Add append-only admin audit events and bounded pagination.

### P2: Assurance and operations

1. Move refresh tokens to HttpOnly cookies and consolidate frontend session state.
2. Add CAPTCHA/abuse detection and idempotency keys to public lead, job, slip, and community submissions.
3. Optimize the 2.2 MB image and large JavaScript/server bundles.
4. Require shared Redis in deployed environments and define cache invalidation tests.
5. Add backup/restore drills, dependency scanning, secret scanning, SAST/DAST, and a staging penetration test.

---

## 7. Required Test Additions

| Test area | Minimum cases |
|---|---|
| Certificate security | Anonymous claim, arbitrary target ID, unenrolled user, incomplete course, duplicate claim |
| Community identity | Anonymous post, impersonated user ID, spoofed forwarded-for, concurrent upvotes, repeated request |
| Credentials | Admin-created password hash, no default password, response never contains `passwordHash`, legacy migration |
| Refresh sessions | Replay, rotation, logout, deletion, password change, role change, expired token |
| Uploads | Oversized body, invalid MIME, invalid magic bytes, SVG/script content, private retrieval authorization |
| Commerce | Coupon race, final-price tampering, expiry boundary, max-use boundary, duplicate redemption |
| State transitions | Concurrent seat updates, hiring state transitions, duplicate XP event, negative/NaN numeric inputs |
| Error handling | Production safe message, request ID correlation, Prisma error mapping |

---

## Final Assessment

The second audit improves confidence in the project’s baseline: the test suite is green, builds are healthy, route-level admin checks are broadly present, and the progress ownership path is protected. It also shows why a passing suite is not equivalent to a complete security audit. The largest remaining risks sit at trust boundaries where user-provided identity, credentials, uploaded media, and derived counters cross into persistent state. Certificate concerns become production-critical only when that deferred demo feature is enabled or presented as an actual credential service.

Until the P0 items are addressed and verified with negative integration tests, UWE should be treated as **not yet ready for an independent production security sign-off**.

---

## Appendix: Source Anchors

- Application middleware and route registration: `backend/src/index.ts`
- Authentication and refresh flow: `backend/src/controllers/authController.ts`
- JWT verification: `backend/src/middlewares/authenticate.ts`
- Admin clearance: `backend/src/middlewares/requireAdmin.ts`, `backend/src/middlewares/requireRole.ts`
- Certificate routes/controller: `backend/src/routes/certificateRoutes.ts`, `backend/src/controllers/certificateController.ts`
- Mastermind routes/controller: `backend/src/routes/mastermindRoutes.ts`, `backend/src/controllers/mastermindController.ts`
- User management: `backend/src/controllers/userController.ts`
- Payment slips: `backend/src/routes/paymentSlipRoutes.ts`, `backend/src/controllers/paymentSlipController.ts`
- Progress ownership wrapper: `backend/src/routes/videoProgressRoutes.ts`
- Error handling: `backend/src/middlewares/errorHandler.ts`
- Frontend sessions/API refresh: `src/services/auth.ts`, `src/services/api.ts`
- Frontend route guards: `src/components/auth/ProtectedRoute.tsx`, `src/components/auth/AdminRoute.tsx`
- Database model: `prisma/schema.prisma`
- Verification tests: `backend/src/__tests__`, `src/__tests__`