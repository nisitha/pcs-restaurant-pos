# Restaurant POS & Operations Management System - Project Rules

This document establishes the non-negotiable architectural standards, core business logic rules, Supabase Free Tier optimization practices, and engineering workflows for this codebase. All developers and AI agents must adhere strictly to these rules.

---

## 1. Core Business Rules (SRS Section 6 & Operations)

### 1.1 Unique Human-Readable Order Numbers & Visible Context
- Every order must be assigned a unique, human-readable order number upon creation (e.g., `ORD-YYYYMMDD-XXXX` or `#XXXX` daily sequence) alongside its internal UUID.
- The order number, order type (`dine_in`, `takeaway`, `delivery`), and context (table number / customer name / delivery address) must remain permanently visible across POS, KDS, Waiter panels, printed receipts, and KOTs.

### 1.2 Paid Orders & Controlled Void/Refund Workflows
- **NEVER silently edit, modify, or delete a paid order.**
- Once an order has `payment_status = 'paid'` or has recorded payments, any changes must pass through a controlled void or refund workflow.
- Every void, cancellation, or refund requires:
  - `user_id` of the executing staff member.
  - Manager approval verification (required for amounts above threshold or post-payment voids).
  - Explicit cancellation/void/refund `reason`.
  - UTC timestamp.
  - Automatic, immutable record in the `audit_logs` table.

### 1.3 Strictly Idempotent Recipe/BOM Stock Deductions & Reversals
- Automatic inventory depletion based on Bill of Materials (BOM) must be **strictly idempotent** to prevent duplicate stock subtractions.
- Every stock movement in `stock_ledger` must cite the originating `order_id` (or `order_item_id`), a unique `transaction_reference`, and a deduction trigger type (`on_order_submit` or `on_payment_complete`).
- If an order item is cancelled, voided, or refunded, stock reversals must reference the original stock movement ID and reverse only what was actually deducted.
- All stock movements must execute inside database transactions (`BEGIN ... COMMIT`) or atomic PostgreSQL stored procedures.

### 1.4 Immutability of Payment Records
- Payment records in the `payments` table are **strictly immutable**. Never run `UPDATE` or `DELETE` on completed payment rows.
- Any payment adjustment, mistaken entry, or refund must be recorded as a new reversal or refund transaction in `refunds` or reciprocal negative ledger entry, referencing the original `payment_id`.

### 1.5 Separation of Preparation Status (KDS) and Payment Status
- An order's preparation lifecycle is strictly decoupled from its payment lifecycle:
  - **Preparation Status (`kds_status`):** `draft` -> `submitted` -> `in_preparation` -> `partially_ready` -> `ready` -> `served` -> `completed` / `cancelled`.
  - **Payment Status (`payment_status`):** `unpaid` -> `partially_paid` -> `paid` -> `refunded` -> `voided`.
- Dine-in orders routinely enter preparation while remaining unpaid until dining completes. Takeaway/delivery orders may be paid prior to kitchen preparation.

### 1.6 Regional Standards & Timezone
- **Default Currency:** Sri Lankan Rupee (`LKR`), formatted as `Rs.` or `LKR` (e.g., `Rs. 1,450.00`). Currency formatting must be driven by configurable system settings.
- **Timezone:** All database timestamps must be stored in UTC (`TIMESTAMPTZ`). All client UI displays, reports, shift records, and printed tickets must be converted to the local restaurant timezone (`Asia/Colombo` / UTC+05:30).

### 1.7 Multi-Branch Architecture from Day One
- All core operational tables (`orders`, `order_items`, `menu_categories`, `menu_items`, `tables`, `cash_shifts`, `kitchen_stations`, `inventory_items`, `stock_ledger`, `audit_logs`, etc.) MUST include a `branch_id` (UUID foreign key referencing `branches`) from Day 1.
- Initial single-branch deployment uses a default branch record (`Default Branch`), ensuring seamless scaling to multi-branch operations without schema refactoring.

---

## 2. Supabase Free Tier Optimization Rules

To operate sustainably within Supabase Free Tier limits (500MB DB storage, 2GB bandwidth/month, 50,000 monthly active users, 200 Realtime connections):

### 2.1 Aggressive Client-Side Menu Caching
- Menu categories, items, variants, modifiers, and combo configurations must be cached in the client (via Zustand and React Query with `localStorage` persistence).
- Maintain a lightweight `menu_versions` table or branch-level `menu_version` integer/timestamp.
- The POS and Waiter apps must only query the database for menu changes when the cached `menu_version` is outdated. Standard order-ringing operations must never repeatedly query static menu tables.

### 2.2 Image Optimization & Compression
- All menu item images must be compressed on the client side before uploading to Supabase Storage.
- Standard format: **WebP**, maximum file size **< 100 KB**, optimal dimensions **600x600 px** or **800x800 px**.
- Direct raw PNG or high-resolution JPEG uploads to Supabase Storage are forbidden.

### 2.3 Resilient Offline Queue Structure (IndexedDB)
- The POS ordering interface must implement an offline-ready queue using **IndexedDB** (via `idb` or `Dexie.js`).
- Draft orders created during intermittent network loss must be assigned a client-side temporary UUID (`offline_temp_id`).
- When the network reconnects, the synchronization worker flushes queued orders to Supabase using idempotent upsert/insert endpoints with conflict detection.

### 2.4 Targeted Realtime Subscriptions
- Never subscribe to wildcards (`*`) or entire database tables in Supabase Realtime.
- Scope Realtime channels strictly:
  - Kitchen screens subscribe only to `station_routing_tickets` filtered by `branch_id` and their specific `station_id`.
  - Waiter panels subscribe only to `orders` where `kds_status = 'ready'` for their assigned tables or section.
  - Cashier subscribes only to active shift order updates.

---

## 3. Git & Engineering Workflow Rules

### 3.1 Atomic Conventional Commits
- Commit early and cleanly after every coherent sub-feature or verified fix.
- Follow Conventional Commits:
  - `feat:` New user-facing feature or screen component.
  - `fix:` Bug fix or logic correction.
  - `db:` Migration, schema update, RLS policy, or seed script.
  - `docs:` Documentation, specification, or architectural guide.
  - `chore:` Configuration, dependencies, tooling, or build scripts.
  - `refactor:` Code restructuring without functional alterations.

### 3.2 Verification Before Commit
- Every sub-feature must be verified in the browser (or via test runner / TypeScript compiler `tsc --noEmit`) before committing.
- Broken builds, lint errors, or unhandled exceptions must never be committed to `main`.

### 3.3 Security & Zero Secret Leaks
- Never commit `.env`, `.env.local`, Supabase service role keys, database passwords, or JWT secrets to Git.
- Client-side code may only access `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Administrative operations requiring the `service_role` key must run strictly in Next.js Server Actions or Route Handlers with authenticated role validation.
