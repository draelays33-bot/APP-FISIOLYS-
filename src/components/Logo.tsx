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
  logoUrl = '/src/assets/images/fisiolys_logo_brand_1785780140781.jpg',
  variant = 'light',
}) => {
  const [imgError, setImgError] = useState(false);

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-2xl sm:text-3xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px] sm:text-xs',
    lg: 'text-xs sm:text-sm',
  };

  const renderVectorEmblem = () => (
    <div className={`${iconSizes[size]} relative shrink-0 rounded-2xl bg-gradient-to-br from-[#23372B] via-[#31523D] to-[#1a2920] p-1 shadow-xs border border-[#D0A73B]/50 flex items-center justify-center overflow-hidden`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 p-0.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5EED3" />
            <stop offset="35%" stopColor="#D0A73B" />
            <stop offset="70%" stopColor="#C49B28" />
            <stop offset="100%" stopColor="#7E611D" />
          </linearGradient>
          <linearGradient id="leafGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#82A350" />
            <stop offset="100%" stopColor="#41612A" />
          </linearGradient>
        </defs>

        {/* Monogram E & Fisiolys */}
        <path
          d="M 38 25 C 28 35, 25 55, 38 68 C 48 76, 62 70, 60 55 C 58 45, 48 48, 48 52 C 48 58, 56 62, 65 52 C 72 44, 65 30, 52 30 C 44 30, 40 36, 40 42 C 40 50, 52 56, 52 64 C 52 72, 42 76, 34 72"
          stroke="url(#goldGradLogo)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Leaf Vine Branches around bottom */}
        <path
          d="M 20 75 Q 32 82 45 80"
          stroke="url(#leafGradLogo)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 55 80 Q 70 82 82 72"
          stroke="url(#leafGradLogo)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M 25 74 C 23 70, 28 68, 29 73 Z" fill="url(#leafGradLogo)" />
        <path d="M 35 79 C 33 75, 38 73, 39 78 Z" fill="url(#leafGradLogo)" />
        <path d="M 65 78 C 67 73, 72 75, 69 80 Z" fill="url(#leafGradLogo)" />
        <path d="M 75 74 C 78 70, 82 73, 78 77 Z" fill="url(#leafGradLogo)" />
      </svg>
    </div>
  );

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {logoUrl && !imgError ? (
        <img
          src={getImageUrl(logoUrl)}
          alt="Fisiolys Fisioterapia e Pilates"
          onError={() => setImgError(true)}
          className={`${iconSizes[size]} object-contain rounded-xl shadow-xs border border-[#D0A73B]/40 bg-white p-0.5`}
        />
      ) : (
        renderVectorEmblem()
      )}

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center space-x-1.5">
            <span className={`font-serif font-extrabold tracking-tight ${titleSizes[size]} ${
              variant === 'dark' ? 'text-white' : 'text-[#23372B]'
            }`}>
              Fisiolys
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D0A73B] inline-block shadow-2xs" />
          </div>
          <p className={`font-sans tracking-widest uppercase font-bold ${subtitleSizes[size]} text-[#9E7F22]`}>
            Fisioterapia e Pilates
          </p>
        </div>
      )}
    </div>
  );
};

