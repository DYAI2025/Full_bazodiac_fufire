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
