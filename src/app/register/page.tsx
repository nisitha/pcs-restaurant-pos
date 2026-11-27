'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  Building2,
  MapPin,
  User,
  Phone,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChefHat,
  MonitorCheck,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';

export default function SaasRegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { branches, setBranches, setActiveBranchId } = useBranchStore();

  const [restaurantName, setRestaurantName] = useState('');
  const [city, setCity] = useState('');
  const [currency, setCurrency] = useState<'LKR' | 'USD'>('LKR');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerPin, setOwnerPin] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [onboardingResult, setOnboardingResult] = useState<{
    branchName: string;
    branchCode: string;
    ownerName: string;
    tablesCreated: number;
    itemsCreated: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!restaurantName.trim() || !city.trim() || !ownerName.trim()) {
      setErrorMessage('Please enter your restaurant name, outlet city, and owner name.');
      return;
    }

    if (!/^\d{4,6}$/.test(ownerPin.trim())) {
      setErrorMessage('Please enter a 4 to 6 digit numeric Owner PIN.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurantName.trim(),
          city: city.trim(),
          currency,
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          ownerPin: ownerPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to provision restaurant workspace.');
      }

      // Activate new branch & owner session immediately
      if (data.branch) {
        const merged = [...branches.filter((b) => b.id !== data.branch.id), data.branch];
        setBranches(merged);
        setActiveBranchId(data.branch.id);
      }
      if (data.ownerUser) {
        login(data.ownerUser);
      }

      setOnboardingResult({
        branchName: data.branch?.name || `${restaurantName} - ${city}`,
        branchCode: data.branch?.code || 'NEW-OUTLET',
        ownerName: data.ownerUser?.display_name || ownerName,
        tablesCreated: data.seeded?.tablesCreated || 6,
        itemsCreated: data.seeded?.itemsCreated || 4,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Onboarding error';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#f4fbf7] text-[#072619] flex flex-col justify-between p-4 sm:p-8 overflow-y-auto">
      {/* Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-4">
        <Link href="/login" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#072619] text-[#a3e04f] flex items-center justify-center shadow-md">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg text-[#072619] tracking-tight block leading-none">
              PCS Bill <span className="text-[#0f8a5f]">OS</span>
            </span>
            <span className="text-[11px] text-[#4f675a] font-mono mt-1 block">
              pcsbill.com &bull; Multi-Tenant SaaS Onboarding
            </span>
          </div>
        </Link>

        <Link
          href="/login"
          className="px-4 py-2 rounded-full bg-white border border-[#E5ECE8] text-xs font-bold text-[#072619] hover:bg-[#cdeeb0]/40 transition"
        >
          Staff PIN Login &rarr;
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full my-auto py-4">
        {onboardingResult ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto bg-white rounded-3xl border-2 border-[#0f8a5f] p-8 shadow-2xl text-center"
          >
            <div className="w-20 h-20 rounded-full bg-[#cdeeb0] text-[#0f8a5f] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-11 h-11" />
            </div>

            <span className="px-3 py-1 rounded-full bg-[#072619] text-[#a3e04f] text-xs font-black uppercase tracking-wider">
              Outlet Provisioned
            </span>

            <h1 className="font-display text-3xl font-black text-[#072619] mt-3">
              Welcome to PCS Bill OS!
            </h1>
            <p className="text-sm text-[#4f675a] mt-1">
              <strong className="text-[#072619]">{onboardingResult.branchName}</strong> is live and ready to accept orders.
            </p>

            <div className="my-6 grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8]">
                <p className="font-display text-2xl font-black text-[#0f8a5f] font-mono">
                  {onboardingResult.tablesCreated}
                </p>
                <p className="text-[11px] font-bold text-[#4f675a]">Dining Tables</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8]">
                <p className="font-display text-2xl font-black text-[#0f8a5f] font-mono">
                  {onboardingResult.itemsCreated}
                </p>
                <p className="text-[11px] font-bold text-[#4f675a]">Starter Dishes</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8]">
                <p className="font-display text-2xl font-black text-[#072619] font-mono">4</p>
                <p className="text-[11px] font-bold text-[#4f675a]">KDS Stations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => router.push('/pos')}
                className="h-12 rounded-2xl bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-display font-extrabold text-sm gap-2 cursor-pointer"
              >
                <MonitorCheck className="w-4 h-4 text-[#a3e04f]" />
                <span>Launch Counter POS</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/dashboard')}
                className="h-12 rounded-2xl border-[#E5ECE8] text-[#072619] font-bold text-sm gap-2 cursor-pointer"
              >
                <span>Open Control Tower</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Value Prop Panel (5 cols) */}
            <div className="lg:col-span-5 bg-[#072619] text-white rounded-3xl p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f8a5f]/30 border border-[#a3e04f]/30 text-[#a3e04f] text-[11px] font-extrabold uppercase tracking-wider mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>60-Second Outlet Setup</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Launch your Restaurant POS in minutes.
                </h1>
                <p className="text-sm text-[#cdeeb0]/80 mt-3 leading-relaxed">
                  Register your outlet to automatically provision your cloud branch, 6 dining tables, 4 kitchen KDS stations, and starter menu catalog.
                </p>
              </div>

              <div className="space-y-3 my-8">
                {[
                  { icon: MonitorCheck, text: 'Sub-10-second Counter Billing + LankaQR & WhatsApp E-Bill' },
                  { icon: ChefHat, text: 'Real-time Kitchen Display (KDS) & Counter Order Ready TV' },
                  { icon: Building2, text: 'Multi-branch stock transfers, BOM recipes & anti-theft audits' },
                ].map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 text-xs text-white/90">
                      <div className="w-8 h-8 rounded-xl bg-[#0f8a5f] text-[#a3e04f] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="pt-1 font-medium">{feat.text}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10 text-[11px] text-white/60">
                Hotline / WhatsApp: <strong className="text-[#a3e04f]">+94 78 76 76 576</strong>
              </div>
            </div>

            {/* Right Onboarding Form (7 cols) */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-7 bg-white rounded-3xl border border-[#E5ECE8] p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl font-black text-[#072619]">
                  Create Your Restaurant Workspace
                </h2>
                <p className="text-xs text-[#4f675a] mt-0.5">
                  All fields below configure your primary branch and owner terminal PIN.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#072619] block mb-1.5">
                    Restaurant / Brand Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#4f675a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="e.g. Spice Garden Bistro"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className="pl-10 h-11 rounded-2xl bg-[#f4fbf7] border-[#E5ECE8] text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#072619] block mb-1.5">
                    Outlet City *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#4f675a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="e.g. Colombo 03"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-10 h-11 rounded-2xl bg-[#f4fbf7] border-[#E5ECE8] text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#072619] block mb-1.5">
                    Primary Currency *
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-11 p-1 rounded-2xl bg-[#f4fbf7] border border-[#E5ECE8]">
                    {(['LKR', 'USD'] as const).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCurrency(curr)}
                        className={`rounded-xl text-xs font-black transition cursor-pointer ${
                          currency === curr
                            ? 'bg-[#072619] text-[#a3e04f] shadow-xs'
                            : 'text-[#4f675a] hover:text-[#072619]'
                        }`}
                      >
                        {curr} {curr === 'LKR' ? '(Rs.)' : '($)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#072619] block mb-1.5">
                    Owner Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#4f675a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="e.g. Kavinda Perera"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="pl-10 h-11 rounded-2xl bg-[#f4fbf7] border-[#E5ECE8] text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#072619] block mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#4f675a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="tel"
                      placeholder="078 76 76 576"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-11 rounded-2xl bg-[#f4fbf7] border-[#E5ECE8] text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#072619] block mb-1.5">
                    4-Digit Owner Terminal PIN *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#4f675a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 8899"
                      value={ownerPin}
                      onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                      className="pl-10 h-11 rounded-2xl bg-[#f4fbf7] border-[#E5ECE8] text-sm font-mono font-black tracking-widest"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 rounded-2xl bg-[#0f8a5f] hover:bg-[#0b6f4c] text-white font-display font-black text-base shadow-lg shadow-[#0f8a5f]/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Provisioning Restaurant...' : 'Create Restaurant & Start Billing'}</span>
                <ArrowRight className="w-5 h-5 text-[#a3e04f]" />
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#4f675a] pt-4">
        <span className="font-bold text-[#072619]">PCS Bill</span> &bull; pcsbill.com &bull; Powered by Pixel Craft Studios
      </footer>
    </div>
  );
}
