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
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useKdsRealtime } from '@/hooks/use-kds-realtime';
import { TicketCard } from '@/components/kds/ticket-card';
import { StationCode } from '@/types/kds.types';

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

  // Count active tickets per station
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

  // Filter tickets by selected station tab
  const displayedTickets =
    activeStation === 'ALL'
      ? tickets
      : tickets.filter((t) => t.station_code.toUpperCase() === activeStation.toUpperCase());

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white min-h-[calc(100vh-4rem)]">
      {/* KDS Sticky Header */}
      <header className="sticky top-16 z-30 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Title + Realtime Status + Mode Switcher */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                  Kitchen Display System
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-zinc-400">
                    Station KDS &bull; {currentUser?.display_name || 'Chef Display'}
                  </span>
                  {/* Realtime Live Pulse Badge */}
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-mono font-semibold border ${
                      connectionStatus === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : connectionStatus === 'connecting'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connectionStatus === 'connected'
                          ? 'bg-emerald-400 animate-pulse'
                          : connectionStatus === 'connecting'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span>{connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode: Active vs Recall */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveView('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeView === 'active'
                    ? 'bg-orange-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Active ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('recall')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeView === 'recall'
                    ? 'bg-zinc-800 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recall</span>
              </button>
            </div>
          </div>

          {/* Right: Audio Chime Toggle + Manual Refresh */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Audio Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMute}
              title={isMuted ? 'Unmute WebAudio Alert' : 'Mute WebAudio Alert'}
              className={`h-9 px-3 text-xs font-bold gap-1.5 border transition ${
                isMuted
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Audio ON</span>
                </>
              )}
            </Button>

            {/* Manual Sync Refetch */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-9 px-3 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Station Filter Tabs */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {stations.map((stn) => {
            const Icon = stn.icon;
            const count = stationCounts[stn.code] || 0;
            const isSelected = activeStation === stn.code;

            return (
              <button
                key={stn.code}
                type="button"
                onClick={() => setActiveStation(stn.code)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{stn.label}</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Ticket Grid Content */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {displayedTickets.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-zinc-900/30 border border-dashed border-zinc-800">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {activeView === 'recall' ? 'No Recalled Tickets' : 'Kitchen All Caught Up!'}
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              {activeView === 'recall'
                ? 'No recently completed tickets found in the last 2 hours to recall.'
                : `There are currently no pending tickets routed to ${
                    activeStation === 'ALL' ? 'any station' : activeStation
                  }. New orders will appear here automatically.`}
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
