import React, { useState, useEffect } from 'react';
import { Project } from '@/src/types/firestore';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Avatar } from '@/src/components/ui/avatar';
import { StatusPill } from '@/src/components/ui/badge';
import {
  FileText,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  UserPlus,
  Bot,
  ShieldAlert,
  Cpu,
  Calendar,
  Briefcase,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface OverviewTabProps {
  project: Project;
  onOpenAddTeamModal: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ project, onOpenAddTeamModal }) => {
  const [realUsersMap, setRealUsersMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const uMap = new Map<string, any>();
      snap.docs.forEach((d) => {
        uMap.set(d.id, { uid: d.id, ...d.data() });
      });
      setRealUsersMap(uMap);
    });
    return () => unsub();
  }, []);

  const rawTeamMembers = project.teamMembers || [];
  const teamMembers = rawTeamMembers
    .filter((m) => {
      if (!m.uid) return false;
      if (m.uid === 'owner-default') return true;
      if (realUsersMap.size > 0) {
        return realUsersMap.has(m.uid);
      }
      return !m.uid.startsWith('symbiote-10');
    })
    .map((m) => {
      const userDoc = realUsersMap.get(m.uid);
      if (userDoc) {
        return {
          ...m,
          displayName: userDoc.displayName || `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || m.displayName,
          role: userDoc.title || userDoc.role || m.role,
          avatarUrl: userDoc.avatarUrl || userDoc.photoURL || (m as any).avatarUrl,
        };
      }
      return {
        ...m,
        avatarUrl: (m as any).avatarUrl,
      };
    });

  const progressPercent =
    typeof project.progressPct === 'number'
      ? project.progressPct
      : typeof project.progressPercent === 'number'
      ? project.progressPercent
      : project.status === 'completed'
      ? 100
      : 0;
  const isCompleted = project.status === 'completed' || project.status === 'closed';
  const healthStatus = project.healthStatus || 'On Track';

  // Budget formatting
  const formattedBudget =
    typeof project.budget === 'number'
      ? `$${project.budget.toLocaleString()}`
      : project.minBudget || project.maxBudget
      ? `$${(project.minBudget || 0).toLocaleString()} – $${(project.maxBudget || 0).toLocaleString()}`
      : '$15,000 Total';

  return (
    <div className="space-y-6">
      {/* 1. PROGRESS & HEALTH BANNER */}
      <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Project Progress
              </h3>
              <p className="text-xs text-slate-400">Current execution status and milestone phases</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <StatusPill variant="green" label={`Health: ${healthStatus}`} />
            <span className="text-xs font-semibold text-[var(--color-accent-cyan)]">
              {progressPercent}% Completed
            </span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* BALANCED TIMELINE / PHASES CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-3 p-3 rounded-[10px] bg-slate-900/50 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">Phase 1: Scope & Architecture</p>
              <p className="text-[11px] text-emerald-400 font-medium">Completed</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-[10px] bg-slate-900/50 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">Phase 2: Core Engineering</p>
              <p className="text-[11px] text-cyan-400 font-medium">In Progress</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. MAIN TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: DESCRIPTION & AI BRIEF (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* PROJECT BRIEF & DESCRIPTION */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <FileText className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <h3 className="text-sm font-semibold text-slate-100">
                Project Scope & Objectives
              </h3>
            </div>

            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {project.description || 'No detailed description provided for this project.'}
            </div>

            {/* REQUIRED TECH STACK */}
            {project.skills && project.skills.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs font-medium text-slate-400">
                  Required Skills & Technologies
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-[6px] text-xs font-medium bg-slate-800/80 border border-slate-700/60 text-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* PRESYNC AI EXECUTIVE BRIEF CARD */}
          {project.aiBrief && (
            <Card className="p-6 space-y-4 bg-[var(--color-surface)] border-[var(--color-border)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <h3 className="text-sm font-semibold text-slate-100">
                    AI Executive Brief
                  </h3>
                </div>
                <StatusPill variant="green" label="Attached & Audited" />
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Executive Summary
                  </p>
                  <p className="font-semibold text-slate-100 text-sm mt-1">
                    {project.aiBrief.title}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1.5">
                    Project Scope
                  </p>
                  <div className="p-3.5 bg-slate-900/60 border border-slate-800/90 rounded-[8px] text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {project.aiBrief.description}
                  </div>
                </div>

                {project.aiBrief.keyRisks && project.aiBrief.keyRisks.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      Risk Factors & Mitigation Pathways
                    </p>
                    <ul className="space-y-1.5 pl-1 text-xs text-slate-300">
                      {project.aiBrief.keyRisks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ASSIGNED TEAM MEMBERS ROW */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Assigned Team ({teamMembers.length})
                </h3>
              </div>
              {!isCompleted ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenAddTeamModal}
                  className="flex items-center gap-1.5 text-xs font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </Button>
              ) : (
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-[6px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Roster Finalized</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamMembers.map((member, idx) => (
                <div
                  key={member.uid || idx}
                  className="p-3 rounded-[10px] bg-slate-900/50 border border-slate-800 flex items-center gap-3"
                >
                  <Avatar
                    name={member.displayName}
                    initials={member.avatarInitials}
                    src={(member as any).avatarUrl}
                    size="sm"
                    statusDot="online"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-slate-100 truncate">
                        {member.displayName}
                      </p>
                      {member.matchScore && (
                        <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded shrink-0">
                          {member.matchScore}% Match
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{member.role || 'Contributor'}</p>
                    {member.hourlyRate && (
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        ${member.hourlyRate}/hr
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: BUDGET & TIMELINE RECAP (1 COL) */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5 space-y-4">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Budget & Timeline
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-[8px] bg-slate-900/50 border border-slate-800 space-y-1.5">
                <span className="text-xs text-slate-400 block font-medium">
                  Total Budget Allocation
                </span>
                <p className="text-lg font-bold text-slate-100">
                  {formattedBudget}
                </p>
                <span className="text-[11px] text-slate-400 capitalize block">
                  Model: {project.budgetType || 'fixed'}
                </span>
              </div>

              <div className="p-3.5 rounded-[8px] bg-slate-900/50 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Work Mode:</span>
                  <span className="font-medium text-slate-200">
                    {project.workMode || 'Remote'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Commitment:</span>
                  <span className="font-medium text-slate-200">
                    {project.weeklyCommitment || 40} hrs / week
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Duration:</span>
                  <span className="font-medium text-slate-200">
                    {project.duration || '3 months'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-slate-900/50 border border-slate-800 space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span className="text-slate-200 font-medium">
                    {project.startDate || 'Immediate'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target End Date:</span>
                  <span className="text-slate-200 font-medium">
                    {project.endDate || 'TBD'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
