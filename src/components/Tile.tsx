import React from 'react';
import { TileData } from '../gameLogic';
import { ArrowUpDown } from 'lucide-react';

export const tileColors: Record<number, string> = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#eab308', // yellow
  4: '#22c55e', // green
  5: '#3b82f6', // blue
  6: '#ec4899', // pink
};

interface TileProps {
  tile: TileData;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isWinningTile?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onMouseEnter?: () => void;
  onFlip?: () => void;
  className?: string;
  size?: 'normal' | 'mini';
}

const PetalPattern = ({ num }: { num: number }) => {
  const color = tileColors[num] || '#6b7280';
  
  if (num === 1) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-1 drop-shadow-sm">
        <circle cx="50" cy="50" r="14" fill={color} opacity="0.9" />
      </svg>
    );
  }

  const petals = [];
  const angles = num === 2 ? [0, 180] :
                 num === 3 ? [0, 120, 240] :
                 num === 4 ? [45, 135, 225, 315] :
                 num === 5 ? [0, 72, 144, 216, 288] :
                 [0, 60, 120, 180, 240, 300];

  for (let i = 0; i < num; i++) {
    petals.push(
      <g key={i} transform={`rotate(${angles[i]} 50 50)`}>
        <path d="M50,50 C44,38 46,25 50,22 C54,25 56,38 50,50 Z" fill={color} opacity="0.9" />
      </g>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full p-1 drop-shadow-sm">
      {petals}
    </svg>
  );
};

export const Tile: React.FC<TileProps> = ({ tile, isFaceDown, isSelected, isWinningTile, onClick, onDoubleClick, onMouseEnter, onFlip, className = '', size = 'normal' }) => {
  const isMini = size === 'mini';
  
  if (isFaceDown) {
    return (
      <div 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={`${isMini ? 'w-6 h-12 border' : 'w-12 h-24 sm:w-14 sm:h-28 border-2'} bg-emerald-800 border-emerald-600 rounded shadow-md flex items-center justify-center cursor-pointer hover:-translate-y-1 transition-transform ${className}`}
      >
        <div className={`${isMini ? 'w-4 h-10' : 'w-8 h-20'} border border-emerald-500/30 rounded-sm opacity-50`} />
      </div>
    );
  }

  const highlightClass = isWinningTile ? 'ring-4 ring-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]' : '';
  const selectedClass = isSelected ? 'ring-4 ring-yellow-400 -translate-y-2' : 'hover:-translate-y-1';

  return (
    <div 
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      className={`relative group ${isMini ? 'w-6 h-12' : 'w-12 h-24 sm:w-14 sm:h-28'} bg-white rounded shadow-md flex flex-col cursor-pointer transition-all duration-200 ${isMini ? '' : selectedClass} ${highlightClass} ${className}`}
    >
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <PetalPattern num={tile.top} />
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden rotate-180">
        <PetalPattern num={tile.bottom} />
      </div>
      
      {tile.isStar && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-md pointer-events-none">
          <svg width={isMini ? "8" : "14"} height={isMini ? "8" : "14"} viewBox="0 0 100 100">
            <polygon points="50,5 63,27.5 89,27.5 76,50 89,72.5 63,72.5 50,95 37,72.5 11,72.5 24,50 11,27.5 37,27.5" fill={tileColors[tile.top]} stroke="#fff" strokeWidth="8" />
          </svg>
        </div>
      )}

      {onFlip && !isMini && (
        <div 
          onClick={(e) => { e.stopPropagation(); onFlip(); }}
          className="absolute left-1 top-1/2 -translate-y-1/2 bg-emerald-700/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-emerald-500 z-20"
        >
          <ArrowUpDown size={14} />
        </div>
      )}
    </div>
  );
};
