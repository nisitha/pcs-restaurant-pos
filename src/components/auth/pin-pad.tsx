'use client';

import React, { useEffect } from 'react';
import { Delete, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinPadProps {
  pin: string;
  maxDigits?: number;
  onPinChange: (newPin: string) => void;
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function PinPad({
  pin,
  maxDigits = 4,
  onPinChange,
  onSubmit,
  isLoading = false,
  errorMessage = null,
}: PinPadProps) {
  const handleDigit = (digit: string) => {
    if (isLoading || pin.length >= maxDigits) return;
    const nextPin = pin + digit;
    onPinChange(nextPin);
    if (nextPin.length === maxDigits) {
      onSubmit(nextPin);
    }
  };

  const handleClear = () => {
    if (isLoading) return;
    onPinChange('');
  };

  const handleBackspace = () => {
    if (isLoading || pin.length === 0) return;
    onPinChange(pin.slice(0, -1));
  };

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto">
      {/* 4-Digit Dots Indicator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {Array.from({ length: maxDigits }).map((_, idx) => (
          <div
            key={idx}
            className={`w-5 h-5 rounded-full transition-all duration-200 border-2 ${
              idx < pin.length
                ? 'bg-amber-400 border-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                : 'bg-zinc-800/80 border-zinc-700'
            }`}
          />
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-center animate-shake">
          {errorMessage}
        </div>
      )}

      {/* Numeric Touch Grid */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {keys.map((key) => {
          if (key === 'C') {
            return (
              <Button
                key={key}
                type="button"
                variant="outline"
                disabled={isLoading || pin.length === 0}
                onClick={handleClear}
                className="h-16 text-sm font-semibold rounded-2xl bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
              >
                <X className="w-5 h-5" />
              </Button>
            );
          }

          if (key === 'DEL') {
            return (
              <Button
                key={key}
                type="button"
                variant="outline"
                disabled={isLoading || pin.length === 0}
                onClick={handleBackspace}
                className="h-16 text-sm font-semibold rounded-2xl bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition"
              >
                <Delete className="w-5 h-5" />
              </Button>
            );
          }

          return (
            <Button
              key={key}
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => handleDigit(key)}
              className="h-16 text-2xl font-bold rounded-2xl bg-zinc-900/90 border-zinc-800 text-white hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition shadow-sm"
            >
              {key}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
