# Supabase Setup & Automated Backup Guide

This document describes how to configure the Supabase PostgreSQL connection string for daily automated database backups, disaster recovery, and keep-alive pings to prevent the Supabase Free Tier project from pausing.

---

## 1. Retrieve the Supabase Database Connection URI

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project: **`tcmdqcsqpozdqxlvriqy`**.
3. In the left navigation, click on **Project Settings** (gear icon) > **Database**.
4. Scroll down to the **Connection string** section.
5. Select the **URI** tab (or **Session mode / Direct connection**):
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.tcmdqcsqpozdqxlvriqy.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the database password you created when the Supabase project was initialized.

---

## 2. Configure GitHub Secrets (1-Minute Setup)

1. Navigate to your GitHub repository: **`https://github.com/nisitha/pcs-restaurant-pos`**.
2. Click on **Settings** > **Secrets and variables** > **Actions**.
3. Click the green **New repository secret** button.
4. Set:
   - **Name:** `SUPABASE_DB_URL`
   - **Secret:** `postgresql://postgres:[YOUR-PASSWORD]@db.tcmdqcsqpozdqxlvriqy.supabase.co:5432/postgres`
5. Click **Add secret**.

---

## 3. How the Daily Backup & Keep-Alive Works

The workflow located in [`.github/workflows/supabase-backup.yml`](../.github/workflows/supabase-backup.yml):
- **Schedule:** Runs every night at `02:00 UTC` (`07:30 AM Sri Lanka Time`).
- **Keep-Alive:** Executes a `SELECT NOW()` query against Supabase, ensuring the Free Tier project stays active and never pauses due to 7 days of inactivity.
- **pg_dump:** Creates a complete schema + table data snapshot, compresses it with `gzip -9`, and uploads the artifact with **30-day retention** on GitHub.
- **Manual Trigger:** Can also be triggered anytime via **Actions** > **Daily Supabase Backup & Keep-Alive** > **Run workflow**.

---

## 4. Database Migrations Execution Order

Run the following SQL migrations in your Supabase SQL Editor in sequence:

1. `supabase/migrations/001_initial_schema.sql` (Core DB schema, tables, ENUMs)
2. `supabase/migrations/002_seed_data.sql` (Colombo branch, staff PINs, stations, sample menu)
3. `supabase/migrations/003_storage_policies.sql` (Supabase Storage bucket `menu-images`)
4. `supabase/migrations/004_order_routing_and_realtime.sql` (Order routing RPC, KDS realtime publication)
5. `supabase/migrations/006_inventory_and_recipes.sql` (Inventory BOM, recipes, GRN, wastage, void/refunds)
6. `supabase/migrations/007_customers_loyalty_promotions.sql` (CRM loyalty points, happy hour promotions, BI reporting)
7. `supabase/migrations/008_phase4_expansion.sql` (Multi-branch, inter-branch transfers, delivery riders, table QR ordering)
