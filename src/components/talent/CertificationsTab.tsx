import React from 'react';
import { Card } from '@/src/components/ui/card';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { FileCheck2, Award, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface CertificationsTabProps {
  symbiote: SymbioteProfile;
}

export const CertificationsTab: React.FC<CertificationsTabProps> = ({ symbiote }) => {
  const certifications = symbiote.certifications || [];

  if (certifications.length === 0) {
    return (
      <EmptyStateBlock
        icon={<FileCheck2 className="w-6 h-6 text-[var(--color-accent-cyan)]" />}
        title="No Certifications Listed"
        description="This specialist has not added any certifications or credentials to their profile yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Certifications & Credentials
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
            {certifications.filter((c) => c.verified).length} Verified Credentials
          </span>
        </div>

        {/* ADMIN VERIFICATION NOTICE */}
        <div className="p-3.5 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0 mt-0.5" />
          <p className="font-sans leading-relaxed">
            <strong className="text-[var(--color-text-primary)] font-mono">Verification Policy:</strong> Credentials marked with a green checkmark have been officially verified. Unverified items were self-reported by the specialist.
          </p>
        </div>

        {/* CERTIFICATION CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="p-4 rounded-[12px] bg-[var(--color-background)] border border-[var(--color-border)] flex items-start justify-between gap-3 hover:border-[var(--color-accent-cyan)]/40 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                {/* AWARD / RIBBON ICON BADGE */}
                <div className="p-2.5 rounded-[10px] bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] shrink-0 border border-[var(--color-accent-cyan)]/20">
                  <Award className="w-5 h-5" />
                </div>

                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                    {cert.name}
                  </h4>
                  <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                    {cert.issuer} {cert.issueDate ? `• ${cert.issueDate}` : ''}
                  </p>
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-[var(--color-accent-cyan)] hover:underline inline-block pt-1"
                    >
                      View Credential
                    </a>
                  )}
                </div>
              </div>

              {/* RIGHT-ALIGNED VERIFIED BADGE */}
              <div className="shrink-0 pt-0.5">
                {cert.verified ? (
                  <span
                    title="Verified Credential"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-success-green)]/15 text-[var(--color-success-green)] border border-[var(--color-success-green)]/30"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span
                    title="Unverified"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Unverified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
