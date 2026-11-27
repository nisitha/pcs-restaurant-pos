'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, QrCode, X, Sparkles, Check, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DiningTable } from '@/types/table.types';

interface QrTentCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: DiningTable[];
  selectedTable?: DiningTable | null;
}

export function QrTentCardsModal({ isOpen, onClose, tables, selectedTable }: QrTentCardsModalProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>('all');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setSelectedTableId(selectedTable.id);
    } else {
      setSelectedTableId('all');
    }
  }, [selectedTable, isOpen]);

  useEffect(() => {
    if (!isOpen || !origin) return;

    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      for (const table of tables) {
        const orderUrl = `${origin}/order/table/${table.id}`;
        try {
          const dataUrl = await QRCode.toDataURL(orderUrl, {
            width: 320,
            margin: 1,
            color: {
              dark: '#119C49',
              light: '#FFFFFF',
            },
          });
          urls[table.id] = dataUrl;
        } catch (err) {
          console.error('Failed to generate QR for table', table.table_number, err);
        }
      }
      setQrCodeUrls(urls);
    };

    generateQRs();
  }, [isOpen, tables, origin]);

  const tablesToPrint = selectedTableId === 'all'
    ? tables
    : tables.filter((t) => t.id === selectedTableId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#EBECEF]">
          <div>
            <DialogTitle className="text-2xl font-black text-[#1A1D1F] flex items-center gap-2">
              <QrCode className="w-6 h-6 text-[#119C49]" />
              <span>Table QR Tent Cards</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-[#7C828D] mt-1">
              Print QR tent cards for your dining tables so guests can scan and self-order directly.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#EBECEF] bg-[#F6F7F9] text-sm font-semibold text-[#1A1D1F] focus:outline-none focus:ring-2 focus:ring-[#119C49]"
            >
              <option value="all">All Tables ({tables.length})</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.table_number} ({t.section || 'Main'})
                </option>
              ))}
            </select>
            <Button
              onClick={handlePrint}
              className="h-10 px-4 rounded-xl bg-[#119C49] hover:bg-[#0E823D] text-white font-bold flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tent Cards</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Tent Cards Preview Grid */}
        <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
          {tablesToPrint.map((table) => {
            const qrUrl = qrCodeUrls[table.id];
            return (
              <div
                key={table.id}
                className="relative bg-white border-2 border-dashed border-[#D1F0DC] rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border-black print:page-break-inside-avoid"
              >
                {/* Brand Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1F0DC] text-[#119C49] text-xs font-bold uppercase tracking-wider mb-3">
                  <Utensils className="w-3.5 h-3.5" />
                  <span>PCS Restaurant</span>
                </div>

                <h3 className="text-3xl font-black text-[#1A1D1F] tracking-tight">
                  TABLE {table.table_number}
                </h3>
                <p className="text-xs text-[#7C828D] mt-0.5">
                  Section: {table.section || 'Main Dining Hall'} • Capacity: {table.capacity || table.seating_capacity || 4} Guests
                </p>

                {/* QR Container */}
                <div className="my-5 p-4 bg-[#F6F7F9] rounded-2xl border border-[#EBECEF] flex flex-col items-center justify-center">
                  {qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrUrl}
                      alt={`QR code for Table ${table.table_number}`}
                      className="w-48 h-48 rounded-xl shadow-inner bg-white p-2"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-sm text-[#7C828D]">
                      Generating QR...
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-[#F8FAF9] w-full rounded-2xl p-3 border border-[#EBECEF]/60">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#119C49] mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Scan with Your Phone Camera</span>
                  </div>
                  <ol className="text-[11px] text-[#7C828D] space-y-0.5">
                    <li>1. Point camera at the QR code</li>
                    <li>2. Browse our digital menu & customize</li>
                    <li>3. Order instantly to this table</li>
                  </ol>
                </div>

                <div className="mt-4 text-[10px] text-[#A0A4AB] font-mono">
                  {origin}/order/table/{table.id.substring(0, 8)}...
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
