import { ExperienceItem, PortfolioItem, CertificationItem } from '@/src/types/firestore';

export interface SymbioteProfile {
  uid: string;
  displayName: string;
  title: string;
  avatarInitials: string;
  avatarUrl?: string;
  rating: number;
  reviewsCount: number;
  hourlyRate: number;
  skills: string[];
  experience: 'Junior' | 'Mid' | 'Senior' | 'Expert' | string;
  availability: 'Immediate' | 'Part-time' | '2+ weeks' | string;
  location: string;
  timeZone?: string;
  bio: string;
  email: string;
  completedProjects: number;
  topAchievements?: string[];
  experiences?: ExperienceItem[];
  portfolio?: PortfolioItem[];
  certifications?: CertificationItem[];
  createdAt?: string;
  updatedAt?: string;
  isOnline?: boolean;
  lastActiveAt?: any;
  lastSeen?: any;
}

export const DEFAULT_SYMBIOTES: SymbioteProfile[] = [];

export const MOCK_SYMBIOTES: SymbioteProfile[] = [];





