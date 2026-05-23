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
