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
                ? 'bg-[#119C49] border-[#119C49] scale-110 shadow-md shadow-[#119C49]/30'
                : 'bg-[#F4F5F7] border-[#EBECEF]'
            }`}
          />
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl text-center animate-shake">
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
                className="h-16 text-sm font-semibold rounded-2xl bg-[#F6F7F9] border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#EBECEF] active:scale-95 transition"
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
                className="h-16 text-sm font-semibold rounded-2xl bg-[#F6F7F9] border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#EBECEF] active:scale-95 transition"
              >
                <Delete className="w-5 h-5" />
              </Button>
            );
          }

          return (
            <Button
              key={key}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigit(key)}
              className="h-16 text-xl font-bold font-mono rounded-2xl bg-white border border-[#EBECEF] text-[#1A1D1F] hover:bg-[#D1F0DC] hover:text-[#119C49] hover:border-[#BDE8CB] active:scale-95 shadow-sm transition"
            >
              {key}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
