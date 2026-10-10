import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { createInvitation, subscribeToProjectInvitations } from '@/src/lib/firestore/invitations';
import {
  getAllSymbiotesFromFirestore,
  subscribeToSymbiotesFromFirestore,
} from '@/src/lib/firestore/users';
import { UserProfileModal } from '@/src/components/profile/UserProfileModal';
import {
  subscribeToProjectMatches,
  computeDeterministicMatchScore,
  ProjectMatch,
} from '@/src/lib/firestore/matches';
import { Invitation, Project } from '@/src/types/firestore';
import { getUserStatusDot } from '@/src/lib/utils/presence';
import {
  UserPlus,
  X,
  Search,
  Sparkles,
  Check,
  AlertCircle,
  Eye,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export interface SymbioteCandidate {
  uid: string;
  displayName: string;
  title: string;
  avatarInitials: string;
  avatarUrl?: string;
  matchScore: number;
  hourlyRate: number;
  skills: string[];
  email: string;
  isOnline?: boolean;
  lastActiveAt?: any;
  lastSeen?: any;
}

interface AddTeamMemberModalProps {
  isOpen: boolean;
  projectId: string;
  projectTitle?: string;
  projectStatus?: string;
  existingTeamUids?: string[];
  onClose: () => void;
  onMemberAdded: () => void;
}

export const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({
  isOpen,
  projectId,
  projectTitle: initialProjectTitle,
  projectStatus,
  existingTeamUids = [],
  onClose,
  onMemberAdded,
}) => {
  const { firebaseUser, userProfile } = useAuth();
  const [candidates, setCandidates] = useState<SymbioteCandidate[]>([]);
  const [invitedUids, setInvitedUids] = useState<string[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>(initialProjectTitle || '');
  const [projectMatches, setProjectMatches] = useState<ProjectMatch[]>([]);
  const [rawUsers, setRawUsers] = useState<any[]>([]);

  // Subscribe to Project Matches to sync scores with PreSync AI Matching engine
  useEffect(() => {
    if (!projectId) {
      setProjectMatches([]);
      return;
    }
    const unsub = subscribeToProjectMatches(projectId, (mList) => {
      setProjectMatches(mList);
    });
    return () => unsub();
  }, [projectId]);

  const isProjectCompleted = projectStatus === 'completed' || projectStatus === 'closed';

  // Modal profile preview state (Requirement 3: in-page profile modal instead of new tab)
  const [profileModalUid, setProfileModalUid] = useState<string | null>(null);

  const [projectData, setProjectData] = useState<Project | null>(null);

  useEffect(() => {
    if (initialProjectTitle) {
      setProjectTitle(initialProjectTitle);
    }
    if (projectId) {
      import('@/src/lib/firestore/projects').then(({ getProjectById }) => {
        getProjectById(projectId).then((p) => {
          if (p) {
            setProjectData(p);
            if (p.title) setProjectTitle(p.title);
          }
        });
      });
    }
  }, [projectId, initialProjectTitle]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<SymbioteCandidate | null>(null);
  const [assignedRole, setAssignedRole] = useState('Senior AI Engineer');
  const [submittingCandidateId, setSubmittingCandidateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // Dynamic Skill Match Scoring based on actual project requirements vs candidate profile
  const computeCandidateMatchScore = (u: any, proj: Project | null, storedMatches: ProjectMatch[]): number => {
    const uid = u.uid || u.id;
    const foundMatch = storedMatches.find((m) => m.symbioteId === uid);
    if (foundMatch && typeof foundMatch.matchScore === 'number' && foundMatch.matchScore > 0) {
      return foundMatch.matchScore;
    }
    if (u.matchScore && typeof u.matchScore === 'number' && u.matchScore > 0) return u.matchScore;
    if (u.aiMatchScore && typeof u.aiMatchScore === 'number' && u.aiMatchScore > 0) return u.aiMatchScore;

    return computeDeterministicMatchScore(u, proj).matchScore;
  };

  // 1. Fetch & Subscribe to real SYMBIOTE users from Firestore
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    let isMounted = true;

    const mapUserToCandidate = (u: any): SymbioteCandidate => {
      const displayName = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Symbiote Specialist';
      const parts = displayName.trim().split(/\s+/);
      const computedInitials = u.avatarInitials || (parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.slice(0, 2).toUpperCase()) || 'SP';
      const rawUrl = u.avatarUrl || u.photoURL;
      const cleanUrl = typeof rawUrl === 'string' && rawUrl.trim().length > 5 && rawUrl !== 'null' && rawUrl !== 'undefined'
        ? rawUrl.trim()
        : undefined;

      return {
        uid: u.uid || u.id,
        displayName,
        title: u.title || u.jobTitle || 'AI Engineering Specialist',
        avatarInitials: computedInitials,
        avatarUrl: cleanUrl,
        matchScore: computeCandidateMatchScore(u, projectData, projectMatches),
        hourlyRate: u.hourlyRate || 125,
        skills: Array.isArray(u.skills) && u.skills.length > 0 ? u.skills : ['AI Architecture', 'Python', 'LLMs'],
        email: u.email || 'specialist@syncsphere.io',
        isOnline: u.isOnline,
        lastActiveAt: u.lastActiveAt,
        lastSeen: u.lastSeen,
      };
    };

    getAllSymbiotesFromFirestore().then((users) => {
      if (isMounted) {
        setRawUsers(users);
        setCandidates(users.map(mapUserToCandidate));
        setIsLoading(false);
      }
    });

    const unsubUsers = subscribeToSymbiotesFromFirestore((users) => {
      if (isMounted) {
        setRawUsers(users);
        setCandidates(users.map(mapUserToCandidate));
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
      unsubUsers();
    };
  }, [isOpen, projectData]);

  // 2. Subscribe to invitations for this project to track already invited symbiotes
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const unsubInvs = subscribeToProjectInvitations(projectId, (invitations: Invitation[]) => {
      const uids = invitations.map((inv) => inv.symbioteId);
      setInvitedUids(uids);
    });

    return () => unsubInvs();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const filteredCandidates = candidates
    .filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.displayName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  // Send Project Invitation (Candidate must accept before client approves onto team)
  const handleSendInvite = async (candidate: SymbioteCandidate, roleToAssign = assignedRole) => {
    if (isProjectCompleted) {
      setErrorText('Cannot send invitations for a completed or closed project.');
      return;
    }
    setSubmittingCandidateId(candidate.uid);
    setIsSubmitting(true);
    setErrorText(null);
    setSuccessText(null);

    try {
      await createInvitation({
        projectId,
        projectTitle: projectTitle && projectTitle !== 'Project Invitation' ? projectTitle : 'Project',
        clientName: userProfile?.companyName || userProfile?.displayName || 'Client',
        symbioteId: candidate.uid,
        symbioteName: candidate.displayName,
        symbioteTitle: candidate.title,
        symbioteAvatarInitials: candidate.avatarInitials,
        symbioteAvatarUrl: candidate.avatarUrl,
        clientId: firebaseUser?.uid || '',
        status: 'pending',
        budgetRange: `$${candidate.hourlyRate}/hr`,
        timeline: 'Project Duration',
        techTags: candidate.skills,
        matchScore: candidate.matchScore,
        clientNote: `Invited as ${roleToAssign}`,
        createdAt: new Date().toISOString(),
      });

      setSuccessText(`Invitation sent to ${candidate.displayName}! Candidate must accept before joining team.`);
      onMemberAdded();
    } catch (err) {
      console.error('Failed to send invitation:', err);
      setErrorText('Failed to send invitation. Please try again.');
    } finally {
      setSubmittingCandidateId(null);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
        <Card className="w-full max-w-xl bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* MODAL HEADER */}
          <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Add Team Member</h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Select a Symbiote specialist to send an invitation to join your project team
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

          {/* MODAL BODY */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {isProjectCompleted && (
              <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>This project is completed and closed. Adding or inviting team members is disabled.</span>
              </div>
            )}

            {errorText && (
              <div className="p-3 rounded-[8px] bg-[var(--color-danger-red)]/10 border border-[var(--color-danger-red)]/30 text-xs text-[var(--color-danger-red)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}

            {successText && (
              <div className="p-3 rounded-[8px] bg-[var(--color-success-green)]/10 border border-[var(--color-success-green)]/30 text-xs text-[var(--color-success-green)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successText}</span>
              </div>
            )}

            {/* SEARCH BAR */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Symbiotes by name, skill, or specialization..."
                className="pl-9 text-xs"
              />
            </div>

            {/* CANDIDATES LIST */}
            <div className="space-y-2.5">
              <label className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
                Available Symbiote Talent ({filteredCandidates.length})
              </label>

              {isLoading ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-secondary)] flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent-cyan)]" />
                  <span>Loading Symbiotes from Firestore...</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] rounded-[10px]">
                  No matching Symbiote specialists found in Firestore.
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {filteredCandidates.map((candidate) => {
                    const isAlreadyTeamMember = existingTeamUids.includes(candidate.uid);
                    const isAlreadyInvited = invitedUids.includes(candidate.uid);
                    const isSelected = selectedCandidate?.uid === candidate.uid;
                    const isSubmittingRow = submittingCandidateId === candidate.uid;

                    return (
                      <div
                        key={candidate.uid}
                        onClick={() => !isAlreadyTeamMember && setSelectedCandidate(candidate)}
                        className={`p-3 rounded-[10px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isAlreadyTeamMember
                            ? 'opacity-60 bg-[var(--color-background)] border-[var(--color-border)] cursor-not-allowed'
                            : isSelected
                            ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 ring-1 ring-[var(--color-accent-cyan)] cursor-pointer'
                            : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-text-secondary)] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={candidate.displayName}
                            initials={candidate.avatarInitials}
                            src={candidate.avatarUrl}
                            size="md"
                            statusDot={getUserStatusDot(candidate)}
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-[var(--color-text-primary)]">
                                {candidate.displayName}
                              </p>
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                {candidate.matchScore}% Match
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-secondary)]">{candidate.title}</p>
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills.slice(0, 3).map((sk) => (
                                <span
                                  key={sk}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT SIDE: RATE & ACTIONS */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--color-border)]">
                          <p className="text-xs font-mono font-bold text-[var(--color-text-primary)]">
                            ${candidate.hourlyRate}/hr
                          </p>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* ACTION: IN-PAGE PROFILE MODAL */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setProfileModalUid(candidate.uid)}
                              className="h-7 px-2 text-[10.5px] flex items-center gap-1"
                              title="View full profile in modal"
                            >
                              <Eye className="w-3 h-3 text-[var(--color-text-secondary)]" />
                              <span>Profile</span>
                            </Button>

                            {/* STATUS OR QUICK ACTIONS */}
                            {isAlreadyTeamMember ? (
                              <span className="text-[10px] font-mono text-[var(--color-success-green)] font-semibold flex items-center gap-1 px-2 py-1 bg-[var(--color-success-green)]/10 rounded">
                                <Check className="w-3 h-3" /> Assigned
                              </span>
                            ) : isAlreadyInvited ? (
                              <span className="text-[10px] font-mono text-[var(--color-info-blue)] font-semibold flex items-center gap-1 px-2 py-1 bg-[var(--color-info-blue)]/10 rounded">
                                <Send className="w-3 h-3" /> Invited
                              </span>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isSubmittingRow || isProjectCompleted}
                                onClick={() => handleSendInvite(candidate)}
                                className="h-7 px-2 text-[10.5px] bg-[var(--color-accent-cyan)] text-black hover:bg-[var(--color-accent-cyan)]/90 font-semibold flex items-center gap-1 disabled:opacity-50"
                              >
                                {isSubmittingRow ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>Invite</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ROLE ASSIGNMENT & TWO CLEAR ACTION OPTIONS */}
            {selectedCandidate && (
              <div className="p-3.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[10px] space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      name={selectedCandidate.displayName}
                      initials={selectedCandidate.avatarInitials}
                      src={selectedCandidate.avatarUrl}
                      size="xs"
                    />
                    <label className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block truncate">
                      Target Role for <span className="text-[var(--color-text-primary)] font-bold">{selectedCandidate.displayName}</span>
                    </label>
                  </div>
                  <span className="text-[10.5px] font-mono text-[var(--color-accent-cyan)] shrink-0">
                    ${selectedCandidate.hourlyRate}/hr
                  </span>
                </div>

                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="w-full p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[6px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)] cursor-pointer"
                >
                  <option value="Senior AI Engineer">Senior AI Engineer</option>
                  <option value="Lead AI Architect">Lead AI Architect</option>
                  <option value="MLOps Specialist">MLOps Specialist</option>
                  <option value="Full-Stack Developer">Full-Stack Developer</option>
                  <option value="LLM Specialist">LLM Specialist</option>
                  <option value="QA & Compliance Auditor">QA & Compliance Auditor</option>
                </select>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting || isProjectCompleted}
                    onClick={() => handleSendInvite(selectedCandidate, assignedRole)}
                    className="w-full py-2.5 bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-green)] text-slate-950 font-bold hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 rounded-xl text-xs sm:text-sm border-0 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Invitation...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Project Invitation</span>
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-[var(--color-text-secondary)] text-center mt-2 leading-relaxed">
                    An official invitation will be sent to <strong className="text-white">{selectedCandidate.displayName}</strong> as <strong className="text-[var(--color-accent-cyan)]">{assignedRole}</strong>. Once accepted, they will join the project team.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Close
            </Button>

            {!selectedCandidate ? (
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                Select a candidate to view actions
              </span>
            ) : (
              <span className="text-[11px] text-[var(--color-accent-cyan)] font-mono">
                Selected: {selectedCandidate.displayName}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* IN-PAGE USER PROFILE MODAL */}
      {profileModalUid && (
        <UserProfileModal
          isOpen={!!profileModalUid}
          onClose={() => setProfileModalUid(null)}
          userId={profileModalUid}
        />
      )}
    </>
  );
};

