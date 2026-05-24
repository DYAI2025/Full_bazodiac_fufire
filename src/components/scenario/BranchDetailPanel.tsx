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
