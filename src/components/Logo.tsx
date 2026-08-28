import React, { useState } from 'react';
import { getImageUrl } from '../utils/imageUtils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  logoUrl?: string;
  variant?: 'light' | 'dark' | 'gold';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  variant = 'light',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8 text-base',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-2xl',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-2xl sm:text-3xl',
  };

  const subtitleSizes = {
    sm: 'text-[8px]',
    md: 'text-[9px] sm:text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Circular Monogram Badge with serif "F" and botanical vine accent */}
      <div className="relative shrink-0">
        <div
          className={`${iconSizes[size]} shrink-0 rounded-full border border-[#B08A3E]/60 bg-[#FAF7F0] flex items-center justify-center font-serif italic font-normal text-[#1B2E24] shadow-2xs relative z-10`}
        >
          <span>F</span>
        </div>
        {/* Subtle organic botanical vine accent */}
        <svg
          className="absolute -top-1.5 -left-1.5 w-6 h-6 pointer-events-none z-20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 18C4.5 12 9 6 16 3"
            stroke="#B08A3E"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M8 10C6 7 8 4 11 5C12 7 11 10 8 10Z"
            fill="#2D533C"
            opacity="0.9"
          />
          <path
            d="M13 6C12 3 14 1 17 2C18 4 16 7 13 6Z"
            fill="#B08A3E"
            opacity="0.85"
          />
        </svg>
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-serif font-bold tracking-tight ${titleSizes[size]} ${
                variant === 'dark' ? 'text-[#FAF7F0]' : 'text-[#1B2E24]'
              }`}
            >
              Fisiolys
            </span>
          </div>
          <p
            className={`font-sans tracking-[0.14em] uppercase font-medium ${subtitleSizes[size]} ${
              variant === 'dark' ? 'text-[#DCC58F]' : 'text-[#7A7569]'
            }`}
          >
            FISIOTERAPIA & PILATES · ALTAMIRA
          </p>
        </div>
      )}
    </div>
  );
};

