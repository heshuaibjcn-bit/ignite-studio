import { cn } from '@/lib/utils';
import { STEP_STATUS_COLORS, STEP_STATUS_LABELS, EXECUTION_STATE_LABELS } from '@/lib/constants';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MinusCircle,
  AlertTriangle,
  PauseCircle,
} from 'lucide-react';

interface PipelineStepNodeProps {
  stepCode: string;
  stepName: string;
  stepOrder: number;
  status: string;
  executionState?: string;
  required?: boolean;
  isFanOut?: boolean;
  onClick?: () => void;
  isActive?: boolean;
}

export function PipelineStepNode({
  stepCode,
  stepName,
  stepOrder,
  status,
  executionState,
  required = true,
  isFanOut = false,
  onClick,
  isActive = false,
}: PipelineStepNodeProps) {
  const colorClass = STEP_STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground';

  function StatusIcon() {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'running':
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case 'queued':
      case 'pending':
        return <Clock className="h-3.5 w-3.5" />;
      case 'skipped':
      case 'cancelled':
        return <MinusCircle className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  }

  const displayStatus = executionState && executionState !== 'normal'
    ? EXECUTION_STATE_LABELS[executionState] ?? STEP_STATUS_LABELS[status]
    : STEP_STATUS_LABELS[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all min-w-[100px]',
        isActive ? 'ring-2 ring-primary border-primary' : 'border-border',
        onClick ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
      )}
    >
      {/* Step number + status icon */}
      <div className={cn('flex items-center justify-center w-7 h-7 rounded-full', colorClass)}>
        <StatusIcon />
      </div>

      {/* Step name */}
      <span className="text-xs font-medium text-center leading-tight">{stepName}</span>

      {/* Status text */}
      <span className="text-[10px] text-muted-foreground">{displayStatus}</span>

      {/* Tags */}
      <div className="flex gap-1">
        {!required && (
          <span className="text-[9px] px-1 py-0.5 bg-muted rounded text-muted-foreground">
            可选
          </span>
        )}
        {isFanOut && (
          <span className="text-[9px] px-1 py-0.5 bg-blue-50 text-blue-600 rounded">
            并行
          </span>
        )}
      </div>
    </button>
  );
}
