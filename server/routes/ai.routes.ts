import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

export const aiRouter = Router();

// 1. AI Brief Generator
aiRouter.post("/generate-project-brief", async (req: Request, res: Response) => {
  try {
    const { projectData, conversation } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const formattedTranscript = (conversation || [])
      .map((c: { role: string; text: string }) => `${c.role.toUpperCase()}: ${c.text}`)
      .join("\n");

    const promptText = `
You are PreSync AI, an expert AI project architect for an elite tech platform.
Based on the following project context and client conversation transcript, generate a structured executive project brief.

PROJECT CONTEXT:
- Title: ${projectData?.title || 'Untitled'}
- Category: ${projectData?.category || 'AI Engineering'}
- Industry: ${projectData?.industry || 'Tech'}
- Tech Stack: ${(projectData?.skills || []).join(', ')}
- Budget: ${projectData?.budgetType || 'fixed'} (${projectData?.minBudget || 0} - ${projectData?.maxBudget || 0} ${projectData?.currency || 'USD'})
- Timeline: ${projectData?.duration || '3 months'} (${projectData?.startDate || ''} to ${projectData?.endDate || ''})
- Priority: ${projectData?.priority || 'High'}
- Work Mode: ${projectData?.workMode || 'Remote'} (${projectData?.weeklyCommitment || 40} hrs/week)
- Initial Description: ${projectData?.description || 'N/A'}

CONVERSATION TRANSCRIPT:
${formattedTranscript}

Respond with ONLY a JSON object in this exact format (no markdown formatting around it, just raw valid JSON):
{
  "title": "Synthesized Project Title",
  "description": "Comprehensive, highly polished multi-paragraph executive project brief outlining core objectives, architecture, technical deliverables, and success metrics.",
  "keyRisks": ["Risk 1 and mitigation", "Risk 2 and mitigation", "Risk 3 and mitigation"],
  "recommendedSkills": ["Skill1", "Skill2", "Skill3", "Skill4"]
}
`;

    if (!apiKey) {
      const synthesizedTitle = projectData?.title
        ? `[PreSync AI Brief] ${projectData.title}`
        : 'Autonomous AI Engineering Pipeline';

      const synthesizedDescription = `
Executive Project Scope:
${projectData?.description || 'To build a high-performance system adhering to strict enterprise standards.'}

Key Objectives & Architecture:
- Implement end-to-end ${projectData?.category || 'AI Engineering'} solution utilizing ${
        (projectData?.skills || ['Python', 'React']).join(', ')
      }.
- Ensure deployment compatibility within ${projectData?.duration || '3 months'} timeline (${projectData?.workMode || 'Remote'} execution).
- Target operational velocity maintaining high quality and strict compliance guidelines.

Additional Client Constraints:
${(conversation || []).filter((c: any) => c.role === 'user').map((c: any) => c.text).join(' ')}
`.trim();

      return res.json({
        success: true,
        brief: {
          title: synthesizedTitle,
          description: synthesizedDescription,
          keyRisks: [
            'Timeline compression due to integration complexity - Mitigated by phased milestone releases.',
            'API rate limits and throughput bottlenecks - Mitigated by response caching & queue management.',
            'Vector index latency - Mitigated by approximate nearest neighbors (ANN) optimization.'
          ],
          recommendedSkills: projectData?.skills || ['Python', 'PyTorch', 'LangChain', 'FastAPI']
        }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedBrief = JSON.parse(jsonMatch[0]);
      return res.json({ success: true, brief: parsedBrief });
    } else {
      throw new Error("Failed to parse JSON response from Gemini");
    }

  } catch (error: any) {
    console.error("Gemini API Brief Error:", error);
    return res.json({
      success: true,
      brief: {
        title: req.body?.projectData?.title ? `AI Brief: ${req.body.projectData.title}` : 'AI Technical Brief',
        description: req.body?.projectData?.description || 'Synthesized brief based on user requirements and project parameters.',
        keyRisks: ['Integration dependencies', 'Resource availability'],
        recommendedSkills: req.body?.projectData?.skills || ['Python', 'React']
      }
    });
  }
});

// Robust fallback matching algorithm handling all edge cases
export function computeFallbackMatches(project: any, candidates: any[]) {
  const rawSkills: any[] = [
    ...(Array.isArray(project?.skills) ? project.skills : []),
    ...(Array.isArray(project?.techTags) ? project.techTags : []),
  ];
  const projectSkills: string[] = rawSkills
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim().toLowerCase());

  const projectTitle = String(project?.title || 'AI Project');
  const projectCategory = String(project?.category || 'Engineering');
  const projectDesc = String(project?.description || '').toLowerCase();

  // If project has no explicit skills, extract keywords from title and category
  const titleKeywords = projectTitle
    .toLowerCase()
    .split(/[\s,/-]+/)
    .filter((w) => w.length > 2 && !['and', 'the', 'for', 'with', 'from', 'app', 'project'].includes(w));

  const effectiveKeywords = projectSkills.length > 0 ? projectSkills : titleKeywords;

  const matches = (candidates || []).map((cand: any) => {
    const candSkills: string[] = (Array.isArray(cand?.skills) ? cand.skills : [])
      .filter((s: any): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim().toLowerCase());

    const candTitle = String(cand?.title || cand?.jobTitle || '').toLowerCase();
    const candBio = String(cand?.bio || '').toLowerCase();

    // Check skills overlap
    const matchingSkills = candSkills.filter((cs) =>
      effectiveKeywords.some((pk) => pk === cs || cs.includes(pk) || pk.includes(cs))
    );

    // Also check if candidate title or bio matches project keywords
    const titleMatches = effectiveKeywords.some((pk) => candTitle.includes(pk));
    const bioMatches = effectiveKeywords.filter((pk) => candBio.includes(pk)).length;

    const hasAnySkillMatch = matchingSkills.length > 0;
    const hasDomainMatch = titleMatches || bioMatches > 1;

    let matchScore = 12;
    let skillsScore = 10;

    if (hasAnySkillMatch || (effectiveKeywords.length > 0 && hasDomainMatch)) {
      const overlapRatio = effectiveKeywords.length > 0 ? matchingSkills.length / effectiveKeywords.length : 0.5;
      skillsScore = Math.min(98, Math.round(50 + overlapRatio * 45 + (titleMatches ? 5 : 0)));
      const expScore = cand.experience === 'Expert' ? 95 : cand.experience === 'Senior' ? 88 : 75;
      const availScore = cand.availability === 'Immediate' ? 95 : 82;

      matchScore = Math.round((skillsScore * 0.6) + (expScore * 0.25) + (availScore * 0.15));
      matchScore = Math.min(98, Math.max(45, matchScore));
    } else {
      // Zero matching skills and zero domain match (e.g. video editor for DevOps project)
      // Strictly assign a low score between 8% and 15%
      matchScore = Math.min(15, Math.max(8, Math.round((cand.rating ? cand.rating * 2 : 10))));
      skillsScore = 10;
    }

    const expScore = cand.experience === 'Expert' ? 95 : cand.experience === 'Senior' ? 88 : 75;
    const availScore = cand.availability === 'Immediate' ? 95 : 80;

    const explanation = hasAnySkillMatch
      ? `${cand.displayName || 'Specialist'} is a ${matchScore}% match for "${projectTitle}". Demonstrates verified expertise in ${matchingSkills.join(', ')} with a solid background as ${cand.title || 'specialist'}.`
      : `${cand.displayName || 'Specialist'} has a ${matchScore}% match index. Primary expertise (${candSkills.slice(0, 3).join(', ') || candTitle || 'General'}) does not align with required qualifications (${effectiveKeywords.slice(0, 3).join(', ')}).`;

    return {
      symbioteId: cand.uid || cand.id || 'specialist',
      matchScore,
      subMetrics: {
        skillsMatch: skillsScore,
        experienceFit: expScore,
        availabilityFit: availScore,
      },
      explanation,
    };
  });

  matches.sort((a: any, b: any) => b.matchScore - a.matchScore);
  return matches;
}

// 2. AI Professional Candidate Matching
aiRouter.post("/generate-matches", async (req: Request, res: Response) => {
  try {
    const { project, candidates } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const rawSkills: any[] = [
      ...(Array.isArray(project?.skills) ? project.skills : []),
      ...(Array.isArray(project?.techTags) ? project.techTags : []),
    ];
    const projectSkills: string[] = rawSkills
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim());

    const projectTitle = project?.title || 'AI Project';
    const projectCategory = project?.category || 'AI Engineering';
    const projectDesc = project?.description || '';

    const candidatesList = (candidates || []).map((c: any) => ({
      uid: c.uid || c.id,
      displayName: c.displayName,
      title: c.title,
      skills: (Array.isArray(c.skills) ? c.skills : []).filter((s: any) => typeof s === 'string'),
      experience: c.experience,
      hourlyRate: c.hourlyRate,
      availability: c.availability,
      rating: c.rating,
      bio: c.bio,
    }));

    const promptText = `
You are PreSync AI, an enterprise AI recruiter scoring specialists for a project.

PROJECT context:
- Title: ${projectTitle}
- Category: ${projectCategory}
- Required Skills: ${projectSkills.join(', ')}
- Description: ${projectDesc}

CANDIDATE PROFILES:
${JSON.stringify(candidatesList, null, 2)}

Task:
Evaluate each candidate against the project requirements.

CRITICAL MATCHING RULES:
1. Strict Skill Verification: If a candidate has ZERO matching skills or belongs to an unrelated discipline (e.g., Video Editor for DevOps, Copywriter for Machine Learning), their matchScore MUST be strictly below 20%.
2. Only specialists with genuine technical qualification and skill overlap should score >= 70%.
3. Rank the highest matching specialists at the top.

Return ONLY a valid JSON object in this exact format (no markdown around it):
{
  "matches": [
    {
      "symbioteId": "candidate_uid",
      "matchScore": 96,
      "subMetrics": {
        "skillsMatch": 98,
        "experienceFit": 95,
        "availabilityFit": 92
      },
      "explanation": "Natural language paragraph explaining specifically why this candidate is ideal for ${projectTitle}, highlighting matching skills and background."
    }
  ]
}
`;

    if (!apiKey) {
      const fallbackMatches = computeFallbackMatches(project, candidatesList);
      return res.json({ success: true, matches: fallbackMatches });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let rawMatches = parsed.matches || [];

      // Anti-hallucination guardrail: verify that candidates with 0 skill match are not falsely scored >= 70
      const projectSkillsLower = projectSkills.map((s) => s.toLowerCase());
      const guardedMatches = rawMatches.map((m: any) => {
        const candidate = candidatesList.find((c: any) => c.uid === m.symbioteId);
        if (candidate && projectSkillsLower.length > 0) {
          const candSkillsLower = (candidate.skills || []).map((s: string) => s.toLowerCase());
          const candTitleLower = (candidate.title || '').toLowerCase();
          const hasSkillOverlap = candSkillsLower.some((cs: string) =>
            projectSkillsLower.some((ps) => ps === cs || cs.includes(ps) || ps.includes(cs))
          );
          const hasTitleOverlap = projectSkillsLower.some((ps) => candTitleLower.includes(ps));

          // If completely unrelated, clamp score to prevent hallucination
          if (!hasSkillOverlap && !hasTitleOverlap && (m.matchScore || 0) > 20) {
            return {
              ...m,
              matchScore: 14,
              subMetrics: {
                ...m.subMetrics,
                skillsMatch: 10,
              },
              explanation: `${candidate.displayName} does not possess matching required skills (${projectSkills.slice(0, 3).join(', ')}).`,
            };
          }
        }
        return m;
      });

      const sortedMatches = guardedMatches.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
      return res.json({ success: true, matches: sortedMatches });
    } else {
      throw new Error("Failed to parse matches JSON from Gemini");
    }

  } catch (error: any) {
    console.error("Gemini AI Match Generation Error:", error);
    const fallbackMatches = computeFallbackMatches(req.body?.project, req.body?.candidates || []);
    return res.json({ success: true, matches: fallbackMatches });
  }
});

// 3. AI Proposal Pitch Generator
aiRouter.post("/generate-proposal-pitch", async (req: Request, res: Response) => {
  try {
    const { project, specialist } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const projectTitle = project?.title || 'Engineering Project';
    const projectDesc = project?.description || '';
    const projectSkills: string[] = [...(project?.techTags || []), ...(project?.skills || [])];
    const projectBudget = project?.maxBudget || project?.minBudget || 5000;
    const projectDuration = project?.duration || '4 Weeks';

    const specialistName = specialist?.displayName || 'Specialist Engineer';
    const specialistTitle = specialist?.title || 'Senior Software Engineer';
    const specialistSkills: string[] = specialist?.skills || [];
    const specialistBio = specialist?.bio || '';
    const specialistRate = specialist?.hourlyRate || 100;

    const matchingSkills = projectSkills.filter(ps =>
      specialistSkills.some(ss => ss.toLowerCase() === ps.toLowerCase() || ss.toLowerCase().includes(ps.toLowerCase()))
    );

    const promptText = `
You are PreSync AI, an expert technical consultant helping an elite software specialist prepare a winning project proposal.

PROJECT DETAILS:
- Title: ${projectTitle}
- Description: ${projectDesc}
- Required Technologies: ${projectSkills.join(', ')}
- Budget: $${projectBudget}
- Desired Timeline: ${projectDuration}

SPECIALIST PROFILE:
- Name: ${specialistName}
- Professional Title: ${specialistTitle}
- Core Skills: ${specialistSkills.join(', ')}
- Background / Bio: ${specialistBio}
- Hourly Rate: $${specialistRate}/hr

TASK:
Generate a compelling, highly professional, context-aware proposal pitch from the specialist to the client.
Focus on concrete architecture, execution velocity, relevant technical stack mastery (${matchingSkills.join(', ') || projectSkills.slice(0, 3).join(', ')}), and deliverable quality.

Respond with ONLY a raw JSON object in this exact format (no markdown blocks, no commentary):
{
  "coverLetter": "Detailed, highly professional multi-paragraph proposal pitch addressing the client directly...",
  "estimatedDuration": "${projectDuration}",
  "questionsForClient": "1. What is the expected peak throughput? 2. Are there existing staging environments or CI/CD pipelines in place?"
}
`;

    if (!apiKey) {
      const fallbackPitch = `Dear Hiring Team,

I reviewed the requirements for "${projectTitle}" with great enthusiasm. As a ${specialistTitle} specializing in ${
        specialistSkills.slice(0, 4).join(', ') || 'modern software engineering'
      }, my technical background aligns directly with your project deliverables.

Technical Approach & Execution:
1. Architecture & Core Implementation: Rapidly establish the foundational service layer utilizing ${
        matchingSkills.slice(0, 3).join(', ') || projectSkills.slice(0, 3).join(', ') || 'industry best practices'
      } with strict typing and test coverage.
2. Performance & Security: Implement robust data validation, secure API endpoints, and optimized query access patterns.
3. Milestones & Delivery Cadence: Deliver weekly progress updates with reproducible test builds, comprehensive documentation, and proactive communication.

I am available to begin immediately and commit full focus toward meeting your ${projectDuration} timeline with exceptional quality.`;

      return res.json({
        success: true,
        pitch: {
          coverLetter: fallbackPitch.trim(),
          estimatedDuration: projectDuration,
          questionsForClient: '1. Are there existing API specifications or design tokens already available?\n2. What are the key deployment target environments and testing milestones?',
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({ success: true, pitch: parsed });
    } else {
      throw new Error("Failed to parse proposal pitch JSON from Gemini");
    }

  } catch (error: any) {
    console.error("Gemini AI Proposal Pitch Error:", error);
    const projectTitle = req.body?.project?.title || 'Engineering Project';
    const fallbackPitch = `Hello,\n\nI am excited to submit my proposal for "${projectTitle}". With proven experience across the required stack, I can deliver a clean, robust, and maintainable implementation meeting all specified milestones.\n\nLooking forward to discussing the architecture with your team.`;

    return res.json({
      success: true,
      pitch: {
        coverLetter: fallbackPitch,
        proposedRate: req.body?.project?.maxBudget || 5000,
        estimatedDuration: req.body?.project?.duration || '4 Weeks',
        questionsForClient: '1. Are there specific performance or latency benchmarks required?',
      },
    });
  }
});

