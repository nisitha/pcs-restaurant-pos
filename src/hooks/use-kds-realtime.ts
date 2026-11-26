'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KDSTicket } from '@/types/kds.types';
import { audioAlert } from '@/lib/audio/chime';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

interface UseKdsRealtimeOptions {
  branchId?: string;
  stationCode?: string;
  view?: 'active' | 'recall';
}

export function useKdsRealtime({
  branchId = '00000000-0000-0000-0000-000000000001',
  stationCode = 'ALL',
  view = 'active',
}: UseKdsRealtimeOptions = {}) {
  const [tickets, setTickets] = useState<KDSTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeStatus>('connecting');
  const [isMuted, setIsMuted] = useState<boolean>(() => audioAlert.getMuted());

  const previousTicketIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Fetch tickets from API
  const fetchTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch(`/api/kds/tickets?branchId=${branchId}&stationCode=${stationCode}&view=${view}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.tickets)) {
        const currentTickets: KDSTicket[] = data.tickets;

        // Check if there are newly arrived tickets that weren't in previous snapshot
        if (!isInitialLoadRef.current && view === 'active') {
          const hasNewTicket = currentTickets.some(
            (t) => !previousTicketIdsRef.current.has(t.id) && t.status === 'submitted'
          );
          if (hasNewTicket) {
            audioAlert.playNewTicketChime();
          }
        }

        previousTicketIdsRef.current = new Set(currentTickets.map((t) => t.id));
        isInitialLoadRef.current = false;
        setTickets(currentTickets);
        setError(null);
      } else {
        setError(data.message || 'Failed to load tickets');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error loading tickets';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, stationCode, view]);

  // Handle Chef Actions
  const updateTicket = useCallback(async (ticketId: string, action: 'start' | 'ready' | 'recall', chefId?: string) => {
    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const nextStatus = action === 'start' ? 'in_preparation' : action === 'ready' ? 'ready' : 'in_preparation';
          return {
            ...t,
            status: nextStatus,
            started_at: action === 'start' ? new Date().toISOString() : t.started_at,
            ready_at: action === 'ready' ? new Date().toISOString() : t.ready_at,
          };
        }
        return t;
      })
    );

    try {
      const res = await fetch(`/api/kds/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, chefId }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to update ticket action:', data.message);
        fetchTickets(true);
      } else {
        // Refetch to sync parent order statuses
        fetchTickets(true);
      }
    } catch (e) {
      console.error('Ticket update error:', e);
      fetchTickets(true);
    }
  }, [fetchTickets]);

  const toggleMute = useCallback(() => {
    const nextMuted = audioAlert.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // Supabase Realtime Channel
  useEffect(() => {
    let isSubscribed = true;
    fetchTickets();

    const supabase = createClient();
    const channelName = `kds-realtime-${stationCode}-${view}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'station_routing_tickets' },
        (payload) => {
          if (!isSubscribed) return;
          if (payload.eventType === 'INSERT') {
            audioAlert.playNewTicketChime();
          }
          fetchTickets(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          if (!isSubscribed) return;
          fetchTickets(true);
        }
      )
      .subscribe((status) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('connecting');
        }
      });

    // Fallback polling every 8s as resilient safety net
    const pollingTimer = setInterval(() => {
      fetchTickets(true);
    }, 8000);

    return () => {
      isSubscribed = false;
      clearInterval(pollingTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchTickets, stationCode, view]);

  return {
    tickets,
    isLoading,
    error,
    connectionStatus,
    isMuted,
    toggleMute,
    refetch: () => fetchTickets(false),
    updateTicket,
  };
}
