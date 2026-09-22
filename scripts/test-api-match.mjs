import fetch from 'node-fetch';

async function testMatch() {
  const res = await fetch('http://localhost:3000/api/generate-matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: {
        id: 'test-proj',
        title: 'Build a Python Machine Learning model',
        category: 'AI Engineering',
        skills: ['Python', 'Machine Learning', 'PyTorch'],
        description: 'We need an expert to build an NLP sentiment analysis pipeline.',
      },
      candidates: [
        {
          uid: '0EL7NLkijZaeUSmUzoCrZXQXySz2',
          displayName: 'celine anthan',
          title: 'Video Editor',
          skills: ['Video editing', 'premiere pro', 'capcut', 'Figma'],
          experience: 'Intermediate',
          hourlyRate: 35,
          availability: 'Immediate',
          rating: 4.8,
          bio: 'Expert video editor with CapCut and Premiere Pro'
        },
        {
          uid: 'RSITdfMVIGVUgKPy3LuAFlv8AGm1',
          displayName: 'Feddy',
          title: 'Full Stack & AI Engineer',
          skills: ['Python', 'PyTorch', 'React', 'Docker'],
          experience: 'Expert',
          hourlyRate: 95,
          availability: 'Immediate',
          rating: 5.0,
          bio: 'Deep learning engineer with 8 years experience'
        }
      ]
    })
  });

  const json = await res.json();
  console.log('API Response:', JSON.stringify(json, null, 2));
}

testMatch();
