import React, { useState } from 'react';
import { Card } from '@/src/components/ui/card';
import {
  reportDefinitions,
  type ReportCategory,
  type ReportFormat,
  type ReportRow,
  generateUserRegistrationReport,
  generateUserStatusReport,
  generateProjectStatusReport,
  generateProjectCategoryReport,
  generateActivityReport,
  reportRowsToCsv,
  exportReportToPdf,
} from '@/src/lib/firestore/adminReports';
import { Download, Eye, Lock, FileText, Calendar, AlertTriangle, Layers, Users, FolderKanban, DollarSign, Activity } from 'lucide-react';

const categories: { label: string; value: ReportCategory; icon: React.ElementType }[] = [
  { label: 'Users', value: 'users', icon: Users },
  { label: 'Projects', value: 'projects', icon: FolderKanban },
  { label: 'Revenue', value: 'revenue', icon: DollarSign },
  { label: 'Activity', value: 'activity', icon: Activity },
];

const generators: Record<string, (from?: Date, to?: Date) => Promise<ReportRow[]>> = {
  'user-registration': generateUserRegistrationReport,
  'user-status': (_f, _t) => generateUserStatusReport(),
  'project-status': (_f, _t) => generateProjectStatusReport(),
  'project-category': (_f, _t) => generateProjectCategoryReport(),
  'activity-audit': generateActivityReport,
};

export function ReportsCenterPage() {
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('users');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [preview, setPreview] = useState<{ reportId: string; rows: ReportRow[] } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleReports = reportDefinitions.filter((r) => r.category === activeCategory);

  const runReport = async (reportId: string, mode: 'preview' | 'export') => {
    const gen = generators[reportId];
    if (!gen) return;
    setLoadingId(reportId);
    setError(null);
    try {
      const from = dateFrom ? new Date(dateFrom) : undefined;
      const to = dateTo ? new Date(dateTo) : undefined;
      const rows = await gen(from, to);

      if (mode === 'preview') {
        setPreview({ reportId, rows });
      } else {
        const reportDef = reportDefinitions.find((r) => r.id === reportId);
        const reportTitle = reportDef ? reportDef.title : 'SyncSphere Compliance Report';
        const dateStr = new Date().toISOString().slice(0, 10);

        if (format === 'pdf') {
          const doc = exportReportToPdf(reportTitle, activeCategory, rows);
          doc.save(`syncsphere-${reportId}-${dateStr}.pdf`);
        } else if (format === 'excel') {
          const csv = reportRowsToCsv(rows);
          // Prepend UTF-8 BOM so Excel opens with proper character encoding and columnar formatting
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `syncsphere-${reportId}-${dateStr}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const csv = reportRowsToCsv(rows);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `syncsphere-${reportId}-${dateStr}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report generation failed');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            <span>Reports Center</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Generate, preview, and export system compliance and activity reports
          </p>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-tertiary)] font-medium">Export Format:</span>
          <div className="flex gap-1 bg-black/40 border border-[var(--color-border)] rounded-lg p-1">
            {(['pdf', 'excel', 'csv'] as ReportFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-md transition-all cursor-pointer ${
                  format === f
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <Card className="p-3.5 border-red-500/30 bg-red-500/10 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </Card>
      )}

      {/* Main Layout: Category Sidebar (3 cols) + Reports Content (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Sidebar */}
        <Card className="lg:col-span-3 p-4 h-fit space-y-3">
          <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider px-2">
            Report Categories
          </h3>
          <div className="space-y-1">
            {categories.map((c) => {
              const Icon = c.icon;
              const isActive = activeCategory === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setActiveCategory(c.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 border border-cyan-500/30 text-white font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Reports & Filters Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* Date Filter Card */}
          <Card className="p-4 flex flex-wrap items-center gap-4 bg-black/20 border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] font-medium">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Date Window Filter:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] text-[var(--color-text-tertiary)] block uppercase mb-1">From</label>
                <input
                  type="date"
                  className="bg-black/50 border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-text-tertiary)] block uppercase mb-1">To</label>
                <input
                  type="date"
                  className="bg-black/50 border border-[var(--color-border)] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="mt-4 text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  Clear dates
                </button>
              )}
            </div>
          </Card>

          {/* Report Definitions List */}
          <div className="space-y-3">
            {visibleReports.map((r) => (
              <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm text-[var(--color-text-primary)] flex items-center gap-2">
                    <span>{r.title}</span>
                    {!r.available && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Unconfigured
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[var(--color-text-secondary)]">{r.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={!r.available || loadingId === r.id}
                    onClick={() => runReport(r.id, 'preview')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Preview</span>
                  </button>

                  <button
                    disabled={!r.available || loadingId === r.id}
                    onClick={() => runReport(r.id, 'export')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{loadingId === r.id ? 'Generating…' : `Export (${format.toUpperCase()})`}</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Report Preview Table */}
          {preview && (
            <Card className="p-5 space-y-4 border-cyan-500/30">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h3 className="font-semibold text-sm text-[var(--color-text-primary)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>
                    Report Preview — {reportDefinitions.find((r) => r.id === preview.reportId)?.title}
                  </span>
                </h3>
                <span className="text-xs text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {preview.rows.length} Rows Generated
                </span>
              </div>

              {preview.rows.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)]">
                  No records match the requested report query or date range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-black/30 text-[var(--color-text-secondary)] font-medium">
                        {Object.keys(preview.rows[0]).map((h) => (
                          <th key={h} className="p-2.5 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {preview.rows.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          {Object.values(row).map((val, vIdx) => (
                            <td key={vIdx} className="p-2.5 text-[var(--color-text-primary)] font-mono text-[11px]">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview.rows.length > 20 && (
                <p className="text-[11px] text-[var(--color-text-tertiary)] italic text-right pt-1">
                  Displaying first 20 of {preview.rows.length} total rows. Click Export for full dataset download.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
