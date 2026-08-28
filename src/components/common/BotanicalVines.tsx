import React from 'react';

/**
 * Botanical Climbing Vines (Plantas Trepadeiras) for Fisiolys Clinic
 * Designed to frame the top-right corner and right margin gracefully
 * WITHOUT overlapping any headline, address, or button typography.
 */

export const HeroClimbingVines: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`pointer-events-none select-none overflow-hidden absolute top-0 right-0 z-0 opacity-80 transition-opacity duration-500 max-w-full ${className}`}
      aria-hidden="true"
    >
      <svg
        width="340"
        height="520"
        viewBox="0 0 340 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[200px] sm:w-[260px] md:w-[320px] lg:w-[340px] h-auto max-w-none transform translate-x-2 sm:translate-x-0 -translate-y-2"
      >
        <defs>
          <linearGradient id="vineStemGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B2E24" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#2A4836" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#B08A3E" stopOpacity="0.65" />
          </linearGradient>

          <linearGradient id="vineStemGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B08A3E" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#243F30" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1B2E24" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="leafGradForest" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#315540" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#1B2E24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#15241C" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="leafGradSage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C8D78" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#3C644E" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#243E30" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="leafGradOliveGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DCC58F" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#B08A3E" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#2F4C3B" stopOpacity="0.8" />
          </linearGradient>

          <filter id="vineShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#1B2E24" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* --- MAIN STEM 1 (Descending vertically along the right perimeter) --- */}
        <path
          d="M330,0 C300,40 270,30 250,80 C230,130 255,190 270,240 C285,295 295,350 280,410 C265,465 250,495 240,520"
          stroke="url(#vineStemGrad1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* --- SECONDARY BRANCH 2 (Upper right arch) --- */}
        <path
          d="M270,30 C220,20 185,45 150,55"
          stroke="url(#vineStemGrad2)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2 1"
          fill="none"
        />

        {/* --- SECONDARY BRANCH 3 (Mid right branch) --- */}
        <path
          d="M270,240 C300,260 330,270 340,310"
          stroke="url(#vineStemGrad1)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* --- DELICATE CURLING TENDRILS --- */}
        <path
          d="M150,55 C135,45 125,55 128,68 C130,78 142,75 140,65"
          stroke="#B08A3E"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M250,80 C240,60 225,58 220,70 C215,80 228,90 234,82"
          stroke="#2A4836"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />
        <path
          d="M280,410 C305,430 330,425 320,455 C312,470 295,462 302,448"
          stroke="#B08A3E"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* --- UPPER LEAVES (Stay near top border, away from text) --- */}
        {/* Leaf Top Corner */}
        <g transform="translate(150, 55) rotate(15)" filter="url(#vineShadow)">
          <path
            d="M0,0 C-10,-14 10,-28 24,-24 C32,-12 20,8 0,0 Z"
            fill="url(#leafGradSage)"
          />
          <path d="M0,0 C6,-12 15,-18 24,-24" stroke="#FAF7F0" strokeWidth="0.6" opacity="0.6" />
        </g>

        {/* Leaf 2 */}
        <g transform="translate(200, 35) rotate(-20)">
          <path
            d="M0,0 C-14,-18 12,-36 30,-30 C40,-16 26,10 0,0 Z"
            fill="url(#leafGradOliveGold)"
          />
          <path d="M0,0 C8,-15 18,-22 30,-30" stroke="#FAF7F0" strokeWidth="0.7" opacity="0.7" />
        </g>

        {/* Leaf 3 */}
        <g transform="translate(260, 25) rotate(35)" filter="url(#vineShadow)">
          <path
            d="M0,0 C-18,-24 16,-46 38,-38 C50,-20 32,12 0,0 Z"
            fill="url(#leafGradForest)"
          />
          <path d="M0,0 C12,-20 25,-28 38,-38" stroke="#DCC58F" strokeWidth="0.8" opacity="0.6" />
        </g>

        {/* Leaf 4 (Top Edge) */}
        <g transform="translate(310, 10) rotate(-10)">
          <path
            d="M0,0 C-14,-18 12,-34 26,-28 C36,-14 22,8 0,0 Z"
            fill="url(#leafGradSage)"
          />
        </g>

        {/* --- MID LEAVES (Cascading along the right margin) --- */}
        {/* Leaf 5 */}
        <g transform="translate(245, 120) rotate(-45)" filter="url(#vineShadow)">
          <path
            d="M0,0 C-16,-22 14,-42 36,-34 C48,-17 30,10 0,0 Z"
            fill="url(#leafGradForest)"
          />
          <path d="M0,0 C11,-18 24,-26 36,-34" stroke="#DCC58F" strokeWidth="0.8" opacity="0.6" />
        </g>

        {/* Leaf 6 (Gold accent) */}
        <g transform="translate(260, 175) rotate(40)">
          <path
            d="M0,0 C-12,-16 12,-30 26,-25 C34,-13 22,8 0,0 Z"
            fill="url(#leafGradOliveGold)"
          />
        </g>

        {/* Leaf 7 (Lush Monstera leaf along the right edge) */}
        <g transform="translate(270, 240) rotate(-15)" filter="url(#vineShadow)">
          <path
            d="M0,0 C-22,-28 20,-54 48,-44 C62,-22 40,14 0,0 Z"
            fill="url(#leafGradForest)"
          />
          <path d="M0,0 C15,-25 32,-34 48,-44" stroke="#DCC58F" strokeWidth="0.9" opacity="0.75" />
          <path d="M15,-13 C8,-20 3,-22 0,-18" stroke="#DCC58F" strokeWidth="0.6" opacity="0.5" />
          <path d="M24,-20 C32,-17 38,-10 37,-4" stroke="#DCC58F" strokeWidth="0.6" opacity="0.5" />
        </g>

        {/* Leaf 8 */}
        <g transform="translate(315, 270) rotate(50)">
          <path
            d="M0,0 C-14,-18 12,-34 28,-28 C38,-14 24,8 0,0 Z"
            fill="url(#leafGradSage)"
          />
        </g>

        {/* Leaf 9 */}
        <g transform="translate(290, 340) rotate(-35)" filter="url(#vineShadow)">
          <path
            d="M0,0 C-18,-24 16,-46 38,-38 C50,-20 32,12 0,0 Z"
            fill="url(#leafGradForest)"
          />
          <path d="M0,0 C12,-20 25,-28 38,-38" stroke="#DCC58F" strokeWidth="0.8" opacity="0.6" />
        </g>

        {/* Leaf 10 (Gold accent) */}
        <g transform="translate(285, 410) rotate(25)">
          <path
            d="M0,0 C-14,-18 12,-32 26,-26 C35,-13 22,8 0,0 Z"
            fill="url(#leafGradOliveGold)"
          />
        </g>

        {/* Leaf 11 */}
        <g transform="translate(265, 460) rotate(-40)" filter="url(#vineShadow)">
          <path
            d="M0,0 C-16,-20 14,-38 32,-30 C42,-15 28,10 0,0 Z"
            fill="url(#leafGradSage)"
          />
          <path d="M0,0 C10,-17 22,-24 32,-30" stroke="#FAF7F0" strokeWidth="0.7" opacity="0.6" />
        </g>

        {/* Leaf 12 (Trailing tip) */}
        <g transform="translate(240, 505) rotate(10)">
          <path
            d="M0,0 C-14,-18 12,-34 28,-28 C38,-14 24,8 0,0 Z"
            fill="url(#leafGradForest)"
          />
        </g>

        {/* Small delicate leaf buds */}
        <circle cx="170" cy="48" r="2.5" fill="#B08A3E" opacity="0.8" />
        <circle cx="255" cy="140" r="2.5" fill="#6C8D78" opacity="0.75" />
        <circle cx="320" cy="330" r="2.5" fill="#B08A3E" opacity="0.7" />
        <circle cx="260" cy="485" r="2.5" fill="#315540" opacity="0.8" />
      </svg>
    </div>
  );
};

/**
 * Subtle Botanical Accent near the logo header ("Minha logo")
 */
export const LogoBotanicalAccent: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none select-none inline-flex items-center ${className}`} aria-hidden="true">
      <svg width="42" height="34" viewBox="0 0 42 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2,30 C12,24 22,18 32,8 C36,4 40,2 40,2"
          stroke="#B08A3E"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Leaf 1 */}
        <g transform="translate(18, 20) rotate(-40)">
          <path
            d="M0,0 C-6,-8 6,-16 14,-12 C18,-6 12,3 0,0 Z"
            fill="#2D533C"
            opacity="0.85"
          />
        </g>
        {/* Leaf 2 */}
        <g transform="translate(30, 10) rotate(30)">
          <path
            d="M0,0 C-5,-7 5,-14 12,-10 C15,-5 10,2 0,0 Z"
            fill="#B08A3E"
            opacity="0.85"
          />
        </g>
        {/* Tendril loop */}
        <path
          d="M32,8 C36,5 40,7 39,12 C38,16 33,14 35,10"
          stroke="#2D533C"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    </div>
  );
};
