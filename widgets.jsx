import React from 'react';
import { cn } from '@/lib/utils';

export function StatCard({ icon: Icon, label, value, sub, accent = 'blue' }) {
  const accents = {
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400',
    green: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400',
    red: 'from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400',
    violet: 'from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn('rounded-xl bg-gradient-to-br p-3', accents[accent])}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    unpaid: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    partially_paid: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    closed: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
    investigating: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    false_alarm: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
    active: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    failed: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  };
  const label = (status || '').replace(/_/g, ' ');
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', map[status] || 'bg-slate-100 text-slate-600')}>
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
      {Icon && <Icon className="mb-3 h-10 w-10 text-muted-foreground/50" />}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function Card({ className, children }) {
  return <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>{children}</div>;
}