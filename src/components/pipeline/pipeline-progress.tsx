'use client';

import { useState } from 'react';
import { PipelineStepNode } from './pipeline-step-node';
import { PipelineStepDetail } from './pipeline-step-detail';
import { DRAMA_PIPELINE_DEFINITIONS, DRAMA_FAN_OUT_STEPS } from '@/constants/step';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface StepInfo {
  id: string;
  stepCode: string;
  stepName: string;
  status: string;
  executionState?: string;
  required?: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  providerName?: string | null;
  providerTaskId?: string | null;
  outputSnapshot?: unknown;
}

interface StepItem {
  id: string;
  stepId: string;
  itemId: string;
  status: string;
  executionState?: string;
}

interface PipelineProgressProps {
  /** Step statuses from episode's 14 columns, or from job steps */
  steps: StepInfo[];
  /** Step items for fan-out steps */
  stepItems?: StepItem[];
  /** Job ID for review actions */
  jobId?: string;
}

export function PipelineProgress({ steps, stepItems = [], jobId }: PipelineProgressProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  // Map step codes to their info
  const stepsByCode = new Map(steps.map(s => [s.stepCode, s]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">管线进度</h3>
      </div>

      {/* Two rows of 7 steps each */}
      {[0, 1].map((row) => (
        <div key={row} className="flex items-center gap-1 flex-nowrap overflow-x-auto pb-1">
          {DRAMA_PIPELINE_DEFINITIONS.slice(row * 7, (row + 1) * 7).map((def, i) => {
            const stepInfo = stepsByCode.get(def.stepCode);
            const isFanOut = DRAMA_FAN_OUT_STEPS.includes(def.stepCode);
            const stepItemsForStep = isFanOut
              ? stepItems.filter(si => {
                  const step = steps.find(s => s.stepCode === def.stepCode);
                  return step && si.stepId === step.id;
                })
              : [];

            return (
              <div key={def.stepCode} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                <PipelineStepNode
                  stepCode={def.stepCode}
                  stepName={def.stepName}
                  stepOrder={def.stepOrder}
                  status={stepInfo?.status ?? 'pending'}
                  executionState={stepInfo?.executionState}
                  required={def.required}
                  isFanOut={isFanOut}
                  isActive={selectedStep === def.stepCode}
                  onClick={() => setSelectedStep(
                    selectedStep === def.stepCode ? null : def.stepCode
                  )}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* Step detail panel */}
      {selectedStep && (
        <PipelineStepDetail
          step={stepsByCode.get(selectedStep) ?? null}
          stepCode={selectedStep}
          stepItems={stepItems.filter(si => {
            const step = steps.find(s => s.stepCode === selectedStep);
            return step && si.stepId === step.id;
          })}
          jobId={jobId}
        />
      )}
    </div>
  );
}
