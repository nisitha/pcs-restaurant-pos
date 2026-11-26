'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  FileText,
  PackageCheck,
  Building2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
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
import {
  Supplier,
  PurchaseOrder,
  GoodsReceivedNote,
  Ingredient,
} from '@/types/inventory.types';

export default function AdminPurchasingPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'grn'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  // PO Form
  const [selectedPoSupplier, setSelectedPoSupplier] = useState('');
  const [poItems, setPoItems] = useState<
    Array<{ ingredient_id: string; quantity: number; unit_cost: number }>
  >([]);

  // GRN Form
  const [selectedGrnSupplier, setSelectedGrnSupplier] = useState('');
  const [selectedGrnPoId, setSelectedGrnPoId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [grnItems, setGrnItems] = useState<
    Array<{ ingredient_id: string; quantity_received: number; unit_cost: number }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supRes, poRes, grnRes, ingRes] = await Promise.all([
        fetch('/api/purchasing/suppliers'),
        fetch('/api/purchasing/orders'),
        fetch('/api/purchasing/grn'),
        fetch('/api/inventory'),
      ]);

      const [supData, poData, grnData, ingData] = await Promise.all([
        supRes.json(),
        poRes.json(),
        grnRes.json(),
        ingRes.json(),
      ]);

      if (supData.success) setSuppliers(supData.suppliers || []);
      if (poData.success) setPurchaseOrders(poData.orders || []);
      if (grnData.success) setGrns(grnData.grns || []);
      if (ingData.success) setIngredients(ingData.ingredients || []);
    } catch (err) {
      console.error('Failed to load purchasing data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Supplier
  const handleSaveSupplier = async () => {
    if (!supplierForm.name || !supplierForm.phone) {
      setFormError('Supplier Name and Phone are required');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/purchasing/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to save supplier');
        return;
      }
      setIsSupplierModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save PO
  const handleCreatePO = async () => {
    if (!selectedPoSupplier) {
      setFormError('Please select a supplier');
      return;
    }
    if (poItems.length === 0) {
      setFormError('Add at least one item');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedPoSupplier,
          items: poItems,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to create PO');
        return;
      }
      setIsPoModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save GRN (Goods Received Note)
  const handleCreateGRN = async () => {
    if (!selectedGrnSupplier) {
      setFormError('Please select a supplier');
      return;
    }
    if (grnItems.length === 0) {
      setFormError('Add at least one received item');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      const res = await fetch('/api/purchasing/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: selectedGrnSupplier,
          po_id: selectedGrnPoId || null,
          invoice_number: invoiceNumber,
          items: grnItems,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to record GRN');
        return;
      }
      setIsGrnModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1D1F] flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-[#119C49]" /> Suppliers & Purchasing (GRN)
          </h1>
          <p className="text-xs text-[#7C828D] mt-1">
            Supplier management, Purchase Orders, and Goods Received Notes with automatic stock increments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={fetchData}
            className="rounded-2xl border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] gap-1.5 h-10 px-3.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-semibold">Refresh</span>
          </Button>

          <Button
            onClick={() => {
              if (activeTab === 'suppliers') {
                setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
                setFormError(null);
                setIsSupplierModalOpen(true);
              } else if (activeTab === 'orders') {
                setSelectedPoSupplier(suppliers[0]?.id || '');
                setPoItems([
                  {
                    ingredient_id: ingredients[0]?.id || '',
                    quantity: 10,
                    unit_cost: ingredients[0]?.unit_cost || 100,
                  },
                ]);
                setFormError(null);
                setIsPoModalOpen(true);
              } else {
                setSelectedGrnSupplier(suppliers[0]?.id || '');
                setSelectedGrnPoId('');
                setInvoiceNumber('');
                setGrnItems([
                  {
                    ingredient_id: ingredients[0]?.id || '',
                    quantity_received: 10,
                    unit_cost: ingredients[0]?.unit_cost || 100,
                  },
                ]);
                setFormError(null);
                setIsGrnModalOpen(true);
              }
            }}
            className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold text-xs gap-1.5 h-10 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeTab === 'suppliers'
                ? 'Add Supplier'
                : activeTab === 'orders'
                ? 'New Purchase Order'
                : 'Receive Goods (GRN)'}
            </span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EBECEF] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-[#119C49] text-white shadow-sm'
              : 'text-[#7C828D] hover:text-[#1A1D1F]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Suppliers ({suppliers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#119C49] text-white shadow-sm'
              : 'text-[#7C828D] hover:text-[#1A1D1F]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grn')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'grn'
              ? 'bg-[#119C49] text-white shadow-sm'
              : 'text-[#7C828D] hover:text-[#1A1D1F]'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Goods Received Notes ({grns.length})</span>
        </button>
      </div>

      {/* Tab 1: Suppliers */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-3xl border border-[#EBECEF] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-extrabold text-[#1A1D1F] text-base leading-tight">
                    {s.name}
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-[#119C49]" />
                </div>
                {s.contact_person && (
                  <p className="text-xs font-semibold text-[#119C49] mb-3">
                    Contact: {s.contact_person}
                  </p>
                )}

                <div className="space-y-1.5 text-xs text-[#7C828D]">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#119C49]" /> {s.phone}
                  </p>
                  {s.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#119C49]" /> {s.email}
                    </p>
                  )}
                  {s.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#119C49]" /> {s.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-[#EBECEF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F7F9] text-[#7C828D] border-b border-[#EBECEF] font-bold">
                <tr>
                  <th className="py-3.5 px-5">PO Number</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4">Items Count</th>
                  <th className="py-3.5 px-4">Total Amount (LKR)</th>
                  <th className="py-3.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F6F7F9]/50 transition">
                    <td className="py-3.5 px-5 font-mono font-bold text-[#1A1D1F]">
                      {po.po_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A1D1F]">
                      {po.supplier?.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#7C828D] text-[11px]">
                      {formatRestaurantDateTime(po.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-[#7C828D]">
                      {po.items?.length || 0} line items
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#119C49]">
                      {formatLKR(po.total_cost)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          po.status === 'received'
                            ? 'bg-[#D1F0DC] text-[#119C49]'
                            : 'bg-[#FEF3E2] text-[#F59E0B]'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Goods Received Notes */}
      {activeTab === 'grn' && (
        <div className="bg-white rounded-3xl border border-[#EBECEF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F7F9] text-[#7C828D] border-b border-[#EBECEF] font-bold">
                <tr>
                  <th className="py-3.5 px-5">GRN Number</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Received Date</th>
                  <th className="py-3.5 px-4">Received Items</th>
                  <th className="py-3.5 px-5">Total Value (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F7]">
                {grns.map((g) => (
                  <tr key={g.id} className="hover:bg-[#F6F7F9]/50 transition">
                    <td className="py-3.5 px-5 font-mono font-bold text-[#119C49]">
                      {g.grn_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A1D1F]">
                      {g.supplier?.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#7C828D]">
                      {g.invoice_number || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#7C828D] text-[11px]">
                      {formatRestaurantDateTime(g.received_at)}
                    </td>
                    <td className="py-3.5 px-4 text-[#1A1D1F]">
                      {(g.items || []).map((it, idx) => (
                        <span key={idx} className="block text-[11px]">
                          &bull; {it.quantity_received} {it.ingredient?.unit} {it.ingredient?.name}
                        </span>
                      ))}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-[#1A1D1F]">
                      {formatLKR(g.total_received_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog: Add Supplier */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F]">
              Add New Supplier
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Company / Supplier Name</label>
              <Input
                type="text"
                placeholder="e.g. Ceylon Poultry & Eggs Ltd"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Contact Person</label>
              <Input
                type="text"
                placeholder="e.g. Sunil Perera"
                value={supplierForm.contact_person}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Phone Number</label>
                <Input
                  type="text"
                  placeholder="+94 77 123 4567"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="h-10 rounded-2xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Email (Optional)</label>
                <Input
                  type="email"
                  placeholder="orders@supplier.lk"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="h-10 rounded-2xl"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Address</label>
              <Input
                type="text"
                placeholder="Colombo, Sri Lanka"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                className="h-10 rounded-2xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSupplierModalOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveSupplier}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
            >
              {isSubmitting ? 'Saving...' : 'Save Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create PO */}
      <Dialog open={isPoModalOpen} onOpenChange={setIsPoModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F]">
              Create Purchase Order
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Select Supplier</label>
              <select
                value={selectedPoSupplier}
                onChange={(e) => setSelectedPoSupplier(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl font-semibold focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[#1A1D1F]">Order Items</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPoItems([
                      ...poItems,
                      {
                        ingredient_id: ingredients[0]?.id || '',
                        quantity: 10,
                        unit_cost: ingredients[0]?.unit_cost || 100,
                      },
                    ]);
                  }}
                  className="rounded-xl h-8 text-[11px] font-bold text-[#119C49]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {poItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF]"
                  >
                    <select
                      value={item.ingredient_id}
                      onChange={(e) => {
                        const ing = ingredients.find((i) => i.id === e.target.value);
                        const updated = [...poItems];
                        updated[idx].ingredient_id = e.target.value;
                        if (ing) updated[idx].unit_cost = ing.unit_cost;
                        setPoItems(updated);
                      }}
                      className="flex-1 h-9 px-2 bg-white rounded-xl text-xs font-semibold"
                    >
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].quantity = parseFloat(e.target.value) || 0;
                        setPoItems(updated);
                      }}
                      className="w-20 h-9 rounded-xl font-mono text-xs text-right"
                    />

                    <Input
                      type="number"
                      step="1"
                      placeholder="Unit Cost"
                      value={item.unit_cost}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].unit_cost = parseFloat(e.target.value) || 0;
                        setPoItems(updated);
                      }}
                      className="w-24 h-9 rounded-xl font-mono text-xs text-right"
                    />

                    <button
                      type="button"
                      onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                      className="text-[#7C828D] hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPoModalOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreatePO}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
            >
              {isSubmitting ? 'Creating...' : 'Place Purchase Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Goods Received Note (GRN) */}
      <Dialog open={isGrnModalOpen} onOpenChange={setIsGrnModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white border-[#EBECEF] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#1A1D1F] flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-[#119C49]" /> Record Goods Received Note (GRN)
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-bold">
              {formError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Supplier</label>
                <select
                  value={selectedGrnSupplier}
                  onChange={(e) => setSelectedGrnSupplier(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl font-semibold focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1A1D1F] block mb-1">Invoice / Delivery #</label>
                <Input
                  type="text"
                  placeholder="INV-9921"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-10 rounded-2xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[#1A1D1F]">Received Items (Increments Stock)</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGrnItems([
                      ...grnItems,
                      {
                        ingredient_id: ingredients[0]?.id || '',
                        quantity_received: 10,
                        unit_cost: ingredients[0]?.unit_cost || 100,
                      },
                    ]);
                  }}
                  className="rounded-xl h-8 text-[11px] font-bold text-[#119C49]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Received Item
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {grnItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF]"
                  >
                    <select
                      value={item.ingredient_id}
                      onChange={(e) => {
                        const ing = ingredients.find((i) => i.id === e.target.value);
                        const updated = [...grnItems];
                        updated[idx].ingredient_id = e.target.value;
                        if (ing) updated[idx].unit_cost = ing.unit_cost;
                        setGrnItems(updated);
                      }}
                      className="flex-1 h-9 px-2 bg-white rounded-xl text-xs font-semibold"
                    >
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Qty"
                      value={item.quantity_received}
                      onChange={(e) => {
                        const updated = [...grnItems];
                        updated[idx].quantity_received = parseFloat(e.target.value) || 0;
                        setGrnItems(updated);
                      }}
                      className="w-20 h-9 rounded-xl font-mono text-xs text-right"
                    />

                    <Input
                      type="number"
                      step="1"
                      placeholder="Cost (LKR)"
                      value={item.unit_cost}
                      onChange={(e) => {
                        const updated = [...grnItems];
                        updated[idx].unit_cost = parseFloat(e.target.value) || 0;
                        setGrnItems(updated);
                      }}
                      className="w-24 h-9 rounded-xl font-mono text-xs text-right"
                    />

                    <button
                      type="button"
                      onClick={() => setGrnItems(grnItems.filter((_, i) => i !== idx))}
                      className="text-[#7C828D] hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGrnModalOpen(false)}
              className="rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateGRN}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#119C49] hover:bg-[#0E853E] text-white font-bold"
            >
              {isSubmitting ? 'Recording...' : 'Accept & Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
