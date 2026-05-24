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
