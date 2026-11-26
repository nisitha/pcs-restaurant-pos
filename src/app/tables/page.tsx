'use client';

import React, { useState, useEffect } from 'react';
import { useTableStore } from '@/stores/table-store';
import { useAuthStore } from '@/stores/auth-store';
import { TableCard } from '@/components/tables/table-card';
import { TableEditDialog } from '@/components/tables/table-edit-dialog';
import { Button } from '@/components/ui/button';
import { TableStatus } from '@/types/table.types';
import {
  Grid3X3,
  Plus,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export default function TablesFloorPlanPage() {
  const { currentUser } = useAuthStore();
  const {
    floors,
    tables,
    fetchTables,
    updateTableStatus,
    saveTable,
    isLoading,
  } = useTableStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const filteredTables = tables.filter((table) => {
    if (statusFilter === 'all') return true;
    return table.status === statusFilter;
  });

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;

  return (
    <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Grid3X3 className="w-7 h-7 text-amber-500" /> Restaurant Floor Plan & Tables
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Visual table map with live dining timers, capacity tracking, and one-touch status transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTables()}
            disabled={isLoading}
            className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setIsAddTableOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
          className={`p-4 rounded-xl border text-left transition ${
            statusFilter === 'available'
              ? 'bg-emerald-500/20 border-emerald-500'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{availableCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'occupied' ? 'all' : 'occupied')}
          className={`p-4 rounded-xl border text-left transition ${
            statusFilter === 'occupied'
              ? 'bg-rose-500/20 border-rose-500'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Occupied</span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{occupiedCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'cleaning' ? 'all' : 'cleaning')}
          className={`p-4 rounded-xl border text-left transition ${
            statusFilter === 'cleaning'
              ? 'bg-purple-500/20 border-purple-500'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Cleaning</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">{cleaningCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'reserved' ? 'all' : 'reserved')}
          className={`p-4 rounded-xl border text-left transition ${
            statusFilter === 'reserved'
              ? 'bg-blue-500/20 border-blue-500'
              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Reserved</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">{reservedCount}</p>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setStatusFilter('all')}
          className={`text-xs rounded-lg ${
            statusFilter === 'all'
              ? 'bg-amber-500 text-zinc-950 font-bold'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          All Tables ({tables.length})
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setStatusFilter('available')}
          className={`text-xs rounded-lg ${
            statusFilter === 'available'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Available Only
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setStatusFilter('occupied')}
          className={`text-xs rounded-lg ${
            statusFilter === 'occupied'
              ? 'bg-rose-600 text-white font-bold'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Occupied Only
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setStatusFilter('cleaning')}
          className={`text-xs rounded-lg ${
            statusFilter === 'cleaning'
              ? 'bg-purple-600 text-white font-bold'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          Cleaning Only
        </Button>
      </div>

      {/* Tables Floor Plan Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onStatusChange={(tableId, nextStatus) => {
              updateTableStatus(tableId, nextStatus);
            }}
          />
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="p-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
          <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-zinc-400">No dining tables found for this status.</p>
        </div>
      )}

      {/* Add Table Dialog */}
      <TableEditDialog
        isOpen={isAddTableOpen}
        onOpenChange={setIsAddTableOpen}
        floors={floors}
        onSave={async (data) => {
          return saveTable(data);
        }}
      />
    </div>
  );
}
