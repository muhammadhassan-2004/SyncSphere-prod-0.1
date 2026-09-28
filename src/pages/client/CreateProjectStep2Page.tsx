import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { StatusPill } from '@/src/components/ui/badge';
import { WizardStepIndicator } from '@/src/components/widgets/WizardStepIndicator';
import { saveProjectDraft, getProjectById } from '@/src/lib/firestore/projects';
import { Project } from '@/src/types/firestore';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Save,
  DollarSign,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Briefcase,
  Zap,
  Globe,
  Sliders,
  FileCheck,
} from 'lucide-react';

const WIZARD_STEPS = [
  { id: '1', label: 'Basic Info', description: 'Title, category & skills' },
  { id: '2', label: 'Timeline & Schedule', description: 'Dates & work arrangement' },
  { id: '3', label: 'AI Matching', description: 'Preferences & criteria' },
  { id: '4', label: 'Review & Publish', description: 'Final audit & launch' },
];

const CURRENCIES = ['USD ($)', 'EUR (€)', 'GBP (£)', 'CAD ($)', 'AUD ($)'];

export const CreateProjectStep2Page: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  // Hydrated Step 1 context state for summary
  const [step1Data, setStep1Data] = useState<{
    title: string;
    category: string;
    skills: string[];
    description: string;
  }>({
    title: '',
    category: '',
    skills: [],
    description: '',
  });

  // Step 2 Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Med' | 'High' | 'Urgent'>('High');
  const [workMode, setWorkMode] = useState<'Remote' | 'Hybrid' | 'Onsite'>('Remote');
  // UI Feedback State
  const [saving, setSaving] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
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
        if (isMounted && project) {
          setStep1Data({
            title: project.title || 'Untitled Project',
            category: project.category || 'AI Engineering',
            skills: project.skills || [],
            description: project.description || '',
          });

          if (project.startDate) setStartDate(project.startDate);
          if (project.endDate) setEndDate(project.endDate);
          if (project.duration) setDuration(project.duration);
          if (project.priority) setPriority(project.priority);
          if (project.workMode) setWorkMode(project.workMode);
        }
        setLoadingDraft(false);
      })
      .catch((err) => {
        console.error('Error fetching draft:', err);
        setLoadingDraft(false);
      });

    return () => {
      isMounted = false;
    };
  }, [draftId, navigate]);

  // Save Draft Handler
  const handleSaveDraft = async () => {
    if (!firebaseUser?.uid || !draftId) {
      setToastMessage({ type: 'error', text: 'Draft session ID missing. Please return to Step 1.' });
      return null;
    }

    setSaving(true);
    setToastMessage(null);

    try {
      const updatedDraftId = await saveProjectDraft(draftId, {
        ownerId: firebaseUser.uid,
        budgetType: 'hourly',
        startDate,
        endDate,
        duration,
        priority,
        workMode,
        deadline: endDate,
        status: 'draft',
      });

      setToastMessage({ type: 'success', text: 'Timeline & Work Arrangement saved successfully!' });
      setSaving(false);
      return updatedDraftId;
    } catch (err) {
      console.error('Save draft error:', err);
      setToastMessage({ type: 'error', text: 'Failed to save draft. Please try again.' });
      setSaving(false);
      return null;
    }
  };

  // Back Handler
  const handleBack = async () => {
    if (draftId) {
      await handleSaveDraft();
      navigate(`/client/projects/new/step-1?draftId=${draftId}`);
    } else {
      navigate('/client/projects/new/step-1');
    }
  };

  // Continue to Step 3 Handler
  const handleContinue = async () => {
    const savedDraftId = await handleSaveDraft();
    if (savedDraftId) {
      navigate(`/client/projects/new/step-3?draftId=${savedDraftId}`);
    }
  };

  if (loadingDraft) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--color-text-secondary)]">Loading draft project session...</p>
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
            <span>Project Creation Wizard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
            Timeline & Work Arrangement
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Step 2 of 4 — Execution window, dates & specialist collaboration structure
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

      {/* WIZARD STEP INDICATOR (Step 1 Completed, Step 2 Active) */}
      <Card className="p-4 sm:p-6">
        <WizardStepIndicator steps={WIZARD_STEPS} currentStepIndex={1} />
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

      {/* TWO COLUMN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT FORM PANEL (2 COLS) */}
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              Timeline & Work Arrangement Parameters
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Configure the execution calendar, work mode, and project priority for specialist collaboration.
            </p>
          </div>

          <div className="space-y-6">
            {/* TIMELINE DATES & DURATION */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-info-blue)]" />
                Timeline & Schedule
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Target Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Target End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Estimated Duration
                  </label>
                  <Input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 3 months, 8 weeks"
                  />
                </div>
              </div>
            </div>

            {/* PRIORITY LEVEL TOGGLE BUTTON GROUP */}
            <div className="border-t border-[var(--color-border)] pt-5 space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                Priority Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Low', 'Med', 'High', 'Urgent'] as const).map((p) => {
                  const isActive = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-3 rounded-[8px] text-xs font-medium border text-center transition-all cursor-pointer ${
                        isActive
                          ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/15 text-[var(--color-text-primary)] font-bold ring-1 ring-[var(--color-accent-cyan)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* WORK MODE TOGGLE BUTTON GROUP */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                Work Arrangement / Location Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Remote', 'Hybrid', 'Onsite'] as const).map((mode) => {
                  const isActive = workMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setWorkMode(mode)}
                      className={`py-2.5 px-3 rounded-[8px] text-xs font-medium border text-center transition-all cursor-pointer ${
                        isActive
                          ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/15 text-[var(--color-text-primary)] font-bold ring-1 ring-[var(--color-accent-cyan)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]'
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT LIVE-UPDATING PROJECT SUMMARY CARD (1 COL) */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-5 space-y-4 bg-[var(--color-surface)] border-[var(--color-border)] sticky top-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                  Live Project Summary
                </h3>
              </div>
              <StatusPill variant="green" label="Auto-Sync" />
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Title & Category */}
              <div>
                <p className="text-[10.5px] text-[var(--color-text-secondary)] uppercase tracking-wider font-mono font-semibold">
                  Project Title
                </p>
                <p className="font-bold text-[var(--color-text-primary)] text-sm mt-0.5 line-clamp-2">
                  {step1Data.title || 'Untitled Project Brief'}
                </p>
                {step1Data.category && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    {step1Data.category}
                  </span>
                )}
              </div>

              {/* Schedule Summary */}
              <div className="space-y-1.5">
                <p className="text-[10.5px] text-[var(--color-text-secondary)] uppercase tracking-wider font-mono font-semibold">
                  Execution Window
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">Duration:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{duration}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)] font-mono">
                  <span>{startDate}</span>
                  <span>→</span>
                  <span>{endDate}</span>
                </div>
              </div>

              {/* Work Arrangement & Priority */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">Work Mode</p>
                  <p className="font-semibold text-[var(--color-text-primary)]">{workMode}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-mono">Priority</p>
                  <StatusPill
                    variant={priority === 'Urgent' ? 'red' : priority === 'High' ? 'amber' : 'blue'}
                    label={priority}
                    className="text-[9.5px] py-0 px-1.5"
                  />
                </div>
              </div>

              {/* Skills Tags Summary */}
              {step1Data.skills.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-[var(--color-border)]">
                  <p className="text-[10.5px] text-[var(--color-text-secondary)] font-mono">Required Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {step1Data.skills.map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded-[4px] text-[10px] bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
          disabled={saving}
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
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleContinue}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
