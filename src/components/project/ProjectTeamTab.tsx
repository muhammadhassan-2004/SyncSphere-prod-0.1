import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Project, Invitation } from '@/src/types/firestore';
import {
  doc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import {
  subscribeToProjectInvitations,
  updateInvitationStatus,
} from '@/src/lib/firestore/invitations';
import { addTeamMemberToProject } from '@/src/lib/firestore/projects';
import { UserProfileModal } from '@/src/components/profile/UserProfileModal';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { StatusPill } from '@/src/components/ui/badge';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { getUserStatusDot } from '@/src/lib/utils/presence';
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Eye,
  Mail,
} from 'lucide-react';

interface ProjectTeamTabProps {
  project: Project;
  onOpenAddTeamModal: () => void;
  onApprovedCountChange?: (count: number) => void;
}

export const ProjectTeamTab: React.FC<ProjectTeamTabProps> = ({
  project,
  onOpenAddTeamModal,
  onApprovedCountChange,
}) => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();

  const projectId = project.id || '';
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // In-page User Profile modal state (Requirement 3)
  const [profileModalUid, setProfileModalUid] = useState<string | null>(null);

  const [realUsersMap, setRealUsersMap] = useState<Map<string, any>>(new Map());

  // Subscribe to real users collection to ensure defensive resolution to real accounts
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uMap = new Map<string, any>();
      snap.docs.forEach((d) => {
        const data = d.data();
        uMap.set(d.id, { uid: d.id, ...data });
      });
      setRealUsersMap(uMap);
    });
    return () => unsubUsers();
  }, []);

  // Subscribe to real-time invitations for this project
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToProjectInvitations(projectId, (invList) => {
      setInvitations(invList);
      setLoading(false);
    });

    return () => unsub();
  }, [projectId]);

  // Defensive check: verify entry resolves to a real user in Firestore
  const isRealUserUid = (uid: string) => {
    if (!uid) return false;
    if (realUsersMap.size > 0) {
      return realUsersMap.has(uid);
    }
    return true; // Fallback before map loads
  };

  const approvedInvitations = useMemo(() => {
    return invitations.filter((inv) => inv.status === 'approved' && isRealUserUid(inv.symbioteId));
  }, [invitations, realUsersMap]);

  // Direct team members on project document (if added directly)
  const projectTeamMembers = useMemo(() => {
    return (project.teamMembers || []).filter((m) => isRealUserUid(m.uid));
  }, [project.teamMembers, realUsersMap]);

  // Combined approved members (approved invitations + direct project.teamMembers deduplicated by uid/symbioteId)
  const allApprovedMembers = useMemo(() => {
    const map = new Map<string, {
      uid: string;
      displayName: string;
      role: string;
      avatarInitials?: string;
      avatarUrl?: string;
      email?: string;
      hourlyRate?: number;
      matchScore?: number;
      invitationId?: string;
      source: 'invitation' | 'projectDoc';
    }>();

    // 1. Add direct project.teamMembers (defensively resolved)
    projectTeamMembers
      .filter((m) => !m.uid?.startsWith('symbiote-10') && isRealUserUid(m.uid))
      .forEach((m) => {
        const userDoc = realUsersMap.get(m.uid);
        const resolvedName = userDoc?.displayName || `${userDoc?.firstName || ''} ${userDoc?.lastName || ''}`.trim() || m.displayName || 'Approved Specialist';
        const resolvedRole = userDoc?.title || userDoc?.role || m.role || 'Senior AI Specialist';
        
        map.set(m.uid, {
          uid: m.uid,
          displayName: resolvedName,
          role: resolvedRole,
          avatarInitials: userDoc?.avatarInitials || m.avatarInitials,
          avatarUrl: userDoc?.avatarUrl || (userDoc as any)?.photoURL || (m as any)?.avatarUrl,
          email: userDoc?.email || m.email,
          hourlyRate: userDoc?.hourlyRate || m.hourlyRate,
          matchScore: m.matchScore,
          source: 'projectDoc',
        });
      });

    // 2. Add approved invitations
    approvedInvitations.forEach((inv) => {
      const uid = inv.symbioteId;
      if (!map.has(uid) && isRealUserUid(uid)) {
        const userDoc = realUsersMap.get(uid);
        const resolvedName = userDoc?.displayName || `${userDoc?.firstName || ''} ${userDoc?.lastName || ''}`.trim() || inv.symbioteName || 'Approved Specialist';
        const resolvedRole = userDoc?.title || inv.symbioteTitle || 'Senior AI Specialist';

        map.set(uid, {
          uid,
          displayName: resolvedName,
          role: resolvedRole,
          avatarInitials: userDoc?.avatarInitials || inv.symbioteAvatarInitials,
          avatarUrl: userDoc?.avatarUrl || (userDoc as any)?.photoURL || inv.symbioteAvatarUrl,
          hourlyRate: userDoc?.hourlyRate || (inv.budgetRange ? parseFloat(inv.budgetRange.replace(/[^0-9.]/g, '')) || undefined : undefined),
          matchScore: inv.matchScore || inv.aiMatchScore,
          invitationId: inv.id,
          source: 'invitation',
        });
      }
    });

    return Array.from(map.values());
  }, [approvedInvitations, projectTeamMembers, realUsersMap]);

  // Sets of UIDs and names for deduplicating pending invitations
  const approvedMemberUids = useMemo(() => {
    const set = new Set<string>();
    allApprovedMembers.forEach((m) => {
      if (m.uid) set.add(m.uid);
    });
    return set;
  }, [allApprovedMembers]);

  const approvedMemberNames = useMemo(() => {
    const set = new Set<string>();
    allApprovedMembers.forEach((m) => {
      if (m.displayName) set.add(m.displayName.toLowerCase().trim());
    });
    return set;
  }, [allApprovedMembers]);

  // Group invitations by section status with defensive filtering (preventing double-appearance of approved members)
  const pendingInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (inv.status !== 'pending') return false;
      if (!isRealUserUid(inv.symbioteId)) return false;
      if (inv.symbioteId && approvedMemberUids.has(inv.symbioteId)) return false;
      if (inv.symbioteName && approvedMemberNames.has(inv.symbioteName.toLowerCase().trim())) return false;
      return true;
    });
  }, [invitations, realUsersMap, approvedMemberUids, approvedMemberNames]);

  const acceptedInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (inv.status !== 'accepted') return false;
      if (!isRealUserUid(inv.symbioteId)) return false;
      if (inv.symbioteId && approvedMemberUids.has(inv.symbioteId)) return false;
      if (inv.symbioteName && approvedMemberNames.has(inv.symbioteName.toLowerCase().trim())) return false;
      return true;
    });
  }, [invitations, realUsersMap, approvedMemberUids, approvedMemberNames]);

  // Notify parent of total approved members count for header tab badge
  useEffect(() => {
    if (onApprovedCountChange) {
      onApprovedCountChange(allApprovedMembers.length);
    }
  }, [allApprovedMembers.length, onApprovedCountChange]);

  // Client-side approval handler for accepted candidates awaiting approval
  const handleApproveMember = async (invitation: Invitation) => {
    if (!invitation.id) return;
    setActionLoadingId(invitation.id);

    try {
      // 1. Update invitation status in Firestore to 'approved'
      await updateInvitationStatus(invitation.id, 'approved');

      // 2. Resolve any other pending/accepted invitations for this symbiote
      const siblingInvs = invitations.filter(
        (i) => i.id !== invitation.id && i.symbioteId === invitation.symbioteId && (i.status === 'pending' || i.status === 'accepted')
      );
      for (const sib of siblingInvs) {
        if (sib.id) {
          await updateInvitationStatus(sib.id, 'approved');
        }
      }

      // 3. Add specialist to project teamMembers array on project document if not already added
      const memberUid = invitation.symbioteId;
      const alreadyInDoc = (project.teamMembers || []).some((m) => m.uid === memberUid);

      if (!alreadyInDoc) {
        await addTeamMemberToProject(projectId, {
          uid: memberUid,
          displayName: invitation.symbioteName || 'Specialist',
          role: invitation.symbioteTitle || 'Senior AI Specialist',
          avatarInitials: invitation.symbioteAvatarInitials || 'SP',
          hourlyRate: invitation.budgetRange ? parseFloat(invitation.budgetRange.replace(/[^0-9.]/g, '')) || 100 : 100,
          matchScore: invitation.matchScore || invitation.aiMatchScore || 95,
        });
      }

      setToastMsg(`Approved ${invitation.symbioteName || 'Specialist'} for project team!`);
    } catch (err) {
      console.error('Failed to approve member:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel/Rescind invitation handler
  const handleCancelInvitation = async (invitationId: string) => {
    setActionLoadingId(invitationId);
    try {
      await updateInvitationStatus(invitationId, 'declined');
      setToastMsg('Invitation rescinded successfully.');
    } catch (err) {
      console.error('Failed to rescind invitation:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const hasAnyTeamOrInvitations =
    allApprovedMembers.length > 0 ||
    acceptedInvitations.length > 0 ||
    pendingInvitations.length > 0;

  const isCompleted = project.status === 'completed' || project.status === 'closed';

  if (loading) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-[var(--color-text-secondary)]">Loading project team & invitations...</p>
      </div>
    );
  }

  if (!hasAnyTeamOrInvitations) {
    return (
      <div className="py-6">
        <EmptyState
          icon={Users}
          title={isCompleted ? "No Team Members on Completed Project" : "No Team Members or Pending Invitations"}
          description={isCompleted ? "This project has been finalized and completed." : "Invite top AI specialists and Symbiote engineers to join this project team."}
          actionLabel={isCompleted ? undefined : "Add Team Member"}
          onAction={isCompleted ? undefined : onOpenAddTeamModal}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* TOAST MESSAGE */}
      {toastMsg && (
        <div className="p-3 rounded-[8px] bg-[var(--color-success-green)]/15 border border-[var(--color-success-green)]/30 text-[var(--color-success-green)] text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-[var(--color-text-secondary)] hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* TOP BAR ACTION */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text-primary)]">Project Team Roster</h2>
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">
            {allApprovedMembers.length} Approved Member(s) · {acceptedInvitations.length} Awaiting Approval · {pendingInvitations.length} Pending Invitation(s)
          </p>
        </div>

        {!isCompleted ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddTeamModal}
            className="flex items-center gap-1.5 text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Team Member</span>
          </Button>
        ) : (
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Roster Finalized (Completed)</span>
          </span>
        )}
      </div>

      {/* SECTION 1: APPROVED TEAM MEMBERS (PRIMARY FOCUS - FULL DETAIL CARDS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-success-green)] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[var(--color-success-green)]" />
            <span>Approved Team Members ({allApprovedMembers.length})</span>
          </h3>
        </div>

        {allApprovedMembers.length === 0 ? (
          <div className="p-4 rounded-[10px] bg-[var(--color-surface)]/50 border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] text-center font-mono">
            No approved team members yet. Review accepted candidates below to approve them.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allApprovedMembers.map((member) => (
              <Card
                key={member.uid}
                className="p-5 bg-[var(--color-surface)] border border-[var(--color-success-green)]/40 hover:border-[var(--color-success-green)]/80 transition-all rounded-[14px] space-y-4 shadow-sm relative overflow-hidden group"
              >
                {/* Top Badge Accent */}
                <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-success-green)] to-transparent opacity-60" />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <Avatar
                      name={member.displayName}
                      initials={member.avatarInitials}
                      src={member.avatarUrl}
                      size="lg"
                      statusDot={getUserStatusDot(realUsersMap.get(member.uid) || (member as any))}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{member.displayName}</h4>
                        <button
                          type="button"
                          onClick={() => setProfileModalUid(member.uid)}
                          className="text-[10.5px] font-mono text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1 cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Profile</span>
                        </button>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] font-medium mt-0.5">{member.role}</p>
                      {member.email && (
                        <p className="text-[10.5px] font-mono text-[var(--color-text-secondary)] flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                          <span>{member.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <StatusPill variant="green" label="Approved Member" className="text-[10px] font-mono font-bold shrink-0" />
                </div>

                <div className="pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {member.matchScore ? (
                      <span className="px-2 py-0.5 rounded bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] font-bold text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>{member.matchScore}% Match</span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-secondary)] flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-success-green)] shrink-0" />
                        <span>Verified</span>
                      </span>
                    )}

                    {member.hourlyRate && (
                      <span className="text-[var(--color-text-primary)] font-bold">${member.hourlyRate}/hr</span>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/client/messages?specialist=${member.uid}`)}
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold h-8 px-3.5 bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-primary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/40 transition-all shrink-0 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--color-accent-cyan)] shrink-0" />
                    <span>Message</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ACCEPTED — AWAITING APPROVAL (CONDENSED LIST ROWS) */}
      {acceptedInvitations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Accepted — Awaiting Approval ({acceptedInvitations.length})</span>
            </h3>
          </div>

          <div className="border border-[var(--color-border)] rounded-[12px] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] overflow-hidden shadow-none">
            {acceptedInvitations.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)]/50 hover:bg-[var(--color-background)]/80 transition-colors text-xs"
              >
                {/* CANDIDATE INFO */}
                <div className="flex items-center gap-3">
                  <Avatar
                    name={inv.symbioteName || 'Candidate'}
                    initials={inv.symbioteAvatarInitials}
                    src={inv.symbioteAvatarUrl}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {inv.symbioteName || 'Accepted Candidate'}
                      </span>
                      <button
                        type="button"
                        onClick={() => inv.symbioteId && setProfileModalUid(inv.symbioteId)}
                        className="text-[10.5px] text-[var(--color-accent-cyan)] hover:underline flex items-center gap-0.5 font-mono cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Profile</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {inv.symbioteTitle || 'Senior AI Engineer'} · <span className="font-mono text-[var(--color-text-primary)]">{inv.budgetRange}</span>
                    </p>
                  </div>
                </div>

                {/* STATUS & APPROVAL/DECLINE ACTIONS */}
                <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--color-border)]">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/20">
                    Accepted — Pending Approval
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="xs"
                      disabled={actionLoadingId === inv.id}
                      onClick={() => inv.id && handleCancelInvitation(inv.id)}
                      className="text-rose-400 hover:text-rose-300 text-[11px] h-7 px-2"
                    >
                      Decline
                    </Button>

                    <Button
                      variant="primary"
                      size="xs"
                      disabled={actionLoadingId === inv.id || isCompleted}
                      onClick={() => handleApproveMember(inv)}
                      className="bg-[var(--color-accent-cyan)] text-slate-950 font-bold font-mono text-[11px] h-7 px-2.5 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{actionLoadingId === inv.id ? 'Approving...' : 'Approve'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: INVITED (PENDING RESPONSE - CONDENSED LIGHT LIST ROWS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-warning-amber)] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[var(--color-warning-amber)]" />
            <span>Invited (Pending Response) ({pendingInvitations.length})</span>
          </h3>
        </div>

        {pendingInvitations.length === 0 ? (
          <div className="p-4 rounded-[10px] bg-[var(--color-surface)]/50 border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] text-center font-mono">
            No pending invitations outstanding for this project.
          </div>
        ) : (
          <div className="border border-[var(--color-border)] rounded-[12px] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] overflow-hidden shadow-none">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)]/40 hover:bg-[var(--color-background)]/80 transition-colors"
              >
                {/* CANDIDATE INFO */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={inv.symbioteName || 'Invited Specialist'}
                    initials={inv.symbioteAvatarInitials}
                    src={inv.symbioteAvatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                        {inv.symbioteName || 'Invited Specialist'}
                      </span>
                      <button
                        type="button"
                        onClick={() => inv.symbioteId && setProfileModalUid(inv.symbioteId)}
                        className="text-[10.5px] text-[var(--color-accent-cyan)] hover:underline flex items-center gap-0.5 font-mono cursor-pointer shrink-0"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Profile</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                      {inv.symbioteTitle || 'AI Specialist'} {inv.budgetRange ? `· Offer: ${inv.budgetRange}` : ''}
                    </p>
                  </div>
                </div>

                {/* STATUS & ACTIONS */}
                <div className="flex items-center gap-3.5 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--color-border)]/50">
                  <StatusPill variant="amber" label="Pending Response" className="text-[10px] font-mono shrink-0" />

                  <span className="text-[10.5px] font-mono text-[var(--color-text-secondary)] hidden md:inline">
                    Sent: {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'Recently'}
                  </span>

                  {inv.id && (
                    <button
                      type="button"
                      disabled={actionLoadingId === inv.id}
                      onClick={() => handleCancelInvitation(inv.id!)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rescind</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IN-PAGE PROFILE MODAL (Requirement 3) */}
      {profileModalUid && (
        <UserProfileModal
          isOpen={!!profileModalUid}
          onClose={() => setProfileModalUid(null)}
          userId={profileModalUid}
        />
      )}
    </div>
  );
};

