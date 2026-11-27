'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  RotateCcw,
  Ban,
  Lock,
  CheckCircle2,
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
import { formatLKR } from '@/lib/utils/currency';

interface VoidRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    order_number: string;
    total_amount: number;
    payment_status: string;
    table_number?: string | null;
  } | null;
  onSuccess: () => void;
}

export function VoidRefundModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: VoidRefundModalProps) {
  const [action, setAction] = useState<'refund' | 'void'>('refund');
  const [managerPin, setManagerPin] = useState('');
  const [reasonCategory, setReasonCategory] = useState('Customer Complaint');
  const [reasonDetails, setReasonDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async () => {
    if (!managerPin || managerPin.length !== 4) {
      setErrorMessage('Please enter a 4-digit Manager PIN (Owner: 1111, Manager: 2222)');
      return;
    }

    const fullReason = reasonDetails.trim()
      ? `${reasonCategory}: ${reasonDetails.trim()}`
      : reasonCategory;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch(`/api/orders/${order.id}/void-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_pin: managerPin,
          action,
          reason: fullReason,
          refund_amount: order.total_amount,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || 'Authorization failed');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
        <DialogHeader className="pr-10">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-1">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-[#1A1D1F]">
            Manager Void / Refund Control
          </DialogTitle>
          <DialogDescription className="text-xs text-[#7C828D]">
            Controlled workflow. Requires Manager or Owner PIN. Reverses deducted recipe ingredients back into stock.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Order Details Context */}
        <div className="p-3.5 rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#7C828D]">Order Number</span>
            <span className="font-bold text-[#1A1D1F] font-mono">{order.order_number}</span>
          </div>
          {order.table_number && (
            <div className="flex items-center justify-between">
              <span className="text-[#7C828D]">Table</span>
              <span className="font-bold text-[#1A1D1F]">Table {order.table_number}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[#7C828D]">Total Amount</span>
            <span className="font-black text-[#119C49] font-mono text-sm">
              {formatLKR(order.total_amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#7C828D]">Payment Status</span>
            <span className="font-bold text-[#1A1D1F] uppercase text-[10px]">
              {order.payment_status}
            </span>
          </div>
        </div>

        {/* Action Toggle */}
        <div>
          <label className="text-xs font-bold text-[#1A1D1F] block mb-1.5">Action Type</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F6F7F9] rounded-2xl border border-[#EBECEF]">
            <button
              type="button"
              onClick={() => setAction('refund')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                action === 'refund'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Issue Refund</span>
            </button>
            <button
              type="button"
              onClick={() => setAction('void')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                action === 'void'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-[#7C828D] hover:text-[#1A1D1F]'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void Order</span>
            </button>
          </div>
        </div>

        {/* Mandatory Reason */}
        <div className="space-y-2 text-xs">
          <label className="font-bold text-[#1A1D1F] block">Mandatory Reason for Audit</label>
          <select
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
            className="w-full h-10 px-3 bg-[#F6F7F9] border border-[#EBECEF] rounded-2xl font-semibold focus:outline-none"
          >
            <option value="Customer Complaint (Quality/Taste)">Customer Complaint (Quality/Taste)</option>
            <option value="Cashier / Order Entry Mistake">Cashier / Order Entry Mistake</option>
            <option value="Long Kitchen Delay">Long Kitchen Delay</option>
            <option value="Customer Left / Walkout">Customer Left / Walkout</option>
            <option value="Wrong Bill Presented">Wrong Bill Presented</option>
            <option value="Duplicate Order Double Tap">Duplicate Order Double Tap</option>
          </select>

          <Input
            type="text"
            placeholder="Additional details / explanation (optional)..."
            value={reasonDetails}
            onChange={(e) => setReasonDetails(e.target.value)}
            className="h-10 rounded-2xl text-xs bg-[#F6F7F9]"
          />
        </div>

        {/* Manager PIN Authentication */}
        <div>
          <label className="text-xs font-bold text-[#1A1D1F] flex items-center gap-1.5 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-red-600" />
            <span>Manager Authorization PIN (4 Digits)</span>
          </label>
          <Input
            type="password"
            maxLength={4}
            placeholder="••••"
            value={managerPin}
            onChange={(e) => setManagerPin(e.target.value)}
            className="h-12 rounded-2xl text-center text-xl font-mono tracking-widest bg-[#F6F7F9] border-[#EBECEF]"
          />
          <p className="text-[10px] text-[#7C828D] text-center mt-1">
            Test PINs: Manager (<span className="font-mono font-bold text-[#119C49]">2222</span>) &bull; Owner (<span className="font-mono font-bold text-[#119C49]">1111</span>)
          </p>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-2xl border-[#EBECEF] text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5"
          >
            {isSubmitting ? 'Authorizing...' : `Authorize ${action === 'void' ? 'Void' : 'Refund'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
