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

  // Color-coded elapsed time thresholds
  // < 10 mins: Green
  // 10 - 20 mins: Amber
  // > 20 mins: Red pulsing
  let colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  if (minutes >= 20) {
    colorClasses = 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse font-extrabold';
  } else if (minutes >= 10) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${colorClasses} ${className}`}
      title={`Created ${minutes}m ${seconds}s ago`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{timeFormatted}</span>
    </div>
  );
}
