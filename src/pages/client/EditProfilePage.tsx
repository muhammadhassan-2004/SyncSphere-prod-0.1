import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { uploadAvatarFile } from '@/src/lib/firebase';
import { subscribeToUserProfile, updateUserProfile } from '@/src/lib/firestore/users';
import { UserProfile } from '@/src/types/firestore';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { useToast } from '@/src/lib/toast/ToastProvider';
import { sanitizePhoneNumber, handlePhoneKeyDown, validators } from '@/src/lib/validation/formValidators';
import { TIMEZONES, getDetectedTimezone } from '@/src/lib/constants';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Clock,
  Globe,
  Linkedin,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Camera,
} from 'lucide-react';

export const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const showToast = useToast();
  const { firebaseUser, userProfile, currentRole } = useAuth();
  const activeRole = userProfile?.role || currentRole || 'client';
  const userId = firebaseUser?.uid || userProfile?.uid || '';

  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);

  // Admins manage their administrative credentials exclusively at /admin/settings
  useEffect(() => {
    if (activeRole === 'admin') {
      navigate('/admin/settings', { replace: true });
    }
  }, [activeRole, navigate]);

  if (activeRole === 'admin') {
    return (
      <div className="p-12 text-center font-mono text-xs text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
        <span>Redirecting administrator to Admin Settings...</span>
      </div>
    );
  }

  // Original loaded state for Cancel reversion
  const [originalProfile, setOriginalProfile] = useState<Partial<UserProfile>>({});

  // Form states
  const initialEmail = firebaseUser?.email || userProfile?.email || '';
  const initialNameParts = (userProfile?.fullName || userProfile?.displayName || firebaseUser?.displayName || '').split(' ').filter(Boolean);
  const defaultFirst = userProfile?.firstName || initialNameParts[0] || '';
  const defaultLast = userProfile?.lastName || (initialNameParts.length > 1 ? initialNameParts.slice(1).join(' ') : '');

  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [firstName, setFirstName] = useState<string>(defaultFirst);
  const [lastName, setLastName] = useState<string>(defaultLast);
  const [email, setEmail] = useState<string>(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState<string>(userProfile?.phoneNumber || '');
  const [bio, setBio] = useState<string>(userProfile?.bio || '');

  const [companyName, setCompanyName] = useState<string>(userProfile?.companyName || '');
  const [location, setLocation] = useState<string>(userProfile?.location || '');
  const [timeZone, setTimeZone] = useState<string>(getDetectedTimezone(userProfile?.timeZone));

  const [linkedInUrl, setLinkedInUrl] = useState<string>(userProfile?.linkedInUrl || '');
  const [websiteUrl, setWebsiteUrl] = useState<string>(userProfile?.websiteUrl || '');

  // Page operation states
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isInitialLoadRef = React.useRef<boolean>(true);

  // Subscribe to live profile data
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToUserProfile(userId, (profile) => {
      if (profile) {
        const nameParts = (profile.fullName || profile.displayName || '').split(' ').filter(Boolean);
        const initialFirst = profile.firstName || nameParts[0] || (firebaseUser?.email ? firebaseUser.email.split('@')[0] : '');
        const initialLast = profile.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
        const detectedTz = getDetectedTimezone(profile.timeZone);

        if (isInitialLoadRef.current) {
          setAvatarUrl(profile.avatarUrl || '');
        }
        setFirstName(initialFirst);
        setLastName(initialLast);
        setEmail(profile.email || firebaseUser?.email || '');
        setPhoneNumber(profile.phoneNumber || '');
        setBio(profile.bio || '');
        setCompanyName(profile.companyName || '');
        setLocation(profile.location || '');
        setTimeZone(detectedTz);
        setLinkedInUrl(profile.linkedInUrl || '');
        setWebsiteUrl(profile.websiteUrl || '');

        setOriginalProfile({
          avatarUrl: profile.avatarUrl || '',
          firstName: initialFirst,
          lastName: initialLast,
          email: profile.email || firebaseUser?.email || '',
          phoneNumber: profile.phoneNumber || '',
          bio: profile.bio || '',
          companyName: profile.companyName || '',
          location: profile.location || '',
          timeZone: detectedTz,
          linkedInUrl: profile.linkedInUrl || '',
          websiteUrl: profile.websiteUrl || '',
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [userId, firebaseUser?.email]);

  // Avatar Upload Handler
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Avatar image size must be less than 5MB.');
        return;
      }
      try {
        const url = await uploadAvatarFile(userId, file);
        setAvatarUrl(url);
      } catch (err) {
        console.warn('Firebase Storage upload warning, fallback to FileReader:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAvatarUrl(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
  };

  // Cancel Handler — discards unsaved changes and reverts
  const handleCancel = () => {
    if (originalProfile) {
      setAvatarUrl(originalProfile.avatarUrl || '');
      setFirstName(originalProfile.firstName || '');
      setLastName(originalProfile.lastName || '');
      setEmail(originalProfile.email || firebaseUser?.email || '');
      setPhoneNumber(originalProfile.phoneNumber || '');
      setBio(originalProfile.bio || '');
      setCompanyName(originalProfile.companyName || '');
      setLocation(originalProfile.location || '');
      setTimeZone(originalProfile.timeZone || 'America/Los_Angeles (PST - UTC-8)');
      setLinkedInUrl(originalProfile.linkedInUrl || '');
      setWebsiteUrl(originalProfile.websiteUrl || '');
    }
    const targetDashboard = `/${activeRole}/dashboard`;
    navigate(targetDashboard);
  };

  // Bio change with hard limit 300 chars
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 300) {
      setBio(val);
    }
  };

  // Save Changes Handler
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setEmailNotice(null);
    setSaveSuccess(false);

    try {
      // Validate phone format if provided
      if (phoneNumber.trim()) {
        const phoneErr = validators.phone(phoneNumber.trim());
        if (phoneErr) {
          setErrorMessage(phoneErr);
          setSaving(false);
          return;
        }
      }

      const fullDisplayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const initials = `${firstName.slice(0, 1)}${lastName ? lastName.slice(0, 1) : ''}`.toUpperCase() || 'CL';

      // Batch write client fields to Firestore user profile document
      await updateUserProfile(userId, {
        displayName: fullDisplayName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        avatarUrl: avatarUrl,
        avatarInitials: initials,
        bio: bio.trim(),
        companyName: companyName.trim(),
        location: location.trim(),
        timeZone: timeZone.trim(),
        linkedInUrl: linkedInUrl.trim(),
        websiteUrl: websiteUrl.trim(),
      });

      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to save profile changes:', err);
      setErrorMessage(err?.message || 'Failed to update user profile. Please try again.');
      setSaving(false);
    }
  };

  const bioLength = bio.length;
  const isBioMax = bioLength >= 300;

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:border-[var(--color-accent-cyan)] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)] tracking-tight">
              Edit Personal Profile
            </h1>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
              Update your individual profile details, profile picture, contact email, and social links.
            </p>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {saveSuccess && (
        <div className="p-4 rounded-[12px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between gap-3 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Personal profile updated successfully across SyncSphere platform.</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400">Saved</span>
        </div>
      )}

      {emailNotice && (
        <div className="p-4 rounded-[12px] bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2.5 shadow-md">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{emailNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-[12px] bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveChanges} className="space-y-6">
        {/* CARD 1: PROFILE PHOTO */}
        <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-4 shadow-md">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="text-sm font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
              Profile Photo & Avatar
            </h3>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
              Distinct from your organization logo. Used in message threads, project assignments, and header navigation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            {/* AVATAR PREVIEW */}
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Personal Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-[var(--color-accent-cyan)] shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-accent-cyan)]/20 to-blue-500/20 border-2 border-[var(--color-border)] flex items-center justify-center text-xl font-mono font-bold text-[var(--color-accent-cyan)]">
                  {firstName.slice(0, 1)}
                  {lastName.slice(0, 1)}
                </div>
              )}
              <label
                htmlFor="avatar-input"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--color-accent-cyan)] text-slate-950 cursor-pointer shadow-md hover:scale-110 transition-transform"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
            </div>

            {/* ACTION BUTTONS & GUIDELINES */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <label
                  htmlFor="avatar-input"
                  className="h-9 px-4 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-xs font-mono font-bold text-[var(--color-text-primary)] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                  <span>Upload New Photo</span>
                </label>

                {avatarUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmRemoveAvatar(true)}
                    className="h-9 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-mono text-xs flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </Button>
                )}
              </div>
              <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                Recommended: Square PNG or JPG, max 5MB. Stored independently under user avatar bucket.
              </p>
            </div>
          </div>

          <ConfirmDialog
            open={confirmRemoveAvatar}
            title="Remove profile photo?"
            description="Are you sure you want to remove your profile photo? This will revert your avatar to display initials."
            confirmLabel="Remove Photo"
            destructive
            onConfirm={() => {
              handleRemoveAvatar();
              setConfirmRemoveAvatar(false);
              showToast('info', 'Profile photo removed');
            }}
            onCancel={() => setConfirmRemoveAvatar(false)}
          />
        </Card>

        {/* CARD 2: PERSONAL INFORMATION */}
        <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-5 shadow-md">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="text-sm font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
              Personal Information
            </h3>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
              Your name and primary communication channels on the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FIRST NAME */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                First Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>

            {/* LAST NAME */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                  Last Name
                </label>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">Optional</span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Optional for single-name accounts"
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>

            {/* EMAIL ADDRESS (READ-ONLY) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                  Account Email Address
                </label>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">🔒 Fixed / Read-Only</span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                <input
                  type="email"
                  readOnly
                  value={email}
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)]/50 border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] cursor-not-allowed opacity-80"
                />
              </div>
              <p className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                Primary login identity. Managed via Security & Authentication settings.
              </p>
            </div>

            {/* PHONE NUMBER */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                  Contact Phone Number
                </label>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">Optional</span>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                <input
                  name="phoneNumber"
                  autoComplete="tel"
                  type="tel"
                  value={phoneNumber}
                  onKeyDown={handlePhoneKeyDown}
                  onChange={(e) => setPhoneNumber(sanitizePhoneNumber(e.target.value))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
              {phoneNumber.trim().length > 0 && phoneNumber.replace(/\D/g, '').length < 8 && (
                <p className="text-[11px] text-amber-400 font-mono mt-1 flex items-center gap-1">
                  <span>• Minimum 8 digits required for a valid phone number</span>
                </p>
              )}
            </div>
          </div>

          {/* BIO WITH LIVE 300-CHAR COUNTER */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                Professional Bio
              </label>
              <span
                className={`text-[11px] font-mono font-bold ${
                  isBioMax ? 'text-rose-400' : 'text-[var(--color-accent-cyan)]'
                }`}
              >
                {bioLength}/300
              </span>
            </div>
            <textarea
              rows={3}
              value={bio}
              onChange={handleBioChange}
              placeholder="Brief summary of your background, experience, or role..."
              className="w-full p-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] resize-none"
            />
            {isBioMax && (
              <p className="text-[10px] font-mono text-rose-400">
                Maximum length reached (300 characters).
              </p>
            )}
          </div>
        </Card>

        {/* CARD 3: COMPANY & LOCATION */}
        <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-4 shadow-md">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="text-sm font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
              Company & Location
            </h3>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
              Information regarding your organization and geographical presence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* COMPANY NAME */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                Organization / Company
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Aether Dynamics Inc."
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>

            {/* LOCATION */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA, USA"
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>

            {/* TIME ZONE */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                Primary Time Zone
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-2.5 pointer-events-none z-10" />
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* CARD 4: LINKS & SOCIAL */}
        <Card className="p-6 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[14px] space-y-4 shadow-md">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="text-sm font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider">
              Online Profiles & Links
            </h3>
            <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
              Direct URLs to your professional LinkedIn profile and personal website.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LINKEDIN */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <Linkedin className="w-4 h-4 text-blue-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>

            {/* WEBSITE */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-[var(--color-text-primary)]">
                Personal / Company Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-[var(--color-accent-cyan)] absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* BOTTOM ACTION ROW */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-10 border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] px-5 hover:bg-[var(--color-surface)]"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="h-10 bg-gradient-to-r from-[var(--color-accent-cyan)] to-blue-500 text-slate-950 font-mono text-xs font-bold px-6 rounded-[8px] flex items-center gap-2 shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
