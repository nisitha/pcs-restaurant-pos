import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  UtensilsCrossed,
  ChefHat,
  MonitorCheck,
  Smartphone,
  ShieldCheck,
  Database,
  ArrowRight,
  Clock,
  Coins,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 sm:p-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">PCS Restaurant POS</h1>
            <p className="text-sm text-zinc-400">Enterprise Operations & Point of Sale System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Milestone 1.1 Ready
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> LKR (Rs.)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Asia/Colombo
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 max-w-5xl mx-auto w-full">
        <div className="text-center sm:text-left mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Restaurant Management Suite
          </h2>
          <p className="text-zinc-400 max-w-2xl text-base sm:text-lg">
            High-speed order entry, multi-station kitchen routing, live order status synchronization, and idempotent inventory control.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <MonitorCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-1">Cashier POS</h3>
              <p className="text-xs text-zinc-400 mb-4">Touch billing, split payments, table selection & fast cart ringing.</p>
            </div>
            <Link href="/pos">
              <Button variant="outline" className="w-full text-xs border-zinc-700 text-zinc-300 hover:text-white">
                Open Counter <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition">
            <div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-1">Kitchen Display (KDS)</h3>
              <p className="text-xs text-zinc-400 mb-4">Real-time station ticket routing, timer alerts & ready marking.</p>
            </div>
            <Link href="/kds">
              <Button variant="outline" className="w-full text-xs border-zinc-700 text-zinc-300 hover:text-white">
                View Kitchen <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-1">Waiter Tablet</h3>
              <p className="text-xs text-zinc-400 mb-4">Floor layout, table ordering & instant ready serving alerts.</p>
            </div>
            <Link href="/waiter">
              <Button variant="outline" className="w-full text-xs border-zinc-700 text-zinc-300 hover:text-white">
                Waiter Panel <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition">
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-1">Back Office</h3>
              <p className="text-xs text-zinc-400 mb-4">Recipes, BOM stock ledger, suppliers, staff PINs & analytics.</p>
            </div>
            <Link href="/admin">
              <Button variant="outline" className="w-full text-xs border-zinc-700 text-zinc-300 hover:text-white">
                Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Database & Setup Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> Supabase Schema Migration Ready
            </h4>
            <p className="text-sm text-zinc-400">
              The normalized database migration is prepared at <code className="text-amber-300 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">supabase/migrations/001_initial_schema.sql</code>.
            </p>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
              Open Supabase Dashboard
            </Button>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 pt-6 text-center text-xs text-zinc-500">
        PCS Restaurant POS &bull; Built with Next.js App Router, Tailwind CSS, Shadcn UI, and Supabase.
      </footer>
    </div>
  );
}
