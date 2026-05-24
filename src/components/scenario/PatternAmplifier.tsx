'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { mockBranches } from '@/mock/pattern-data';
import { createGrowthBranch, projectTo2D } from '@/lib/vector-space/calculations';
import { GrowthBranch } from '@/types/domain';

// Constants
const SVG_WIDTH = 600;
const SVG_HEIGHT = 400;
const ANIMATION_STEP = 0.05;
const ANIMATION_INTERVAL = 50;
const COLOR_SELECTED = '#3b82f6';
const COLOR_DEFAULT = '#64748b';
const RADIUS_SELECTED = 6;
const RADIUS_DEFAULT = 4;
const STROKE_WIDTH_SELECTED = 3;
const STROKE_WIDTH_DEFAULT = 2;

interface PatternAmplifierProps {
  onBranchSelect?: (branchId: string) => void;
  selectedBranchId?: string | null;
}

export function PatternAmplifier({ onBranchSelect, selectedBranchId }: PatternAmplifierProps) {
  const [growthBranches, setGrowthBranches] = useState<GrowthBranch[]>([]);
  const [animationProgress, setAnimationProgress] = useState<number>(0);

  useEffect(() => {
    // Initialize growth branches
    const branches = mockBranches.map(createGrowthBranch);
    setGrowthBranches(branches);
  }, []);

  useEffect(() => {
    // Animate branch growth
    if (animationProgress < 1) {
      const timer = setTimeout(() => {
        setAnimationProgress(prev => Math.min(prev + ANIMATION_STEP, 1));
      }, ANIMATION_INTERVAL);
      return () => clearTimeout(timer);
    }
  }, [animationProgress]);

  // Memoize projected positions to avoid recalculation on every render
  const projectedBranches = useMemo(() => {
    return growthBranches.map((gb) => ({
      branch: gb,
      start: projectTo2D(gb.startPosition, SVG_WIDTH, SVG_HEIGHT),
      end: projectTo2D(gb.endPosition, SVG_WIDTH, SVG_HEIGHT),
    }));
  }, [growthBranches]);

  // Memoize selection handler
  const handleBranchSelect = useCallback((branchId: string) => {
    onBranchSelect?.(branchId);
  }, [onBranchSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((branchId: string, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleBranchSelect(branchId);
    }
  }, [handleBranchSelect]);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Pattern Amplifier (2.5D)</h2>
      <svg 
        width={SVG_WIDTH} 
        height={SVG_HEIGHT} 
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="border rounded bg-muted"
        role="img"
        aria-label="Pattern Amplifier 2.5D visualization showing growth branches"
      >
        <title>Pattern Amplifier 2.5D Visualization</title>
        
        {/* Axis labels */}
        <text x={SVG_WIDTH / 2} y={20} textAnchor="middle" className="text-xs fill-muted-foreground">
          X: Activation/Agency
        </text>
        <text x={10} y={SVG_HEIGHT / 2} className="text-xs fill-muted-foreground">
          Y: Coherence/Tension
        </text>
        <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 10} textAnchor="middle" className="text-xs fill-muted-foreground">
          Z: Externalization/Internalization
        </text>

        {/* Draw branches */}
        {projectedBranches.map(({ branch, start, end }, index) => {
          const isSelected = selectedBranchId === branch.branchId;
          
          // Calculate animated end position
          const animatedEnd = {
            x: start.x + (end.x - start.x) * animationProgress,
            y: start.y + (end.y - start.y) * animationProgress,
          };

          return (
            <g key={branch.branchId}>
              {/* Branch line */}
              <line
                x1={start.x}
                y1={start.y}
                x2={animatedEnd.x}
                y2={animatedEnd.y}
                stroke={isSelected ? COLOR_SELECTED : COLOR_DEFAULT}
                strokeWidth={isSelected ? STROKE_WIDTH_SELECTED : STROKE_WIDTH_DEFAULT}
                onClick={() => handleBranchSelect(branch.branchId)}
                onKeyDown={(e) => handleKeyDown(branch.branchId, e)}
                tabIndex={0}
                role="button"
                aria-label={`Branch ${mockBranches[index].name}${isSelected ? ', selected' : ''}`}
                aria-pressed={isSelected}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Branch endpoint */}
              <circle
                cx={animatedEnd.x}
                cy={animatedEnd.y}
                r={isSelected ? RADIUS_SELECTED : RADIUS_DEFAULT}
                fill={isSelected ? COLOR_SELECTED : COLOR_DEFAULT}
                onClick={() => handleBranchSelect(branch.branchId)}
                onKeyDown={(e) => handleKeyDown(branch.branchId, e)}
                tabIndex={0}
                role="button"
                aria-label={`Branch endpoint ${mockBranches[index].name}${isSelected ? ', selected' : ''}`}
                aria-pressed={isSelected}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Branch label */}
              <text
                x={animatedEnd.x + 10}
                y={animatedEnd.y}
                className="text-xs"
                fill={isSelected ? COLOR_SELECTED : COLOR_DEFAULT}
              >
                {mockBranches[index].name}
              </text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}
