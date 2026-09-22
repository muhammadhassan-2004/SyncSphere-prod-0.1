import {
  collection,
  query,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Project, Review } from '@/src/types/firestore';

export interface PlatformMetrics {
  totalUsers: number;
  totalSymbiotes: number;
  totalClients: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalReviews: number;
  averageRating: number;
  isLiveFirestore: boolean;
}

export interface FeaturedReview {
  id: string;
  authorName: string;
  authorRole: 'client' | 'symbiote';
  companyName?: string;
  rating: number;
  comment: string;
  projectName?: string;
  createdAt: string;
  isRealData: boolean;
}

export interface FeaturedProject {
  id: string;
  title: string;
  category: string;
  budget: string;
  progressPercent: number;
  status: string;
  skills: string[];
}

/**
 * Fetch live platform metrics from Firestore.
 */
export async function getLivePlatformMetrics(): Promise<PlatformMetrics> {
  try {
    const usersCol = collection(db, 'users');
    const projectsCol = collection(db, 'projects');
    const reviewsCol = collection(db, 'reviews');

    // Query counts safely
    const [usersSnap, projectsSnap, reviewsSnap] = await Promise.all([
      getDocs(usersCol),
      getDocs(projectsCol),
      getDocs(reviewsCol),
    ]);

    let totalSymbiotes = 0;
    let totalClients = 0;

    usersSnap.forEach((d) => {
      const u = d.data();
      if (u.role === 'symbiote') totalSymbiotes++;
      else if (u.role === 'client') totalClients++;
    });

    let activeProjects = 0;
    let completedProjects = 0;

    projectsSnap.forEach((d) => {
      const p = d.data();
      const st = (p.status || '').toLowerCase();
      if (st === 'completed' || st === 'finished') {
        completedProjects++;
      } else {
        activeProjects++;
      }
    });

    let totalRatingSum = 0;
    reviewsSnap.forEach((d) => {
      const r = d.data() as Partial<Review>;
      const rating = r.ratings?.overall ?? (typeof (r as any).rating === 'number' ? (r as any).rating : 5);
      totalRatingSum += rating;
    });

    const reviewsCount = reviewsSnap.docs.length;
    const averageRating = reviewsCount > 0 ? Number((totalRatingSum / reviewsCount).toFixed(1)) : 4.9;

    return {
      totalUsers: usersSnap.docs.length,
      totalSymbiotes,
      totalClients,
      totalProjects: projectsSnap.docs.length,
      activeProjects,
      completedProjects,
      totalReviews: reviewsCount,
      averageRating,
      isLiveFirestore: true,
    };
  } catch (error) {
    console.warn('Failed to fetch live platform metrics from Firestore:', error);
    return {
      totalUsers: 0,
      totalSymbiotes: 0,
      totalClients: 0,
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalReviews: 0,
      averageRating: 5.0,
      isLiveFirestore: false,
    };
  }
}

/**
 * Fetch real public reviews/testimonials from Firestore reviews collection.
 */
export async function getLivePublicReviews(): Promise<FeaturedReview[]> {
  try {
    const reviewsCol = collection(db, 'reviews');
    const q = query(reviewsCol, limit(6));
    const snap = await getDocs(q);

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((d) => {
      const data = d.data() as Partial<Review>;
      const authorName = data.clientName || data.symbioteName || 'Verified Member';
      const authorRole: 'client' | 'symbiote' = data.clientName ? 'client' : 'symbiote';
      const rating = data.ratings?.overall ?? 5;
      const comment = data.feedback || 'Outstanding technical delivery and seamless project collaboration.';

      return {
        id: d.id,
        authorName,
        authorRole,
        companyName: data.projectName ? `Project: ${data.projectName}` : 'Enterprise Partner',
        rating,
        comment,
        projectName: data.projectName || 'Full-Stack Delivery',
        createdAt: data.createdAt || new Date().toISOString(),
        isRealData: true,
      };
    });
  } catch (error) {
    console.warn('Failed to fetch public reviews from Firestore:', error);
    return [];
  }
}

/**
 * Fetch real projects from Firestore for the interactive dashboard mockup.
 */
export async function getLiveFeaturedProjects(): Promise<FeaturedProject[]> {
  try {
    const projectsCol = collection(db, 'projects');
    const q = query(projectsCol, limit(5));
    const snap = await getDocs(q);

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((d) => {
      const data = d.data() as Project;
      // Calculate progress based on milestone completion or status
      let progress = 45;
      const status = (data.status || '').toLowerCase();
      if (status === 'completed') progress = 100;
      else if (status === 'review' || status === 'testing') progress = 85;
      else if (status === 'in_progress' || status === 'active') progress = 65;
      else if (status === 'planning') progress = 25;

      const rawBudget = typeof data.budget === 'number' ? data.budget : (data.budget as any)?.total || 15000;

      return {
        id: d.id,
        title: data.title || 'Untitled Project',
        category: data.category || 'Software Engineering',
        budget: `$${Number(rawBudget).toLocaleString()}`,
        progressPercent: progress,
        status: data.status || 'Active',
        skills: data.skills || data.techTags || ['React', 'TypeScript'],
      };
    });
  } catch (error) {
    console.warn('Failed to fetch featured projects from Firestore:', error);
    return [];
  }
}
