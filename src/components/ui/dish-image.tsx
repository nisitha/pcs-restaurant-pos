'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from 'cn';

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
    text.includes('kottu') ||
    text.includes('hot')
  ) {
    return 'rice';
  }
  if (
    text.includes('burger') ||
    text.includes('grill') ||
    text.includes('bbq') ||
    text.includes('steak') ||
    text.includes('sandwich') ||
    text.includes('wings') ||
    text.includes('wrap')
  ) {
    return 'burger';
  }
  if (
    text.includes('coffee') ||
    text.includes('latte') ||
    text.includes('tea') ||
    text.includes('juice') ||
    text.includes('shake') ||
    text.includes('drink') ||
    text.includes('soda') ||
    text.includes('beverage') ||
    text.includes('iced')
  ) {
    return 'beverage';
  }
  if (
    text.includes('cake') ||
    text.includes('dessert') ||
    text.includes('sweet') ||
    text.includes('ice cream') ||
    text.includes('waffle') ||
    text.includes('pudding') ||
    text.includes('lava')
  ) {
    return 'dessert';
  }
  return 'general';
}

export function getStudio3DFoodFallback(category: DishCategoryType): string {
  switch (category) {
    case 'rice':
      return '/images/3d/food-curry-3d.jpg';
    case 'burger':
      return '/images/3d/food-burger-3d.jpg';
    case 'beverage':
      return '/images/3d/food-latte-3d.jpg';
    case 'dessert':
    case 'combo':
    default:
      return '/images/3d/food-feast-3d.svg';
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

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const detectedCategory = detectDishCategory(alt, category);
  const fallbackSrc = getStudio3DFoodFallback(detectedCategory);

  const aspectClass = {
    '4/3': 'aspect-[4/3]',
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio];

  const hasValidCustomUrl = Boolean(src && src.trim().length > 0 && !hasError);
  const resolvedSrc = hasValidCustomUrl ? src!.trim() : fallbackSrc;
  const isSvg = resolvedSrc.toLowerCase().endsWith('.svg');

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[#f4fbf7] select-none',
        aspectClass,
        className
      )}
    >
      {/* Soft mint shimmer skeleton while image is loading */}
      {isLoading && (
        <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-[#eaf5ee] via-[#cdeeb0]/35 to-[#eaf5ee]" />
      )}

      {isSvg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            if (hasValidCustomUrl) {
              setHasError(true);
            }
            setIsLoading(false);
          }}
          className={cn(
            'w-full h-full object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-105',
            isLoading ? 'opacity-0' : 'opacity-100',
            imageClassName
          )}
        />
      ) : (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            if (hasValidCustomUrl) {
              setHasError(true);
            } else {
              setIsLoading(false);
            }
          }}
          className={cn(
            'object-cover transition-transform duration-300 ease-out group-hover:scale-105',
            isLoading ? 'opacity-0 scale-98' : 'opacity-100 scale-100',
            imageClassName
          )}
        />
      )}
    </div>
  );
}
