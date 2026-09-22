import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { WizardStepIndicator } from '@/src/components/widgets/WizardStepIndicator';
import { saveProjectDraft, getProjectById } from '@/src/lib/firestore/projects';
import { getPlatformOperationsSettings } from '@/src/lib/firestore/adminSettings';
import { INDUSTRIES } from '@/src/lib/constants';
import { FieldError } from '@/src/lib/validation/formValidators';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Save,
  UploadCloud,
  FileText,
  X,
  Plus,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

const WIZARD_STEPS = [
  { id: '1', label: 'Basic Info', description: 'Title, category & skills' },
  { id: '2', label: 'Scope & Budget', description: 'Milestones & deliverables' },
  { id: '3', label: 'AI Matching', description: 'Preferences & criteria' },
  { id: '4', label: 'Review & Publish', description: 'Final audit & launch' },
];

const CATEGORIES = [
  'AI Engineering',
  'Autonomous Agents',
  'Computer Vision',
  'LLM Fine-Tuning',
  'Full-Stack Development',
  'Data Engineering',
  'DevOps & Cloud Architecture',
  'Cybersecurity & Compliance',
];

const PROJECT_TYPES = [
  'One-time Project',
  'Ongoing Contract',
  'Full-time Hiring',
  'Advisory & Consulting',
];

const EXPERIENCE_LEVELS = [
  'Entry Level',
  'Intermediate',
  'Expert',
  'AI Symbiote Specialist',
];

const SKILL_SUGGESTIONS = [
  'Python',
  'PyTorch',
  'LangChain',
  'React',
  'Vector DB',
  'FastAPI',
  'TypeScript',
  'Docker',
  'Llama 3',
  'OpenAI API',
  'TensorFlow',
  'Kubernetes',
];

export const CreateProjectStep1Page: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [industry, setIndustry] = useState('');
  const [projectType, setProjectType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);

  // UI Feedback State
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<{ title?: string; category?: string; description?: string }>({});
  const [maxUploadMb, setMaxUploadMb] = useState(25);

  useEffect(() => {
    getPlatformOperationsSettings().then((cfg) => {
      if (cfg?.maxFileUploadSizeMb) setMaxUploadMb(cfg.maxFileUploadSizeMb);
    });
  }, []);

  // Hydrate draft if draftId is present
  useEffect(() => {
    if (!draftId) return;

    let isMounted = true;
    getProjectById(draftId).then((project) => {
      if (isMounted && project) {
        if (project.title) setTitle(project.title);
        if (project.category) setCategory(project.category);
        if (project.industry) setIndustry(project.industry);
        if (project.projectType) setProjectType(project.projectType);
        if (project.experienceLevel) setExperienceLevel(project.experienceLevel);
        if (project.skills) setSkills(project.skills);
        if (project.description) setDescription(project.description);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [draftId]);

  // Handle Skills Tag Input
  const handleAddSkill = (skill?: string | React.MouseEvent) => {
    const rawInput = typeof skill === 'string' ? skill : skillInput;
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const tokens = trimmed.split(',').map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) return;

    setSkills((prev) => {
      const updated = [...prev];
      for (const tok of tokens) {
        if (!updated.some((s) => s.toLowerCase() === tok.toLowerCase())) {
          updated.push(tok);
        }
      }
      return updated;
    });
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()));
  };

  const handleKeyDownSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSkill(skillInput);
    }
  };

  // Handle File Dropzone Mock Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).map((f: File) => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      }));
      setAttachments([...attachments, ...filesArray]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Save Draft Handler
  const handleSaveDraft = async (redirectAfter = false) => {
    if (!firebaseUser?.uid) {
      setToastMessage({ type: 'error', text: 'You must be logged in to save a draft.' });
      return null;
    }

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

      const currentDraftId = await saveProjectDraft(draftId, {
        ownerId: firebaseUser.uid,
        clientId: firebaseUser.uid,
        clientName,
        companyName,
        clientEmail: firebaseUser.email || undefined,
        title: title || 'Untitled Project Brief',
        category,
        industry,
        projectType,
        experienceLevel,
        skills,
        description,
        status: 'draft',
      });

      if (!draftId) {
        setSearchParams({ draftId: currentDraftId });
      }

      setToastMessage({ type: 'success', text: 'Project draft saved successfully!' });
      setSaving(false);
      return currentDraftId;
    } catch (err) {
      console.error('Save draft error:', err);
      setToastMessage({ type: 'error', text: 'Failed to save draft. Please try again.' });
      setSaving(false);
      return null;
    }
  };

  // Continue to Step 2 Handler
  const handleContinue = async () => {
    const newErrors: { title?: string; category?: string; description?: string } = {};
    if (!title.trim()) newErrors.title = 'Project title is required';
    if (!category) newErrors.category = 'Please select a project category';
    if (!description.trim()) newErrors.description = 'Project description is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setToastMessage({ type: 'error', text: 'Please complete all required fields before continuing.' });
      return;
    }

    setErrors({});
    const savedDraftId = await handleSaveDraft();
    if (savedDraftId) {
      navigate(`/client/projects/new/step-2?draftId=${savedDraftId}`);
    }
  };

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
            Create Project
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Step 1 of 4 — Basic Information & Technical Requirements
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

      {/* WIZARD STEP INDICATOR */}
      <Card className="p-4 sm:p-6">
        <WizardStepIndicator steps={WIZARD_STEPS} currentStepIndex={0} />
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
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">Project Overview</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Provide fundamental details so our AI matching engine can route your brief to optimal talent.
            </p>
          </div>

          <div className="space-y-5">
            {/* Project Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-between">
                <span>Project Title <span className="text-[var(--color-danger-red)]">*</span></span>
                <span className="text-[10.5px] text-[var(--color-text-secondary)] font-mono">{title.length}/100</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. E-commerce Platform Redesign & Autonomous Agent Pipeline"
                maxLength={100}
                className={errors.title ? 'border-[var(--color-danger-red)] focus:ring-[var(--color-danger-red)]' : ''}
              />
              <FieldError message={errors.title} />
            </div>

            {/* Category & Industry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Project Category <span className="text-[var(--color-danger-red)]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  className={`w-full bg-[var(--color-surface)] border rounded-[10px] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)] cursor-pointer ${
                    errors.category ? 'border-[var(--color-danger-red)]' : 'border-[var(--color-border)]'
                  }`}
                >
                  <option value="">Select project category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.category} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Industry Domain
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)] cursor-pointer"
                >
                  <option value="">Select industry domain...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Type & Experience Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)] cursor-pointer"
                >
                  <option value="">Select project type...</option>
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Required Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)] cursor-pointer"
                >
                  <option value="">Select experience level...</option>
                  {EXPERIENCE_LEVELS.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Required Skills Tag Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                Required Tech Stack & Skills
              </label>

              {/* Tag Pill Display */}
              <div className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] space-y-2">
                {skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-medium bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] shadow-sm"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-red-400 text-[var(--color-accent-cyan)] cursor-pointer ml-0.5"
                          title={`Remove ${skill}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleKeyDownSkill}
                    placeholder={skills.length === 0 ? 'Type a skill (e.g. React, Node.js) and press Enter or Add...' : 'Add another skill...'}
                    className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-md text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] min-w-[120px] px-2.5 py-1.5 h-8"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleAddSkill(skillInput)}
                    disabled={!skillInput.trim()}
                    className="h-8 px-3 text-xs bg-[var(--color-accent-cyan)] text-black font-bold hover:bg-cyan-400 shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {/* Suggestion Chips */}
              <div className="space-y-1 pt-1">
                <p className="text-[10.5px] text-[var(--color-text-secondary)] font-medium">Popular Skill Suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleAddSkill(s)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10.5px] bg-[var(--color-surface)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center justify-between">
                <span>Detailed Project Brief <span className="text-[var(--color-danger-red)]">*</span></span>
                <span className="text-[10.5px] text-[var(--color-text-secondary)] font-mono">{description.length} chars</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe your project goals, technical requirements, target deliverables, architecture constraints, and expected outcomes..."
                className={`w-full bg-[var(--color-surface)] border rounded-[10px] p-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)] transition-colors resize-y ${
                  errors.description ? 'border-[var(--color-danger-red)]' : 'border-[var(--color-border)]'
                }`}
              />
              <FieldError message={errors.description} />
            </div>

            {/* Supporting Documents Dropzone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                Supporting Documents & Specifications
              </label>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/60 rounded-[12px] bg-[var(--color-surface)]/50 hover:bg-[var(--color-surface)] transition-all cursor-pointer text-center group">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.txt"
                />
                <UploadCloud className="w-8 h-8 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent-cyan)] transition-colors mb-2" />
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  Drag & drop project briefs, spec sheets, or wireframes here
                </p>
                <p className="text-[10.5px] text-[var(--color-text-secondary)] mt-1">
                  Supports PDF, DOC, PNG, JPG up to {maxUploadMb}MB per file
                </p>
              </label>

              {/* File Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Attached Documents:</p>
                  <div className="space-y-1.5">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-[var(--color-accent-cyan)] shrink-0" />
                          <span className="font-medium text-[var(--color-text-primary)] truncate">{file.name}</span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">{file.size}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger-red)] transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* RIGHT CONTEXTUAL TIPS PANEL (1 COL) */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-5 space-y-4 bg-[var(--color-surface)] border-[var(--color-border)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)]">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                  Contextual Guidance
                </h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">Tips for a Great Project Brief</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-cyan)]" />
                  Define Clear Objectives
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed pl-3">
                  State the core problem and expected business outcome clearly. Vague goals delay Symbiote proposal evaluation.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-info-blue)]" />
                  Specific Tech Stack & Models
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed pl-3">
                  Specify model families (e.g. Llama 3, Gemini, Claude) or database preference (e.g. Vector DB, PostgreSQL) in your tech tags.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success-green)]" />
                  Milestone Granularity
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed pl-3">
                  In Step 2 you will define milestones. Break large projects into 2–4 reviewable sprints for structured milestone delivery.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning-amber)]" />
                  Attach Spec Documents
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed pl-3">
                  Uploading an existing PRD or Figma link increases applicant accuracy by up to 40% during AI matching.
                </p>
              </div>
            </div>
          </Card>

          {/* AI Matching Feature Preview Note */}
          <Card className="p-4 border-[var(--color-accent-cyan)]/30 bg-[var(--color-accent-cyan)]/5 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">Autonomous Matching Active</h4>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
              Once published, our vector matching algorithm immediately scores verified Symbiote operators against your skill tags.
            </p>
          </Card>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] flex items-center justify-between gap-4 shadow-none">
        <Button
          variant="secondary"
          size="md"
          disabled={true}
          className="flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleSaveDraft(false)}
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
