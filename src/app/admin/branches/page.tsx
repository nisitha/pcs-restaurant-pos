'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  ArrowRightLeft,
  Plus,
  RefreshCw,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBranchStore } from '@/stores/branch-store';
import { Branch, InterBranchTransfer } from '@/types/phase4.types';

export default function BranchesAndTransfersPage() {
  const { branches, setBranches, fetchBranches } = useBranchStore();

  const [activeTab, setActiveTab] = useState<'branches' | 'transfers'>('branches');
  const [transfers, setTransfers] = useState<InterBranchTransfer[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [branchCode, setBranchCode] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [branchAddress, setBranchAddress] = useState<string>('');
  const [branchPhone, setBranchPhone] = useState<string>('');
  const [serviceChargeRate, setServiceChargeRate] = useState<number>(10);

  // New Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [fromBranchId, setFromBranchId] = useState<string>('');
  const [toBranchId, setToBranchId] = useState<string>('');
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<string>('5');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferError, setTransferError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/branches/transfers');
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.transfers || []);
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchIngredients = useCallback(async (branchId: string) => {
    try {
      const res = await fetch(`/api/inventory?branchId=${branchId}`);
      if (res.ok) {
        const data = await res.json();
        setIngredients(data.ingredients || []);
        if (data.ingredients && data.ingredients.length > 0) {
          setSelectedIngredientId(data.ingredients[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load ingredients:', err);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchTransfers();
  }, [fetchBranches, fetchTransfers]);

  useEffect(() => {
    if (branches.length >= 2) {
      setFromBranchId(branches[0].id);
      setToBranchId(branches[1].id);
      fetchIngredients(branches[0].id);
    }
  }, [branches, fetchIngredients]);

  // Handle source branch change
  const handleFromBranchChange = (branchId: string) => {
    setFromBranchId(branchId);
    fetchIngredients(branchId);
  };

  // Submit New Branch
  const handleSaveBranch = async () => {
    if (!branchCode.trim() || !branchName.trim()) return;

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: branchCode.trim(),
          name: branchName.trim(),
          address: branchAddress.trim() || null,
          phone: branchPhone.trim() || null,
          service_charge_rate: serviceChargeRate,
          currency: 'LKR',
          tax_rate: 0,
          is_active: true,
        }),
      });

      if (res.ok) {
        setIsBranchModalOpen(false);
        setBranchCode('');
        setBranchName('');
        setBranchAddress('');
        setBranchPhone('');
        fetchBranches();
      }
    } catch (err) {
      console.error('Failed to save branch:', err);
    }
  };

  // Submit Transfer Request
  const handleCreateTransfer = async () => {
    setTransferError(null);
    if (!fromBranchId || !toBranchId || fromBranchId === toBranchId) {
      setTransferError('Please select two distinct branches');
      return;
    }

    const ing = ingredients.find((i) => i.id === selectedIngredientId);
    if (!ing) {
      setTransferError('Please select a valid ingredient');
      return;
    }

    const qty = Number(transferQty);
    if (isNaN(qty) || qty <= 0) {
      setTransferError('Quantity must be greater than zero');
      return;
    }

    if (qty > Number(ing.current_stock)) {
      setTransferError(`Source branch only has ${ing.current_stock} ${ing.unit} in stock`);
      return;
    }

    try {
      const res = await fetch('/api/branches/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_branch_id: fromBranchId,
          to_branch_id: toBranchId,
          notes: transferNotes.trim() || null,
          items: [
            {
              ingredient_id: ing.id,
              quantity: qty,
              unit_cost: ing.unit_cost,
            },
          ],
        }),
      });

      if (res.ok) {
        setIsTransferModalOpen(false);
        setTransferNotes('');
        fetchTransfers();
      } else {
        const data = await res.json();
        setTransferError(data.message || 'Failed to create transfer');
      }
    } catch (err: any) {
      setTransferError(err.message);
    }
  };

  // Process / Complete Transfer
  const handleProcessTransfer = async (transferId: string) => {
    try {
      const res = await fetch(`/api/branches/transfers/${transferId}/process`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchTransfers();
      }
    } catch (err) {
      console.error('Failed to process transfer:', err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1A1D1F] flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#119C49]" />
            <span>Multi-Branch & Stock Transfers</span>
          </h1>
          <p className="text-sm text-[#7C828D] mt-1">
            Manage restaurant outlets, view consolidated inventory, and execute inter-branch stock transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              fetchBranches();
              fetchTransfers();
            }}
            className="h-11 px-4 rounded-2xl border-[#EBECEF] text-xs font-bold text-[#1A1D1F] hover:bg-[#F6F7F9]"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            <span>Refresh</span>
          </Button>

          {activeTab === 'branches' ? (
            <Button
              onClick={() => setIsBranchModalOpen(true)}
              className="h-11 px-5 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-black shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Branch</span>
            </Button>
          ) : (
            <Button
              onClick={() => setIsTransferModalOpen(true)}
              className="h-11 px-5 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-black shadow-sm flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>New Stock Transfer</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EBECEF] pb-3">
        <button
          onClick={() => setActiveTab('branches')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'branches'
              ? 'bg-[#119C49] text-white shadow-xs'
              : 'bg-white text-[#7C828D] border border-[#EBECEF]'
          }`}
        >
          Operating Branches ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'transfers'
              ? 'bg-[#119C49] text-white shadow-xs'
              : 'bg-white text-[#7C828D] border border-[#EBECEF]'
          }`}
        >
          Inter-Branch Stock Transfers ({transfers.length})
        </button>
      </div>

      {/* TAB 1: BRANCHES */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl p-6 border border-[#EBECEF] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EBECEF]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center font-black">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-[#1A1D1F]">{b.name}</h4>
                      <p className="text-xs font-mono font-bold text-[#119C49]">{b.code}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#D1F0DC] text-[#119C49]">
                    Active
                  </span>
                </div>

                <div className="py-4 space-y-2 text-xs">
                  <p className="text-[#7C828D] flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#7C828D] shrink-0 mt-0.5" />
                    <span>{b.address || 'Address not configured'}</span>
                  </p>
                  <p className="text-[#7C828D] flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#7C828D] shrink-0" />
                    <span>{b.phone || 'Phone not configured'}</span>
                  </p>
                  <p className="text-[11px] font-bold text-[#1A1D1F] bg-[#F6F7F9] p-2.5 rounded-xl mt-2">
                    Currency: {b.currency} • Service Charge: {b.service_charge_rate}% • Tax: {b.tax_rate}%
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EBECEF] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#A0A4AB]">ID: {b.id.substring(0, 8)}...</span>
                <span className="text-[#119C49] font-bold text-xs">Ready for POS & KDS</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[#EBECEF] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-b border-[#EBECEF] text-[#7C828D] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-6">Transfer #</th>
                    <th className="py-3.5 px-6">Route (From → To)</th>
                    <th className="py-3.5 px-6">Items & Quantities</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBECEF]">
                  {transfers.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-4 px-6 font-extrabold text-[#1A1D1F]">
                        {t.transfer_number}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#1A1D1F]">
                        <div className="flex items-center gap-1.5">
                          <span>{t.from_branch?.name || 'Colombo'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#119C49]" />
                          <span>{t.to_branch?.name || 'Kandy'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[#7C828D]">
                        {(t.items || []).map((i: any) => (
                          <div key={i.id} className="font-semibold">
                            {i.ingredient?.name || 'Ingredient'}: {i.quantity} {i.ingredient?.unit || 'kg'}
                          </div>
                        ))}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                            t.status === 'completed'
                              ? 'bg-[#D1F0DC] text-[#119C49]'
                              : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#7C828D]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {t.status === 'pending' ? (
                          <Button
                            onClick={() => handleProcessTransfer(t.id)}
                            className="h-8 px-3 rounded-xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-bold"
                          >
                            Receive & Deduct Stock
                          </Button>
                        ) : (
                          <span className="text-[#119C49] font-bold text-xs flex items-center justify-end gap-1">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Received</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7C828D]">
                        No stock transfers recorded yet. Click &quot;New Stock Transfer&quot; to transfer inventory.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Branch Modal */}
      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[#EBECEF]">
            <DialogTitle className="text-xl font-black text-[#1A1D1F] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#119C49]" />
              <span>Create Restaurant Branch</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Branch Code *</label>
              <input
                type="text"
                placeholder="e.g. GALLE-01"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-bold uppercase focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Branch Name *</label>
              <input
                type="text"
                placeholder="e.g. Galle Fort Branch"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Address</label>
              <input
                type="text"
                placeholder="Street, City"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+94 91 223 4567"
                value={branchPhone}
                onChange={(e) => setBranchPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Service Charge Rate (%)</label>
              <input
                type="number"
                value={serviceChargeRate}
                onChange={(e) => setServiceChargeRate(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveBranch}
            disabled={!branchCode.trim() || !branchName.trim()}
            className="w-full h-11 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-black mt-2"
          >
            Create Branch
          </Button>
        </DialogContent>
      </Dialog>

      {/* New Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[#EBECEF]">
            <DialogTitle className="text-xl font-black text-[#1A1D1F] flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#119C49]" />
              <span>Inter-Branch Stock Transfer</span>
            </DialogTitle>
          </DialogHeader>

          {transferError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          <div className="space-y-3 py-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">From Branch</label>
                <select
                  value={fromBranchId}
                  onChange={(e) => handleFromBranchChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">To Branch</label>
                <select
                  value={toBranchId}
                  onChange={(e) => setToBranchId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
                >
                  {branches
                    .filter((b) => b.id !== fromBranchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Select Ingredient</label>
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Stock: {ing.current_stock} {ing.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Transfer Quantity</label>
              <input
                type="number"
                step="0.1"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Transfer Notes</label>
              <input
                type="text"
                placeholder="e.g. Weekly replenishment for Kandy Kitchen"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateTransfer}
            className="w-full h-11 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-black mt-2"
          >
            Create Transfer Request
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
