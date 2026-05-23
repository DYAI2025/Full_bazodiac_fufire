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
