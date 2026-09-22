import fetch from 'node-fetch';
import { getFirebaseAdmin, getAdminFirestore } from '../server/firebaseAdmin';
import dotenv from 'dotenv';
dotenv.config();

const adminApp = getFirebaseAdmin();
const db = getAdminFirestore(adminApp);
const snap = await db.collection('users').get();
const all = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
const candidates = all.filter(u => u.role === 'symbiote' || u.role === 'freelancer' || u.hourlyRate).map(c => ({
  uid: c.uid,
  displayName: c.displayName || c.fullName,
  title: c.title || c.jobTitle,
  skills: c.skills || [],
  experience: c.experience || 'Senior',
  hourlyRate: c.hourlyRate || 50,
  availability: c.availability || 'Immediate',
  rating: c.rating || 5,
  bio: c.bio || ''
}));

console.log(`Testing with all ${candidates.length} candidates from Firestore...`);

const res = await fetch('http://localhost:3000/api/generate-matches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project: {
      id: 'PEtUwie0xdMdfGN1Y7BH',
      title: 'DevOps & Cloud Infrastructure Pipeline',
      category: 'DevOps',
      skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS'],
      description: 'Setup automated CI/CD pipeline and Kubernetes cluster on AWS.'
    },
    candidates
  })
});

const json = await res.json();
console.log('Returned matches count:', json.matches?.length);
console.log('Top 3 matches:');
json.matches?.slice(0, 3).forEach(m => console.log(m));
