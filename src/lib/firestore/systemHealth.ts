import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'not_monitored';
  detail?: string;
}

export async function getSystemHealth(): Promise<ServiceHealth[]> {
  const results: ServiceHealth[] = [];

  const start = performance.now();
  try {
    // Perform a round-trip latency ping against Firestore
    const pingDocRef = auth.currentUser?.uid
      ? doc(db, 'users', auth.currentUser.uid)
      : doc(db, 'projects', '__health_check__');

    await getDoc(pingDocRef);
    const ms = Math.round(performance.now() - start);
    results.push({ name: 'Database', status: ms < 1000 ? 'healthy' : 'degraded', detail: `${ms}ms` });
  } catch (err: any) {
    const ms = Math.round(performance.now() - start);
    // If permission-denied is returned, Firestore is reachable and responding!
    if (err?.code === 'permission-denied') {
      results.push({ name: 'Database', status: 'healthy', detail: `${ms}ms` });
    } else {
      results.push({ name: 'Database', status: 'down', detail: err?.message || 'Connection failed' });
    }
  }

  // Secondary non-monitored services
  results.push({ name: 'API Gateway', status: 'not_monitored' });
  results.push({ name: 'File Storage', status: 'not_monitored' });
  results.push({ name: 'CDN', status: 'not_monitored' });

  return results;
}
