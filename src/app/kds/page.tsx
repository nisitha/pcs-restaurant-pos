'use client';

import React, { useState } from 'react';
import {
  ChefHat,
  Volume2,
  VolumeX,
  RotateCcw,
  RefreshCw,
  Flame,
  Coffee,
  IceCream,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useKdsRealtime } from '@/hooks/use-kds-realtime';
import { TicketCard } from '@/components/kds/ticket-card';
import { Floating3DElement, PulseBeacon } from '@/components/ui/Motion3D';

export default function KdsPage() {
  const { currentUser } = useAuthStore();
  const [activeStation, setActiveStation] = useState<string>('ALL');
  const [activeView, setActiveView] = useState<'active' | 'recall'>('active');

  const {
    tickets,
    isLoading,
    error,
    connectionStatus,
    isMuted,
    toggleMute,
    refetch,
    updateTicket,
  } = useKdsRealtime({
    stationCode: activeStation,
    view: activeView,
  });

  const stations: Array<{ code: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { code: 'ALL', label: 'All Stations', icon: Layers },
    { code: 'HOT', label: 'Hot Kitchen', icon: Flame },
    { code: 'GRILL', label: 'Grill Station', icon: ChefHat },
    { code: 'BEV', label: 'Beverage', icon: Coffee },
    { code: 'DESSERT', label: 'Dessert', icon: IceCream },
  ];

  const stationCounts: Record<string, number> = {
    ALL: tickets.length,
    HOT: tickets.filter((t) => t.station_code === 'HOT').length,
    GRILL: tickets.filter((t) => t.station_code === 'GRILL').length,
    BEV: tickets.filter((t) => t.station_code === 'BEV').length,
    DESSERT: tickets.filter((t) => t.station_code === 'DESSERT').length,
  };

  const handleStartPrep = (ticketId: string) => {
    updateTicket(ticketId, 'start', currentUser?.id);
  };

  const handleMarkReady = (ticketId: string) => {
    updateTicket(ticketId, 'ready', currentUser?.id);
  };

  const handleRecall = (ticketId: string) => {
    updateTicket(ticketId, 'recall', currentUser?.id);
  };

  const displayedTickets =
    activeStation === 'ALL'
      ? tickets
      : tickets.filter((t) => t.station_code.toUpperCase() === activeStation.toUpperCase());

  return (
    <div className="flex-1 flex flex-col bg-[#f4fbf7] text-[#072619] h-full overflow-hidden">
      {/* High-Contrast KDS Header */}
      <header className="bg-white border-b border-[#E5ECE8] px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <Floating3DElement amplitude={4} rotate={1.5} duration={5}>
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#072619] border border-[#0f8a5f]/30 shadow-md p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/3d/icon-kds-3d.jpg"
                    alt="KDS 3D"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </Floating3DElement>
              <div>
                <h1 className="font-display text-lg font-extrabold tracking-tight text-[#072619] leading-tight">
                  Kitchen Display System
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#4f675a] font-medium">
                    {currentUser?.display_name || 'Chef Station'}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      connectionStatus === 'connected'
                        ? 'bg-[#cdeeb0]/60 text-[#072619] border-[#0f8a5f]/30'
                        : 'bg-[#FEF3E2] text-[#B45309] border-[#FDE3B8]'
                    }`}
                  >
                    <PulseBeacon color={connectionStatus === 'connected' ? '#0f8a5f' : '#F59E0B'} size="sm" />
                    <span>{connectionStatus === 'connected' ? 'LIVE SYNC' : connectionStatus.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active vs Recall View Switcher */}
            <div className="flex items-center bg-[#f4fbf7] p-1 rounded-full border border-[#E5ECE8]">
              <button
                type="button"
                onClick={() => setActiveView('active')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  activeView === 'active'
                    ? 'bg-[#072619] text-[#a3e04f] shadow-xs'
                    : 'text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                Active ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('recall')}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  activeView === 'recall'
                    ? 'bg-[#072619] text-[#a3e04f] shadow-xs'
                    : 'text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recall</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Audio + Refresh */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMute}
              className={`h-10 px-4 text-xs font-bold rounded-full gap-1.5 border transition cursor-pointer ${
                isMuted
                  ? 'bg-white border-[#E5ECE8] text-[#4f675a]'
                  : 'bg-[#cdeeb0]/50 border-[#0f8a5f]/30 text-[#072619]'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-[#4f675a]" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#0f8a5f]" />
                  <span>Audio ON</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-10 px-4 bg-white border-[#E5ECE8] text-[#072619] hover:bg-[#f4fbf7] text-xs font-bold rounded-full gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Station Filter Tabs with Framer Motion layoutId */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {stations.map((stn) => {
            const Icon = stn.icon;
            const count = stationCounts[stn.code] || 0;
            const isSelected = activeStation === stn.code;

            return (
              <button
                key={stn.code}
                type="button"
                onClick={() => setActiveStation(stn.code)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'text-white'
                    : 'bg-[#f4fbf7] border border-[#E5ECE8] text-[#4f675a] hover:text-[#072619]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-kds-station"
                    className="absolute inset-0 bg-[#0f8a5f] rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <Icon className={`relative z-10 w-3.5 h-3.5 ${isSelected ? 'text-[#a3e04f]' : ''}`} />
                <span className="relative z-10">{stn.label}</span>
                <span
                  className={`relative z-10 ml-0.5 px-2 py-0.2 rounded-full text-[10px] font-mono font-black ${
                    isSelected ? 'bg-[#072619] text-[#a3e04f]' : 'bg-white text-[#4f675a]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main KDS Grid Canvas */}
      <main className="p-6 flex-1 overflow-y-auto scrollbar-none">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {displayedTickets.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-white border border-[#E5ECE8] shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#cdeeb0] text-[#0f8a5f] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display text-lg font-extrabold text-[#072619] mb-1">
              {activeView === 'recall' ? 'No Recalled Tickets' : 'Kitchen All Caught Up!'}
            </h3>
            <p className="text-xs text-[#4f675a] max-w-sm">
              {activeView === 'recall'
                ? 'No tickets completed in the last 2 hours to recall.'
                : 'No pending orders at this station. New tickets will arrive and chime in real time.'}
            </p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence mode="popLayout">
              {displayedTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onStart={handleStartPrep}
                  onReady={handleMarkReady}
                  onRecall={activeView === 'recall' ? handleRecall : undefined}
                  isActionLoading={isLoading}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
