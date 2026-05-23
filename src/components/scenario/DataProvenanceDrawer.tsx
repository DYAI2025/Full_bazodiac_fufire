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
