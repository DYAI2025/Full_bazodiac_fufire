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
