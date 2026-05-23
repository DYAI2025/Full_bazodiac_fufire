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
            <PatternAmplifier 
              onBranchSelect={setSelectedBranchId}
              selectedBranchId={selectedBranchId}
            />
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
