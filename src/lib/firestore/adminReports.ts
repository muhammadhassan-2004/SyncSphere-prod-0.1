import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { jsPDF } from 'jspdf';

export type ReportCategory = 'users' | 'projects' | 'revenue' | 'activity';
export type ReportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportDefinition {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  available: boolean; // false = data source doesn't exist yet, don't let them "generate" a fake report
}

export const reportDefinitions: ReportDefinition[] = [
  { id: 'user-registration', category: 'users', title: 'User Registration Report', description: 'New user signups over time, broken down by role.', available: true },
  { id: 'user-status', category: 'users', title: 'User Status Report', description: 'Current breakdown of active, suspended, and disabled accounts.', available: true },
  { id: 'project-status', category: 'projects', title: 'Project Status Report', description: 'All platform projects grouped by current status.', available: true },
  { id: 'project-category', category: 'projects', title: 'Project Category Report', description: 'Project volume broken down by category.', available: true },
  { id: 'revenue-summary', category: 'revenue', title: 'Revenue Summary Report', description: 'Requires a payments/invoices collection — not yet available.', available: false },
  { id: 'activity-audit', category: 'activity', title: 'Admin Activity Report', description: 'Audit log export for a selected date range.', available: true },
];

export interface ReportRow { [key: string]: string | number }

export async function generateUserRegistrationReport(from?: Date, to?: Date): Promise<ReportRow[]> {
  try {
    const constraints = [];
    if (from) constraints.push(where('createdAt', '>=', Timestamp.fromDate(from)));
    if (to) constraints.push(where('createdAt', '<=', Timestamp.fromDate(to)));
    
    let snap;
    try {
      const q = query(collection(db, 'users'), ...constraints, orderBy('createdAt', 'desc'));
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(collection(db, 'users'));
    }

    let docs = snap.docs;
    // In-memory date filter fallback if simple getDocs was used
    if (from || to) {
      const fromMs = from ? from.getTime() : 0;
      const toMs = to ? to.getTime() : Infinity;
      docs = docs.filter((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : data.createdAt ? new Date(data.createdAt).getTime() : 0;
        return created >= fromMs && created <= toMs;
      });
    }

    const rows = docs.map((d) => {
      const data = d.data();
      let regDate = '—';
      let createdMs = 0;
      if (data.createdAt?.toDate) {
        regDate = data.createdAt.toDate().toLocaleDateString();
        createdMs = data.createdAt.toDate().getTime();
      } else if (data.createdAt) {
        regDate = new Date(data.createdAt).toLocaleDateString();
        createdMs = new Date(data.createdAt).getTime();
      }
      return {
        _createdMs: createdMs,
        'User ID': d.id,
        'Name': data.displayName ?? data.fullName ?? '—',
        'Email': data.email ?? '—',
        'Role': data.role ?? '—',
        'Registered': regDate,
      };
    });

    // In-memory sort by registration date descending
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

export async function generateActivityReport(from?: Date, to?: Date): Promise<ReportRow[]> {
  try {
    const constraints = [];
    if (from) constraints.push(where('timestamp', '>=', Timestamp.fromDate(from)));
    if (to) constraints.push(where('timestamp', '<=', Timestamp.fromDate(to)));
    
    let snap;
    try {
      const q = query(collection(db, 'audit_logs'), ...constraints, orderBy('timestamp', 'desc'));
      snap = await getDocs(q);
    } catch {
      snap = await getDocs(collection(db, 'audit_logs'));
    }

    let docs = snap.docs;
    // In-memory date filter fallback if simple getDocs was used
    if (from || to) {
      const fromMs = from ? from.getTime() : 0;
      const toMs = to ? to.getTime() : Infinity;
      docs = docs.filter((d) => {
        const data = d.data();
        const ts = data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp?.toDate ? data.timestamp.toDate().getTime() : data.timestamp ? new Date(data.timestamp).getTime() : 0;
        return ts >= fromMs && ts <= toMs;
      });
    }

    const rows = docs.map((d) => {
      const data = d.data();
      let ts = '—';
      let tsMs = 0;
      if (data.timestamp?.toDate) {
        ts = data.timestamp.toDate().toLocaleString();
        tsMs = data.timestamp.toDate().getTime();
      } else if (data.timestamp?.toMillis) {
        tsMs = data.timestamp.toMillis();
        ts = new Date(tsMs).toLocaleString();
      } else if (data.timestamp) {
        tsMs = new Date(data.timestamp).getTime();
        ts = new Date(data.timestamp).toLocaleString();
      }
      return {
        _tsMs: tsMs,
        'Timestamp': ts,
        'User': data.userEmail ?? data.userId ?? data.actorEmail ?? '—',
        'Action': data.action ?? '—',
        'Module': data.module ?? '—',
        'Result': data.result ?? '—',
      };
    });

    // In-memory sort by timestamp descending
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
  const lines = rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
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

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark slate (#0f172a)
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Cyan Accent Strip
  doc.setFillColor(34, 211, 238); // Cyan (#22d3ee)
  doc.rect(0, 26, pageWidth, 1.5, 'F');

  // Title & Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(34, 211, 238); // Cyan
  doc.text('SYNCHSPHERE COMPLIANCE & REPORTING', margin, 11);

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), margin, 19);

  // Metadata on top-right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  const dateStr = new Date().toLocaleString();
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 11, { align: 'right' });
  doc.text(`Category: ${category.toUpperCase()} • Total Records: ${rows.length}`, pageWidth - margin, 19, { align: 'right' });

  // If no rows
  if (rows.length === 0 || headers.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No records found for the specified criteria.', margin, 45);
    return doc;
  }

  // Calculate column widths
  const colWidth = printableWidth / headers.length;
  let y = 38;

  // Draw Table Headers
  const drawTableHeader = (currentY: number) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, currentY, printableWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // slate-800

    headers.forEach((h, i) => {
      const colX = margin + i * colWidth + 2;
      doc.text(h, colX, currentY + 5.5);
    });

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(margin, currentY + 8, margin + printableWidth, currentY + 8);
  };

  drawTableHeader(y);
  y += 8;

  // Draw Rows
  rows.forEach((row, rowIndex) => {
    // Check if new page needed
    if (y + 7 > pageHeight - 16) {
      doc.addPage();
      y = 18;
      drawTableHeader(y);
      y += 8;
    }

    // Alternating background
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, y, printableWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85); // slate-700

    headers.forEach((h, i) => {
      const colX = margin + i * colWidth + 2;
      const rawVal = String(row[h] ?? '—');
      // Truncate text nicely to fit column width
      const maxChars = Math.max(6, Math.floor(colWidth / 2.1));
      const displayVal = rawVal.length > maxChars ? rawVal.substring(0, maxChars - 2) + '…' : rawVal;
      doc.text(displayVal, colX, y + 4.5);
    });

    // Row bottom border
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, margin + printableWidth, y + 6.5);
    y += 6.5;
  });

  // Footer on each page
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

