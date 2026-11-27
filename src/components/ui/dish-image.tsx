'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from 'cn';
import {
  UtensilsCrossed,
  Flame,
  Coffee,
  Sparkles,
  Cake,
  Sandwich,
  Wine,
  Package,
} from 'lucide-react';

export type DishCategoryType =
  | 'rice'
  | 'burger'
  | 'beverage'
  | 'dessert'
  | 'combo'
  | 'general';

interface DishImageProps {
  src?: string | null;
  alt: string;
  category?: string | null;
  aspectRatio?: '4/3' | 'square' | 'video' | 'auto';
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}

export function detectDishCategory(name?: string, categoryName?: string | null): DishCategoryType {
  const text = `${name || ''} ${categoryName || ''}`.toLowerCase();
  if (text.includes('combo') || text.includes('deal') || text.includes('bundle')) return 'combo';
  if (
    text.includes('rice') ||
    text.includes('nasi') ||
    text.includes('biryani') ||
    text.includes('noodle') ||
    text.includes('pasta') ||
    text.includes('kottu')
  ) {
    return 'rice';
  }
  if (
    text.includes('burger') ||
    text.includes('grill') ||
    text.includes('bbq') ||
    text.includes('steak') ||
    text.includes('sandwich') ||
    text.includes('wings')
  ) {
    return 'burger';
  }
  if (
    text.includes('coffee') ||
    text.includes('tea') ||
    text.includes('juice') ||
    text.includes('shake') ||
    text.includes('drink') ||
    text.includes('soda') ||
    text.includes('beverage')
  ) {
    return 'beverage';
  }
  if (
    text.includes('cake') ||
    text.includes('dessert') ||
    text.includes('sweet') ||
    text.includes('ice cream') ||
    text.includes('waffle') ||
    text.includes('pudding')
  ) {
    return 'dessert';
  }
  return 'general';
}

function VectorDishFallback({ category }: { category: DishCategoryType }) {
  switch (category) {
    case 'rice':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#E8F8ED] to-[#D1F0DC]/70 p-4 text-[#119C49]">
          <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center mb-1.5 border border-[#119C49]/20">
            <UtensilsCrossed className="w-6 h-6 text-[#119C49]" />
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase text-[#119C49]/80">
            Hot Kitchen
          </span>
        </div>
      );
    case 'burger':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FEF3E2] to-[#FDE6C8] p-4 text-[#D97706]">
          <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center mb-1.5 border border-[#D97706]/20">
            <Flame className="w-6 h-6 text-[#D97706]" />
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase text-[#D97706]/80">
            Grill Station
          </span>
        </div>
      );
    case 'beverage':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#E6F4FE] to-[#D0EBFD] p-4 text-[#0284C7]">
          <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center mb-1.5 border border-[#0284C7]/20">
            <Coffee className="w-6 h-6 text-[#0284C7]" />
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase text-[#0284C7]/80">
            Beverage Bar
          </span>
        </div>
      );
    case 'dessert':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FCE7F3] to-[#FBCFE8] p-4 text-[#DB2777]">
          <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center mb-1.5 border border-[#DB2777]/20">
            <Cake className="w-6 h-6 text-[#DB2777]" />
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase text-[#DB2777]/80">
            Dessert Studio
          </span>
        </div>
      );
    case 'combo':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] p-4 text-[#7C3AED]">
          <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-xs flex items-center justify-center mb-1.5 border border-[#7C3AED]/20">
            <Sparkles className="w-6 h-6 text-[#7C3AED]" />
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase text-[#7C3AED]/80">
            Combo Special
          </span>
        </div>
      );
    default:
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F6F7F9] to-[#EBECEF] p-4 text-[#7C828D]">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-1.5 border border-[#EBECEF]">
            <UtensilsCrossed className="w-6 h-6 text-[#7C828D]" />
          </div>
          <span className="text-[10px] font-black tracking-wider uppercase text-[#7C828D]">
            Signature Dish
          </span>
        </div>
      );
  }
}

export function DishImage({
  src,
  alt,
  category,
  aspectRatio = '4/3',
  className,
  imageClassName,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: DishImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const detectedCategory = detectDishCategory(alt, category);

  const aspectClass = {
    '4/3': 'aspect-[4/3]',
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio];

  const hasValidUrl = src && src.trim().length > 0 && !hasError;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[#F6F7F9] select-none',
        aspectClass,
        className
      )}
    >
      {/* Soft mint/slate shimmer skeleton while image is loading */}
      {hasValidUrl && isLoading && (
        <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-[#F0F2F5] via-[#D1F0DC]/30 to-[#F0F2F5]" />
      )}

      {hasValidUrl ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          className={cn(
            'object-cover transition-transform duration-300 ease-out group-hover:scale-105',
            isLoading ? 'opacity-0 scale-98' : 'opacity-100 scale-100',
            imageClassName
          )}
        />
      ) : (
        <VectorDishFallback category={detectedCategory} />
      )}
    </div>
  );
}
