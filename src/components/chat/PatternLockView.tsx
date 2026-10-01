import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PatternLockViewProps {
  onPatternComplete: (pattern: number[]) => void;
  error?: boolean;
  disabled?: boolean;
}

export const PatternLockView: React.FC<PatternLockViewProps> = ({
  onPatternComplete,
  error = false,
  disabled = false,
}) => {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentCoord, setCurrentCoord] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 3x3 Grid: 0 to 8
  const dots = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  // Coordinates of dots relative to container
  const getDotCenter = useCallback((index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    // 3 columns: 16.66%, 50%, 83.33%
    // In a 240px x 240px container:
    const size = 240;
    const padding = 32;
    const usable = size - padding * 2;
    const step = usable / 2;
    const x = padding + col * step;
    const y = padding + row * step;
    return { x, y };
  }, []);

  const getTouchedDot = useCallback((clientX: number, clientY: number): number | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;

    for (let i = 0; i < 9; i++) {
      const center = getDotCenter(i);
      const dist = Math.hypot(center.x - touchX, center.y - touchY);
      if (dist < 28) { // 28px hit radius
        return i;
      }
    }
    return null;
  }, [getDotCenter]);

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return;
    setIsDrawing(true);
    const dot = getTouchedDot(clientX, clientY);
    if (dot !== null) {
      setSelectedDots([dot]);
    } else {
      setSelectedDots([]);
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCurrentCoord({ x: clientX - rect.left, y: clientY - rect.top });
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDrawing || disabled) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCurrentCoord({ x: clientX - rect.left, y: clientY - rect.top });
    }
    const dot = getTouchedDot(clientX, clientY);
    if (dot !== null && !selectedDots.includes(dot)) {
      setSelectedDots((prev) => [...prev, dot]);
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentCoord(null);
    if (selectedDots.length > 0) {
      onPatternComplete(selectedDots);
    }
  };

  useEffect(() => {
    const onTouchEnd = () => {
      if (isDrawing) handleEnd();
    };
    window.addEventListener('mouseup', onTouchEnd);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mouseup', onTouchEnd);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDrawing, selectedDots, onPatternComplete]);

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length > 0) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      className="relative w-[240px] h-[240px] select-none touch-none mx-auto cursor-pointer"
      style={{ touchAction: 'none' }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {/* Draw lines between connected dots */}
        {selectedDots.map((dotIdx, i) => {
          if (i === 0) return null;
          const prevDot = selectedDots[i - 1];
          const start = getDotCenter(prevDot);
          const end = getDotCenter(dotIdx);
          return (
            <line
              key={`line-${i}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={error ? '#f43f5e' : '#6366f1'}
              strokeWidth="4"
              strokeLinecap="round"
              className="transition-colors duration-150"
            />
          );
        })}

        {/* Dynamic line to cursor/finger touch */}
        {isDrawing && selectedDots.length > 0 && currentCoord && (
          <line
            x1={getDotCenter(selectedDots[selectedDots.length - 1]).x}
            y1={getDotCenter(selectedDots[selectedDots.length - 1]).y}
            x2={currentCoord.x}
            y2={currentCoord.y}
            stroke={error ? '#f43f5e' : '#818cf8'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
        )}
      </svg>

      {/* Render 9 Nodes */}
      {dots.map((dotIdx) => {
        const center = getDotCenter(dotIdx);
        const isSelected = selectedDots.includes(dotIdx);
        return (
          <div
            key={dotIdx}
            style={{
              position: 'absolute',
              left: `${center.x}px`,
              top: `${center.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="flex items-center justify-center pointer-events-none"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 ${
                isSelected
                  ? error
                    ? 'bg-rose-500/20 ring-2 ring-rose-500 scale-110'
                    : 'bg-indigo-500/20 ring-2 ring-indigo-500 scale-110'
                  : 'bg-transparent'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isSelected
                    ? error
                      ? 'bg-rose-500 shadow-md shadow-rose-500/50 scale-125'
                      : 'bg-indigo-600 dark:bg-indigo-400 shadow-md shadow-indigo-500/50 scale-125'
                    : 'bg-slate-400 dark:bg-slate-600'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
