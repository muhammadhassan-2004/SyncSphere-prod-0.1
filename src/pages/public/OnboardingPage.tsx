import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  Plus,
  X,
  Globe,
  DollarSign,
  Layers,
  Sliders,
  Check,
  Zap,
} from 'lucide-react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { StatusPill } from '@/src/components/ui/badge';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';
import { useAuth, UserRole } from '@/src/context/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  INDUSTRIES,
  COMPANY_SIZES,
  normalizeCompanySize,
  normalizeCountry,
  getDetectedTimezone,
  normalizeIndustry,
} from '@/src/lib/constants';
import { useToast } from '@/src/lib/toast/ToastProvider';
import { sanitizePhoneNumber, handlePhoneKeyDown, validators } from '@/src/lib/validation/formValidators';

const SUGGESTED_SKILLS = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'Next.js',
  'Tailwind CSS',
  'AWS',
  'PostgreSQL',
  'GraphQL',
  'Docker',
  'Kubernetes',
  'UI/UX Design',
  'Figma',
  'AI / LLM Integration',
  'Golang',
  'Rust',
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { firebaseUser, userProfile, currentRole, setRole } = useAuth();
  const { addToast } = useToast();

  const queryRole = searchParams.get('role') as UserRole;
  const activeRole: UserRole =
    queryRole === 'client' || queryRole === 'symbiote' || queryRole === 'admin'
      ? queryRole
      : (userProfile?.role as UserRole) || currentRole || 'client';

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Client form state - strictly empty unless previously stored on userProfile
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || firebaseUser?.phoneNumber || '');
  const [companyName, setCompanyName] = useState(userProfile?.companyName || userProfile?.companyProfile?.companyName || '');
  const [industry, setIndustry] = useState(userProfile?.companyProfile?.industry || userProfile?.industry || '');
  const [companySize, setCompanySize] = useState(userProfile?.companyProfile?.companySize || userProfile?.companySize || '');
  const [website, setWebsite] = useState(userProfile?.companyProfile?.website || userProfile?.websiteUrl || '');
  const [location, setLocation] = useState(userProfile?.location || userProfile?.companyProfile?.country || '');
  const [primaryGoal, setPrimaryGoal] = useState(userProfile?.primaryGoal || '');
  const [budgetRange, setBudgetRange] = useState(userProfile?.budgetRange || '');
  const [projectDescription, setProjectDescription] = useState(userProfile?.companyProfile?.companyDescription || userProfile?.bio || '');

  // Symbiote form state - strictly empty unless previously stored on userProfile
  const [jobTitle, setJobTitle] = useState(userProfile?.title || userProfile?.jobTitle || '');
  const [experienceYears, setExperienceYears] = useState(userProfile?.experience || '');
  const [hourlyRate, setHourlyRate] = useState<number | string>(userProfile?.hourlyRate !== undefined ? userProfile.hourlyRate : '');
  const [skills, setSkills] = useState<string[]>(userProfile?.skills && userProfile.skills.length > 0 ? userProfile.skills : []);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [availability, setAvailability] = useState(userProfile?.availability || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [portfolioUrl, setPortfolioUrl] = useState(userProfile?.websiteUrl || '');

  // Admin form state
  const [department, setDepartment] = useState(userProfile?.department || '');
  const [adminTitle, setAdminTitle] = useState(userProfile?.jobTitle || userProfile?.adminTitle || '');
  const [alertCritical, setAlertCritical] = useState(true);
  const [alertSecurity, setAlertSecurity] = useState(true);
  const [alertDisputes, setAlertDisputes] = useState(true);

  const draftKey = `syncsphere_onboarding_draft_${firebaseUser?.uid || userProfile?.uid || 'temp'}`;

  // Restore draft state on mount if present in sessionStorage (TC-AUTH-005 browser refresh retention)
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.step) setStep(draft.step);
        if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
        if (draft.companyName) setCompanyName(draft.companyName);
        if (draft.industry) setIndustry(draft.industry);
        if (draft.companySize) setCompanySize(draft.companySize);
        if (draft.website) setWebsite(draft.website);
        if (draft.location) setLocation(draft.location);
        if (draft.primaryGoal) setPrimaryGoal(draft.primaryGoal);
        if (draft.budgetRange) setBudgetRange(draft.budgetRange);
        if (draft.projectDescription) setProjectDescription(draft.projectDescription);
        if (draft.jobTitle) setJobTitle(draft.jobTitle);
        if (draft.experienceYears) setExperienceYears(draft.experienceYears);
        if (draft.hourlyRate !== undefined) setHourlyRate(draft.hourlyRate);
        if (Array.isArray(draft.skills) && draft.skills.length > 0) setSkills(draft.skills);
        if (draft.availability) setAvailability(draft.availability);
        if (draft.bio) setBio(draft.bio);
        if (draft.portfolioUrl) setPortfolioUrl(draft.portfolioUrl);
        if (draft.department) setDepartment(draft.department);
        if (draft.adminTitle) setAdminTitle(draft.adminTitle);
      }
    } catch {}
  }, [draftKey]);

  // Persist draft state on step or input change to survive hard refresh (TC-AUTH-005)
  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          step,
          phoneNumber,
          companyName,
          industry,
          companySize,
          website,
          location,
          primaryGoal,
          budgetRange,
          projectDescription,
          jobTitle,
          experienceYears,
          hourlyRate,
          skills,
          availability,
          bio,
          portfolioUrl,
          department,
          adminTitle,
        })
      );
    } catch {}
  }, [
    draftKey,
    step,
    phoneNumber,
    companyName,
    industry,
    companySize,
    website,
    location,
    primaryGoal,
    budgetRange,
    projectDescription,
    jobTitle,
    experienceYears,
    hourlyRate,
    skills,
    availability,
    bio,
    portfolioUrl,
    department,
    adminTitle,
  ]);

  // Sync role if necessary when query param specifies a valid role
  useEffect(() => {
    if (queryRole && (queryRole === 'client' || queryRole === 'symbiote' || queryRole === 'admin') && queryRole !== currentRole) {
      setRole(queryRole);
    }
  }, [queryRole, currentRole, setRole]);

  const handleAddCustomSkill = (skillText?: string) => {
    const textToProcess = (skillText !== undefined ? skillText : customSkillInput).trim();
    if (!textToProcess) return;

    // Support comma-separated input (e.g. "React, Node.js, PyTorch")
    const tokens = textToProcess.split(',').map((t) => t.trim()).filter(Boolean);
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

    setCustomSkillInput('');
    if (errors.skills) {
      setErrors((prev) => ({ ...prev, skills: '' }));
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()));
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) => {
      const exists = prev.some((s) => s.toLowerCase() === skill.toLowerCase());
      if (exists) {
        return prev.filter((s) => s.toLowerCase() !== skill.toLowerCase());
      } else {
        return [...prev, skill];
      }
    });
    if (errors.skills) {
      setErrors((prev) => ({ ...prev, skills: '' }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (activeRole === 'client') {
      if (!companyName.trim()) {
        newErrors.companyName = 'Please enter your company or organization name.';
      }
      if (!industry) {
        newErrors.industry = 'Please select an industry vertical.';
      }
      if (!companySize) {
        newErrors.companySize = 'Please select your company size.';
      }
    } else if (activeRole === 'symbiote') {
      if (!jobTitle.trim()) {
        newErrors.jobTitle = 'Please enter your professional job title.';
      }
      if (!experienceYears) {
        newErrors.experienceYears = 'Please select your years of experience.';
      }
      if (hourlyRate === '' || isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0) {
        newErrors.hourlyRate = 'Please enter a valid hourly rate (e.g. 75).';
      }
      if (skills.length === 0) {
        newErrors.skills = 'Please select or add at least one technical skill.';
      }
    } else if (activeRole === 'admin') {
      if (!adminTitle.trim()) {
        newErrors.adminTitle = 'Please enter your administrator title.';
      }
      if (!department) {
        newErrors.department = 'Please select your operational department.';
      }
    }

    if (phoneNumber.trim()) {
      const phoneErr = validators.phone(phoneNumber.trim());
      if (phoneErr) {
        newErrors.phoneNumber = phoneErr;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  const handleSaveOnboarding = async (skip: boolean = false) => {
    setSaving(true);
    const targetDashboard = `/${activeRole}/dashboard`;

    try {
      const uid = firebaseUser?.uid || userProfile?.uid;

      if (uid) {
        let updates: Record<string, any> = {
          onboardingCompleted: true,
          role: activeRole,
          updatedAt: new Date().toISOString(),
          lastActiveAt: serverTimestamp(),
        };

        if (!skip) {
          if (phoneNumber.trim()) {
            updates.phoneNumber = phoneNumber.trim();
          }

          if (activeRole === 'client') {
            const normalizedSize = normalizeCompanySize(companySize);
            const normalizedInd = normalizeIndustry(industry);
            const rawLocation = location.trim();
            const normalizedCtry = normalizeCountry(rawLocation);
            const detectedTz = getDetectedTimezone();
            const resolvedBio = projectDescription.trim() || 'Enterprise technology organization delivering high-scale digital solutions.';

            updates = {
              ...updates,
              companyName: companyName.trim() || 'Card Private Limited',
              industry: normalizedInd,
              companySize: normalizedSize,
              location: rawLocation || normalizedCtry,
              country: normalizedCtry,
              timeZone: detectedTz,
              ...(website.trim() ? { websiteUrl: website.trim() } : {}),
              ...(primaryGoal ? { primaryGoal } : {}),
              ...(budgetRange ? { budgetRange } : {}),
              bio: resolvedBio,
              companyProfile: {
                companyName: companyName.trim() || 'Card Private Limited',
                industry: normalizedInd,
                companySize: normalizedSize,
                website: website.trim() || '',
                country: normalizedCtry,
                timeZone: detectedTz,
                companyDescription: resolvedBio,
              },
            };
          } else if (activeRole === 'symbiote') {
            const parsedRate = typeof hourlyRate === 'string' ? parseFloat(hourlyRate) : hourlyRate;
            const rawLocation = location.trim();
            updates = {
              ...updates,
              ...(rawLocation ? { location: rawLocation, country: normalizeCountry(rawLocation) } : {}),
              ...(jobTitle.trim() ? { title: jobTitle.trim(), jobTitle: jobTitle.trim() } : {}),
              ...(!isNaN(parsedRate) && parsedRate > 0 ? { hourlyRate: parsedRate } : {}),
              ...(skills.length > 0 ? { skills } : {}),
              ...(experienceYears
                ? {
                    experience: experienceYears,
                    experienceYears: experienceYears,
                    yearsOfExperience: experienceYears,
                  }
                : {}),
              ...(availability ? { availability } : {}),
              ...(bio.trim() ? { bio: bio.trim() } : {}),
              ...(portfolioUrl.trim()
                ? { websiteUrl: portfolioUrl.trim(), portfolioUrl: portfolioUrl.trim() }
                : {}),
            };
          } else if (activeRole === 'admin') {
            updates = {
              ...updates,
              ...(department ? { department } : {}),
              ...(adminTitle.trim() ? { adminTitle: adminTitle.trim(), jobTitle: adminTitle.trim() } : {}),
              notificationPreferences: {
                newApplications: true,
                messages: true,
                invoiceAlerts: alertCritical,
                milestoneUpdates: alertSecurity,
              },
            };
          }
        }

        try {
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, updates, { merge: true });
        } catch (dbErr) {
          console.warn('Firestore write warning during onboarding, proceeding with local role sync:', dbErr);
        }
      }

      setRole(activeRole);

      try {
        sessionStorage.removeItem(draftKey);
      } catch {}

      if (skip) {
        addToast({
          title: 'Onboarding Skipped',
          description: `Welcome to SyncSphere! You can complete your profile preferences anytime in Settings.`,
          type: 'info',
        });
      } else {
        addToast({
          title: 'Profile Setup Complete',
          description: `Welcome to your ${activeRole} workspace!`,
          type: 'success',
        });
      }

      navigate(targetDashboard, { replace: true });
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setRole(activeRole);
      navigate(targetDashboard, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const roleMeta = {
    client: {
      badge: 'Client Workspace Setup',
      badgeVariant: 'blue' as const,
      icon: Building2,
    },
    symbiote: {
      badge: 'Symbiote Profile Setup',
      badgeVariant: 'green' as const,
      icon: Briefcase,
    },
    admin: {
      badge: 'Admin Console Setup',
      badgeVariant: 'red' as const,
      icon: Shield,
    },
  }[activeRole];

  const getStepSubtitle = () => {
    if (step === 1) {
      if (activeRole === 'client') return 'Set up your company profile to start discovering and hiring top technical specialists.';
      if (activeRole === 'symbiote') return 'Showcase your core skills, experience, and target rate to win premium contracts.';
      return 'Configure your administrator profile and operational department.';
    } else {
      if (activeRole === 'client') return 'Set your hiring objectives and budget parameters to help tailor talent recommendations.';
      if (activeRole === 'symbiote') return 'Set your contract availability, bio summary, and portfolio link.';
      return 'Configure your notification preferences and critical platform alert channels.';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex flex-col font-sans">
      {/* Top Bar with Brand, Back affordances, and Skip */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 focus:outline-none">
            <SyncSphereLogo iconSize={28} textSize="md" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 border-l border-[var(--color-border)] pl-3">
            <Link
              to="/"
              id="onboarding-back-home"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)]/40 transition-all group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to home</span>
            </Link>
            <Link
              to="/login"
              id="onboarding-back-login"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
            >
              <span>Back to login</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-[var(--color-text-secondary)] font-medium hidden sm:block">
            Step {step} of 2
          </div>
          <button
            type="button"
            id="onboarding-skip-btn"
            onClick={() => handleSaveOnboarding(true)}
            disabled={saving}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] font-semibold transition-colors px-2.5 py-1 rounded-md hover:bg-[var(--color-surface-elevated)] cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header Card */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2">
              <StatusPill status={roleMeta.badge} variant={roleMeta.badgeVariant} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {step === 1 ? 'Tell us about yourself' : 'Set Your Preferences'}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed">
              {getStepSubtitle()}
            </p>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 1
                    ? 'w-12 bg-[var(--color-accent-cyan)]'
                    : 'w-6 bg-[var(--color-accent-cyan)]/40'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 2
                    ? 'w-12 bg-[var(--color-accent-cyan)]'
                    : 'w-6 bg-[var(--color-border)]'
                }`}
              />
            </div>
          </div>

          {/* Form Card */}
          <Card className="p-6 sm:p-8 space-y-6 border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/10">
            {/* ========================================================= */}
            {/* CLIENT ONBOARDING FLOW */}
            {/* ========================================================= */}
            {activeRole === 'client' && (
              <>
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                        Company or Organization Name <span className="text-[var(--color-accent-cyan)]">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Acme Technologies Inc."
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: '' }));
                        }}
                        autoFocus
                      />
                      {errors.companyName && (
                        <p className="text-xs text-red-400 mt-1 font-medium">{errors.companyName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Industry Vertical <span className="text-[var(--color-accent-cyan)]">*</span>
                        </label>
                        <select
                          value={industry}
                          onChange={(e) => {
                            setIndustry(e.target.value);
                            if (errors.industry) setErrors((prev) => ({ ...prev, industry: '' }));
                          }}
                          className={`w-full h-10 px-3 rounded-lg bg-[var(--color-background)] border text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] ${
                            errors.industry ? 'border-red-500/80' : 'border-[var(--color-border)]'
                          }`}
                        >
                          <option value="">Select industry...</option>
                          {INDUSTRIES.map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                        {errors.industry && (
                          <p className="text-xs text-red-400 mt-1 font-medium">{errors.industry}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Company Website (Optional)
                        </label>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                        Company Size <span className="text-[var(--color-accent-cyan)]">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { value: '1-10 employees (Seed / Early Stage)', label: '1-10 (Seed)' },
                          { value: '11-50 employees (Growth Stage)', label: '11-50 (Growth)' },
                          { value: '51-200 employees (Mid-Market)', label: '51-200 (Mid)' },
                          { value: '201-500 employees (Scale-up)', label: '201-500 (Scale)' },
                          { value: '500+ employees (Enterprise)', label: '500+ (Enterprise)' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setCompanySize(opt.value);
                              if (errors.companySize) setErrors((prev) => ({ ...prev, companySize: '' }));
                            }}
                            className={`px-2.5 py-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                              companySize === opt.value || companySize.includes(opt.label.split(' ')[0])
                                ? 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] shadow-sm'
                                : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]/40'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {errors.companySize && (
                        <p className="text-xs text-red-400 mt-1.5 font-medium">{errors.companySize}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Primary Location / Headquarters (Optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. San Francisco, CA or London, UK"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Contact Phone Number (Optional)
                        </label>
                        <Input
                          name="phoneNumber"
                          autoComplete="tel"
                          type="tel"
                          placeholder="e.g. +1 (555) 000-0000"
                          value={phoneNumber}
                          onKeyDown={handlePhoneKeyDown}
                          onChange={(e) => {
                            setPhoneNumber(sanitizePhoneNumber(e.target.value));
                            if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: '' }));
                          }}
                        />
                        {errors.phoneNumber && (
                          <p className="text-xs text-red-400 mt-1 font-medium">{errors.phoneNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                        Primary Hiring Objective
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          'Build New MVP / Product',
                          'Scale Existing Architecture',
                          'Hire Dedicated IT Specialists',
                          'UI/UX & Product Redesign',
                          'Cloud & DevOps Modernization',
                          'Security & Codebase Audit',
                        ].map((goal) => (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => {
                              setPrimaryGoal(goal === primaryGoal ? '' : goal);
                            }}
                            className={`p-3 rounded-lg text-xs font-semibold border text-left flex items-center justify-between transition-all cursor-pointer ${
                              primaryGoal === goal
                                ? 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)]'
                                : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]/40'
                            }`}
                          >
                            <span>{goal}</span>
                            {primaryGoal === goal && <Check className="w-4 h-4 text-[var(--color-accent-cyan)] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                        Estimated Initial Project Budget
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {['< $5,000', '$5,000 - $25,000', '$25,000 - $75,000', '$75,000+'].map((budget) => (
                          <button
                            key={budget}
                            type="button"
                            onClick={() => {
                              setBudgetRange(budget === budgetRange ? '' : budget);
                            }}
                            className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                              budgetRange === budget
                                ? 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)]'
                                : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]/40'
                            }`}
                          >
                            {budget}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                        Brief Project Summary / Requirements (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe the technical challenges or roles you are looking to fill..."
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        className="w-full p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] resize-none"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* SYMBIOTE ONBOARDING FLOW */}
            {/* ========================================================= */}
            {activeRole === 'symbiote' && (
              <>
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                        Professional Job Title <span className="text-[var(--color-accent-cyan)]">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Lead Full-Stack Cloud Engineer"
                        value={jobTitle}
                        onChange={(e) => {
                          setJobTitle(e.target.value);
                          if (errors.jobTitle) setErrors((prev) => ({ ...prev, jobTitle: '' }));
                        }}
                        autoFocus
                      />
                      {errors.jobTitle && (
                        <p className="text-xs text-red-400 mt-1 font-medium">{errors.jobTitle}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Years of Experience <span className="text-[var(--color-accent-cyan)]">*</span>
                        </label>
                        <select
                          value={experienceYears}
                          onChange={(e) => {
                            setExperienceYears(e.target.value);
                            if (errors.experienceYears) setErrors((prev) => ({ ...prev, experienceYears: '' }));
                          }}
                          className={`w-full h-10 px-3 rounded-lg bg-[var(--color-background)] border text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] ${
                            errors.experienceYears ? 'border-red-500/80' : 'border-[var(--color-border)]'
                          }`}
                        >
                          <option value="">Select years of experience...</option>
                          <option value="1-2 years">1-2 years (Junior)</option>
                          <option value="3-5 years">3-5 years (Mid-Level)</option>
                          <option value="5-8 years">5-8 years (Senior)</option>
                          <option value="8+ years">8+ years (Lead / Principal)</option>
                        </select>
                        {errors.experienceYears && (
                          <p className="text-xs text-red-400 mt-1 font-medium">{errors.experienceYears}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Target Hourly Rate ($ / hr) <span className="text-[var(--color-accent-cyan)]">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-[var(--color-text-secondary)] font-semibold">$</span>
                          <Input
                            type="number"
                            min="10"
                            max="500"
                            placeholder="e.g. 75"
                            value={hourlyRate}
                            onChange={(e) => {
                              setHourlyRate(e.target.value);
                              if (errors.hourlyRate) setErrors((prev) => ({ ...prev, hourlyRate: '' }));
                            }}
                            className="pl-7"
                          />
                        </div>
                        {errors.hourlyRate && (
                          <p className="text-xs text-red-400 mt-1 font-medium">{errors.hourlyRate}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Contact Phone Number (Optional)
                        </label>
                        <Input
                          name="phoneNumber"
                          autoComplete="tel"
                          type="tel"
                          placeholder="e.g. +1 (555) 000-0000"
                          value={phoneNumber}
                          onKeyDown={handlePhoneKeyDown}
                          onChange={(e) => {
                            setPhoneNumber(sanitizePhoneNumber(e.target.value));
                            if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: '' }));
                          }}
                        />
                        {errors.phoneNumber && (
                          <p className="text-xs text-red-400 mt-1 font-medium">{errors.phoneNumber}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Primary Location / Time Zone (Optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. New York, NY (UTC-5)"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          Core Technical Skills <span className="text-[var(--color-accent-cyan)]">*</span>
                        </label>
                        <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                          {skills.length} Selected
                        </span>
                      </div>

                      {/* Selected Skills Badges List */}
                      <div className="p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] min-h-[52px] flex flex-wrap items-center gap-2 mb-3">
                        {skills.length > 0 ? (
                          skills.map((sk) => (
                            <span
                              key={sk}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] shadow-sm animate-in fade-in zoom-in-95 duration-150"
                            >
                              <Zap className="w-3 h-3 text-[var(--color-accent-cyan)] shrink-0" />
                              <span>{sk}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(sk)}
                                className="hover:text-red-400 text-[var(--color-accent-cyan)] transition-colors p-0.5 ml-0.5 cursor-pointer rounded hover:bg-red-500/10"
                                title={`Remove ${sk}`}
                                aria-label={`Remove ${sk}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--color-text-secondary)] italic">
                            No skills selected yet. Pick from popular suggestions below or type your own.
                          </p>
                        )}
                      </div>

                      {/* Add custom skill input */}
                      <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            placeholder="Add custom skill (e.g. Solidity, Flutter, PyTorch)..."
                            value={customSkillInput}
                            onChange={(e) => setCustomSkillInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddCustomSkill();
                              }
                            }}
                            className="bg-[var(--color-background)] border-[var(--color-border)] text-xs h-10 pr-2"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleAddCustomSkill()}
                          disabled={!customSkillInput.trim()}
                          className="h-10 px-4 shrink-0 bg-[var(--color-accent-cyan)] text-black font-bold hover:bg-cyan-400 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Add
                        </Button>
                      </div>

                      {/* Quick Suggestions Chips */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-mono text-[var(--color-text-secondary)] font-medium">
                          Quick Add Popular Skills:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTED_SKILLS.map((skill) => {
                            const isSelected = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[var(--color-accent-cyan)]/20 border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-semibold shadow-sm'
                                    : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-cyan)]/50 hover:text-[var(--color-text-primary)]'
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                                ) : (
                                  <Plus className="w-3 h-3 opacity-60" />
                                )}
                                <span>{skill}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {errors.skills && (
                        <p className="text-xs text-red-400 mt-2 font-medium">{errors.skills}</p>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                        Current Contract Availability
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          'Available Full-Time (40h/wk)',
                          'Available Part-Time (20h/wk)',
                          'Open for Direct Contracts',
                          'Weekends & Advisory Only',
                        ].map((avail) => (
                          <button
                            key={avail}
                            type="button"
                            onClick={() => {
                              setAvailability(avail === availability ? '' : avail);
                            }}
                            className={`p-3 rounded-lg text-xs font-semibold border text-left flex items-center justify-between transition-all cursor-pointer ${
                              availability === avail
                                ? 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)]'
                                : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]/40'
                            }`}
                          >
                            <span>{avail}</span>
                            {availability === avail && <Check className="w-4 h-4 text-[var(--color-accent-cyan)] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                        Professional Bio / Summary (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Highlight your key achievements, preferred architecture patterns, and what makes you stand out..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                        GitHub / Portfolio / LinkedIn URL (Optional)
                      </label>
                      <Input
                        type="url"
                        placeholder="https://github.com/yourhandle"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* ADMIN ONBOARDING FLOW */}
            {/* ========================================================= */}
            {activeRole === 'admin' && (
              <>
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                        Admin Display Title <span className="text-[var(--color-accent-cyan)]">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Lead Platform Engineer & Governance Officer"
                        value={adminTitle}
                        onChange={(e) => {
                          setAdminTitle(e.target.value);
                          if (errors.adminTitle) setErrors((prev) => ({ ...prev, adminTitle: '' }));
                        }}
                        autoFocus
                      />
                      {errors.adminTitle && (
                        <p className="text-xs text-red-400 mt-1 font-medium">{errors.adminTitle}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                        Operational Department / Unit <span className="text-[var(--color-accent-cyan)]">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          'Platform Operations & Infrastructure',
                          'Trust, Safety & Security',
                          'User Governance & Disputes',
                          'Executive Oversight',
                        ].map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setDepartment(dept);
                              if (errors.department) setErrors((prev) => ({ ...prev, department: '' }));
                            }}
                            className={`p-3 rounded-lg text-xs font-semibold border text-left flex items-center justify-between transition-all cursor-pointer ${
                              department === dept
                                ? 'bg-[var(--color-accent-cyan)]/15 border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)]'
                                : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]/40'
                            }`}
                          >
                            <span>{dept}</span>
                            {department === dept && <Check className="w-4 h-4 text-[var(--color-accent-cyan)] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                      {errors.department && (
                        <p className="text-xs text-red-400 mt-1.5 font-medium">{errors.department}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                        Contact Phone Number (Optional)
                      </label>
                      <Input
                        name="phoneNumber"
                        autoComplete="tel"
                        type="tel"
                        placeholder="e.g. +1 (555) 000-0000"
                        value={phoneNumber}
                        onKeyDown={handlePhoneKeyDown}
                        onChange={(e) => {
                          setPhoneNumber(sanitizePhoneNumber(e.target.value));
                          if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: '' }));
                        }}
                      />
                      {errors.phoneNumber && (
                        <p className="text-xs text-red-400 mt-1 font-medium">{errors.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                        Real-time Alert Subscriptions
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] cursor-pointer">
                          <div>
                            <p className="text-xs font-bold text-[var(--color-text-primary)]">Critical System & Infra Alerts</p>
                            <p className="text-[11px] text-[var(--color-text-secondary)]">Server spikes, failed deploys, and database threshold warnings</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={alertCritical}
                            onChange={(e) => setAlertCritical(e.target.checked)}
                            className="w-4 h-4 rounded text-[var(--color-accent-cyan)]"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] cursor-pointer">
                          <div>
                            <p className="text-xs font-bold text-[var(--color-text-primary)]">Security Anomalies & Auth Violations</p>
                            <p className="text-[11px] text-[var(--color-text-secondary)]">Brute-force detections, suspicious IP logins, and role escalations</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={alertSecurity}
                            onChange={(e) => setAlertSecurity(e.target.checked)}
                            className="w-4 h-4 rounded text-[var(--color-accent-cyan)]"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] cursor-pointer">
                          <div>
                            <p className="text-xs font-bold text-[var(--color-text-primary)]">Dispute & Escalation Events</p>
                            <p className="text-[11px] text-[var(--color-text-secondary)]">Client-Symbiote milestone dispute requests and refund filings</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={alertDisputes}
                            onChange={(e) => setAlertDisputes(e.target.checked)}
                            className="w-4 h-4 rounded text-[var(--color-accent-cyan)]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step Navigation Buttons */}
            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setErrors({});
                    setStep(1);
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step === 1 ? (
                <Button
                  type="button"
                  id="onboarding-continue-btn"
                  onClick={handleNextStep}
                  className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-green)] text-slate-950 font-bold hover:opacity-95 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] transition-all px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm border-0"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  id="onboarding-complete-btn"
                  onClick={() => handleSaveOnboarding(false)}
                  disabled={saving}
                  className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-green)] text-slate-950 font-bold hover:opacity-95 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] transition-all px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm border-0"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      <span>Complete Setup & Enter Workspace</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

