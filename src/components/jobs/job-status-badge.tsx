import { Badge } from '@/components/ui/badge';
import { JOB_STATUS_LABELS, JOB_STATUS_VARIANT, BIZ_STATUS_LABELS, BIZ_STATUS_VARIANT } from '@/lib/constants';
import type { VariantProps } from 'class-variance-authority';

interface JobStatusBadgeProps {
  status: string;
  className?: string;
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const label = JOB_STATUS_LABELS[status] ?? status;
  const variant = JOB_STATUS_VARIANT[status] ?? 'secondary';

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

interface BizStatusBadgeProps {
  status: string;
  className?: string;
}

export function BizStatusBadge({ status, className }: BizStatusBadgeProps) {
  const label = BIZ_STATUS_LABELS[status] ?? status;
  const variant = BIZ_STATUS_VARIANT[status] ?? 'secondary';

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
