import { clsx } from 'clsx';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../lib/constants.js';

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  return (
    <span className={clsx('badge border border-white/5', cfg.bg, cfg.color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span className={clsx('badge border', cfg.bg, cfg.text, cfg.border)}>
      {cfg.label}
    </span>
  );
}
