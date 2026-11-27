'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ElapsedTimerProps {
  startTime: string; // ISO timestamp
  className?: string;
}

export function ElapsedTimer({ startTime, className = '' }: ElapsedTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, diff));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Color-coded high-contrast elapsed prep thresholds:
  // < 10m: Green
  // 10 - 20m: Amber
  // > 20m: Pulsing Red
  let colorClasses = 'bg-[#cdeeb0] text-[#072619] border-[#0f8a5f]/30 font-bold';
  if (minutes >= 20) {
    colorClasses = 'bg-rose-600 text-white border-rose-700 animate-pulse font-black shadow-sm shadow-rose-500/30';
  } else if (minutes >= 10) {
    colorClasses = 'bg-amber-400 text-[#072619] border-amber-500 font-extrabold shadow-xs';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${colorClasses} ${className}`}
      title={`Created ${minutes}m ${seconds}s ago`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{timeFormatted}</span>
    </div>
  );
}
