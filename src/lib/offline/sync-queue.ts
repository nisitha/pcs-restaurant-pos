'use client';

import { useState, useEffect, useCallback } from 'react';
import { OfflineQueuedOrder } from '@/types/phase4.types';

const DB_NAME = 'pcs_pos_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'order_queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'idempotency_key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineOrder(payload: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const idempotencyKey = payload.idempotency_key || `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    payload.idempotency_key = idempotencyKey;

    const queuedItem: OfflineQueuedOrder = {
      id: idempotencyKey,
      idempotency_key: idempotencyKey,
      payload,
      created_at: new Date().toISOString(),
      status: 'pending',
      retry_count: 0,
    };

    const req = store.put(queuedItem);
    req.onsuccess = () => {
      window.dispatchEvent(new Event('pcs_offline_queue_updated'));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineOrders(): Promise<OfflineQueuedOrder[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineOrder(idempotencyKey: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(idempotencyKey);

      req.onsuccess = () => {
        window.dispatchEvent(new Event('pcs_offline_queue_updated'));
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to remove offline order:', err);
  }
}

export async function syncQueuedOrders(): Promise<{ synced: number; failed: number }> {
  const items = await getOfflineOrders();
  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          await removeOfflineOrder(item.idempotency_key);
          synced++;
          continue;
        }
      }
      failed++;
    } catch {
      failed++;
    }
  }

  window.dispatchEvent(new Event('pcs_offline_queue_updated'));
  return { synced, failed };
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshCount = useCallback(async () => {
    const items = await getOfflineOrders();
    setPendingCount(items.length);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncQueuedOrders();
      await refreshCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshCount]);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdated = () => {
      refreshCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pcs_offline_queue_updated', handleQueueUpdated);

    // Periodic check / sync if online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        refreshCount().then(() => {
          if (pendingCount > 0 && !isSyncing) {
            triggerSync();
          }
        });
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pcs_offline_queue_updated', handleQueueUpdated);
      clearInterval(interval);
    };
  }, [refreshCount, triggerSync, pendingCount, isSyncing]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow: triggerSync,
  };
}
