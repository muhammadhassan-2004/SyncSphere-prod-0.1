import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { updateUserProfile, subscribeToUserProfile } from '@/src/lib/firestore/users';
import { uploadAvatarFile } from '@/src/lib/firebase';
import { CompanyProfile, UserProfile } from '@/src/types/firestore';
import { SettingsLeftNav } from '@/src/components/settings/SettingsLeftNav';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Building2,
  Upload,
  Save,
  CheckCircle2,
  AlertTriangle,
  Globe,
  MapPin,
  Clock,
  Briefcase,
  Users,
  FileText,
  Building,
  Sparkles,
} from 'lucide-react';
import {
  INDUSTRIES,
  COMPANY_SIZES,
  COUNTRIES,
  TIMEZONES,
  normalizeCompanySize,
  normalizeCountry,
  getDetectedTimezone,
  normalizeIndustry,
} from '@/src/lib/constants';

export const CompanyProfilePage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const userId = firebaseUser?.uid || userProfile?.uid || '';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State - Fully auto-filled from user profile, company profile, or smart detected defaults
  const [companyName, setCompanyName] = useState<string>(() => {
    return (
      userProfile?.companyProfile?.companyName ||
      userProfile?.companyName ||
      userProfile?.displayName ||
      'Card Private Limited'
    );
  });
  const [logoUrl, setLogoUrl] = useState<string>(
    userProfile?.companyProfile?.logoUrl || userProfile?.avatarUrl || ''
  );
  const [industry, setIndustry] = useState<string>(() => {
    return normalizeIndustry(
      userProfile?.companyProfile?.industry || userProfile?.industry
    );
  });
  const [companySize, setCompanySize] = useState<string>(() => {
    return normalizeCompanySize(
      userProfile?.companyProfile?.companySize || userProfile?.companySize
    );
  });
  const [website, setWebsite] = useState<string>(() => {
    return (
      userProfile?.companyProfile?.website ||
      userProfile?.websiteUrl ||
      (userProfile?.email ? `https://${userProfile.email.split('@')[1] || 'card.dev'}` : 'https://card.dev')
    );
  });
  const [companyDescription, setCompanyDescription] = useState<string>(() => {
    return (
      userProfile?.companyProfile?.companyDescription ||
      userProfile?.bio ||
      'Enterprise software and developer infrastructure organization.'
    );
  });
  const [country, setCountry] = useState<string>(() => {
    return normalizeCountry(
      userProfile?.companyProfile?.country || userProfile?.location
    );
  });
  const [timeZone, setTimeZone] = useState<string>(() => {
    return getDetectedTimezone(
      userProfile?.companyProfile?.timeZone || userProfile?.timeZone
    );
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync profile data from Firestore or AuthContext
  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeToUserProfile(userId, (profile) => {
      if (profile) {
        const cp = profile.companyProfile || {};
        setCompanyName(
          cp.companyName ||
            profile.companyName ||
            profile.displayName ||
            'Card Private Limited'
        );
        setLogoUrl(cp.logoUrl || profile.avatarUrl || '');
        setIndustry(normalizeIndustry(cp.industry || profile.industry));
        setCompanySize(normalizeCompanySize(cp.companySize || profile.companySize));
        setWebsite(
          cp.website ||
            profile.websiteUrl ||
            (profile.email ? `https://${profile.email.split('@')[1] || 'card.dev'}` : 'https://card.dev')
        );
        setCompanyDescription(
          cp.companyDescription ||
            profile.bio ||
            'Enterprise software and developer infrastructure organization.'
        );
        setCountry(normalizeCountry(cp.country || profile.location));
        setTimeZone(getDetectedTimezone(cp.timeZone || profile.timeZone));
      }
    });

    return () => unsub();
  }, [userId]);

  // Handle Logo File Upload to Firebase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadAvatarFile(`company_${userId}`, file);
        setLogoUrl(url);
      } catch (err) {
        console.warn('Firebase Storage logo upload warning, fallback to FileReader:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setLogoUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Batched Save Changes Handler
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    const updatedCompanyProfile: CompanyProfile = {
      companyName,
      logoUrl,
      industry,
      companySize,
      website,
      companyDescription,
      country,
      timeZone,
    };

    try {
      await updateUserProfile(userId, {
        companyName,
        companyProfile: updatedCompanyProfile,
      });

      setSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Failed to update company profile:', err);
      setErrorMsg('Failed to save company profile updates. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight">
                Company Profile & Settings
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                Manage organization identity, branding assets, industry vertical, and timezone configurations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS TOAST BANNER */}
      {saveSuccess && (
        <div className="p-3.5 rounded-[10px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Company profile updated successfully! Changes saved to database.</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-300">Saved</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-[10px] bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. TWO-COLUMN LAYOUT: [LEFT NAV] | [RIGHT CONTENT PANEL] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT NAV PANEL (4 COLS) */}
        <div className="lg:col-span-4 sticky top-20">
          <SettingsLeftNav />
        </div>

        {/* RIGHT CONTENT PANEL (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveChanges}>
            <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-6 shadow-md">
              {/* SECTION 1: LOGO & BRANDING */}
              <div className="space-y-4 border-b border-[var(--color-border)] pb-6">
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <span>Company Branding & Logo</span>
                </h3>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* LOGO AVATAR PREVIEW */}
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-[14px] bg-[var(--color-background)] border-2 border-[var(--color-border)] flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Company Logo"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Building className="w-10 h-10 text-[var(--color-accent-cyan)] opacity-70" />
                      )}
                    </div>
                  </div>

                  {/* UPLOAD LOGO ACTIONS */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="h-9 border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-primary)] font-mono text-xs rounded-[8px] flex items-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                        <span>Upload Logo</span>
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          variant="ghost"
                          className="h-9 text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                      PNG, JPG, or SVG. Max file size 2MB. Displayed across project briefs and client invoices.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: BASIC COMPANY INFORMATION */}
              <div className="space-y-4 border-b border-[var(--color-border)] pb-6">
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <span>Organization Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* COMPANY NAME */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                      Company / Legal Entity Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme AI Innovations Inc."
                        className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                      />
                    </div>
                  </div>

                  {/* INDUSTRY */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                      Industry Vertical
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">Select industry...</option>
                        {industry && !INDUSTRIES.includes(industry) && (
                          <option value={industry} className="bg-slate-900 text-white">
                            {industry}
                          </option>
                        )}
                        {INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind} className="bg-slate-900 text-white">
                            {ind}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* COMPANY SIZE */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                      Company Size
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">Select company size...</option>
                        {companySize && !COMPANY_SIZES.includes(companySize) && (
                          <option value={companySize} className="bg-slate-900 text-white">
                            {companySize}
                          </option>
                        )}
                        {COMPANY_SIZES.map((cs) => (
                          <option key={cs} value={cs} className="bg-slate-900 text-white">
                            {cs}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* WEBSITE */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                      Official Website
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://company.com"
                        className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                      />
                    </div>
                  </div>

                  {/* COMPANY DESCRIPTION */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                      Company Overview / Bio
                    </label>
                    <textarea
                      rows={3}
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      placeholder="Brief description of your product, mission, or engineering goals..."
                      className="w-full p-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: LOCATION & TIME ZONE */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  <span>Location & Regional Settings</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* COUNTRY */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                      Country / Region
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">Select country / region...</option>
                        {country && !COUNTRIES.includes(country) && (
                          <option value={country} className="bg-slate-900 text-white">
                            {country}
                          </option>
                        )}
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c} className="bg-slate-900 text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* TIME ZONE */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                      Operating Time Zone
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                      <select
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">Select operating time zone...</option>
                        {timeZone && !TIMEZONES.includes(timeZone) && (
                          <option value={timeZone} className="bg-slate-900 text-white">
                            {timeZone}
                          </option>
                        )}
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz} className="bg-slate-900 text-white">
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE CHANGES FOOTER CTA */}
              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-10 bg-gradient-to-r from-[var(--color-accent-cyan)] to-blue-500 text-slate-950 font-mono text-xs font-bold px-6 rounded-[8px] flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-[1.01] transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Updates...' : 'Save Changes'}</span>
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
};
