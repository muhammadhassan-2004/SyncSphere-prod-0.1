import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import { WizardStepIndicator } from '@/src/components/widgets/WizardStepIndicator';
import { getProjectById, saveProjectDraft, publishProject } from '@/src/lib/firestore/projects';
import { Project } from '@/src/types/firestore';
import {
  Sparkles,
  ArrowLeft,
  Save,
  Rocket,
  FileText,
  DollarSign,
  Clock,
  Bot,
  Eye,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  Cpu,
  Layers,
  Calendar,
  Briefcase,
  Paperclip,
} from 'lucide-react';

const WIZARD_STEPS = [
  { id: '1', label: 'Basic Info', description: 'Title, category & skills' },
  { id: '2', label: 'Budget & Timeline', description: 'Cost parameters & schedule' },
  { id: '3', label: 'AI Matching', description: 'Preferences & criteria' },
  { id: '4', label: 'Review & Publish', description: 'Final audit & launch' },
];

export const CreateProjectStep4Page: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  // Project state loaded from Firestore
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);

  // Step 4 interactive state
  const [visibility, setVisibility] = useState<'Public' | 'Invite Only'>('Public');

  // UI feedback state
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if no draftId
  useEffect(() => {
    if (!draftId) {
      navigate('/client/projects/new/step-1', { replace: true });
      return;
    }

    let isMounted = true;
    getProjectById(draftId)
      .then((project) => {
        if (!isMounted) return;

        if (project) {
          setProjectData(project);
          if (project.visibility) {
            setVisibility(project.visibility);
          }
        }
        setLoadingDraft(false);
      })
      .catch((err) => {
        console.error('Error fetching project draft for Step 4:', err);
        setLoadingDraft(false);
      });

    return () => {
      isMounted = false;
    };
  }, [draftId, navigate]);

  // Save Draft handler
  const handleSaveDraft = async () => {
    if (!firebaseUser?.uid || !draftId) return;

    setSaving(true);
    setToastMessage(null);

    try {
      const clientName =
        userProfile?.displayName ||
        (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : null) ||
        userProfile?.companyName ||
        firebaseUser.displayName ||
        'Client';
      const companyName = userProfile?.companyName || userProfile?.companyProfile?.companyName || undefined;

      await saveProjectDraft(draftId, {
        ownerId: firebaseUser.uid,
        clientId: firebaseUser.uid,
        clientName,
        companyName,
        clientEmail: firebaseUser.email || undefined,
        visibility,
        status: 'draft',
      });

      setToastMessage({ type: 'success', text: 'Project draft and visibility preferences saved successfully.' });
    } catch (err) {
      console.error('Error saving draft in Step 4:', err);
      setToastMessage({ type: 'error', text: 'Failed to save draft preferences.' });
    } finally {
      setSaving(false);
    }
  };

  // Publish Project handler
  const handlePublish = async () => {
    if (!draftId) return;

    setPublishing(true);
    setToastMessage(null);

    try {
      if (firebaseUser?.uid) {
        const clientName =
          userProfile?.displayName ||
          (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : null) ||
          userProfile?.companyName ||
          firebaseUser.displayName ||
          'Client';
        const companyName = userProfile?.companyName || userProfile?.companyProfile?.companyName || undefined;

        await saveProjectDraft(draftId, {
          ownerId: firebaseUser.uid,
          clientId: firebaseUser.uid,
          clientName,
          companyName,
          clientEmail: firebaseUser.email || undefined,
        });
      }

      await publishProject(draftId, visibility);

      setToastMessage({ type: 'success', text: '🎉 Project published successfully! Redirecting to project overview...' });

      setTimeout(() => {
        navigate(`/client/projects/${draftId}`);
      }, 1200);
    } catch (err) {
      console.error('Error publishing project:', err);
      setToastMessage({ type: 'error', text: 'Failed to publish project. Please try again.' });
      setPublishing(false);
    }
  };

  // Back handler
  const handleBack = () => {
    navigate(`/client/projects/new/step-3?draftId=${draftId}`);
  };

  if (loadingDraft) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--color-text-secondary)]">Aggregating project specifications for final review...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Final Quality Audit & Launch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
            Review & Publish
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Step 4 of 4 — Verify aggregated project parameters and launch to talent marketplace
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/client/projects')}
          className="shrink-0 flex items-center gap-2 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Wizard</span>
        </Button>
      </div>

      {/* WIZARD STEP INDICATOR (Steps 1, 2 & 3 Completed, Step 4 Active) */}
      <Card className="p-4 sm:p-6">
        <WizardStepIndicator steps={WIZARD_STEPS} currentStepIndex={3} />
      </Card>

      {/* TOAST MESSAGE BANNER */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-[10px] border text-xs flex items-center justify-between gap-3 ${
            toastMessage.type === 'success'
              ? 'bg-[var(--color-success-green)]/10 border-[var(--color-success-green)]/30 text-[var(--color-success-green)]'
              : 'bg-[var(--color-danger-red)]/10 border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/10 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* READ-ONLY SUMMARY PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: BASIC INFO & BUDGET/TIMELINE (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. BASIC INFORMATION SUMMARY CARD */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                  1. Basic Information Summary
                </h2>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/client/projects/new/step-1?draftId=${draftId}`)}
                className="text-[11px] h-7 px-2.5"
              >
                Edit Step 1
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-[10.5px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase">
                  Project Title
                </p>
                <p className="font-bold text-[var(--color-text-primary)] text-base mt-0.5">
                  {projectData?.title || 'Untitled Project'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px]">
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">Category</p>
                  <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                    {projectData?.category || 'AI Engineering'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">Industry</p>
                  <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                    {projectData?.industry || 'FinTech'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">Project Type</p>
                  <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                    {projectData?.projectType || 'One-time Project'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">Exp. Level</p>
                  <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                    {projectData?.experienceLevel || 'Expert'}
                  </p>
                </div>
              </div>

              {/* Skills Tags */}
              {projectData?.skills && projectData.skills.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10.5px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase">
                    Required Tech Stack & Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {projectData.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-[6px] text-xs font-medium bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-[10.5px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase">
                  Project Brief & Scope
                </p>
                <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                  {projectData?.description || 'No detailed brief specified.'}
                </div>
              </div>
            </div>
          </Card>

          {/* 2. BUDGET, TIMELINE & WORK ARRANGEMENT SUMMARY CARD */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                  2. Budget, Timeline & Arrangement Summary
                </h2>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/client/projects/new/step-2?draftId=${draftId}`)}
                className="text-[11px] h-7 px-2.5"
              >
                Edit Step 2
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Budget Model:</span>
                  <span className="font-bold text-[var(--color-text-primary)] capitalize">
                    {projectData?.budgetType === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}
                  </span>
                </div>
                <div className="pt-1 border-t border-[var(--color-border)]/50 text-[11px] font-mono text-[var(--color-accent-cyan)] font-bold">
                  {projectData?.budgetType === 'hourly'
                    ? `$${projectData.minBudget || 50} – $${projectData.maxBudget || 150}/hr`
                    : projectData?.maxBudget
                    ? `$${Number(projectData.minBudget || 0).toLocaleString()} – $${Number(projectData.maxBudget).toLocaleString()}`
                    : 'Flexible Budget'}
                </div>
              </div>

              <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Duration:</span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {projectData?.duration || 'Flexible'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]/50 text-[11px] font-mono text-[var(--color-text-secondary)]">
                  <span>{projectData?.startDate || 'TBD'}</span>
                  <span>→</span>
                  <span>{projectData?.endDate || 'TBD'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Work Mode:</span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {projectData?.workMode || 'Remote'}
                  </span>
                </div>
                <div className="pt-1 border-t border-[var(--color-border)]/50 text-[11px] text-[var(--color-text-secondary)]">
                  Location & arrangement
                </div>
              </div>

              <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-secondary)]">Priority Level:</span>
                  <StatusPill
                    variant={projectData?.priority === 'Urgent' ? 'red' : projectData?.priority === 'High' ? 'amber' : 'blue'}
                    label={projectData?.priority || 'High'}
                    className="text-[9.5px] py-0 px-1.5"
                  />
                </div>
                <div className="pt-1 border-t border-[var(--color-border)]/50 text-[11px] text-[var(--color-text-secondary)]">
                  Execution queue priority
                </div>
              </div>
            </div>
          </Card>

          {/* 3. PRESYNC AI BRIEF SUMMARY CARD */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                  3. PreSync AI Executive Brief
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {projectData?.aiBriefAttached ? (
                  <StatusPill variant="green" label="Brief Verified & Attached" />
                ) : (
                  <StatusPill variant="amber" label="Brief Not Attached" />
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/client/projects/new/step-3?draftId=${draftId}`)}
                  className="text-[11px] h-7 px-2.5"
                >
                  Edit Step 3
                </Button>
              </div>
            </div>

            {projectData?.aiBrief ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase">
                    Synthesized Title
                  </p>
                  <p className="font-bold text-[var(--color-text-primary)] text-sm mt-0.5">
                    {projectData.aiBrief.title}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase">
                    Executive Scope & Architecture
                  </p>
                  <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
                    {projectData.aiBrief.description}
                  </div>
                </div>

                {projectData.aiBrief.keyRisks && projectData.aiBrief.keyRisks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-[var(--color-warning-amber)]" />
                      Risk Assessment
                    </p>
                    <ul className="space-y-1 pl-2 text-[11px] text-[var(--color-text-secondary)]">
                      {projectData.aiBrief.keyRisks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning-amber)] mt-1 shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-[10px] text-xs text-[var(--color-text-secondary)] text-center">
                No custom AI brief attached. Standard project specifications will be published.
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: VISIBILITY SETTINGS & LAUNCH CONTROLS (1 COL) */}
        <div className="space-y-6 lg:col-span-1">
          {/* VISIBILITY SETTINGS TOGGLE BUTTON GROUP */}
          <Card className="p-5 space-y-4">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Visibility Settings
              </h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Control who can discover and submit proposals to your project.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setVisibility('Public')}
                className={`w-full p-3.5 rounded-[10px] border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  visibility === 'Public'
                    ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 text-[var(--color-text-primary)] ring-1 ring-[var(--color-accent-cyan)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]'
                }`}
              >
                <Globe className={`w-4 h-4 mt-0.5 shrink-0 ${visibility === 'Public' ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'}`} />
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">Public Marketplace</p>
                  <p className="text-[10.5px] text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                    Visible to all verified Symbiote specialists & AI matching engine algorithms.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('Invite Only')}
                className={`w-full p-3.5 rounded-[10px] border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  visibility === 'Invite Only'
                    ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 text-[var(--color-text-primary)] ring-1 ring-[var(--color-accent-cyan)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]'
                }`}
              >
                <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${visibility === 'Invite Only' ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'}`} />
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">Invite Only</p>
                  <p className="text-[10.5px] text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                    Hidden from public feed; accessible only via direct invitation links.
                  </p>
                </div>
              </button>
            </div>
          </Card>

          {/* LAUNCH READINESS CHECKLIST */}
          <Card className="p-5 space-y-3 bg-[var(--color-surface)] border-[var(--color-border)]">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
              Launch Readiness
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[var(--color-success-green)]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Title & Category verified</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-success-green)]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Timeline & Work Arrangement configured</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-success-green)]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>AI Brief reviewed & attached</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-success-green)]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Milestone breakdown pre-validated</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] flex items-center justify-between gap-4 shadow-none">
        <Button
          variant="secondary"
          size="md"
          onClick={handleBack}
          disabled={publishing || saving}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleSaveDraft}
            disabled={publishing || saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handlePublish}
            disabled={publishing || saving}
            className="flex items-center gap-2 bg-gradient-to-r from-[var(--color-accent-cyan)] to-cyan-400 text-slate-950 font-bold hover:brightness-110"
          >
            <Rocket className="w-4 h-4" />
            <span>{publishing ? 'Publishing Project...' : 'Publish Project'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
