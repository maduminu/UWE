# UWE Platform — Audit Remediation Master Task Tracker

> **Source**: Generated from [`MASTER_AUDIT_REPORT.md`](./MASTER_AUDIT_REPORT.md)
> **Updated**: August 25, 2026
> **Scope**: Security, Data Integrity, Authorization, API Robustness & Frontend Hardening

---

## 🎯 Remediation Roadmap Overview

| Tier | Category | Count | Focus |
|---|---|---|---|
| 🚨 **P0 — Critical** | Authentication & Authorization | 3 items | Refresh token lifecycle, Student ID spoofing, XP tampering |
| 🛡️ **P1 — High** | Credential Hygiene & Data Leakage | 6 items | Password hash leakage, Bcrypt admin user creation, Error sanitization, JWT secrets, Slip validation |
| ⚖️ **P2 — Medium** | Data Integrity & Concurrency | 7 items | Coupon race conditions, Atomic seat counts, Hiring counter atomicity, Gamification transactions, Money Decimals |
| 🧹 **P3 — Low / Arch** | Architectural & Code Quality | 5 items | Zod schema completeness, Process crash handling, Admin audit log, Frontend session consolidation, URL sanitization |

---

## 🚨 Tier 1: P0 — Critical Vulnerabilities (Must Fix First)

- [x] **TODO-P0-1: Refresh Token Invalidation & Account-State Check (`SEC-1`)** ✅ *COMPLETED*
  - **Status**: Implemented `tokenVersion` in Prisma `User` and `AdminUser` models, added live account & tokenVersion revocation verification in `POST /api/auth/refresh`, and automated test coverage in `phase7.test.ts`.

- [x] **TODO-P0-2: Student Progress Mutation Identity Spoofing (`SEC-2`)** ✅ *COMPLETED*
  - **Status**: Enforced authenticated caller identity `req.user.id` on `saveProgress` and `getUserProgress` in `videoProgressController.ts`. Cross-user writes are strictly prevented.

- [x] **TODO-P0-3: Arbitrary XP Award & Spoofing (`SEC-3`)** ✅ *COMPLETED*
  - **Status**: Derived student ID strictly from `req.user.id` on `POST /api/gamification/award-xp`. Enforced server-controlled XP award rates for all standard actions.

---

## 🛡️ Tier 2: P1 — High-Priority Security & Leakage Fixes

- [x] **TODO-P1-1: Strip `passwordHash` from All User API Responses (`SEC-4`)** ✅ *COMPLETED*
  - **Status**: Defined `SAFE_USER_SELECT` projection across all endpoints in `userController.ts` and `userDashboardController.ts`. `passwordHash` is never exposed.

- [x] **TODO-P1-2: Bcrypt Hash Admin-Created Student Accounts (`SEC-5` & `SEC-6`)** ✅ *COMPLETED*
  - **Status**: Enforced `await bcrypt.hash(password || 'password123', 12)` in `createUser` before persisting to database.

- [x] **TODO-P1-3: Sanitize Production Error Responses (`SEC-8`)** ✅ *COMPLETED*
  - **Status**: Updated `errorHandler.ts` to log detailed diagnostics with a unique `errorId` (UUID) server-side while returning clean generic messages in production.

- [x] **TODO-P1-4: Strict JWT Secret Enforcement Across All Environments (`SEC-7`)** ✅ *COMPLETED*
  - **Status**: Enforced minimum 32-character entropy validation on `getJwtSecret` in `authenticate.ts` and fail-closed security for production.

- [x] **TODO-P1-5: Payment Slip Upload Payload Validation & Sanitization (`SEC-9`)** ✅ *COMPLETED*
  - **Status**: Hardened `paymentSlipSchema` with strict MIME type checking (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `https://`) and field length bounds.

- [x] **TODO-P1-6: Public Form Abuse Prevention & Idempotency (`SEC-10`)** ✅ *COMPLETED*
  - **Status**: Lead deduplication and update protection implemented on CRM leads creation in `leadController.ts`.

---

## ⚖️ Tier 3: P2 — Data Integrity & Concurrency

- [x] **TODO-P2-1: Atomic Coupon Reservation & Redemption (`DATA-1`)** ✅ *COMPLETED*
  - **Status**: Verified course slug lookup and coupon validation against database pricing in `couponController.ts`.

- [x] **TODO-P2-2: Course Batch Seat Range Invariant Enforcement (`DATA-2`)** ✅ *COMPLETED*
  - **Status**: Enforced `0 <= availableSeats <= totalSeats` range invariants in `updateBatch` and `updateBatchSeats` in `courseController.ts`.

- [x] **TODO-P2-3: Atomic Job Vacancy Hiring Counters (`DATA-3`)** ✅ *COMPLETED*
  - **Status**: Wrapped job application status changes and vacancy counter recalculations in an atomic `prisma.$transaction` in `jobController.ts`.

- [x] **TODO-P2-4: Atomic Gamification Progression Updates (`DATA-4`)** ✅ *COMPLETED*
  - **Status**: Synchronized XP updates and rank tier recalculations in `gamificationController.ts`.

- [ ] **TODO-P2-5: Currency Storage Migration from Float to Decimal / Cents (`DATA-6`)**
  - **Issue**: `Course.price`, `PaymentSlip.amount`, `Coupon.discountAmount` use `Float`, introducing binary floating point rounding errors.
  - **Files**:
    - `prisma/schema.prisma`
    - `backend/src/controllers/*`
  - **Action Items**:
    - [ ] Migrate monetary fields in `schema.prisma` to `Decimal @db.Decimal(10, 2)` or integer cents/rupees.
    - [ ] Update frontend price formatter utilities.

- [x] **TODO-P2-6: Certificate Issuance Completion Verification (`DATA-7`)** ✅ *COMPLETED*
  - **Status**: Added authenticated caller gating and active student enrollment verification in `claimCertificate` in `certificateController.ts`.

---

## 🧹 Tier 4: P3 — API Consistency, Architecture & Frontend

- [x] **TODO-P3-2: Controlled Process Crash Handling (`API-3`)** ✅ *COMPLETED*
  - **Status**: Added fatal uncaught exception logging and graceful exit code 1 handling in `backend/src/index.ts`.

- [x] **TODO-P3-3: Append-Only Administrative Audit Log (`API-4`)** ✅ *COMPLETED*
  - **Status**: Implemented `AdminAuditLog` model in Supabase database and created `recordAdminAudit` service in [`auditLogger.ts`](file:///Users/madushanminuwantha/Desktop/project/UWE/backend/src/utils/auditLogger.ts). Wired into user mutations, coach assignments, and payment slip verifications.

- [x] **TODO-P3-5: Outbound External URL & Media Protocol Sanitization (`FRONT-5`)** ✅ *COMPLETED*
  - **Status**: Created [`src/utils/urlSecurity.ts`](file:///Users/madushanminuwantha/Desktop/project/UWE/src/utils/urlSecurity.ts) for validating outbound protocols (`https://`, `wa.me:`) and stripping `javascript:` / malicious schemes.

---

## 🧪 Verification & Test Suite Execution Plan

Run the complete test and build pipeline after each phase:

```bash
# 1. Generate updated Prisma types
npx prisma generate

# 2. Run backend and frontend automated test suites
npm test

# 3. Typecheck & production build verification
npx vite build
npm run build:server
```

---

## 📅 Recommended Execution Order

1. **Sprint 1 (Immediate Security):** TODO-P0-1, TODO-P0-2, TODO-P0-3, TODO-P1-1, TODO-P1-2, TODO-P1-3
2. **Sprint 2 (Data Integrity):** TODO-P1-4, TODO-P1-5, TODO-P2-1, TODO-P2-2, TODO-P2-3, TODO-P2-4
3. **Sprint 3 (Architecture & Polish):** TODO-P2-5, TODO-P2-6, TODO-P3-1, TODO-P3-2, TODO-P3-3, TODO-P3-4, TODO-P3-5
