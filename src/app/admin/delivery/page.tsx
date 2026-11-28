'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  Plus,
  Search,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  Navigation,
  User,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBranchStore } from '@/stores/branch-store';
import { DeliveryRider } from '@/types/phase4.types';
import { Floating3DElement } from '@/components/ui/Motion3D';

export default function DeliveryDispatchPage() {
  const { activeBranchId } = useBranchStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'riders'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<DeliveryRider[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Rider Modal
  const [isRiderModalOpen, setIsRiderModalOpen] = useState<boolean>(false);
  const [riderName, setRiderName] = useState<string>('');
  const [riderPhone, setRiderPhone] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'car'>('bike');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');

  const fetchDeliveryData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersRes, ridersRes] = await Promise.all([
        fetch(`/api/delivery/orders?branchId=${activeBranchId}`),
        fetch(`/api/delivery/riders?branchId=${activeBranchId}`),
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.orders || []);
      }

      if (ridersRes.ok) {
        const rData = await ridersRes.json();
        setRiders(rData.riders || []);
      }
    } catch (err) {
      console.error('Failed to load delivery data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    fetchDeliveryData();
    const interval = setInterval(fetchDeliveryData, 15000);
    return () => clearInterval(interval);
  }, [fetchDeliveryData]);

  // Assign Rider and/or update delivery status
  const handleUpdateOrderStatus = async (
    orderId: string,
    riderId: string | null,
    deliveryStatus: string
  ) => {
    try {
      const res = await fetch('/api/delivery/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          riderId: riderId || undefined,
          deliveryStatus,
        }),
      });

      if (res.ok) {
        fetchDeliveryData();
      }
    } catch (err) {
      console.error('Failed to update delivery order:', err);
    }
  };

  // Create Rider
  const handleCreateRider = async () => {
    if (!riderName.trim() || !riderPhone.trim()) return;

    try {
      const res = await fetch('/api/delivery/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: activeBranchId,
          name: riderName.trim(),
          phone: riderPhone.trim(),
          vehicle_type: vehicleType,
          vehicle_plate: vehiclePlate.trim() || null,
        }),
      });

      if (res.ok) {
        setIsRiderModalOpen(false);
        setRiderName('');
        setRiderPhone('');
        setVehiclePlate('');
        fetchDeliveryData();
      }
    } catch (err) {
      console.error('Failed to create rider:', err);
    }
  };

  const availableRiders = riders.filter((r) => r.status === 'available');

  const handleNotifyDeliveryWhatsApp = (order: any) => {
    const rawPhone = (order.customer_phone || order.customer?.phone || '+94787676576').replace(/[^0-9]/g, '');
    const formattedPhone = rawPhone.startsWith('0') && rawPhone.length === 10 ? `94${rawPhone.slice(1)}` : rawPhone;
    const customerLabel = order.customer_name || order.customer?.name || 'Valued Guest';
    const assignedRider = riders.find((r) => r.id === order.delivery_rider_id);
    const status = order.delivery_status || 'preparing';

    const statusLine =
      status === 'dispatched'
        ? `is OUT FOR DELIVERY${assignedRider ? ` with our rider ${assignedRider.name} (${assignedRider.phone})` : ''}!`
        : status === 'ready_for_pickup'
        ? 'is READY FOR PICKUP / DISPATCH from our outlet!'
        : status === 'delivered'
        ? 'has been DELIVERED. Enjoy your meal!'
        : 'is currently being prepared in our kitchen.';

    const text = encodeURIComponent(
      `Hello ${customerLabel}, your PCS Bill order #${order.order_number} (Rs. ${Number(order.total_amount).toLocaleString()}) ${statusLine}\n\npcsbill.com • Hotline: +94 78 76 76 576`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Floating3DElement amplitude={4} rotate={2} duration={5.2}>
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-[#E5ECE8] shadow-md p-1.5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/3d/icon-delivery-3d.svg" alt="Delivery 3D" className="w-full h-full object-contain" />
            </div>
          </Floating3DElement>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#072619] flex items-center gap-2">
              <span>Delivery &amp; Rider Dispatch</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#4f675a] mt-0.5">
              Dispatch online and phone delivery orders to fleet riders with live WhatsApp status alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchDeliveryData}
            className="h-11 px-4 rounded-2xl border-[#EBECEF] text-xs font-bold text-[#1A1D1F] hover:bg-[#F6F7F9]"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setIsRiderModalOpen(true)}
            className="h-11 px-5 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-black shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Delivery Rider</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EBECEF] pb-3">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'orders'
              ? 'bg-[#119C49] text-white shadow-xs'
              : 'bg-white text-[#7C828D] border border-[#EBECEF]'
          }`}
        >
          Active Deliveries ({orders.filter((o) => o.delivery_status !== 'delivered').length})
        </button>
        <button
          onClick={() => setActiveTab('riders')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'riders'
              ? 'bg-[#119C49] text-white shadow-xs'
              : 'bg-white text-[#7C828D] border border-[#EBECEF]'
          }`}
        >
          Rider Fleet ({riders.length} Riders • {availableRiders.length} Available)
        </button>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => {
            const status = order.delivery_status || 'preparing';
            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBECEF]">
                    <div>
                      <h4 className="text-base font-black text-[#1A1D1F]">
                        {order.order_number}
                      </h4>
                      <p className="text-[11px] text-[#7C828D]">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        status === 'delivered'
                          ? 'bg-[#D1F0DC] text-[#119C49]'
                          : status === 'dispatched'
                          ? 'bg-[#E0F2FE] text-[#0284C7]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="py-3 space-y-1.5 text-xs">
                    <p className="font-extrabold text-[#1A1D1F] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#119C49]" />
                      <span>{order.customer_name || order.customer?.name || 'Customer'}</span>
                    </p>
                    <p className="text-[#7C828D] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#7C828D]" />
                      <span>{order.customer_phone || order.customer?.phone || 'N/A'}</span>
                    </p>
                    <p className="text-[#7C828D] flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#7C828D] mt-0.5 shrink-0" />
                      <span className="line-clamp-2">
                        {order.delivery_address || order.customer?.delivery_address || 'Delivery Address'}
                      </span>
                    </p>
                  </div>

                  {/* Items Summary */}
                  <div className="py-2.5 bg-[#F6F7F9] rounded-2xl px-3 text-xs mb-3">
                    <p className="text-[11px] font-bold text-[#7C828D] mb-1">
                      Order Total: <span className="text-[#1A1D1F] font-black">Rs. {Number(order.total_amount).toLocaleString()}</span>
                    </p>
                    <p className="text-[11px] text-[#7C828D] line-clamp-1">
                      {(order.items || []).map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ')}
                    </p>
                  </div>

                  {/* Assigned Rider */}
                  <div className="text-xs mb-3">
                    <label className="text-[11px] font-bold text-[#7C828D] block mb-1">
                      Assigned Rider
                    </label>
                    <select
                      value={order.delivery_rider_id || ''}
                      onChange={(e) =>
                        handleUpdateOrderStatus(order.id, e.target.value || null, status)
                      }
                      className="w-full h-9 px-3 rounded-xl border border-[#EBECEF] bg-[#F8FAF9] text-xs font-semibold text-[#1A1D1F] focus:ring-2 focus:ring-[#119C49]"
                    >
                      <option value="">Select Delivery Rider...</option>
                      {riders.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.vehicle_plate || r.vehicle_type}) - {r.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[#EBECEF] flex items-center gap-2">
                  {status === 'preparing' && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(order.id, order.delivery_rider_id, 'ready_for_pickup')}
                      className="flex-1 h-9 rounded-xl bg-[#F6F7F9] hover:bg-[#EBECEF] text-[#1A1D1F] text-xs font-bold"
                    >
                      Ready for Pickup
                    </Button>
                  )}

                  {['preparing', 'ready_for_pickup'].includes(status) && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(order.id, order.delivery_rider_id, 'dispatched')}
                      disabled={!order.delivery_rider_id}
                      className="flex-1 h-9 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-black flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </Button>
                  )}

                  {status === 'dispatched' && (
                    <Button
                      onClick={() => handleUpdateOrderStatus(order.id, order.delivery_rider_id, 'delivered')}
                      className="w-full h-9 rounded-xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-black flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Delivered</span>
                    </Button>
                  )}

                  {status === 'delivered' && (
                    <div className="flex-1 text-center py-1 text-xs font-bold text-[#0f8a5f] flex items-center justify-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleNotifyDeliveryWhatsApp(order)}
                    className="h-9 px-3 rounded-xl border-[#0f8a5f]/30 bg-[#cdeeb0]/40 hover:bg-[#cdeeb0] text-[#072619] text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    title="Notify Customer via WhatsApp"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/3d/icon-whatsapp-3d.svg" alt="WhatsApp" className="w-4 h-4 object-contain" />
                    <span>WhatsApp</span>
                  </Button>
                </div>
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-[#EBECEF]">
              <Bike className="w-10 h-10 text-[#7C828D] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-[#1A1D1F]">No active delivery orders</p>
              <p className="text-xs text-[#7C828D]">New online and phone orders will appear here automatically.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RIDERS */}
      {activeTab === 'riders' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {riders.map((rider) => (
            <div
              key={rider.id}
              className="bg-white rounded-3xl p-5 border border-[#EBECEF] shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                    rider.status === 'available'
                      ? 'bg-[#D1F0DC] text-[#119C49]'
                      : 'bg-[#FEF3C7] text-[#D97706]'
                  }`}
                >
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#1A1D1F]">{rider.name}</h4>
                  <p className="text-xs text-[#7C828D]">{rider.phone}</p>
                  <p className="text-[11px] font-mono text-[#A0A4AB] mt-0.5">
                    {rider.vehicle_type.toUpperCase()} • {rider.vehicle_plate || 'No Plate'}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  rider.status === 'available'
                    ? 'bg-[#D1F0DC] text-[#119C49]'
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}
              >
                {rider.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Rider Modal */}
      <Dialog open={isRiderModalOpen} onOpenChange={setIsRiderModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-white border-[#EBECEF] p-6 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-[#EBECEF]">
            <DialogTitle className="text-xl font-black text-[#1A1D1F] flex items-center gap-2">
              <Bike className="w-5 h-5 text-[#119C49]" />
              <span>Add Delivery Rider</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Rider Name *</label>
              <input
                type="text"
                placeholder="e.g. Kamal Perera"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Phone Number *</label>
              <input
                type="tel"
                placeholder="077 123 4567"
                value={riderPhone}
                onChange={(e) => setRiderPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e: any) => setVehicleType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              >
                <option value="bike">Motorcycle / Bike</option>
                <option value="scooter">Scooter</option>
                <option value="car">Car / Van</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-[#1A1D1F] block mb-1">Vehicle License Plate</label>
              <input
                type="text"
                placeholder="e.g. WP BDF-1234"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#EBECEF] text-xs font-medium focus:ring-2 focus:ring-[#119C49]"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateRider}
            disabled={!riderName.trim() || !riderPhone.trim()}
            className="w-full h-11 rounded-2xl bg-[#119C49] hover:bg-[#0E823D] text-white text-xs font-black mt-2"
          >
            Save Delivery Rider
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
