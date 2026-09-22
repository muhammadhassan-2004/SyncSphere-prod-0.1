import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  requireTypedConfirmation?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  requireTypedConfirmation,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  if (!open) return null;

  const canConfirm = !requireTypedConfirmation || typed === requireTypedConfirmation;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="p-2 rounded-full bg-red-500/15 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg text-[var(--color-text-primary)]">{title}</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{description}</p>
          </div>
        </div>

        {requireTypedConfirmation && (
          <div className="space-y-1">
            <label className="text-xs text-[var(--color-text-tertiary)] font-medium">
              Type <span className="font-mono text-white select-all">{requireTypedConfirmation}</span> to confirm:
            </label>
            <input
              className="w-full px-3 py-2 bg-black/40 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-mono"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTypedConfirmation}
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-white bg-transparent border border-[var(--color-border)] hover:bg-white/5 transition-colors cursor-pointer"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              destructive
                ? 'bg-red-500/80 hover:bg-red-600 text-white border border-red-400/30'
                : 'bg-accent-gradient text-white hover:opacity-95'
            } ${(!canConfirm || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={onConfirm}
            disabled={loading || !canConfirm}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
