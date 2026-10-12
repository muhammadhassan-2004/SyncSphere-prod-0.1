import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

export const aiRouter = Router();

// Helper to query Gemini with fallback models
async function generateGeminiContent(ai: GoogleGenAI, promptText: string): Promise<string> {
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.7-flash'];
  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} failed:`, err?.message || err);
    }
  }
  throw lastError || new Error("All Gemini models failed or unavailable");
}

// Intelligent fallback brief generator that synthesizes detailed architecture & domain-specific risks
export function computeFallbackBrief(projectData: any, conversation?: any[]) {
  const title = (projectData?.title || 'Modern Software Application').trim();
  const cleanTitle = title.replace(/^\[PreSync\s+AI\s+Brief\]\s*/i, '').replace(/^PreSync\s+AI\s+Brief:\s*/i, '').trim() || title;

  const category = projectData?.category || 'Full Stack Development';
  const industry = projectData?.industry || 'Technology & SaaS';
  const duration = projectData?.duration || '3 months';
  const workMode = projectData?.workMode || 'Remote';
  const weeklyHours = projectData?.weeklyCommitment || 40;
  const userDesc = typeof projectData?.description === 'string' ? projectData.description.trim() : '';

  // Extract user remarks from consultation conversation
  const userRemarks = (conversation || [])
    .filter((c: any) => c.role === 'user' && typeof c.text === 'string' && c.text.trim())
    .map((c: any) => c.text.trim());

  // Determine intelligent recommended skills
  const existingSkills = Array.isArray(projectData?.skills) ? projectData.skills.filter(Boolean) : [];
  let recommendedSkills = [...existingSkills];
  if (recommendedSkills.length === 0) {
    if (/mobile/i.test(title + ' ' + category)) {
      recommendedSkills = ['React Native', 'TypeScript', 'Redux Toolkit', 'REST APIs', 'Firebase'];
    } else if (/ai|machine learning|ml/i.test(title + ' ' + category)) {
      recommendedSkills = ['Python', 'FastAPI', 'PyTorch', 'LangChain', 'Docker', 'Vector DB'];
    } else if (/design|ui|ux/i.test(title + ' ' + category)) {
      recommendedSkills = ['Figma', 'Design Systems', 'Prototyping', 'User Research', 'TailwindCSS'];
    } else {
      recommendedSkills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'TailwindCSS', 'REST APIs'];
    }
  }

  // Synthesize executive brief
  let executiveScope = `The primary objective of this initiative is to architect, develop, and deploy an enterprise-grade ${title} solution tailored for the ${industry} ecosystem. Designed with high reliability, scalable architectural patterns, and responsive user-centric workflows, this project addresses mission-critical platform requirements while ensuring technical agility and code maintainability.`;

  if (userDesc.length > 25 && !/^(need|require|pls|please)?\s*br(ie|ei)f$/i.test(userDesc)) {
    executiveScope += `\n\nClient Specifications & Directives:\n"${userDesc}"`;
  } else {
    executiveScope += `\n\nClient Specifications & Directives:\nDeliver an end-to-end technical foundation featuring responsive user interfaces, modular backend services, persistent data caching, and comprehensive end-to-end test coverage.`;
  }

  if (userRemarks.length > 0) {
    executiveScope += `\n\nKey Stakeholder Directives from Consultation:\n` + userRemarks.map((r) => `• ${r}`).join('\n');
  }

  const technicalArchitecture = `Core Objectives & Technical Architecture:
• Frontend & Experience: Deliver a responsive, component-driven client architecture leveraging modern reactive state management and robust client-side validation.
• Backend Services & APIs: Build resilient, strictly-typed API services ensuring sub-100ms response times, secure token authentication, and data consistency.
• Data Architecture & Integration: Implement optimized database schema indexing, structured queries, and secure integration with external vendor systems.
• Quality, Security & Compliance: Integrate comprehensive automated test suites, input sanitization, OWASP security best practices, and CI/CD automation.
• Execution Cadence: Phased sprint deliveries with milestone reviews within the ${duration} timeframe under a dedicated ${weeklyHours} hrs/week ${workMode} workflow.`;

  const fullDescription = `${executiveScope}\n\n${technicalArchitecture}`.trim();

  const keyRisks = [
    'Timeline compression during third-party integration phases - Mitigated by establishing standardized mock services and phased sprint milestones.',
    'System throughput and API rate-limiting under peak concurrency - Mitigated through server-side in-memory caching and resilient retry mechanisms.',
    'Security and role-based data isolation vulnerabilities - Mitigated by enforcing strict RBAC middleware, JWT rotation, and comprehensive schema validations.',
    'Cross-environment consistency and deployment variance - Mitigated by containerized staging pipelines and rigorous automated edge-case test suites.'
  ];

  return {
    title: cleanTitle,
    description: fullDescription,
    keyRisks,
    recommendedSkills
  };
}

// 1. AI Brief Generator
aiRouter.post("/generate-project-brief", async (req: Request, res: Response) => {
  const { projectData, conversation } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const brief = computeFallbackBrief(projectData, conversation);
    return res.json({ success: true, brief });
  }

  try {
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

    const ai = new GoogleGenAI({ apiKey });
    const responseText = await generateGeminiContent(ai, promptText);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedBrief = JSON.parse(jsonMatch[0]);
      if (parsedBrief && parsedBrief.title && parsedBrief.description) {
        return res.json({ success: true, brief: parsedBrief });
      }
    }
    throw new Error("Failed to parse valid JSON response from Gemini");
  } catch (error: any) {
    console.error("Gemini API Brief Error (falling back to intelligent synthesizer):", error?.message || error);
    const fallbackBrief = computeFallbackBrief(projectData, conversation);
    return res.json({
      success: true,
      brief: fallbackBrief
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

    const matchedList = matchingSkills.slice(0, 3).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
    const explanation = hasAnySkillMatch
      ? `${cand.displayName || 'Specialist'} is a ${matchScore}% match for "${projectTitle}". Verified skills in ${matchedList} with strong alignment.`
      : `${cand.displayName || 'Specialist'} has a ${matchScore}% match index. Primary expertise does not align with required project stack (${effectiveKeywords.slice(0, 3).join(', ')}).`;

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
4. Short & Crisp Explanation: Keep explanation to 1-2 punchy, insightful sentences. Highlight specific core skills and role alignment. Never output repetitive boilerplate text.

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
      "explanation": "Concise 1-2 sentence explanation of why this specialist excels for this project."
    }
  ]
}
`;

    if (!apiKey) {
      const fallbackMatches = computeFallbackMatches(project, candidatesList);
      return res.json({ success: true, matches: fallbackMatches });
    }

    const ai = new GoogleGenAI({ apiKey });
    const responseText = await generateGeminiContent(ai, promptText);
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
    const responseText = await generateGeminiContent(ai, promptText);
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

