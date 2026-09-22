import React, { useRef, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  FileCheck,
  Download,
  PenTool,
  RotateCcw,
  ShieldCheck,
  X,
  Lock,
  CheckCircle2,
  Calendar,
  UserCheck,
} from 'lucide-react';

export interface ContractDetails {
  id?: string;
  projectTitle: string;
  projectId?: string;
  clientName: string;
  clientEmail: string;
  symbioteName: string;
  symbioteEmail: string;
  effectiveDate: string;
  scopeOfWork: string;
  totalAmount: number;
  currency?: string;
  milestones?: Array<{ title: string; amount: number; dueDate?: string }>;
  terms?: string[];
}

interface ContractSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractDetails;
  currentUserRole: 'client' | 'symbiote' | 'admin';
  currentUserName: string;
  onSigned?: (signatureDataUrl: string, pdfBlob?: Blob) => Promise<void> | void;
}

export const ContractSigningModal: React.FC<ContractSigningModalProps> = ({
  isOpen,
  onClose,
  contract,
  currentUserRole,
  currentUserName,
  onSigned,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedDate, setSignedDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSignedDate(new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }));
      setHasSignature(false);
      setAgreedToTerms(false);
    }
  }, [isOpen]);

  // Handle canvas initialization
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#22D3EE'; // Cyan accent
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const generatePDFDoc = (signatureDataUrl?: string): jsPDF => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Header styling
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.rect(0, 0, 210, 32, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(34, 211, 238); // Cyan
    doc.text('SYNCLINK ENTERPRISE AGREEMENT', 15, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Document Reference: SLA-${contract.projectId?.slice(0, 8) || 'GLOBAL'}-${Date.now().toString().slice(-6)}`, 15, 25);

    // Body content
    let y = 45;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('1. PARTIES & ENGAGEMENT', 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`This Independent Services Agreement ("Agreement") is executed on ${contract.effectiveDate || signedDate} by:`, 15, y);
    y += 6;
    doc.text(`• Client: ${contract.clientName} (${contract.clientEmail})`, 18, y);
    y += 5;
    doc.text(`• Specialist (Symbiote): ${contract.symbioteName} (${contract.symbioteEmail})`, 18, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('2. PROJECT TITLE & SCOPE OF SERVICES', 15, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Project: ${contract.projectTitle}`, 15, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitScope = doc.splitTextToSize(
      contract.scopeOfWork || 'Delivery of high-grade specialized services adhering to standard milestone guidelines.',
      180
    );
    doc.text(splitScope, 15, y);
    y += splitScope.length * 5 + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('3. COMPENSATION & MILESTONE SETTLEMENT TERMS', 15, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Agreed Value: $${contract.totalAmount.toLocaleString()} ${contract.currency || 'USD'}`, 15, y);
    y += 6;
    doc.text('Milestones and deliverables are tracked on the SyncSphere workspace with itemized invoicing upon deliverable review.', 15, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('4. INTELLECTUAL PROPERTY & CONFIDENTIALITY', 15, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const ipText = 'Upon final disbursement of funds, all work products and intellectual property created under this contract are exclusively assigned to the Client. Both parties agree to maintain strict confidentiality of proprietary project details.';
    const splitIP = doc.splitTextToSize(ipText, 180);
    doc.text(splitIP, 15, y);
    y += splitIP.length * 4.5 + 14;

    // Signatures Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('5. DIGITAL EXECUTION & E-SIGNATURES', 15, y);
    y += 8;

    // Client box
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, y, 85, 38);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT SIGNATURE', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${contract.clientName}`, 18, y + 12);
    doc.text(`Date: ${contract.effectiveDate || signedDate}`, 18, y + 17);

    // Specialist box
    doc.rect(110, y, 85, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('SPECIALIST SIGNATURE', 113, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${contract.symbioteName}`, 113, y + 12);
    doc.text(`Date: ${signedDate}`, 113, y + 17);

    // If signature provided, embed onto the correct role box
    if (signatureDataUrl) {
      try {
        if (currentUserRole === 'client') {
          doc.addImage(signatureDataUrl, 'PNG', 18, y + 19, 50, 16);
        } else {
          doc.addImage(signatureDataUrl, 'PNG', 113, y + 19, 50, 16);
        }
      } catch (err) {
        console.error('Failed to embed signature into PDF:', err);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Securely generated and verified by SyncSphere Legal Protocol • Tamper-Evident Digital Audit Trail', 15, 287);

    return doc;
  };

  const handleDownloadPDF = () => {
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas && hasSignature ? canvas.toDataURL('image/png') : undefined;
    const doc = generatePDFDoc(signatureDataUrl);
    doc.save(`${contract.projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Contract.pdf`);
  };

  const handleConfirmAndSign = async () => {
    if (!hasSignature) return;
    setIsSubmitting(true);
    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : '';
      const doc = generatePDFDoc(signatureDataUrl);
      const pdfBlob = doc.output('blob');

      if (onSigned) {
        await onSigned(signatureDataUrl, pdfBlob);
      }
      onClose();
    } catch (err) {
      console.error('Failed to complete signing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <Card className="w-full max-w-3xl bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Legal Service Agreement & Digital Signature</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  SLA Verifiable
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Project: {contract.projectTitle} • Amount: ${contract.totalAmount.toLocaleString()} USD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-secondary)] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Summary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-black/30 border border-[var(--color-border)] text-xs">
            <div>
              <span className="text-[var(--color-text-tertiary)]">Client (Principal)</span>
              <p className="font-semibold text-white mt-0.5">{contract.clientName}</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-mono">{contract.clientEmail}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Specialist (Symbiote)</span>
              <p className="font-semibold text-white mt-0.5">{contract.symbioteName}</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-mono">{contract.symbioteEmail}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Total Contract Value</span>
              <p className="font-semibold text-emerald-400 mt-0.5">${contract.totalAmount.toLocaleString()} USD</p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Effective Date</span>
              <p className="font-semibold text-white mt-0.5">{contract.effectiveDate || signedDate}</p>
            </div>
          </div>

          {/* Scope Statement */}
          <div className="space-y-1.5 text-xs">
            <h3 className="font-semibold text-white">Scope & Deliverables</h3>
            <p className="text-[var(--color-text-secondary)] bg-black/20 p-3 rounded-lg border border-[var(--color-border)] leading-relaxed">
              {contract.scopeOfWork || 'Completion of all mutually established roadmap objectives, code delivery, and milestone verification.'}
            </p>
          </div>

          {/* Signature Canvas Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-cyan-400" />
                <span>Draw Your Digital Signature ({currentUserName})</span>
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Canvas</span>
              </button>
            </div>

            <div className="border border-cyan-500/30 rounded-xl overflow-hidden bg-black/60 relative">
              <canvas
                ref={canvasRef}
                width={500}
                height={130}
                className="w-full h-[130px] cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-[var(--color-text-tertiary)]">
                  Sign with mouse or stylus on this area
                </div>
              )}
            </div>
          </div>

          {/* Legal Acknowledgement */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-[var(--color-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 rounded border-[var(--color-border)] text-cyan-500 focus:ring-cyan-500"
            />
            <span>
              I understand that drawing my signature constitutes an legally binding agreement under the Electronic Signatures in Global and National Commerce Act (E-SIGN) and SyncSphere terms.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="border-[var(--color-border)] text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Draft PDF</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!hasSignature || !agreedToTerms || isSubmitting}
              onClick={handleConfirmAndSign}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Signing...' : 'Execute & Save Contract'}</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
