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
