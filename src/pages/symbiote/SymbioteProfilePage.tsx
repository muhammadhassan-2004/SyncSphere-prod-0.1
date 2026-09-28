import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import {
  UserProfile,
  ExperienceItem,
  PortfolioItem,
  CertificationItem,
} from '@/src/types/firestore';
import {
  subscribeToUserProfile,
  updateUserProfile,
} from '@/src/lib/firestore/users';
import { uploadAvatarFile } from '@/src/lib/firebase';
import { SymbioteProfile } from '@/src/data/symbiotes';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Avatar } from '@/src/components/ui/avatar';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { ProfileHeader } from '@/src/components/talent/ProfileHeader';
import { ProfileStatsStrip } from '@/src/components/talent/ProfileStatsStrip';
import { AboutTab } from '@/src/components/talent/AboutTab';
import { SkillsTab } from '@/src/components/talent/SkillsTab';
import { PortfolioTab } from '@/src/components/talent/PortfolioTab';
import { ExperienceTab } from '@/src/components/talent/ExperienceTab';
import { CertificationsTab } from '@/src/components/talent/CertificationsTab';
import { ReviewsTab } from '@/src/components/talent/ReviewsTab';
import { ContactCard } from '@/src/components/talent/ContactCard';
import { AvailabilityCard } from '@/src/components/talent/AvailabilityCard';
import {
  User,
  Camera,
  Save,
  Eye,
  Plus,
  X,
  Briefcase,
  FolderGit2,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  Sparkles,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  ArrowLeft,
  Award,
  Globe,
  FileCheck2,
  Code2,
  FolderKanban,
  Star,
  UserCheck,
  Zap,
  Calendar,
  Building2,
  Link2,
  Layers,
  HelpCircle,
  AlertCircle,
  Edit3,
} from 'lucide-react';

type ProfileTab = 'about' | 'skills' | 'portfolio' | 'experience' | 'certifications' | 'reviews';

export const SymbioteProfilePage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile Form Fields
  const [displayName, setDisplayName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [timeZone, setTimeZone] = useState<string>('');
  const [availability, setAvailability] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<string>('Senior');
  const [bio, setBio] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [completedProjects, setCompletedProjects] = useState<number>(0);

  // Lists
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  const [topAchievements, setTopAchievements] = useState<string[]>([]);
  const [newAchievementInput, setNewAchievementInput] = useState<string>('');

  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);

  // Modals state
  const [showExpModal, setShowExpModal] = useState<boolean>(false);
  const [expRole, setExpRole] = useState<string>('');
  const [expCompany, setExpCompany] = useState<string>('');
  const [expStartDate, setExpStartDate] = useState<string>('');
  const [expEndDate, setExpEndDate] = useState<string>('');
  const [expIsCurrent, setExpIsCurrent] = useState<boolean>(false);
  const [expDesc, setExpDesc] = useState<string>('');

  const [showPortModal, setShowPortModal] = useState<boolean>(false);
  const [portName, setPortName] = useState<string>('');
  const [portTechInput, setPortTechInput] = useState<string>('');
  const [portDesc, setPortDesc] = useState<string>('');
  const [portLink, setPortLink] = useState<string>('');
  const [portColor, setPortColor] = useState<string>('#10b981');

  const [showCertModal, setShowCertModal] = useState<boolean>(false);
  const [certName, setCertName] = useState<string>('');
  const [certIssuer, setCertIssuer] = useState<string>('');
  const [certYear, setCertYear] = useState<string>('');
  const [certUrl, setCertUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isInitialLoadRef = useRef<boolean>(true);

  // Subscribe to real user profile from Firestore
  useEffect(() => {
    if (!uid) return;
    setLoading(true);

    const unsub = subscribeToUserProfile(uid, (profile) => {
      if (profile) {
        setDisplayName(profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || (firebaseUser?.email ? firebaseUser.email.split('@')[0] : ''));
        setJobTitle(profile.title || profile.jobTitle || '');
        setHourlyRate(profile.hourlyRate ? String(profile.hourlyRate) : '');
        setLocation(profile.location || (profile as any).country || (profile as any).city || profile.companyProfile?.country || '');
        setTimeZone(profile.timeZone || '');
        setAvailability(profile.availability || '');
        setExperienceLevel((profile.experience as any) || '');
        setBio(profile.bio || '');
        if (isInitialLoadRef.current) {
          setAvatarUrl(profile.avatarUrl || '');
        }
        setRating(profile.rating ?? 0);
        setReviewsCount(profile.reviewsCount ?? 0);
        setCompletedProjects(profile.completedProjects ?? 0);
        setSkills(profile.skills || []);
        setTopAchievements(profile.topAchievements || []);
        setExperiences(profile.experiences || []);
        setPortfolio(profile.portfolio || []);
        setCertifications(profile.certifications || []);
        isInitialLoadRef.current = false;
      }
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  // Derived SymbioteProfile object matching ProfessionalProfilePage.tsx schema
  const symbioteForPreview: SymbioteProfile = useMemo(() => {
    const parsedRate = parseFloat(hourlyRate) || 0;
    return {
      uid,
      displayName: displayName.trim() || 'Symbiote Specialist',
      title: jobTitle.trim() || 'AI Engineering Specialist',
      avatarInitials: (displayName || 'SP').slice(0, 2).toUpperCase(),
      avatarUrl: avatarUrl || '',
      rating: rating ?? 0,
      reviewsCount: reviewsCount || 0,
      hourlyRate: parsedRate,
      skills: skills || [],
      experience: (experienceLevel as any) || 'Senior',
      availability: availability || 'Available',
      location: location || 'Remote',
      timeZone: timeZone || 'PST (UTC-8)',
      bio: bio || '',
      email: firebaseUser?.email || 'specialist@syncsphere.ai',
      completedProjects: completedProjects || 0,
      topAchievements: topAchievements || [],
      experiences: experiences || [],
      portfolio: portfolio || [],
      certifications: certifications || [],
    };
  }, [
    uid, displayName, jobTitle, avatarUrl, rating, reviewsCount,
    hourlyRate, skills, experienceLevel, availability, location, timeZone,
    bio, firebaseUser?.email, completedProjects, topAchievements,
    experiences, portfolio, certifications
  ]);

  // Handle Avatar Upload to Firebase Storage
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast('Uploading avatar image...');
    try {
      const url = await uploadAvatarFile(uid, file);
      setAvatarUrl(url);
      showToast('Avatar image updated. Save profile to publish.');
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast('Failed to upload avatar image.');
    }
  };

  // Skill Handlers
  const handleAddSkill = (skillText?: string | React.MouseEvent) => {
    const rawInput = typeof skillText === 'string' ? skillText : newSkillInput;
    const textToProcess = rawInput.trim();
    if (!textToProcess) return;

    const tokens = textToProcess.split(',').map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) return;

    let addedCount = 0;
    setSkills((prev) => {
      const updated = [...prev];
      for (const tok of tokens) {
        if (!updated.some((s) => s.toLowerCase() === tok.toLowerCase())) {
          updated.push(tok);
          addedCount++;
        }
      }
      return updated;
    });

    setNewSkillInput('');
    if (addedCount > 0) {
      showToast(`${addedCount} skill${addedCount > 1 ? 's' : ''} added`);
    } else {
      showToast('Skill already exists in your list');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()));
  };

  // Top Achievements Handlers
  const handleAddAchievement = (achText?: string | React.MouseEvent) => {
    const rawInput = typeof achText === 'string' ? achText : newAchievementInput;
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    setTopAchievements([...topAchievements, trimmed]);
    setNewAchievementInput('');
  };

  const handleRemoveAchievement = (idx: number) => {
    setTopAchievements(topAchievements.filter((_, i) => i !== idx));
  };

  // Experience Handlers
  const handleAddExperience = () => {
    if (!expRole.trim() || !expCompany.trim()) {
      showToast('Role and Company are required');
      return;
    }

    const newItem: ExperienceItem = {
      id: `exp-${Date.now()}`,
      role: expRole.trim(),
      company: expCompany.trim(),
      startDate: expStartDate.trim() || '2023',
      endDate: expIsCurrent ? 'Present' : expEndDate.trim() || '2024',
      isCurrent: expIsCurrent,
      description: expDesc.trim(),
    };

    setExperiences([newItem, ...experiences]);
    setShowExpModal(false);
    setExpRole('');
    setExpCompany('');
    setExpStartDate('');
    setExpEndDate('');
    setExpIsCurrent(false);
    setExpDesc('');
    showToast('Work experience entry added.');
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences(experiences.filter((item) => item.id !== id));
  };

  // Portfolio Handlers
  const handleAddPortfolio = () => {
    if (!portName.trim()) {
      showToast('Project name is required');
      return;
    }

    const tagsArray = portTechInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newItem: PortfolioItem = {
      id: `port-${Date.now()}`,
      name: portName.trim(),
      techTags: tagsArray.length > 0 ? tagsArray : ['AI Architecture'],
      description: portDesc.trim(),
      linkUrl: portLink.trim(),
      iconColor: portColor,
    };

    setPortfolio([newItem, ...portfolio]);
    setShowPortModal(false);
    setPortName('');
    setPortTechInput('');
    setPortDesc('');
    setPortLink('');
    showToast('Portfolio project added.');
  };

  const handleRemovePortfolio = (id: string) => {
    setPortfolio(portfolio.filter((item) => item.id !== id));
  };

  // Certification Handlers
  const handleAddCertification = () => {
    if (!certName.trim() || !certIssuer.trim()) {
      showToast('Certification Name and Issuer are required');
      return;
    }

    const newItem: CertificationItem = {
      id: `cert-${Date.now()}`,
      name: certName.trim(),
      issuer: certIssuer.trim(),
      year: certYear.trim() || new Date().getFullYear().toString(),
      verified: true, // Mark self-added certs as verified credentials
    };

    setCertifications([newItem, ...certifications]);
    setShowCertModal(false);
    setCertName('');
    setCertIssuer('');
    setCertYear('');
    setCertUrl('');
    showToast('Certification added.');
  };

  const handleRemoveCertification = (id: string) => {
    setCertifications(certifications.filter((item) => item.id !== id));
  };

  // SAVE PROFILE TO FIRESTORE
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const parsedRate = hourlyRate ? parseFloat(hourlyRate) : 0;

      await updateUserProfile(uid, {
        displayName: displayName.trim(),
        title: jobTitle.trim(),
        jobTitle: jobTitle.trim(),
        email: firebaseUser?.email || '',
        hourlyRate: isNaN(parsedRate) ? 0 : parsedRate,
        location: location.trim(),
        timeZone: timeZone.trim(),
        availability: availability.trim(),
        experience: experienceLevel.trim(),
        bio: bio.trim(),
        avatarUrl,
        skills,
        topAchievements,
        experiences,
        portfolio,
        certifications,
      });

      isInitialLoadRef.current = true;
      showToast('Profile saved! Updates reflect instantly on Client & Admin views.');
    } catch (err) {
      console.error('Save profile error:', err);
      showToast('Failed to save profile updates.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-pulse">
        <div className="h-10 w-48 bg-[var(--color-surface)] rounded-lg" />
        <div className="h-48 bg-[var(--color-surface)] rounded-[12px]" />
        <div className="h-20 bg-[var(--color-surface)] rounded-[12px]" />
        <div className="h-64 bg-[var(--color-surface)] rounded-[12px]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* TOAST FLOATING NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[var(--color-success-green)] text-white font-semibold text-caption rounded-lg shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4">
          <CheckCheck className="w-4 h-4 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER WITH PAGE TITLE AND ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-h2 font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <User className="w-6 h-6 shrink-0 text-[var(--color-accent-cyan)]" />
            <span>My Professional Profile</span>
          </h1>
          <p className="text-caption text-[var(--color-text-secondary)] mt-0.5">
            Manage every section of your public Symbiote profile. Any edits saved here immediately update what clients see.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* SAVE PROFILE BUTTON */}
          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md gap-2 text-caption font-bold cursor-pointer"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>{saving ? 'Saving Changes...' : 'Save Profile'}</span>
          </Button>
        </div>
      </div>

      {/* TOP EDITABLE HEADER CARD */}
      <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start gap-6 relative z-10">
          {/* AVATAR WITH OVERLAY CAMERA BUTTON */}
          <div className="relative group shrink-0">
            <Avatar
              name={displayName || 'Symbiote'}
              src={avatarUrl}
              size="lg"
              className="w-24 h-24 border-2 border-[var(--color-accent-cyan)]/40 text-h2 shadow-md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--color-accent-cyan)] text-black shadow-lg hover:scale-105 transition-transform active:scale-95 cursor-pointer"
              title="Upload new avatar image"
            >
              <Camera className="w-4 h-4 shrink-0" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          {/* QUICK EDIT INLINE FORM GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 w-full">
            {/* DISPLAY NAME */}
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                Full Name <span className="text-[var(--color-accent-cyan)]">*</span>
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                className="bg-[var(--color-background)] border-[var(--color-border)] text-body"
              />
            </div>

            {/* PROFESSIONAL TITLE / HEADLINE */}
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                Headline / Title <span className="text-[var(--color-accent-cyan)]">*</span>
              </label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Lead AI Systems Architect"
                className="bg-[var(--color-background)] border-[var(--color-border)] text-body"
              />
            </div>

            {/* HOURLY RATE */}
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                Hourly Rate (USD) <span className="text-[var(--color-accent-cyan)]">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="120"
                  className="bg-[var(--color-background)] border-[var(--color-border)] pl-9 text-body font-mono"
                />
              </div>
            </div>

            {/* LOCATION */}
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 shrink-0 text-[var(--color-accent-cyan)] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA (Remote)"
                  className="bg-[var(--color-background)] border-[var(--color-border)] pl-9 text-body"
                />
              </div>
            </div>

            {/* AVAILABILITY */}
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                Availability Status
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 shrink-0 text-[var(--color-success-green)] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="e.g. Available 30-40 hrs/wk"
                  className="bg-[var(--color-background)] border-[var(--color-border)] pl-9 text-body"
                />
              </div>
            </div>

            {/* EXPERIENCE LEVEL */}
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                Seniority Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full p-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-body text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] transition-colors"
              >
                <option value="Senior" className="bg-slate-900 text-white">Senior Specialist (5+ yrs)</option>
                <option value="Staff" className="bg-slate-900 text-white">Staff Engineer (8+ yrs)</option>
                <option value="Principal" className="bg-slate-900 text-white">Principal Architect (10+ yrs)</option>
                <option value="Lead" className="bg-slate-900 text-white">Engineering Lead</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* STATS STRIP (LIVE PREVIEW OF CLIENT STATS) */}
      <ProfileStatsStrip symbiote={symbioteForPreview} />

      {/* TAB NAVIGATION BAR (MIRRORS CLIENT-SIDE PROFESSIONAL PROFILE TABS EXACTLY) */}
      <div className="border-b border-[var(--color-border)] flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'about', label: 'About', icon: <UserCheck className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'skills', label: 'Skills & Tech', icon: <Code2 className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'portfolio', label: 'Portfolio', icon: <FolderKanban className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'experience', label: 'Experience', icon: <Award className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'certifications', label: 'Certifications', icon: <FileCheck2 className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'reviews', label: `Reviews (${symbioteForPreview.reviewsCount})`, icon: <Star className="w-3.5 h-3.5 shrink-0" /> },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as ProfileTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono transition-colors border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] font-bold bg-[var(--color-accent-cyan)]/5'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TWO-COLUMN LAYOUT: [TAB EDITORS + LIVE CLIENT VIEW] | [CONTACT & AVAILABILITY CARDS] */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: TAB CONTENT EDITORS & REAL-TIME PREVIEW (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* EDIT CARD */}
              <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 shrink-0 text-[var(--color-accent-cyan)]" />
                    <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                      Edit Bio & Highlights
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                    Client Summary Section
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">
                      Professional Overview & Bio
                    </label>
                    <textarea
                      rows={5}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Write a comprehensive professional bio detailing your experience with LLMs, agent architectures, fine-tuning, vector databases, and system engineering..."
                      className="w-full rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-3 text-body text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] resize-y"
                    />
                  </div>

                  {/* TOP ACHIEVEMENTS / HIGHLIGHTS */}
                  <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                    <label className="text-caption font-semibold text-[var(--color-text-primary)] block">
                      Key Achievements & Milestones (Bullet Points)
                    </label>

                    <div className="flex gap-2">
                      <Input
                        value={newAchievementInput}
                        onChange={(e) => setNewAchievementInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAchievement())}
                        placeholder="e.g. Reduced inference latency by 45% for a Fortune 500 client"
                        className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                      />
                      <Button
                        type="button"
                        onClick={() => handleAddAchievement()}
                        disabled={!newAchievementInput.trim()}
                        className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black font-bold text-caption gap-1 shrink-0 cursor-pointer disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Add</span>
                      </Button>
                    </div>

                    {topAchievements.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        {topAchievements.map((ach, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between gap-3 text-caption text-[var(--color-text-primary)]"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <Sparkles className="w-4 h-4 shrink-0 text-[var(--color-accent-cyan)] mt-0.5" />
                              <span className="leading-normal">{ach}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAchievement(idx)}
                              className="text-[var(--color-text-secondary)] hover:text-red-400 p-1 shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-caption text-[var(--color-text-secondary)] italic">
                        No key achievements added yet. Type an achievement above and click Add.
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* LIVE CLIENT VIEW PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] font-bold uppercase tracking-wider px-1">
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>Client-Facing Live View: About Section</span>
                </div>
                <AboutTab symbiote={symbioteForPreview} />
              </div>
            </div>
          )}

          {/* TAB 2: SKILLS & TECH TAB */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* EDIT CARD */}
              <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 shrink-0 text-[var(--color-accent-cyan)]" />
                    <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                      Manage Specializations & Skills
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                    {skills.length} Skills Listed
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2 max-w-md">
                    <Input
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Add skill (e.g. LangChain, PyTorch, Multi-Agent)..."
                      className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                    />
                    <Button
                      type="button"
                      onClick={() => handleAddSkill()}
                      disabled={!newSkillInput.trim()}
                      className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black font-bold text-caption gap-1 shrink-0 cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Add Skill</span>
                    </Button>
                  </div>

                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {skills.map((sk) => (
                        <span
                          key={sk}
                          className="px-3 py-1.5 text-caption font-mono rounded-lg bg-[var(--color-background)] text-[var(--color-accent-cyan)] border border-[var(--color-border)] flex items-center gap-2 shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5 shrink-0 text-[var(--color-accent-cyan)]" />
                          <span>{sk}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(sk)}
                            className="hover:text-red-400 text-[var(--color-text-secondary)] transition-colors p-0.5 cursor-pointer ml-1"
                            title={`Remove ${sk}`}
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-caption text-[var(--color-text-secondary)] italic">
                      No skills added yet. Type a skill above to add.
                    </p>
                  )}
                </div>
              </Card>

              {/* LIVE CLIENT VIEW PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] font-bold uppercase tracking-wider px-1">
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>Client-Facing Live View: Skills & Tech</span>
                </div>
                <SkillsTab symbiote={symbioteForPreview} />
              </div>
            </div>
          )}

          {/* TAB 3: PORTFOLIO TAB */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* EDIT CARD */}
              <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 shrink-0 text-[var(--color-accent-cyan)]" />
                    <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                      Manage Portfolio Projects
                    </h3>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setShowPortModal(true)}
                    size="sm"
                    className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black font-bold text-caption gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Add Project</span>
                  </Button>
                </div>

                {portfolio.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {portfolio.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-[12px] bg-[var(--color-background)] border border-[var(--color-border)] space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                              {p.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleRemovePortfolio(p.id)}
                              className="text-[var(--color-text-secondary)] hover:text-red-400 p-1 cursor-pointer shrink-0"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </button>
                          </div>
                          {p.description && (
                            <p className="text-caption text-[var(--color-text-secondary)] line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>

                        {p.techTags && p.techTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border)]">
                            {p.techTags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateBlock
                    icon={<FolderKanban className="w-6 h-6 shrink-0 text-[var(--color-accent-cyan)]" />}
                    title="No Portfolio Projects Added"
                    description="Click 'Add Project' above to showcase your AI applications, GitHub repositories, or technical architectures."
                  />
                )}
              </Card>

              {/* LIVE CLIENT VIEW PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] font-bold uppercase tracking-wider px-1">
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>Client-Facing Live View: Portfolio Section</span>
                </div>
                <PortfolioTab symbiote={symbioteForPreview} />
              </div>
            </div>
          )}

          {/* TAB 4: EXPERIENCE TAB */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              {/* EDIT CARD */}
              <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 shrink-0 text-[var(--color-accent-cyan)]" />
                    <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                      Manage Work History & Experience
                    </h3>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setShowExpModal(true)}
                    size="sm"
                    className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black font-bold text-caption gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Add Experience</span>
                  </Button>
                </div>

                {experiences.length > 0 ? (
                  <div className="space-y-3">
                    {experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-4 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                              {exp.role}
                            </h4>
                            <span className="text-xs font-mono text-[var(--color-accent-cyan)] font-semibold">
                              @ {exp.company}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                            {exp.startDate} – {exp.endDate || 'Present'}
                          </p>
                          {exp.description && (
                            <p className="text-caption text-[var(--color-text-secondary)] pt-1">
                              {exp.description}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="text-[var(--color-text-secondary)] hover:text-red-400 p-1 cursor-pointer shrink-0"
                          title="Delete work experience entry"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateBlock
                    icon={<Briefcase className="w-6 h-6 shrink-0 text-[var(--color-accent-cyan)]" />}
                    title="No Work History Listed"
                    description="Click 'Add Experience' above to enter your previous engineering roles and client projects."
                  />
                )}
              </Card>

              {/* LIVE CLIENT VIEW PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] font-bold uppercase tracking-wider px-1">
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>Client-Facing Live View: Work History Timeline</span>
                </div>
                <ExperienceTab symbiote={symbioteForPreview} />
              </div>
            </div>
          )}

          {/* TAB 5: CERTIFICATIONS TAB */}
          {activeTab === 'certifications' && (
            <div className="space-y-6">
              {/* EDIT CARD */}
              <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 shrink-0 text-[var(--color-accent-cyan)]" />
                    <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                      Manage Certifications & Credentials
                    </h3>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setShowCertModal(true)}
                    size="sm"
                    className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black font-bold text-caption gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Add Certification</span>
                  </Button>
                </div>

                {certifications.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {certifications.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-[10px] bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--color-text-primary)]">{c.name}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-success-green)]" />
                          </div>
                          <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                            {c.issuer} • {c.year}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCertification(c.id)}
                          className="text-[var(--color-text-secondary)] hover:text-red-400 p-1 cursor-pointer shrink-0"
                          title="Delete certification"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateBlock
                    icon={<FileCheck2 className="w-6 h-6 shrink-0 text-[var(--color-accent-cyan)]" />}
                    title="No Certifications Recorded"
                    description="Click 'Add Certification' above to display AWS, GCP, or TensorFlow credentials."
                  />
                )}
              </Card>

              {/* LIVE CLIENT VIEW PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] font-bold uppercase tracking-wider px-1">
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>Client-Facing Live View: Certifications & Credentials</span>
                </div>
                <CertificationsTab symbiote={symbioteForPreview} />
              </div>
            </div>
          )}

          {/* TAB 6: REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 shrink-0 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase">
                    Client Reviews & Verified Ratings
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--color-accent-cyan)]">
                  {symbioteForPreview.reviewsCount} Client Feedback Records
                </span>
              </Card>

              {/* LIVE CLIENT REVIEWS TAB */}
              <ReviewsTab symbiote={symbioteForPreview} />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CONTACT & AVAILABILITY CARDS (1 COL) */}
        <div className="space-y-6">
          <ContactCard
            symbiote={symbioteForPreview}
            onMessageClick={() => navigate('/symbiote/messages')}
            onInviteClick={() => {}}
          />

          <AvailabilityCard symbiote={symbioteForPreview} />

          {/* REAL-TIME SYNC NOTICE CARD */}
          <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-3">
            <div className="flex items-center gap-2 text-[var(--color-accent-cyan)]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-bold font-mono uppercase">Universal Real-Time Sync</h4>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] font-sans leading-relaxed">
              Every detail edited here updates your profile document in Firestore. Changes reflect immediately across:
            </p>
            <ul className="text-[11px] font-mono text-[var(--color-text-primary)] space-y-1.5 pl-2 border-l-2 border-[var(--color-accent-cyan)]/40">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[var(--color-accent-cyan)] shrink-0" />
                <span>Your Symbiote Workspace & Dashboard</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[var(--color-accent-cyan)] shrink-0" />
                <span>CLIENT Professional Talent View</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[var(--color-accent-cyan)] shrink-0" />
                <span>ADMIN Platform User Management</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* MODAL: ADD WORK EXPERIENCE */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 rounded-[12px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-body font-bold text-[var(--color-text-primary)]">Add Work Experience</h3>
              <button onClick={() => setShowExpModal(false)} className="text-[var(--color-text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5 shrink-0" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Role / Title *</label>
                <Input
                  value={expRole}
                  onChange={(e) => setExpRole(e.target.value)}
                  placeholder="e.g. Senior Machine Learning Engineer"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Company / Client *</label>
                <Input
                  value={expCompany}
                  onChange={(e) => setExpCompany(e.target.value)}
                  placeholder="e.g. AI Swarm Labs"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Start Year</label>
                  <Input
                    value={expStartDate}
                    onChange={(e) => setExpStartDate(e.target.value)}
                    placeholder="2022"
                    className="bg-[var(--color-background)] border-[var(--color-border)] text-caption font-mono"
                  />
                </div>
                <div>
                  <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">End Year</label>
                  <Input
                    value={expEndDate}
                    disabled={expIsCurrent}
                    onChange={(e) => setExpEndDate(e.target.value)}
                    placeholder="Present"
                    className="bg-[var(--color-background)] border-[var(--color-border)] text-caption font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="expCurrentCheck"
                  checked={expIsCurrent}
                  onChange={(e) => setExpIsCurrent(e.target.checked)}
                  className="rounded accent-[var(--color-accent-cyan)]"
                />
                <label htmlFor="expCurrentCheck" className="text-caption text-[var(--color-text-primary)] cursor-pointer">
                  I currently work in this role
                </label>
              </div>

              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Summarize key engineering achievements, stack, and deliverables..."
                  className="w-full rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-2.5 text-caption text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <Button variant="ghost" onClick={() => setShowExpModal(false)} className="text-caption font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button onClick={handleAddExperience} className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black text-caption font-bold cursor-pointer">
                Add Entry
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: ADD PORTFOLIO PROJECT */}
      {showPortModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 rounded-[12px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-body font-bold text-[var(--color-text-primary)]">Add Portfolio Project</h3>
              <button onClick={() => setShowPortModal(false)} className="text-[var(--color-text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5 shrink-0" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Project Name *</label>
                <Input
                  value={portName}
                  onChange={(e) => setPortName(e.target.value)}
                  placeholder="e.g. Autonomous Multi-Agent Swarm Orchestrator"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Tech Tags (comma separated)</label>
                <Input
                  value={portTechInput}
                  onChange={(e) => setPortTechInput(e.target.value)}
                  placeholder="e.g. Python, LangGraph, FastAPI, Pinecone"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Project Link / URL</label>
                <Input
                  value={portLink}
                  onChange={(e) => setPortLink(e.target.value)}
                  placeholder="https://github.com/or-demo-link"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={portDesc}
                  onChange={(e) => setPortDesc(e.target.value)}
                  placeholder="Describe the problem solved, system architecture, and performance outcomes..."
                  className="w-full rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-2.5 text-caption text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <Button variant="ghost" onClick={() => setShowPortModal(false)} className="text-caption font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button onClick={handleAddPortfolio} className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black text-caption font-bold cursor-pointer">
                Add Project
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: ADD CERTIFICATION */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 rounded-[12px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-body font-bold text-[var(--color-text-primary)]">Add Certification</h3>
              <button onClick={() => setShowCertModal(false)} className="text-[var(--color-text-secondary)] hover:text-white cursor-pointer">
                <X className="w-5 h-5 shrink-0" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Certification Name *</label>
                <Input
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  placeholder="e.g. GCP Professional Machine Learning Engineer"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Issuer / Organization *</label>
                <Input
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  placeholder="e.g. Google Cloud"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption"
                />
              </div>

              <div>
                <label className="text-caption font-semibold text-[var(--color-text-primary)] block mb-1">Year Issued</label>
                <Input
                  value={certYear}
                  onChange={(e) => setCertYear(e.target.value)}
                  placeholder="2024"
                  className="bg-[var(--color-background)] border-[var(--color-border)] text-caption font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <Button variant="ghost" onClick={() => setShowCertModal(false)} className="text-caption font-semibold cursor-pointer">
                Cancel
              </Button>
              <Button onClick={handleAddCertification} className="bg-[var(--color-accent-cyan)] hover:bg-cyan-400 text-black text-caption font-bold cursor-pointer">
                Add Credential
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
