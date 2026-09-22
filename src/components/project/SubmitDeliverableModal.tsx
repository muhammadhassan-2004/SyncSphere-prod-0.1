import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Github,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Clock,
  CheckSquare,
  Link as LinkIcon,
  Send,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Project, WorkspaceMilestone, WorkspaceTask, MilestoneDeliverableItem } from '@/src/types/firestore';
import { uploadFileToCloudinary } from '@/src/lib/storage/cloudinary';
import { submitMilestoneForReview } from '@/src/lib/firestore/workspace';
import { useAuth } from '@/src/context/AuthContext';

interface SubmitDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  milestone: WorkspaceMilestone;
  tasks: WorkspaceTask[];
  onSubmitted?: () => void;
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  isOpen,
  onClose,
  project,
  milestone,
  tasks,
  onSubmitted,
}) => {
  const { firebaseUser, userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deliverables, setDeliverables] = useState<MilestoneDeliverableItem[]>(
    milestone.deliverables || []
  );
  const [repositoryUrl, setRepositoryUrl] = useState<string>(
    milestone.repositoryUrl || ''
  );
  const [summaryNotes, setSummaryNotes] = useState<string>(
    milestone.summaryNotes || ''
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Task hour calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalEstimatedHours = tasks.reduce(
    (sum, t) => sum + (t.estimatedHours || 0),
    0
  );
  const totalActualHours = tasks.reduce(
    (sum, t) => sum + (t.actualHours || 0),
    0
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !project.id) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const newDeliverables: MilestoneDeliverableItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadFileToCloudinary(file, {
          projectId: project.id,
          folder: `syncsphere/projects/${project.id}/deliverables`,
          fileName: file.name,
        });

        newDeliverables.push({
          name: file.name,
          url: res.url,
          size: formatFileSize(res.bytes || file.size),
          type: file.type || file.name.split('.').pop() || 'file',
          uploadedAt: new Date().toISOString(),
        });
      }

      setDeliverables((prev) => [...prev, ...newDeliverables]);
    } catch (err: any) {
      console.error('File upload error:', err);
      setErrorMsg(
        err?.message || 'Failed to upload deliverable file to cloud storage.'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDeliverable = (indexToRemove: number) => {
    setDeliverables((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation: Require at least one form of deliverable evidence
    if (
      deliverables.length === 0 &&
      !repositoryUrl.trim() &&
      !summaryNotes.trim()
    ) {
      setErrorMsg(
        'Please upload at least one deliverable file, provide a code repository link, or include summary notes.'
      );
      return;
    }

    if (repositoryUrl.trim()) {
      try {
        new URL(repositoryUrl.trim());
      } catch {
        setErrorMsg('Please enter a valid repository or deployment URL (e.g. https://github.com/org/repo).');
        return;
      }
    }

    if (!project.id || !milestone.id) {
      setErrorMsg('Missing project or milestone identification.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMilestoneForReview(project.id, milestone.id, {
        deliverables,
        repositoryUrl: repositoryUrl.trim(),
        summaryNotes: summaryNotes.trim(),
        specialistId: firebaseUser?.uid || userProfile?.uid || '',
        specialistName:
          userProfile?.displayName ||
          firebaseUser?.displayName ||
          'Specialist',
      });

      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMsg(err?.message || 'Failed to submit milestone for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/40">
                {milestone.phase ? `M${milestone.phase}` : 'MILESTONE'}
              </span>
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Submit Milestone Deliverables
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {milestone.title || milestone.name} • {project.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-[8px] bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-xs text-[var(--color-danger-red)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TASK HOUR SUMMARY CARD */}
        <div className="p-4 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Milestone Task & Hour Summary</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                completedTasks === totalTasks && totalTasks > 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {completedTasks}/{totalTasks} Tasks Completed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase">
                Total Tasks
              </p>
              <p className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                {totalTasks}
              </p>
            </div>
            <div className="p-2.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase">
                Completed
              </p>
              <p className="text-sm font-bold text-emerald-400 font-mono">
                {completedTasks}
              </p>
            </div>
            <div className="p-2.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase">
                Estimated
              </p>
              <p className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                {totalEstimatedHours}h
              </p>
            </div>
            <div className="p-2.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-[10px] font-mono text-[var(--color-text-secondary)] uppercase">
                Actual Logged
              </p>
              <p className="text-sm font-bold text-[var(--color-success-green)] font-mono">
                {totalActualHours}h
              </p>
            </div>
          </div>

          {completedTasks < totalTasks && (
            <p className="text-[11px] text-amber-400/90 italic flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Note: {totalTasks - completedTasks} task(s) are still marked in progress. Submitting will notify the client to review all tasks.
              </span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* UPLOAD DELIVERABLE FILES */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-[var(--color-text-secondary)] uppercase flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                <span>Upload Deliverable Files (ZIP, PDF, Code, Assets)</span>
              </span>
              <span className="text-[10px] text-[var(--color-text-secondary)] lowercase font-normal">
                Direct to Cloudinary CDN
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="deliverable-file-input"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/70 rounded-[10px] p-5 text-center cursor-pointer transition-colors bg-[var(--color-background)] group"
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-2 text-[var(--color-accent-cyan)]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-mono">Uploading deliverables to CDN...</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-7 h-7 text-[var(--color-accent-cyan)] mx-auto group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">
                    Click to browse or drag & drop files
                  </p>
                  <p className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                    Supports project archives, build binaries, documentation PDFs, and media assets
                  </p>
                </div>
              )}
            </div>

            {/* ATTACHED FILES LIST */}
            {deliverables.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                  Attached Deliverables ({deliverables.length}):
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {deliverables.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between text-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
                        <span className="font-semibold text-[var(--color-text-primary)] truncate">
                          {file.name}
                        </span>
                        {file.size && (
                          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] shrink-0">
                            ({file.size})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1 text-[11px] font-mono"
                          >
                            <span>Preview</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDeliverable(idx)}
                          className="text-[var(--color-danger-red)] hover:text-red-400 p-1 cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GITHUB REPOSITORY / LIVE URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-[var(--color-text-secondary)] uppercase flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Git Repository / Staging URL</span>
            </label>
            <div className="relative">
              <Input
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/organization/repository-name"
                className="text-xs pl-8 font-mono"
              />
              <LinkIcon className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-2.5 top-3" />
            </div>
            <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
              Include GitHub, GitLab, branch, PR link, or deployed staging URL for client verification.
            </p>
          </div>

          {/* SUMMARY NOTES & CHANGELOG */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-[var(--color-text-secondary)] uppercase flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Deliverable Summary Notes & Changelog</span>
            </label>
            <textarea
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="Detail the completed milestone deliverables, configuration steps, test coverage, or notes for the client review..."
              rows={4}
              className="w-full p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] resize-none"
            />
          </div>

          {/* ACTIONS */}
          <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || isUploading}
              className="bg-[var(--color-accent-cyan)] text-black font-bold text-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Deliverables...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Milestone for Client Review</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
