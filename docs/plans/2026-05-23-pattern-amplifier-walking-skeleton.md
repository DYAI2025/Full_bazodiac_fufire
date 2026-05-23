# Pattern Amplifier Walking Skeleton Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a walking skeleton for the Pattern Amplifier feature with TypeScript domain types, mock data, vector-space logic, and UI components using SVG/2.5D visualization.

**Architecture:** Domain-driven types → Mock data → Vector-space logic → UI components → App integration. No 3D library yet (SVG/2.5D only). Mock mode allows app to run without env vars.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, SVG for 2.5D visualization

---

## Task 1: Create TypeScript Domain Types

**Files:**
- Create: `src/types/domain.ts`

**Step 1: Write the failing test**

```typescript
// No test needed for type definitions - TypeScript compilation will validate
```

**Step 2: Create domain types file**

```typescript
// src/types/domain.ts

export interface UserPatternState {
  id: string;
  userId: string;
  currentHypothesisId: string;
  confidence: number; // 0-1
  sourceWeights: SourceWeights;
  lastUpdated: Date;
}

export interface SourceWeights {
  natal: number;
  transit: number;
  quiz: number;
  agentMemory: number;
  hypotheses: number;
  skeptic: number;
}

export interface SevenHypothesis {
  id: string;
  name: string;
  description: string;
  epistemicStatus: 'active' | 'dormant' | 'contradicted';
  confidence: number; // 0-1
  coherenceDelta: number; // -1 to 1
  tensionDelta: number; // -1 to 1
}

export interface ScenarioBranch {
  id: string;
  hypothesisId: string;
  parentId: string | null;
  name: string;
  description: string;
  confidence: number; // 0-1
  sourceWeights: SourceWeights;
  coherenceDelta: number; // -1 to 1
  tensionDelta: number; // -1 to 1
  activationDelta: number; // -1 to 1
  externalizationDelta: number; // -1 to 1
  isSecondary: boolean;
  notToInfer: boolean;
  agentVotes: AgentVote[];
  growthPath: PatternForce[];
}

export interface AgentVote {
  agentId: string;
  confidence: number; // 0-1
  reasoning: string;
  timestamp: Date;
}

export interface PatternAxis3D {
  x: number; // Activation / Agency delta
  y: number; // Coherence / Tension delta
  z: number; // Externalization / Internalization delta
}

export interface PatternForce {
  axis: PatternAxis3D;
  magnitude: number; // 0-1
  direction: 'expand' | 'contract';
}

export interface GrowthBranch {
  branchId: string;
  startPosition: PatternAxis3D;
  endPosition: PatternAxis3D;
  forces: PatternForce[];
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat: add domain types for pattern amplifier"
```

---

## Task 2: Create Mock Data

**Files:**
- Create: `src/mock/pattern-data.ts`

**Step 1: Write the failing test**

```typescript
// No test needed for mock data - will be validated by UI rendering
```

**Step 2: Create mock data file**

```typescript
// src/mock/pattern-data.ts
import { UserPatternState, SevenHypothesis, ScenarioBranch, SourceWeights } from '@/types/domain';

export const mockSourceWeights: SourceWeights = {
  natal: 0.3,
  transit: 0.25,
  quiz: 0.2,
  agentMemory: 0.15,
  hypotheses: 0.05,
  skeptic: 0.05,
};

export const mockUserPatternState: UserPatternState = {
  id: 'user-state-1',
  userId: 'user-1',
  currentHypothesisId: 'hypo-1',
  confidence: 0.72,
  sourceWeights: mockSourceWeights,
  lastUpdated: new Date('2026-05-23T00:00:00Z'),
};

export const mockHypotheses: SevenHypothesis[] = [
  {
    id: 'hypo-1',
    name: 'Creative Expansion Pattern',
    description: 'Tendency toward creative expression and novel solutions',
    epistemicStatus: 'active',
    confidence: 0.85,
    coherenceDelta: 0.4,
    tensionDelta: -0.2,
  },
  {
    id: 'hypo-2',
    name: 'Structural Stability Pattern',
    description: 'Preference for established structures and reliable outcomes',
    epistemicStatus: 'active',
    confidence: 0.65,
    coherenceDelta: 0.6,
    tensionDelta: 0.1,
  },
  {
    id: 'hypo-3',
    name: 'Adaptive Flexibility Pattern',
    description: 'Capacity to adjust approach based on feedback',
    epistemicStatus: 'active',
    confidence: 0.78,
    coherenceDelta: 0.3,
    tensionDelta: -0.3,
  },
  {
    id: 'hypo-4',
    name: 'Analytical Depth Pattern',
    description: 'Tendency toward thorough analysis and detail orientation',
    epistemicStatus: 'dormant',
    confidence: 0.45,
    coherenceDelta: 0.2,
    tensionDelta: 0.4,
  },
  {
    id: 'hypo-5',
    name: 'Intuitive Insight Pattern',
    description: 'Reliance on instinct and rapid pattern recognition',
    epistemicStatus: 'active',
    confidence: 0.70,
    coherenceDelta: -0.1,
    tensionDelta: -0.4,
  },
  {
    id: 'hypo-6',
    name: 'Collaborative Synergy Pattern',
    description: 'Enhanced effectiveness in group settings',
    epistemicStatus: 'contradicted',
    confidence: 0.30,
    coherenceDelta: -0.3,
    tensionDelta: 0.5,
  },
  {
    id: 'hypo-7',
    name: 'Independent Autonomy Pattern',
    description: 'Preference for self-directed work and decision making',
    epistemicStatus: 'active',
    confidence: 0.82,
    coherenceDelta: 0.5,
    tensionDelta: -0.1,
  },
];

export const mockBranches: ScenarioBranch[] = [
  {
    id: 'branch-1',
    hypothesisId: 'hypo-1',
    parentId: null,
    name: 'Primary Creative Branch',
    description: 'Main branch for creative expansion pattern',
    confidence: 0.85,
    sourceWeights: mockSourceWeights,
    coherenceDelta: 0.4,
    tensionDelta: -0.2,
    activationDelta: 0.6,
    externalizationDelta: 0.3,
    isSecondary: false,
    notToInfer: false,
    agentVotes: [
      {
        agentId: 'agent-1',
        confidence: 0.9,
        reasoning: 'Strong pattern alignment',
        timestamp: new Date('2026-05-23T00:00:00Z'),
      },
    ],
    growthPath: [],
  },
  {
    id: 'branch-2',
    hypothesisId: 'hypo-2',
    parentId: null,
    name: 'Primary Structural Branch',
    description: 'Main branch for structural stability pattern',
    confidence: 0.65,
    sourceWeights: { ...mockSourceWeights, natal: 0.4, transit: 0.3 },
    coherenceDelta: 0.6,
    tensionDelta: 0.1,
    activationDelta: 0.2,
    externalizationDelta: -0.1,
    isSecondary: false,
    notToInfer: false,
    agentVotes: [],
    growthPath: [],
  },
  {
    id: 'branch-3',
    hypothesisId: 'hypo-3',
    parentId: null,
    name: 'Primary Adaptive Branch',
    description: 'Main branch for adaptive flexibility pattern',
    confidence: 0.78,
    sourceWeights: { ...mockSourceWeights, quiz: 0.35 },
    coherenceDelta: 0.3,
    tensionDelta: -0.3,
    activationDelta: 0.5,
    externalizationDelta: 0.2,
    isSecondary: false,
    notToInfer: false,
    agentVotes: [
      {
        agentId: 'agent-2',
        confidence: 0.75,
        reasoning: 'Moderate confidence based on quiz responses',
        timestamp: new Date('2026-05-23T00:00:00Z'),
      },
    ],
    growthPath: [],
  },
  {
    id: 'branch-4',
    hypothesisId: 'hypo-1',
    parentId: 'branch-1',
    name: 'Secondary Creative Variant',
    description: 'Alternative interpretation of creative pattern',
    confidence: 0.55,
    sourceWeights: { ...mockSourceWeights, agentMemory: 0.3 },
    coherenceDelta: 0.2,
    tensionDelta: 0.1,
    activationDelta: 0.3,
    externalizationDelta: 0.4,
    isSecondary: true,
    notToInfer: false,
    agentVotes: [],
    growthPath: [],
  },
  {
    id: 'branch-5',
    hypothesisId: 'hypo-7',
    parentId: null,
    name: 'Primary Autonomy Branch',
    description: 'Main branch for independent autonomy pattern',
    confidence: 0.82,
    sourceWeights: { ...mockSourceWeights, skeptic: 0.15 },
    coherenceDelta: 0.5,
    tensionDelta: -0.1,
    activationDelta: 0.7,
    externalizationDelta: -0.2,
    isSecondary: false,
    notToInfer: false,
    agentVotes: [
      {
        agentId: 'agent-1',
        confidence: 0.85,
        reasoning: 'High confidence from multiple sources',
        timestamp: new Date('2026-05-23T00:00:00Z'),
      },
    ],
    growthPath: [],
  },
  {
    id: 'branch-6',
    hypothesisId: 'hypo-7',
    parentId: 'branch-5',
    name: 'Secondary Autonomy Variant',
    description: 'Alternative autonomy interpretation',
    confidence: 0.40,
    sourceWeights: { ...mockSourceWeights, hypotheses: 0.2 },
    coherenceDelta: 0.1,
    tensionDelta: 0.3,
    activationDelta: 0.2,
    externalizationDelta: 0.1,
    isSecondary: true,
    notToInfer: true,
    agentVotes: [],
    growthPath: [],
  },
];
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/mock/pattern-data.ts
git commit -m "feat: add mock data for pattern amplifier"
```

---

## Task 3: Implement Vector-Space Logic

**Files:**
- Create: `src/lib/vector-space/calculations.ts`

**Step 1: Write the failing test**

```typescript
// No test file - will be validated by UI behavior
```

**Step 2: Create vector-space calculations**

```typescript
// src/lib/vector-space/calculations.ts
import { PatternAxis3D, PatternForce, GrowthBranch, ScenarioBranch } from '@/types/domain';

export function calculateBranchPosition(branch: ScenarioBranch): PatternAxis3D {
  // X axis: Activation / Agency delta
  // Y axis: Coherence / Tension delta  
  // Z axis: Externalization / Internalization delta
  return {
    x: branch.activationDelta,
    y: branch.coherenceDelta,
    z: branch.externalizationDelta,
  };
}

export function generateGrowthPath(branch: ScenarioBranch): PatternForce[] {
  const position = calculateBranchPosition(branch);
  const forces: PatternForce[] = [];
  
  // Create deterministic growth path based on confidence
  const steps = Math.floor(branch.confidence * 10) + 3;
  
  for (let i = 0; i < steps; i++) {
    const progress = (i + 1) / steps;
    forces.push({
      axis: {
        x: position.x * progress,
        y: position.y * progress,
        z: position.z * progress,
      },
      magnitude: branch.confidence * progress,
      direction: branch.confidence > 0.5 ? 'expand' : 'contract',
    });
  }
  
  return forces;
}

export function createGrowthBranch(branch: ScenarioBranch): GrowthBranch {
  const startPosition: PatternAxis3D = { x: 0, y: 0, z: 0 };
  const endPosition = calculateBranchPosition(branch);
  const forces = generateGrowthPath(branch);
  
  return {
    branchId: branch.id,
    startPosition,
    endPosition,
    forces,
  };
}

export function projectTo2D(position: PatternAxis3D, width: number, height: number): { x: number; y: number } {
  // Simple isometric-like projection for 2.5D effect
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = 100; // pixels per unit
  
  const x2D = centerX + (position.x - position.z) * scale * 0.866;
  const y2D = centerY + (position.x + position.z) * scale * 0.5 - position.y * scale;
  
  return { x: x2D, y: y2D };
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/vector-space/calculations.ts
git commit -m "feat: add vector-space calculations for 2.5D projection"
```

---

## Task 4: Create ScenarioDashboard Component

**Files:**
- Create: `src/components/scenario/ScenarioDashboard.tsx`

**Step 1: Write the failing test**

```typescript
// No test file - will be validated by rendering
```

**Step 2: Create dashboard component**

```typescript
// src/components/scenario/ScenarioDashboard.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockUserPatternState, mockHypotheses, mockBranches } from '@/mock/pattern-data';

export function ScenarioDashboard() {
  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pattern Amplifier</h1>
        <Badge variant="outline">Mock Mode</Badge>
      </div>
      
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Current Pattern State</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Confidence:</span>
            <span className="text-sm font-medium">{(mockUserPatternState.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Active Hypothesis:</span>
            <span className="text-sm font-medium">
              {mockHypotheses.find(h => h.id === mockUserPatternState.currentHypothesisId)?.name}
            </span>
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Scenario Branches</h2>
        <div className="space-y-2">
          {mockBranches.map(branch => (
            <div key={branch.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{branch.name}</div>
                <div className="text-sm text-muted-foreground">{branch.description}</div>
              </div>
              <div className="text-right">
                <Badge variant={branch.isSecondary ? 'secondary' : 'default'}>
                  {branch.isSecondary ? 'Secondary' : 'Primary'}
                </Badge>
                <div className="text-sm mt-1">{(branch.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/scenario/ScenarioDashboard.tsx
git commit -m "feat: add ScenarioDashboard component"
```

---

## Task 5: Create PatternAmplifier Component (SVG/2.5D)

**Files:**
- Create: `src/components/scenario/PatternAmplifier.tsx`

**Step 1: Write the failing test**

```typescript
// No test file - will be validated by rendering
```

**Step 2: Create PatternAmplifier with SVG visualization**

```typescript
// src/components/scenario/PatternAmplifier.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { mockBranches } from '@/mock/pattern-data';
import { createGrowthBranch, projectTo2D } from '@/lib/vector-space/calculations';
import { GrowthBranch } from '@/types/domain';

export function PatternAmplifier() {
  const [growthBranches, setGrowthBranches] = useState<GrowthBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    // Initialize growth branches
    const branches = mockBranches.map(createGrowthBranch);
    setGrowthBranches(branches);
  }, []);

  useEffect(() => {
    // Animate branch growth
    if (animationProgress < 1) {
      const timer = setTimeout(() => {
        setAnimationProgress(prev => Math.min(prev + 0.05, 1));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [animationProgress]);

  const width = 600;
  const height = 400;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Pattern Amplifier (2.5D)</h2>
      <svg width={width} height={height} className="border rounded bg-muted">
        {/* Axis labels */}
        <text x={width / 2} y={20} textAnchor="middle" className="text-xs fill-muted-foreground">
          X: Activation/Agency
        </text>
        <text x={10} y={height / 2} className="text-xs fill-muted-foreground">
          Y: Coherence/Tension
        </text>
        <text x={width / 2} y={height - 10} textAnchor="middle" className="text-xs fill-muted-foreground">
          Z: Externalization/Internalization
        </text>

        {/* Draw branches */}
        {growthBranches.map((gb, index) => {
          const start = projectTo2D(gb.startPosition, width, height);
          const end = projectTo2D(gb.endPosition, width, height);
          const isSelected = selectedBranchId === gb.branchId;
          
          // Calculate animated end position
          const animatedEnd = {
            x: start.x + (end.x - start.x) * animationProgress,
            y: start.y + (end.y - start.y) * animationProgress,
          };

          return (
            <g key={gb.branchId}>
              {/* Branch line */}
              <line
                x1={start.x}
                y1={start.y}
                x2={animatedEnd.x}
                y2={animatedEnd.y}
                stroke={isSelected ? '#3b82f6' : '#64748b'}
                strokeWidth={isSelected ? 3 : 2}
                onClick={() => setSelectedBranchId(gb.branchId)}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Branch endpoint */}
              <circle
                cx={animatedEnd.x}
                cy={animatedEnd.y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? '#3b82f6' : '#64748b'}
                onClick={() => setSelectedBranchId(gb.branchId)}
                style={{ cursor: 'pointer' }}
              />
              
              {/* Branch label */}
              <text
                x={animatedEnd.x + 10}
                y={animatedEnd.y}
                className="text-xs"
                fill={isSelected ? '#3b82f6' : '#64748b'}
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
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/scenario/PatternAmplifier.tsx
git commit -m "feat: add PatternAmplifier with SVG 2.5D visualization"
```

---

## Task 6: Create BranchDetailPanel Component

**Files:**
- Create: `src/components/scenario/BranchDetailPanel.tsx`

**Step 1: Write the failing test**

```typescript
// No test file - will be validated by rendering
```

**Step 2: Create branch detail panel**

```typescript
// src/components/scenario/BranchDetailPanel.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScenarioBranch } from '@/types/domain';

interface BranchDetailPanelProps {
  branch: ScenarioBranch | null;
}

export function BranchDetailPanel({ branch }: BranchDetailPanelProps) {
  if (!branch) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Select a branch to view details</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{branch.name}</h3>
        <p className="text-sm text-muted-foreground">{branch.description}</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Confidence</span>
          <span className="font-medium">{(branch.confidence * 100).toFixed(0)}%</span>
        </div>
        <Progress value={branch.confidence * 100} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Coherence Delta</span>
          <span className="font-medium">{branch.coherenceDelta.toFixed(2)}</span>
        </div>
        <Progress value={(branch.coherenceDelta + 1) * 50} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Tension Delta</span>
          <span className="font-medium">{branch.tensionDelta.toFixed(2)}</span>
        </div>
        <Progress value={(branch.tensionDelta + 1) * 50} />
      </div>

      <div className="flex gap-2">
        <Badge variant={branch.isSecondary ? 'secondary' : 'default'}>
          {branch.isSecondary ? 'Secondary' : 'Primary'}
        </Badge>
        {branch.notToInfer && (
          <Badge variant="destructive">Not to Infer</Badge>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Source Weights</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Natal</span>
            <span>{(branch.sourceWeights.natal * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Transit</span>
            <span>{(branch.sourceWeights.transit * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Quiz</span>
            <span>{(branch.sourceWeights.quiz * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Agent Memory</span>
            <span>{(branch.sourceWeights.agentMemory * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Hypotheses</span>
            <span>{(branch.sourceWeights.hypotheses * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Skeptic</span>
            <span>{(branch.sourceWeights.skeptic * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/scenario/BranchDetailPanel.tsx
git commit -m "feat: add BranchDetailPanel component"
```

---

## Task 7: Create Remaining UI Components

**Files:**
- Create: `src/components/scenario/ScenarioFan.tsx`
- Create: `src/components/scenario/PatternAmplifierControls.tsx`
- Create: `src/components/scenario/VectorAxisLegend.tsx`
- Create: `src/components/scenario/SourceContributionBars.tsx`
- Create: `src/components/scenario/DataProvenanceDrawer.tsx`
- Create: `src/components/scenario/EpistemicStatusStrip.tsx`

**Step 1: Create stub components**

```typescript
// src/components/scenario/ScenarioFan.tsx
'use client';

import { Card } from '@/components/ui/card';

export function ScenarioFan() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Scenario Fan</h2>
      <p className="text-sm text-muted-foreground">Fan visualization of hypotheses</p>
    </Card>
  );
}

// src/components/scenario/PatternAmplifierControls.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PatternAmplifierControls() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Controls</h2>
      <div className="space-y-2">
        <Button variant="outline" className="w-full">Reset View</Button>
        <Button variant="outline" className="w-full">Animate Growth</Button>
      </div>
    </Card>
  );
}

// src/components/scenario/VectorAxisLegend.tsx
'use client';

import { Card } from '@/components/ui/card';

export function VectorAxisLegend() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Axis Legend</h2>
      <div className="space-y-2 text-sm">
        <div><span className="font-medium">X:</span> Activation / Agency delta</div>
        <div><span className="font-medium">Y:</span> Coherence / Tension delta</div>
        <div><span className="font-medium">Z:</span> Externalization / Internalization delta</div>
      </div>
    </Card>
  );
}

// src/components/scenario/SourceContributionBars.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function SourceContributionBars() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Source Contributions</h2>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Natal</span>
            <span>30%</span>
          </div>
          <Progress value={30} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Transit</span>
            <span>25%</span>
          </div>
          <Progress value={25} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Quiz</span>
            <span>20%</span>
          </div>
          <Progress value={20} />
        </div>
      </div>
    </Card>
  );
}

// src/components/scenario/DataProvenanceDrawer.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DataProvenanceDrawer() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Data Provenance</h2>
      <Button variant="outline" className="w-full">View Sources</Button>
    </Card>
  );
}

// src/components/scenario/EpistemicStatusStrip.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function EpistemicStatusStrip() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Epistemic Status</h2>
      <div className="flex gap-2">
        <Badge>Active: 5</Badge>
        <Badge variant="secondary">Dormant: 1</Badge>
        <Badge variant="destructive">Contradicted: 1</Badge>
      </div>
    </Card>
  );
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/scenario/
git commit -m "feat: add remaining UI components"
```

---

## Task 8: Integrate Components into App Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Write the failing test**

```typescript
// No test file - will be validated by rendering
```

**Step 2: Replace page content with integrated dashboard**

```typescript
// src/app/page.tsx
'use client';

import { ScenarioDashboard } from '@/components/scenario/ScenarioDashboard';
import { PatternAmplifier } from '@/components/scenario/PatternAmplifier';
import { BranchDetailPanel } from '@/components/scenario/BranchDetailPanel';
import { ScenarioFan } from '@/components/scenario/ScenarioFan';
import { PatternAmplifierControls } from '@/components/scenario/PatternAmplifierControls';
import { VectorAxisLegend } from '@/components/scenario/VectorAxisLegend';
import { SourceContributionBars } from '@/components/scenario/SourceContributionBars';
import { DataProvenanceDrawer } from '@/components/scenario/DataProvenanceDrawer';
import { EpistemicStatusStrip } from '@/components/scenario/EpistemicStatusStrip';
import { useState } from 'react';
import { mockBranches } from '@/mock/pattern-data';

export default function Home() {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const selectedBranch = mockBranches.find(b => b.id === selectedBranchId) || null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <ScenarioDashboard />
            <ScenarioFan />
            <EpistemicStatusStrip />
          </div>

          {/* Center column */}
          <div className="space-y-6">
            <PatternAmplifier />
            <PatternAmplifierControls />
            <VectorAxisLegend />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <BranchDetailPanel branch={selectedBranch} />
            <SourceContributionBars />
            <DataProvenanceDrawer />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate dashboard components into app page"
```

---

## Task 9: Update PatternAmplifier to Handle Selection

**Files:**
- Modify: `src/components/scenario/PatternAmplifier.tsx`

**Step 1: Add selection prop**

```typescript
// Add props interface
interface PatternAmplifierProps {
  onBranchSelect?: (branchId: string) => void;
  selectedBranchId?: string | null;
}

// Update component signature
export function PatternAmplifier({ onBranchSelect, selectedBranchId }: PatternAmplifierProps) {
  // Remove local state for selectedBranchId
  // const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  
  // Update onClick handlers
  onClick={() => onBranchSelect?.(gb.branchId)}
```

**Step 2: Update page.tsx to pass props**

```typescript
// In page.tsx
<PatternAmplifier 
  onBranchSelect={setSelectedBranchId}
  selectedBranchId={selectedBranchId}
/>
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/scenario/PatternAmplifier.tsx src/app/page.tsx
git commit -m "feat: add branch selection to PatternAmplifier"
```

---

## Task 10: Verify App Runs Without Env Vars

**Files:**
- Test: Run dev server

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts successfully without requiring environment variables

**Step 2: Verify mock mode is visible**

Open http://localhost:3000 in browser
Expected: "Mock Mode" badge is visible on dashboard

**Step 3: Verify Pattern Amplifier animation**

Expected: Branches animate from center outward

**Step 4: Verify branch selection**

Click on a branch in Pattern Amplifier
Expected: BranchDetailPanel updates with branch information

**Step 5: Verify language rules**

Check all displayed text
Expected: No deterministic future language, no fate/destiny/guaranteed wording, uses tendency/pattern/branch/may amplify/confidence/uncertainty/coherence/tension

**Step 6: Commit**

```bash
git add .
git commit -m "test: verify walking skeleton acceptance criteria"
```

---

## Task 11: Create Empty Adapter and Safety Stubs

**Files:**
- Create: `src/lib/adapters/index.ts`
- Create: `src/lib/pattern-state/index.ts`
- Create: `src/lib/scenario/index.ts`
- Create: `src/lib/safety/index.ts`

**Step 1: Create stub files**

```typescript
// src/lib/adapters/index.ts
// Placeholder for data adapters

// src/lib/pattern-state/index.ts
// Placeholder for pattern state management

// src/lib/scenario/index.ts
// Placeholder for scenario logic

// src/lib/safety/index.ts
// Placeholder for safety validation
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/adapters/index.ts src/lib/pattern-state/index.ts src/lib/scenario/index.ts src/lib/safety/index.ts
git commit -m "feat: add stub files for future implementation"
```

---

## Task 12: Final Verification and Documentation

**Files:**
- Modify: `docs/plans/2026-05-23-pattern-amplifier-walking-skeleton.md`

**Step 1: Run final checks**

Run: `npm run dev`
Expected: Server starts, no errors

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 2: Update README with walking skeleton info**

```typescript
// Add to README.md
## Walking Skeleton

The Pattern Amplifier walking skeleton includes:
- TypeScript domain types
- Mock data for testing
- Vector-space logic with 2.5D SVG projection
- UI components for dashboard visualization
- Mock mode that runs without environment variables

Run `npm run dev` to start the development server.
```

**Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add walking skeleton documentation"
```

---

## Acceptance Criteria Verification

After completing all tasks:

1. ✅ npm run dev works
2. ✅ TypeScript compiles without errors
3. ✅ Dashboard renders mock scenario
4. ✅ Pattern Amplifier works in 2.5D SVG
5. ✅ No hardcoded secrets in code
6. ✅ Mock mode visible in UI
7. ✅ Branch animation works
8. ✅ Branch selection updates detail panels
9. ✅ Language rules followed (no deterministic future, fate, destiny, guaranteed)
10. ✅ All components use tendency/pattern/branch/may amplify/confidence/uncertainty/coherence/tension
