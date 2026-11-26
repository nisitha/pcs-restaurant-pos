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
  Utensils,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useKdsRealtime } from '@/hooks/use-kds-realtime';
import { TicketCard } from '@/components/kds/ticket-card';

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

  const stations: Array<{ code: string; label: string; icon: any }> = [
    { code: 'ALL', label: 'All Stations', icon: Layers },
    { code: 'HOT', label: 'Hot Kitchen', icon: Flame },
    { code: 'GRILL', label: 'Grill Station', icon: ChefHat },
    { code: 'BEV', label: 'Beverage Station', icon: Coffee },
    { code: 'DESSERT', label: 'Dessert Station', icon: IceCream },
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
    <div className="flex-1 flex flex-col bg-[#F6F7F9] text-[#1A1D1F] h-full overflow-hidden">
      {/* KDS Header */}
      <header className="bg-white border-b border-[#EBECEF] px-6 py-4 shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Title + Station Info */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF3E2] border border-[#FDE3B8] text-[#F59E0B] flex items-center justify-center font-bold">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-[#1A1D1F] leading-tight">
                  Kitchen Display System
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#7C828D]">
                    {currentUser?.display_name || 'Chef Station'}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      connectionStatus === 'connected'
                        ? 'bg-[#D1F0DC] text-[#119C49] border-[#BDE8CB]'
                        : 'bg-[#FEF3E2] text-[#F59E0B] border-[#FDE3B8]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-[#119C49] animate-pulse' : 'bg-[#F59E0B]'
                      }`}
                    />
                    <span>{connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Switcher: Active vs Recall */}
            <div className="flex items-center bg-[#F6F7F9] p-1 rounded-full border border-[#EBECEF]">
              <button
                type="button"
                onClick={() => setActiveView('active')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeView === 'active'
                    ? 'bg-[#119C49] text-white shadow-sm'
                    : 'text-[#7C828D] hover:text-[#1A1D1F]'
                }`}
              >
                Active ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('recall')}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  activeView === 'recall'
                    ? 'bg-[#119C49] text-white shadow-sm'
                    : 'text-[#7C828D] hover:text-[#1A1D1F]'
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
              className={`h-10 px-4 text-xs font-bold rounded-full gap-1.5 border transition ${
                isMuted
                  ? 'bg-white border-[#EBECEF] text-[#7C828D]'
                  : 'bg-[#D1F0DC] border-[#BDE8CB] text-[#119C49]'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-[#7C828D]" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#119C49]" />
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
              className="h-10 px-4 bg-white border-[#EBECEF] text-[#1A1D1F] hover:bg-[#F6F7F9] text-xs font-bold rounded-full gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Station Filter Tabs */}
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
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-[#D1F0DC] border-[#BDE8CB] text-[#119C49] shadow-sm'
                    : 'bg-white border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{stn.label}</span>
                <span
                  className={`ml-1 px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-[#119C49] text-white' : 'bg-[#F4F5F7] text-[#7C828D]'
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
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {displayedTickets.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-white border border-[#EBECEF] shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#D1F0DC] text-[#119C49] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-[#1A1D1F] mb-1">
              {activeView === 'recall' ? 'No Recalled Tickets' : 'Kitchen All Caught Up!'}
            </h3>
            <p className="text-xs text-[#7C828D] max-w-sm">
              {activeView === 'recall'
                ? 'No tickets completed in the last 2 hours to recall.'
                : 'No pending orders at this station. New tickets will arrive and alert in real time.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          </div>
        )}
      </main>
    </div>
  );
}
