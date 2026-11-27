'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Award,
  DollarSign,
  Phone,
  Mail,
  History,
  Crown,
  Building2,
  UserCheck,
  Star,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatLKR } from '@/lib/utils/currency';
import { formatRestaurantDateTime } from '@/lib/utils/datetime';
import { Customer, CustomerTier } from '@/types/crm.types';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    delivery_address: '',
    tier: 'Regular' as CustomerTier,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = searchQuery
        ? `/api/customers?q=${encodeURIComponent(searchQuery)}`
        : '/api/customers';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const openNewCustomerModal = () => {
    setFormData({
      id: '',
      name: '',
      phone: '',
      email: '',
      delivery_address: '',
      tier: 'Regular',
      notes: '',
    });
    setFormError(null);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setFormData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      delivery_address: customer.delivery_address || '',
      tier: customer.tier,
      notes: customer.notes || '',
    });
    setFormError(null);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!formData.name || !formData.phone) {
      setFormError('Name and Phone number are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to save customer');
        return;
      }

      setIsCustomerModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Error saving customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPIs
  const totalPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
  const vipCount = customers.filter((c) => c.tier === 'VIP').length;
  const corporateCount = customers.filter((c) => c.tier === 'Corporate').length;
  const totalCustomerSpend = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#119C49]" /> Customer CRM & Loyalty
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Customer directory, loyalty points ledgers (1 pt / Rs. 100), VIP tiers, and dietary preferences.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={fetchCustomers}
            className="rounded-2xl border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] gap-1.5 h-10 px-3.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-semibold">Refresh</span>
          </Button>

          <Button
            onClick={openNewCustomerModal}
            className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs gap-1.5 h-10 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Registered Guests</p>
            <p className="text-xl font-black text-[#1A1D1F]">{customers.length} Guests</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3E2] text-[#F59E0B] flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Active Loyalty Points</p>
            <p className="text-xl font-black text-[#F59E0B] font-mono">{totalPoints} Pts</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D1F0DC] text-[#119C49] flex items-center justify-center">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">VIP & Corporate Tiers</p>
            <p className="text-xl font-black text-[#119C49]">
              {vipCount} VIP &bull; {corporateCount} Corp
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F7F9] text-[#1A1D1F] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#7C828D] font-medium">Total Lifetime Spend</p>
            <p className="text-xl font-black text-[#1A1D1F] font-mono">
              {formatLKR(totalCustomerSpend)}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C828D]" />
        <Input
          type="text"
          placeholder="Search customer by name or phone (+94...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-white border-[#EBECEF] rounded-2xl text-xs"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-[#EBECEF] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F7F9] text-[#7C828D] border-b border-[#EBECEF] font-bold">
              <tr>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-4">Phone / Contact</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Loyalty Balance</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Preferences & Notes</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F7]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#F6F7F9]/50 transition">
                  <td className="py-3.5 px-5 font-bold text-[#1A1D1F]">
                    {c.name}
                    {c.email && (
                      <span className="block text-[10px] text-[#7C828D] font-normal">
                        {c.email}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#1A1D1F]">
                    {c.phone}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.tier === 'VIP'
                          ? 'bg-[#FEF3E2] text-[#F59E0B] border border-[#F59E0B]/30'
                          : c.tier === 'Corporate'
                          ? 'bg-[#D1F0DC] text-[#119C49] border border-[#119C49]/30'
                          : 'bg-[#F6F7F9] text-[#7C828D]'
                      }`}
                    >
                      {c.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#F59E0B]">
                    {c.loyalty_points} Pts
                    <span className="block text-[10px] text-[#7C828D] font-normal">
                      (= {formatLKR(c.loyalty_points)})
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#119C49]">
                    {formatLKR(c.total_spent)}
                  </td>
                  <td className="py-3.5 px-4 text-[#7C828D] text-[11px] max-w-xs truncate">
                    {c.notes || '—'}
                  </td>
                  <td className="py-3.5 px-5 text-right space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setIsHistoryModalOpen(true);
                      }}
                      className="rounded-xl border-[#EBECEF] text-xs h-8 px-2.5 text-[#119C49] hover:bg-[#D1F0DC]/20"
                    >
                      <History className="w-3.5 h-3.5 mr-1" />
                      <span>Ledger</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditCustomerModal(c)}
                      className="rounded-xl border-[#EBECEF] text-xs h-8 px-2.5 hover:bg-[#F6F7F9]"
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: Add/Edit Customer */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F]">
              {formData.id ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Customer Full Name</label>
              <Input
                type="text"
                placeholder="e.g. Kasun Wickramasinghe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Phone Number</label>
                <Input
                  type="text"
                  placeholder="+94 77 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-10 rounded-2xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Tier Group</label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                  className="w-full h-10 px-3 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl font-semibold focus:outline-none"
                >
                  <option value="Regular">Regular</option>
                  <option value="VIP">VIP</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Email Address (Optional)</label>
              <Input
                type="email"
                placeholder="customer@domain.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Delivery Address (Optional)</label>
              <Input
                type="text"
                placeholder="House / Apartment, Street, City"
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Dietary Notes & Preferences</label>
              <Input
                type="text"
                placeholder="Allergic to peanuts, prefers window table, extra spicy"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomerModalOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCustomer}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
            >
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Loyalty Ledger History */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#F59E0B]" />
              <span>Loyalty Points History: {selectedCustomer?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] flex items-center justify-between">
                <div>
                  <span className="text-[#7C828D] block text-[10px]">Available Balance</span>
                  <span className="text-xl font-black text-[#F59E0B] font-mono">
                    {selectedCustomer.loyalty_points} Points
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#7C828D] block text-[10px]">Total Lifetime Spend</span>
                  <span className="text-sm font-black text-[#119C49] font-mono">
                    {formatLKR(selectedCustomer.total_spent)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {selectedCustomer.transactions && selectedCustomer.transactions.length > 0 ? (
                  selectedCustomer.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-2xl bg-white border border-[#EBECEF] flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-[#1A1D1F] block">{tx.notes || tx.transaction_type}</span>
                        <span className="text-[10px] text-[#7C828D] font-mono">
                          {formatRestaurantDateTime(tx.created_at)}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold text-sm ${
                          tx.points_change > 0 ? 'text-[#119C49]' : 'text-red-500'
                        }`}
                      >
                        {tx.points_change > 0 ? `+${tx.points_change}` : tx.points_change} Pts
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-[#7C828D] py-6">
                    No points transactions recorded yet. Points will accumulate automatically on settled POS orders.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHistoryModalOpen(false)}
              className="rounded-2xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
