import React from 'react';

interface VineProps {
  className?: string;
  variant?: 'corner-tr' | 'corner-tl' | 'corner-br' | 'corner-bl' | 'border-garland' | 'delicate-branch' | 'leaf-cluster';
  colorTheme?: 'gold' | 'green' | 'light' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Botanical Climbing Vine (Trepadeira) Decorative Elements
 * Tailored for Dra. Elays Marinho / Fisiolys Clínica Integrada identity
 */
export const BotanicalVineAccents: React.FC<VineProps> = ({
  className = '',
  variant = 'corner-tr',
  colorTheme = 'gold',
  size = 'md'
}) => {
  const getColors = () => {
    switch (colorTheme) {
      case 'gold':
        return {
          stem: '#B08A3E',
          leaf: '#DCC58F',
          darkLeaf: '#97732F',
          bud: '#EAD9B3',
          glow: 'rgba(220, 197, 143, 0.25)'
        };
      case 'green':
        return {
          stem: '#1B2E24',
          leaf: '#2E5A44',
          darkLeaf: '#16251D',
          bud: '#8EA593',
          glow: 'rgba(46, 90, 68, 0.2)'
        };
      case 'light':
        return {
          stem: '#FAF7F0',
          leaf: '#E4DCC8',
          darkLeaf: '#DCC58F',
          bud: '#FFFFFF',
          glow: 'rgba(250, 247, 240, 0.3)'
        };
      case 'subtle':
      default:
        return {
          stem: '#8C8270',
          leaf: '#A69B88',
          darkLeaf: '#736B5E',
          bud: '#DCC58F',
          glow: 'rgba(140, 130, 112, 0.15)'
        };
    }
  };

  const colors = getColors();

  if (variant === 'corner-tr') {
    return (
      <svg
        className={`pointer-events-none select-none ${className}`}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Main climbing vine stem */}
        <path
          d="M160 0C140 15 125 35 118 60C110 88 115 115 95 138C82 152 62 158 40 160"
          stroke={colors.stem}
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Secondary tendril branch */}
        <path
          d="M135 10C115 28 100 40 92 65C86 85 92 105 78 120C65 134 50 140 30 145"
          stroke={colors.stem}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2 3"
          opacity="0.6"
        />
        {/* Climbing curl tendril */}
        <path
          d="M118 60C108 55 100 58 98 68C96 78 105 82 108 78C110 74 106 70 102 72"
          stroke={colors.stem}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />
        <path
          d="M95 138C92 148 98 155 106 152C112 150 114 142 108 138"
          stroke={colors.stem}
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Leaves along the vine */}
        {/* Leaf 1 (Top) */}
        <path
          d="M152 14C140 10 132 18 135 28C145 28 154 22 152 14Z"
          fill={colors.leaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        {/* Leaf 2 */}
        <path
          d="M128 42C118 36 112 42 116 52C124 50 130 46 128 42Z"
          fill={colors.darkLeaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        {/* Leaf 3 (Main decorative) */}
        <path
          d="M120 72C132 78 140 72 136 60C126 62 118 68 120 72Z"
          fill={colors.leaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        {/* Leaf 4 */}
        <path
          d="M106 95C94 92 88 100 94 110C104 108 108 100 106 95Z"
          fill={colors.leaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        {/* Leaf 5 */}
        <path
          d="M84 124C72 122 68 130 75 139C84 136 88 128 84 124Z"
          fill={colors.darkLeaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        {/* Leaf 6 (Tip) */}
        <path
          d="M58 152C48 148 44 154 50 160C58 159 62 154 58 152Z"
          fill={colors.leaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />

        {/* Delicate golden buds / berries */}
        <circle cx="142" cy="34" r="2.5" fill={colors.bud} />
        <circle cx="112" cy="85" r="2.2" fill={colors.bud} />
        <circle cx="90" cy="116" r="2.5" fill={colors.bud} />
        <circle cx="68" cy="148" r="2" fill={colors.bud} />
      </svg>
    );
  }

  if (variant === 'corner-tl') {
    return (
      <svg
        className={`pointer-events-none select-none transform -scale-x-100 ${className}`}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M160 0C140 15 125 35 118 60C110 88 115 115 95 138C82 152 62 158 40 160"
          stroke={colors.stem}
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M135 10C115 28 100 40 92 65C86 85 92 105 78 120C65 134 50 140 30 145"
          stroke={colors.stem}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2 3"
          opacity="0.6"
        />
        <path
          d="M118 60C108 55 100 58 98 68C96 78 105 82 108 78C110 74 106 70 102 72"
          stroke={colors.stem}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />
        <path
          d="M152 14C140 10 132 18 135 28C145 28 154 22 152 14Z"
          fill={colors.leaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        <path
          d="M128 42C118 36 112 42 116 52C124 50 130 46 128 42Z"
          fill={colors.darkLeaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        <path
          d="M120 72C132 78 140 72 136 60C126 62 118 68 120 72Z"
          fill={colors.leaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        <path
          d="M106 95C94 92 88 100 94 110C104 108 108 100 106 95Z"
          fill={colors.leaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        <path
          d="M84 124C72 122 68 130 75 139C84 136 88 128 84 124Z"
          fill={colors.darkLeaf}
          stroke={colors.stem}
          strokeWidth="0.8"
        />
        <circle cx="142" cy="34" r="2.5" fill={colors.bud} />
        <circle cx="112" cy="85" r="2.2" fill={colors.bud} />
        <circle cx="90" cy="116" r="2.5" fill={colors.bud} />
      </svg>
    );
  }

  if (variant === 'border-garland') {
    return (
      <svg
        className={`pointer-events-none select-none w-full h-8 ${className}`}
        viewBox="0 0 600 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Flowing horizontal vine garland */}
        <path
          d="M0 16C60 6 120 26 180 16C240 6 300 26 360 16C420 6 480 26 540 16C570 11 600 16 600 16"
          stroke={colors.stem}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />
        {/* Leaf pairs */}
        {[60, 120, 180, 240, 300, 360, 420, 480, 540].map((x, i) => (
          <g key={i}>
            <path
              d={`M${x} ${i % 2 === 0 ? 11 : 21}C${x - 8} ${i % 2 === 0 ? 3 : 29} ${x + 8} ${i % 2 === 0 ? 3 : 29} ${x} ${i % 2 === 0 ? 11 : 21}Z`}
              fill={i % 2 === 0 ? colors.leaf : colors.darkLeaf}
              opacity="0.85"
            />
            <circle cx={x + 12} cy={i % 2 === 0 ? 14 : 18} r="1.8" fill={colors.bud} opacity="0.9" />
          </g>
        ))}
      </svg>
    );
  }

  // Delicate branch motif
  return (
    <svg
      className={`pointer-events-none select-none inline-block ${className}`}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 42C12 36 20 30 24 20C28 10 38 6 42 6"
        stroke={colors.stem}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 28C14 26 12 20 16 16C20 18 22 24 20 28Z"
        fill={colors.leaf}
      />
      <path
        d="M26 18C32 16 34 10 30 8C26 10 24 16 26 18Z"
        fill={colors.darkLeaf}
      />
      <path
        d="M36 10C42 8 44 4 40 2C36 4 34 8 36 10Z"
        fill={colors.leaf}
      />
      <circle cx="28" cy="22" r="2" fill={colors.bud} />
    </svg>
  );
};
