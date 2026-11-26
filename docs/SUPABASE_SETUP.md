# Supabase Setup Guide for PCS Restaurant POS

Follow these steps to connect your Supabase project to the local application.

---

## 1. Create or Open Your Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project (e.g. `pcs-restaurant-pos`) or select an existing project.
3. Choose a strong database password and select the region closest to your users (e.g., `Singapore (ap-southeast-1)` or `Mumbai (ap-south-1)`).

---

## 2. Execute the Database Migration
1. In the Supabase Dashboard sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open `supabase/migrations/001_initial_schema.sql` from this repository.
4. Copy the entire file content and paste it into the Supabase SQL Editor.
5. Click **Run** (or `Ctrl + Enter`).
6. Verify that all tables, enums, stored procedures, RLS policies, and default seed records (`MAIN-BRANCH`, default kitchen stations, inventory units, dining tables) are created.

---

## 3. Configure Local Environment Variables
1. In the root of this repository, create a local file named `.env.local` (this file is git-ignored):
   ```bash
   cp .env.example .env.local
   ```
2. In your Supabase Dashboard, go to **Project Settings** (gear icon) -> **API**.
3. Copy the **Project URL** and paste it into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   ```
4. Copy the **anon public** API key and paste it into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
5. Copy the **service_role secret** API key and paste it into `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

---

## 4. Enable Supabase Storage Bucket for Menu Images
1. In your Supabase Dashboard sidebar, navigate to **Storage**.
2. Click **New bucket**.
3. Set the Bucket name to `menu-assets`.
4. Enable **Public bucket** toggle (so menu images can be displayed on POS/KDS without token expiration).
5. Click **Save bucket**.

---

## 5. Enable Supabase Realtime for KDS & Orders
1. In your Supabase Dashboard sidebar, navigate to **Database** -> **Replication** (or **Realtime**).
2. Ensure Realtime is enabled for the following tables:
   - `station_routing_tickets`
   - `orders`
   - `dining_tables`

---

## 6. Verify Connection
Run the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
