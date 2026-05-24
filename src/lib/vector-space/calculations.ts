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
