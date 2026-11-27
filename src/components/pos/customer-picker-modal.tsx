'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Check,
  UserPlus,
  Award,
  X,
  Phone,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Customer } from '@/types/crm.types';
import { formatLKR } from '@/lib/utils/currency';

interface CustomerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomerId?: string | null;
}

export function CustomerPickerModal({
  isOpen,
  onClose,
  onSelectCustomer,
  selectedCustomerId,
}: CustomerPickerModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickAdd, setIsQuickAdd] = useState(false);

  // Quick add form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTier, setNewTier] = useState<'Regular' | 'VIP' | 'Corporate'>('Regular');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = async (q = '') => {
    try {
      setIsLoading(true);
      const url = q ? `/api/customers?q=${encodeURIComponent(q)}` : '/api/customers';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to load customers in picker', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsQuickAdd(false);
      setSearchQuery('');
      fetchCustomers();
    }
  }, [isOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchCustomers(val);
  };

  const handleQuickCreate = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      setFormError('Name and Phone are required');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          tier: newTier,
          notes: newNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to create customer');
        return;
      }

      onSelectCustomer(data.customer);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Error creating customer');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#119C49]" />
              <span>{isQuickAdd ? 'Quick-Register Customer' : 'Select Loyalty Customer'}</span>
            </DialogTitle>

            <button
              type="button"
              onClick={() => {
                setIsQuickAdd(!isQuickAdd);
                setFormError(null);
              }}
              className="text-xs font-bold text-[#119C49] hover:underline flex items-center gap-1"
            >
              {isQuickAdd ? (
                '← Search Existing'
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Quick Add</span>
                </>
              )}
            </button>
          </div>
          <DialogDescription className="text-xs text-[#7C828D]">
            Search loyalty members by name or phone, or register a new customer profile.
          </DialogDescription>
        </DialogHeader>

        {isQuickAdd ? (
          <div className="space-y-3 py-2 text-xs">
            {formError && (
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 font-bold">
                {formError}
              </div>
            )}

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Customer Name</label>
              <Input
                type="text"
                placeholder="e.g. Kasun Silva"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Phone Number</label>
                <Input
                  type="text"
                  placeholder="+94 77 000 0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-10 rounded-2xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as any)}
                  className="w-full h-10 px-3 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl font-semibold focus:outline-none"
                >
                  <option value="Regular">Regular</option>
                  <option value="VIP">VIP</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Dietary / Special Notes</label>
              <Input
                type="text"
                placeholder="e.g. No ice, window seat preference"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="h-10 rounded-2xl"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickAdd(false)}
                className="rounded-2xl"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleQuickCreate}
                disabled={isSaving}
                className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
              >
                {isSaving ? 'Creating...' : 'Register & Select'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-2 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C828D]" />
              <Input
                type="text"
                placeholder="Search name or phone number..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 h-10 bg-[#F6F7F9] border-[#EBECEF] rounded-2xl text-xs"
              />
            </div>

            {/* Results List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {/* Option to clear attached customer */}
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCustomer(null);
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-bold flex items-center justify-center gap-1.5 hover:bg-red-100 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove Attached Customer (Anonymous Order)</span>
                </button>
              )}

              {customers.length === 0 ? (
                <div className="py-8 text-center text-[#7C828D]">
                  <p>No customers found matching &quot;{searchQuery}&quot;</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsQuickAdd(true);
                      setNewName(searchQuery);
                    }}
                    className="mt-3 rounded-xl border-[#EBECEF] text-xs font-bold text-[#119C49]"
                  >
                    + Register &quot;{searchQuery}&quot; as New Customer
                  </Button>
                </div>
              ) : (
                customers.map((c) => {
                  const isSelected = c.id === selectedCustomerId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        onClose();
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#D1F0DC]/40 border-[#119C49]'
                          : 'bg-[#F6F7F9] border-[#EBECEF] hover:bg-white hover:border-[#119C49]/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#1A1D1F] text-sm">{c.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              c.tier === 'VIP'
                                ? 'bg-[#FEF3E2] text-[#F59E0B]'
                                : c.tier === 'Corporate'
                                ? 'bg-[#D1F0DC] text-[#119C49]'
                                : 'bg-zinc-200 text-zinc-700'
                            }`}
                          >
                            {c.tier}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#7C828D] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </span>
                        {c.notes && (
                          <span className="text-[10px] text-[#7C828D] block mt-0.5 italic">
                            &quot;{c.notes}&quot;
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-[#F59E0B] font-mono block">
                          {c.loyalty_points} Pts
                        </span>
                        <span className="text-[10px] text-[#7C828D] block font-mono">
                          {formatLKR(c.loyalty_points)} off
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-2xl"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
