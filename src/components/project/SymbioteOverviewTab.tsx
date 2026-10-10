import React from 'react';
import { Project, UserProfile } from '@/src/types/firestore';
import { formatProjectBudget, getProjectBillingModel } from '@/src/lib/utils/projectBudget';
import { Card } from '@/src/components/ui/card';
import { StatusPill } from '@/src/components/ui/badge';
import { Avatar } from '@/src/components/ui/avatar';
import { getUserStatusDot } from '@/src/lib/utils/presence';
import {
  FileText,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Bot,
  ShieldAlert,
  Calendar,
  Building,
  CheckCircle2,
  Briefcase,
  Layers,
} from 'lucide-react';

interface SymbioteOverviewTabProps {
  project: Project;
  clientProfile?: UserProfile | null;
  hoursLogged?: number;
  completedMilestones?: number;
  totalMilestones?: number;
  closedTasks?: number;
  totalTasks?: number;
  daysLeft?: number;
}

export const SymbioteOverviewTab: React.FC<SymbioteOverviewTabProps> = ({
  project,
  clientProfile,
  hoursLogged = 0,
  completedMilestones = 0,
  totalMilestones = 0,
  closedTasks = 0,
  totalTasks = 0,
  daysLeft = 0,
}) => {
  const milestoneProgress = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : (project.progressPercent ?? 35);
  const healthStatus = project.healthStatus || 'On Track';

  const teamMembers = project.teamMembers || [];

  return (
    <div className="space-y-6">
      {/* 1. OVERALL PROGRESS & HEALTH BANNER */}
      <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Overall Project Progress
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill variant="green" label={`Health: ${healthStatus}`} />
            <span className="text-xs font-mono font-bold text-emerald-400">
              {milestoneProgress}% Completed
            </span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full h-2.5 rounded-full bg-[var(--color-background)] overflow-hidden border border-[var(--color-border)]">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${milestoneProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-secondary)] pt-0.5">
          <span>Milestones: {completedMilestones}/{totalMilestones} Complete</span>
          <span>Tasks: {closedTasks}/{totalTasks} Closed</span>
        </div>
      </Card>

      {/* 2. MAIN TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: DESCRIPTION, AI BRIEF, & TEAM (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* PROJECT OVERVIEW & SCOPE */}
          <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                Project Overview & Scope
              </h3>
            </div>

            <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
              {project.description || 'No detailed description provided for this project.'}
            </div>

            {/* REQUIRED SKILL CRITERIA & STACK */}
            {project.skills && project.skills.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
                <p className="text-[10.5px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase">
                  Required Skill Criteria & Tech Stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-[6px] text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono"
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
            <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                    PreSync AI Synthesized Brief
                  </h3>
                </div>
                <StatusPill variant="green" label="Attached & Audited" />
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono uppercase font-semibold">
                    Executive Title
                  </p>
                  <p className="font-bold text-[var(--color-text-primary)] text-sm mt-0.5">
                    {project.aiBrief.title}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono uppercase font-semibold">
                    Executive Scope
                  </p>
                  <div className="p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[11.5px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line mt-1">
                    {project.aiBrief.description}
                  </div>
                </div>

                {project.aiBrief.keyRisks && project.aiBrief.keyRisks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-mono uppercase font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      Risk Factors & Mitigation Pathways
                    </p>
                    <ul className="space-y-1 pl-2 text-[11px] text-[var(--color-text-secondary)]">
                      {project.aiBrief.keyRisks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* CLIENT & ASSIGNED TEAM MEMBERS */}
          <Card className="p-6 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                  Client & Project Team
                </h3>
              </div>
            </div>

            {/* Client Info Block */}
            {clientProfile && (
              <div className="p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={clientProfile.displayName || 'Client'}
                    initials={clientProfile.avatarInitials}
                    size="sm"
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">
                      {clientProfile.displayName}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {clientProfile.companyName || clientProfile.companyProfile?.companyName || 'Project Client'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-mono font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                  Project Client
                </span>
              </div>
            )}

            {/* Team Members List */}
            {teamMembers.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[10.5px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase">
                  Assigned Team Specialists ({teamMembers.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={member.uid || idx}
                      className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] flex items-center gap-3"
                    >
                      <Avatar
                        name={member.displayName}
                        initials={member.avatarInitials}
                        size="sm"
                        statusDot={getUserStatusDot(member)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                            {member.displayName}
                          </p>
                          {member.matchScore && (
                            <span className="text-[9.5px] font-mono font-bold text-emerald-400 shrink-0">
                              {member.matchScore}% Match
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] truncate">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: BUDGET, TIMELINE, & QUICK STATS (1 COL) */}
        <div className="space-y-6 lg:col-span-1">
          {/* BUDGET & EXECUTION WINDOW */}
          <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-4 shadow-sm">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Project Financials & Schedule
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--color-text-secondary)] font-mono uppercase">
                    Project Budget
                  </span>
                  <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                    {formatProjectBudget(project)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Work Mode:</span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {project.workMode || 'Remote'}
                  </span>
                </div>
                {project.priority && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--color-text-secondary)]">Priority:</span>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {project.priority}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Duration:</span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {project.duration || 'Flexible'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1 text-[11px] font-mono text-[var(--color-text-secondary)]">
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span className="text-[var(--color-text-primary)] font-semibold">
                    {project.startDate || 'Immediate'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target End Date:</span>
                  <span className="text-[var(--color-text-primary)] font-semibold">
                    {project.endDate || 'TBD'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* QUICK STATS */}
          <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-3 font-mono uppercase tracking-wider">
              Workspace Overview Stats
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* HOURS LOGGED */}
              <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  Hours Logged
                </span>
                <span className="text-lg font-bold text-cyan-400 font-mono">
                  {hoursLogged} hrs
                </span>
              </div>

              {/* MILESTONES DONE */}
              <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  Milestones
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {completedMilestones}/{totalMilestones}
                </span>
              </div>

              {/* TASKS CLOSED */}
              <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  Tasks Closed
                </span>
                <span className="text-lg font-bold text-[var(--color-text-primary)] font-mono">
                  {closedTasks}/{totalTasks}
                </span>
              </div>

              {/* DAYS LEFT */}
              <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">
                  Days Left
                </span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {daysLeft} days
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
