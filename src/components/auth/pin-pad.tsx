'use client';

import React, { useEffect } from 'react';
import { Delete, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

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
        {Array.from({ length: maxDigits }).map((_, idx) => {
          const isFilled = idx < pin.length;
          return (
            <motion.div
              key={idx}
              animate={{
                scale: isFilled ? 1.15 : 1,
                backgroundColor: isFilled ? '#119C49' : '#F4F5F7',
                borderColor: isFilled ? '#119C49' : '#EBECEF',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`w-5 h-5 rounded-full border-2 ${
                isFilled ? 'shadow-md shadow-[#119C49]/30' : ''
              }`}
            />
          );
        })}
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
              <motion.button
                key={key}
                type="button"
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.02 }}
                disabled={isLoading || pin.length === 0}
                onClick={handleClear}
                className="h-16 text-sm font-semibold rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#EBECEF] transition flex items-center justify-center disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </motion.button>
            );
          }

          if (key === 'DEL') {
            return (
              <motion.button
                key={key}
                type="button"
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.02 }}
                disabled={isLoading || pin.length === 0}
                onClick={handleBackspace}
                className="h-16 text-sm font-semibold rounded-2xl bg-[#F6F7F9] border border-[#EBECEF] text-[#7C828D] hover:text-[#1A1D1F] hover:bg-[#EBECEF] transition flex items-center justify-center disabled:opacity-50"
              >
                <Delete className="w-5 h-5" />
              </motion.button>
            );
          }

          return (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.02 }}
              disabled={isLoading}
              onClick={() => handleDigit(key)}
              className="h-16 text-xl font-bold font-mono rounded-2xl bg-white border border-[#EBECEF] text-[#1A1D1F] hover:bg-[#D1F0DC] hover:text-[#119C49] hover:border-[#BDE8CB] shadow-sm transition flex items-center justify-center disabled:opacity-50"
            >
              {key}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
