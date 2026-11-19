import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { jsPDF } from 'jspdf';

export type ReportCategory = 'users' | 'projects' | 'revenue' | 'activity';
export type ReportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportDefinition {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  available: boolean;
  /** Whether the Date Window Filter applies to this report */
  dateFilterable?: boolean;
}

export const reportDefinitions: ReportDefinition[] = [
  {
    id: 'user-registration',
    category: 'users',
    title: 'User Registration Report',
    description: 'New user signups over time, broken down by role.',
    available: true,
    dateFilterable: true,
  },
  {
    id: 'user-status',
    category: 'users',
    title: 'User Status Report',
    description: 'Current breakdown of active, suspended, and disabled accounts.',
    available: true,
    dateFilterable: false,
  },
  {
    id: 'project-status',
    category: 'projects',
    title: 'Project Status Report',
    description: 'All platform projects grouped by current status.',
    available: true,
    dateFilterable: false,
  },
  {
    id: 'project-category',
    category: 'projects',
    title: 'Project Category Report',
    description: 'Project volume broken down by category.',
    available: true,
    dateFilterable: false,
  },
  {
    id: 'revenue-summary',
    category: 'revenue',
    title: 'Revenue Summary Report',
    description: 'Gross invoice volume, platform fees (5%), and net payouts across all transactions.',
    available: true,
    dateFilterable: true,
  },
  {
    id: 'activity-audit',
    category: 'activity',
    title: 'Admin Activity Report',
    description: 'Audit log export for a selected date range.',
    available: true,
    dateFilterable: true,
  },
];

export interface ReportRow {
  [key: string]: string | number;
}

function parseReportDate(raw: unknown): number {
  if (!raw) return 0;
  if (typeof (raw as { toDate?: () => Date })?.toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof (raw as { toMillis?: () => number })?.toMillis === 'function') {
    return (raw as { toMillis: () => number }).toMillis();
  }
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Inclusive local-day bounds for <input type="date"> values.
 * Avoids UTC midnight clipping that drops same-day records.
 */
export function reportRangeBounds(from?: Date, to?: Date): { fromMs: number; toMs: number } {
  const fromMs = from
    ? new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).getTime()
    : 0;
  const toMs = to
    ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime()
    : Number.POSITIVE_INFINITY;
  return { fromMs, toMs };
}

/** Parse YYYY-MM-DD from date input into a local Date (not UTC). */
export function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export async function generateUserRegistrationReport(from?: Date, to?: Date): Promise<ReportRow[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const { fromMs, toMs } = reportRangeBounds(from, to);

    const rows = snap.docs
      .map((d) => {
        const data = d.data();
        const createdMs = parseReportDate(data.createdAt);
        return {
          _createdMs: createdMs,
          'User ID': d.id,
          Name: data.displayName ?? data.fullName ?? '—',
          Email: data.email ?? '—',
          Role: data.role ?? '—',
          Registered: createdMs ? new Date(createdMs).toLocaleDateString() : '—',
        };
      })
      .filter((r) => r._createdMs > 0 && r._createdMs >= fromMs && r._createdMs <= toMs);

    rows.sort((a, b) => b._createdMs - a._createdMs);
    return rows.map(({ _createdMs, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to generate user registration report:', err);
    return [];
  }
}

export async function generateUserStatusReport(): Promise<ReportRow[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const counts = { active: 0, suspended: 0, disabled: 0 };
    snap.forEach((d) => {
      const status = (d.data().status ?? 'active') as keyof typeof counts;
      if (status in counts) {
        counts[status]++;
      } else {
        counts.active++;
      }
    });
    return [
      { Status: 'Active', Count: counts.active },
      { Status: 'Suspended', Count: counts.suspended },
      { Status: 'Disabled', Count: counts.disabled },
    ];
  } catch (err) {
    console.error('Failed to generate user status report:', err);
    return [];
  }
}

export async function generateProjectStatusReport(): Promise<ReportRow[]> {
  try {
    const snap = await getDocs(collection(db, 'projects'));
    const counts = new Map<string, number>();
    snap.forEach((d) => {
      const status = d.data().status ?? 'active';
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([Status, Count]) => ({ Status, Count }));
  } catch (err) {
    console.error('Failed to generate project status report:', err);
    return [];
  }
}

export async function generateProjectCategoryReport(): Promise<ReportRow[]> {
  try {
    const snap = await getDocs(collection(db, 'projects'));
    const counts = new Map<string, number>();
    snap.forEach((d) => {
      const cat = d.data().category ?? d.data().industry ?? 'Uncategorized';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([Category, Count]) => ({ Category, Count }));
  } catch (err) {
    console.error('Failed to generate project category report:', err);
    return [];
  }
}

export async function generateRevenueSummaryReport(from?: Date, to?: Date): Promise<ReportRow[]> {
  try {
    const snap = await getDocs(collection(db, 'invoices'));
    const { fromMs, toMs } = reportRangeBounds(from, to);

    return snap.docs
      .map((d) => {
        const data = d.data();
        const createdMs = parseReportDate(data.paidAt || data.issuedDate || data.createdAt);
        const amount = Number(data.amount) || 0;
        const platformFee = Math.round(amount * 0.05 * 100) / 100;
        return {
          _createdMs: createdMs,
          'Invoice ID': data.invoiceNumber || d.id,
          Date: createdMs ? new Date(createdMs).toLocaleDateString() : '—',
          Project: data.projectName || data.projectId || 'General Scope',
          'Client ID': data.clientId || '—',
          Specialist: data.symbioteName || data.symbioteId || '—',
          'Total Amount ($)': amount.toFixed(2),
          'Platform Fee (5%) ($)': platformFee.toFixed(2),
          'Net Specialist Payout ($)': (amount - platformFee).toFixed(2),
          'Payment Status': (data.status || 'pending').toUpperCase(),
        };
      })
      .filter((r) => (!from && !to) || (r._createdMs >= fromMs && r._createdMs <= toMs))
      .map(({ _createdMs, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to generate revenue summary report:', err);
    return [];
  }
}

export async function generateActivityReport(from?: Date, to?: Date): Promise<ReportRow[]> {
  try {
    const { fromMs, toMs } = reportRangeBounds(from, to);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const params = new URLSearchParams({ limit: '250' });
        if (from) params.set('startDate', `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`);
        if (to) params.set('endDate', `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`);
        const res = await fetch(`/api/admin/audit-logs?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.success && Array.isArray(body.rows)) {
          return body.rows
            .map((r: any) => {
              const tsMs = r.timestamp ? new Date(r.timestamp).getTime() : 0;
              return {
                _tsMs: tsMs,
                Timestamp: tsMs ? new Date(tsMs).toLocaleString() : '—',
                User: r.userEmail ?? r.userId ?? '—',
                Action: r.action ?? '—',
                Module: r.module ?? '—',
                Result: r.result ?? '—',
              };
            })
            .filter((r: any) => r._tsMs >= fromMs && r._tsMs <= toMs)
            .sort((a: any, b: any) => b._tsMs - a._tsMs)
            .map(({ _tsMs, ...rest }: any) => rest);
        }
      }
    } catch (apiErr) {
      console.warn('Activity report API path failed, using client fallback:', apiErr);
    }

    const snap = await getDocs(collection(db, 'audit_logs'));
    const rows = snap.docs
      .map((d) => {
        const data = d.data();
        const tsMs = parseReportDate(data.timestamp);
        return {
          _tsMs: tsMs,
          Timestamp: tsMs ? new Date(tsMs).toLocaleString() : '—',
          User: data.userEmail ?? data.userId ?? data.actorEmail ?? '—',
          Action: data.action ?? '—',
          Module: data.module ?? '—',
          Result: data.result ?? '—',
        };
      })
      .filter((r) => r._tsMs >= fromMs && r._tsMs <= toMs);

    rows.sort((a, b) => b._tsMs - a._tsMs);
    return rows.map(({ _tsMs, ...rest }) => rest);
  } catch (err) {
    console.error('Failed to generate activity report:', err);
    return [];
  }
}

export function reportRowsToCsv(rows: ReportRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map((r) =>
    headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

export function exportReportToPdf(title: string, category: string, rows: ReportRow[]): jsPDF {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const isLandscape = headers.length > 4;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setFillColor(34, 211, 238);
  doc.rect(0, 26, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(34, 211, 238);
  doc.text('SYNCHSPHERE COMPLIANCE & REPORTING', margin, 11);

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), margin, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const dateStr = new Date().toLocaleString();
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 11, { align: 'right' });
  doc.text(
    `Category: ${category.toUpperCase()} • Total Records: ${rows.length}`,
    pageWidth - margin,
    19,
    { align: 'right' }
  );

  if (rows.length === 0 || headers.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No records found for the specified criteria.', margin, 45);
    return doc;
  }

  const colWidth = printableWidth / headers.length;
  let y = 38;

  const drawTableHeader = (currentY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, printableWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    headers.forEach((h, i) => {
      const colX = margin + i * colWidth + 2;
      doc.text(h, colX, currentY + 5.5);
    });

    doc.setDrawColor(203, 213, 225);
    doc.line(margin, currentY + 8, margin + printableWidth, currentY + 8);
  };

  drawTableHeader(y);
  y += 8;

  rows.forEach((row, rowIndex) => {
    if (y + 7 > pageHeight - 16) {
      doc.addPage();
      y = 18;
      drawTableHeader(y);
      y += 8;
    }

    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, printableWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    headers.forEach((h, i) => {
      const colX = margin + i * colWidth + 2;
      const rawVal = String(row[h] ?? '—');
      const maxChars = Math.max(6, Math.floor(colWidth / 2.1));
      const displayVal = rawVal.length > maxChars ? rawVal.substring(0, maxChars - 2) + '…' : rawVal;
      doc.text(displayVal, colX, y + 4.5);
    });

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, margin + printableWidth, y + 6.5);
    y += 6.5;
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${p} of ${totalPages} • SyncSphere Platform Compliance Report • Confidential`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  return doc;
}
