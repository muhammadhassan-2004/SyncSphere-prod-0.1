import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { getProjectsByOwner } from '@/src/lib/firestore/projects';
import { createInvitation } from '@/src/lib/firestore/invitations';
import { Project } from '@/src/types/firestore';
import {
  Send,
  X,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Sparkles,
  Star,
} from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  candidate: SymbioteProfile | null;
  onClose: () => void;
  onSuccess?: (projectName: string) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onSuccess,
}) => {
  const { firebaseUser, userProfile, authenticatedUser } = useAuth();
  const currentUserId = firebaseUser?.uid || authenticatedUser?.uid || userProfile?.uid;
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    setLoading(true);
    setErrorText(null);

    getProjectsByOwner(currentUserId)
      .then((userProjects) => {
        // Filter active / open / in_progress / draft projects (exclude completed / closed)
        const activeProjects = userProjects.filter(
          (p) => p.status !== 'completed' && p.status !== 'closed'
        );
        setProjects(activeProjects);
        if (activeProjects.length > 0) {
          setSelectedProjectId(activeProjects[0].id || '');
        }
      })
      .catch((err) => {
        console.error('Error fetching client projects:', err);
        setErrorText('Failed to load your active projects. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, currentUserId]);

  if (!isOpen || !candidate) return null;

  const handleSendInvite = async () => {
    if (!selectedProjectId) {
      setErrorText('Please select a project to invite this specialist to.');
      return;
    }

    if (!currentUserId) {
      setErrorText('You must be signed in as a client to send invitations.');
      return;
    }

    const selectedProj = projects.find((p) => p.id === selectedProjectId);
    if (!selectedProj || selectedProj.status === 'completed' || selectedProj.status === 'closed') {
      setErrorText('Cannot send invitations for a completed or closed project.');
      return;
    }
    const projTitle = selectedProj.title || 'Selected Project';

    setSubmitting(true);
    setErrorText(null);

    try {
      const budgetFormatted =
        typeof selectedProj?.budget === 'number'
          ? `$${selectedProj.budget.toLocaleString()}`
          : selectedProj?.minBudget
          ? `$${selectedProj.minBudget} - $${selectedProj.maxBudget || ''}`
          : '$10,000 - $25,000';

      const invId = await createInvitation({
        projectId: selectedProjectId,
        projectTitle: projTitle,
        clientName: userProfile?.companyName || userProfile?.displayName || 'Client',
        symbioteId: candidate.uid,
        symbioteName: candidate.displayName,
        symbioteTitle: candidate.title,
        symbioteAvatarInitials: candidate.avatarInitials || candidate.displayName?.slice(0, 2).toUpperCase() || 'SP',
        symbioteAvatarUrl: candidate.avatarUrl || '',
        clientId: currentUserId,
        status: 'pending',
        budgetRange: budgetFormatted,
        timeline: selectedProj?.duration || '1 - 3 months',
        techTags: (candidate.skills || []).slice(0, 4),
        matchScore: candidate.matchScore || (candidate as any).aiMatchScore || 95,
        clientNote: customNote || '',
        createdAt: new Date().toISOString(),
      });

      if (!invId) {
        throw new Error('Failed to create invitation record');
      }

      if (onSuccess) {
        onSuccess(projTitle);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create invitation:', err);
      setErrorText('Failed to send invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Invite Specialist</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Send project invitation to {candidate.displayName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--color-background)] rounded-[6px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CANDIDATE MINI BANNER */}
        <div className="p-4 bg-[var(--color-background)] border-b border-[var(--color-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={candidate.displayName} initials={candidate.avatarInitials} src={candidate.avatarUrl} size="sm" statusDot="online" />
            <div>
              <p className="text-xs font-bold text-[var(--color-text-primary)]">{candidate.displayName}</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">{candidate.title}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-[var(--color-accent-cyan)]">${candidate.hourlyRate}/hr</span>
            {candidate.reviewsCount > 0 ? (
              <span className="text-[10px] text-[var(--color-text-secondary)] flex items-center justify-end gap-1 font-mono">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{candidate.rating.toFixed(1)}</span>
              </span>
            ) : (
              <span className="text-[10px] text-[var(--color-text-secondary)] flex items-center justify-end gap-1 font-mono">
                <Star className="w-3 h-3 opacity-40" />
                <span>No ratings yet</span>
              </span>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-4">
          {errorText && (
            <div className="p-3 rounded-[8px] bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-xs text-[var(--color-danger-red)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* PROJECT SELECTION */}
          <div className="space-y-2">
            <label className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Select Target Project <span className="text-[var(--color-danger-red)]">*</span>
            </label>

            {loading ? (
              <div className="p-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] font-mono animate-pulse flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
                Loading your client projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] text-center space-y-2">
                <p className="text-xs text-[var(--color-text-secondary)]">You do not have any active project listings yet.</p>
                <p className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                  Create a new project first to invite candidates.
                </p>
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] font-sans"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.title} ({proj.status || 'open'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* CUSTOM INVITATION MESSAGE */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Optional Note / Brief Message
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Hi! We saw your expertise in AI systems and would love to invite you to review our project scope..."
              rows={3}
              className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] resize-none"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSendInvite}
            disabled={submitting || loading || projects.length === 0 || !selectedProjectId}
            className="flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Sending...' : 'Send Invitation'}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
