import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { StatusPill } from '@/src/components/ui/badge';
import { WizardStepIndicator } from '@/src/components/widgets/WizardStepIndicator';
import { saveProjectDraft, getProjectById } from '@/src/lib/firestore/projects';
import { Project } from '@/src/types/firestore';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  RefreshCw,
  Edit3,
  Paperclip,
  ShieldAlert,
  Cpu,
  HelpCircle,
  Check,
} from 'lucide-react';

const WIZARD_STEPS = [
  { id: '1', label: 'Basic Info', description: 'Title, category & skills' },
  { id: '2', label: 'Timeline & Schedule', description: 'Dates & work arrangement' },
  { id: '3', label: 'AI Matching', description: 'Preferences & criteria' },
  { id: '4', label: 'Review & Publish', description: 'Final audit & launch' },
];

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

interface AIBrief {
  title: string;
  description: string;
  keyRisks?: string[];
  recommendedSkills?: string[];
  attachedAt?: string;
}

export const CreateProjectStep3Page: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Project context loaded from Step 1 & 2
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);

  // Conversation & AI Brief State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiBrief, setAiBrief] = useState<AIBrief | null>(null);
  const [isBriefAttached, setIsBriefAttached] = useState(false);

  // Brief Edit Mode
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // UI Feedback State
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if no draftId
  useEffect(() => {
    if (!draftId) {
      navigate('/client/projects/new/step-1', { replace: true });
      return;
    }

    let isMounted = true;
    getProjectById(draftId)
      .then((project) => {
        if (!isMounted) return;

        if (project) {
          setProjectData(project);

          // Hydrate conversation if present
          if (project.aiConversation && project.aiConversation.length > 0) {
            setMessages(project.aiConversation);
          } else {
            // Initial AI welcome message referencing Step 1 and Step 2 details
            const initialGreeting: ChatMessage = {
              role: 'assistant',
              text: `Hello! I'm PreSync AI, your autonomous project architect. I've reviewed your brief details for "${
                project.title || 'Untitled Project'
              }" (${project.category || 'AI Engineering'}) with a ${project.budgetType || 'fixed'} budget of ${
                project.currency || 'USD'
              } ${project.minBudget?.toLocaleString() || '10,000'} - ${
                project.maxBudget?.toLocaleString() || '25,000'
              }.

To synthesize a high-precision executive brief for our matching engine, please share any specific architectural constraints, compliance mandates, or key deliverables required.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages([initialGreeting]);
          }

          // Hydrate brief if present
          if (project.aiBrief) {
            setAiBrief(project.aiBrief);
            setEditedTitle(project.aiBrief.title);
            setEditedDescription(project.aiBrief.description);
          }

          if (project.aiBriefAttached) {
            setIsBriefAttached(true);
          }
        }
        setLoadingDraft(false);
      })
      .catch((err) => {
        console.error('Error loading draft for step 3:', err);
        setLoadingDraft(false);
      });

    return () => {
      isMounted = false;
    };
  }, [draftId, navigate]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  // Save conversation & brief to Firestore
  const persistStep3Data = async (
    updatedMessages: ChatMessage[],
    updatedBrief: AIBrief | null,
    attached: boolean
  ) => {
    if (!firebaseUser?.uid || !draftId) return;

    try {
      await saveProjectDraft(draftId, {
        ownerId: firebaseUser.uid,
        aiConversation: updatedMessages,
        aiBrief: updatedBrief || undefined,
        aiBriefAttached: attached,
        // Also sync title, description, and skills with AI brief if attached
        ...(attached && updatedBrief ? {
          description: updatedBrief.description,
          ...(updatedBrief.title ? { title: updatedBrief.title } : {}),
          ...(updatedBrief.recommendedSkills && updatedBrief.recommendedSkills.length > 0
            ? { skills: updatedBrief.recommendedSkills }
            : {}),
        } : {}),
      });
    } catch (err) {
      console.error('Failed to sync Step 3 state to Firestore:', err);
    }
  };

  // Generate / Synthesize AI Brief via server API
  const generateBrief = async (conversationContext: ChatMessage[]) => {
    setIsAiTyping(true);
    try {
      const res = await fetch('/api/generate-project-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData,
          conversation: conversationContext,
        }),
      });

      const data = await res.json();
      if (data.success && data.brief) {
        const generated: AIBrief = {
          title: data.brief.title,
          description: data.brief.description,
          keyRisks: data.brief.keyRisks || [],
          recommendedSkills: data.brief.recommendedSkills || projectData?.skills || [],
        };

        setAiBrief(generated);
        setEditedTitle(generated.title);
        setEditedDescription(generated.description);

        // Add assistant notification message
        const briefReadyMsg: ChatMessage = {
          role: 'assistant',
          text: `✨ I have synthesized a formal Executive Brief based on our conversation! You can review the Brief Summary card below, edit it if needed, and click "Attach to Project" to attach it to your draft.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const newMessages = [...conversationContext, briefReadyMsg];
        setMessages(newMessages);
        await persistStep3Data(newMessages, generated, isBriefAttached);
      }
    } catch (err) {
      console.error('Error generating brief:', err);
      setToastMessage({ type: 'error', text: 'Failed to synthesize AI brief. Please try again.' });
    } finally {
      setIsAiTyping(false);
    }
  };

  // Send User Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isAiTyping) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsAiTyping(true);

    await persistStep3Data(updatedMessages, aiBrief, isBriefAttached);

    // Simulate AI response + trigger synthesis if 2+ turns
    setTimeout(async () => {
      const aiReply: ChatMessage = {
        role: 'assistant',
        text: `Understood. I've noted: "${text.length > 60 ? text.substring(0, 60) + '...' : text}". Synthesizing this requirement into your technical architectural profile...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, aiReply];
      setMessages(finalMessages);
      setIsAiTyping(false);
      await persistStep3Data(finalMessages, aiBrief, isBriefAttached);

      // Auto trigger brief generation on user response if not generated yet or re-synthesize
      await generateBrief(finalMessages);
    }, 1200);
  };

  // Attach Brief to Project
  const handleAttachBrief = async () => {
    if (!aiBrief) return;

    const attachedBrief: AIBrief = {
      ...aiBrief,
      title: editedTitle || aiBrief.title,
      description: editedDescription || aiBrief.description,
      attachedAt: new Date().toISOString(),
    };

    setAiBrief(attachedBrief);
    setIsBriefAttached(true);
    setIsEditingBrief(false);

    setToastMessage({ type: 'success', text: 'AI Executive Brief attached to project successfully!' });

    await persistStep3Data(messages, attachedBrief, true);
  };

  // Save Inline Edits
  const handleSaveBriefEdits = () => {
    if (!aiBrief) return;
    const updated: AIBrief = {
      ...aiBrief,
      title: editedTitle,
      description: editedDescription,
    };
    setAiBrief(updated);
    setIsEditingBrief(false);
    persistStep3Data(messages, updated, isBriefAttached);
    setToastMessage({ type: 'success', text: 'Brief summary updated.' });
  };

  // Regenerate Brief
  const handleRegenerate = async () => {
    setIsBriefAttached(false);
    setAiBrief(null);
    setToastMessage({ type: 'success', text: 'Re-running AI brief synthesis...' });
    await generateBrief(messages);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!firebaseUser?.uid || !draftId) return;
    setSaving(true);
    try {
      await saveProjectDraft(draftId, {
        ownerId: firebaseUser.uid,
        aiConversation: messages,
        aiBrief: aiBrief || undefined,
        aiBriefAttached: isBriefAttached,
        status: 'draft',
        ...(isBriefAttached && aiBrief ? {
          description: aiBrief.description,
          ...(aiBrief.title ? { title: aiBrief.title } : {}),
          ...(aiBrief.recommendedSkills && aiBrief.recommendedSkills.length > 0
            ? { skills: aiBrief.recommendedSkills }
            : {}),
        } : {}),
      });
      setToastMessage({ type: 'success', text: 'Step 3 session saved successfully.' });
    } catch (err) {
      setToastMessage({ type: 'error', text: 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  // Navigation
  const handleBack = () => {
    navigate(`/client/projects/new/step-2?draftId=${draftId}`);
  };

  const handleContinue = () => {
    if (!isBriefAttached) {
      setToastMessage({
        type: 'error',
        text: 'Human verification required: Please click "Attach to Project" on the AI brief card before continuing.',
      });
      return;
    }
    navigate(`/client/projects/new/step-4?draftId=${draftId}`);
  };

  if (loadingDraft) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--color-text-secondary)]">Connecting to PreSync AI Assistant...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-accent-cyan)] font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>PreSync AI Assistant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
            AI Brief Synthesis & Alignment
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Step 3 of 4 — Conversational scope refinement & automated brief generation
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/client/projects')}
          className="shrink-0 flex items-center gap-2 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Wizard</span>
        </Button>
      </div>

      {/* WIZARD STEP INDICATOR (Steps 1 & 2 Completed, Step 3 Active) */}
      <Card className="p-4 sm:p-6">
        <WizardStepIndicator steps={WIZARD_STEPS} currentStepIndex={2} />
      </Card>

      {/* TOAST MESSAGE BANNER */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-[10px] border text-xs flex items-center justify-between gap-3 ${
            toastMessage.type === 'success'
              ? 'bg-[var(--color-success-green)]/10 border-[var(--color-success-green)]/30 text-[var(--color-success-green)]'
              : 'bg-[var(--color-danger-red)]/10 border-[var(--color-danger-red)]/30 text-[var(--color-danger-red)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/10 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT CONVERSATIONAL CHAT THREAD (2 COLS) */}
        <Card className="lg:col-span-2 flex flex-col h-[620px] p-0 overflow-hidden border-[var(--color-border)]">
          {/* CHAT HEADER */}
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  PreSync AI Architect
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-success-green)] animate-ping" />
                </h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Active session context: {projectData?.title || 'Draft Brief'}
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateBrief(messages)}
              disabled={isAiTyping}
              className="flex items-center gap-1.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span>Synthesize Brief</span>
            </Button>
          </div>

          {/* CHAT MESSAGES SCROLL AREA */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-4 bg-[var(--color-background)]"
          >
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={index}
                  className={`flex gap-3 max-w-[88%] ${isAssistant ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isAssistant
                        ? 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`p-3.5 rounded-[12px] text-xs leading-relaxed whitespace-pre-wrap ${
                        isAssistant
                          ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
                          : 'bg-[var(--color-accent-cyan)] text-slate-950 font-medium'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <p
                      className={`text-[10px] text-[var(--color-text-secondary)] font-mono ${
                        isAssistant ? 'text-left' : 'text-right'
                      }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              );
            })}

            {isAiTyping && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-7 h-7 rounded-full bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 flex items-center justify-center text-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent-cyan)] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent-cyan)] animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent-cyan)] animate-bounce [animation-delay:0.4s]" />
                  <span className="font-mono text-[10.5px]">Analyzing context & generating brief...</span>
                </div>
              </div>
            )}
          </div>

          {/* CHAT INPUT BAR */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2"
          >
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your answer or provide additional technical context..."
              disabled={isAiTyping}
              className="flex-1 text-xs"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!inputText.trim() || isAiTyping}
              className="shrink-0 flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </Card>

        {/* RIGHT PANEL: AI GENERATED BRIEF CARD + ACTIONS (1 COL) */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-5 space-y-4 bg-[var(--color-surface)] border-[var(--color-border)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
                  Synthesized Brief Card
                </h3>
              </div>
              {isBriefAttached ? (
                <StatusPill variant="green" label="Attached" />
              ) : (
                <StatusPill variant="amber" label="Pending Attachment" />
              )}
            </div>

            {aiBrief ? (
              <div className="space-y-4 text-xs">
                {/* Editable Title */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase block mb-1">
                    Brief Title
                  </label>
                  {isEditingBrief ? (
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-xs font-bold"
                    />
                  ) : (
                    <p className="font-bold text-[var(--color-text-primary)] text-sm">{aiBrief.title}</p>
                  )}
                </div>

                {/* Editable Description */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase block mb-1">
                    Executive Scope & Brief
                  </label>
                  {isEditingBrief ? (
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={6}
                      className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-cyan)]"
                    />
                  ) : (
                    <p className="text-[11.5px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line bg-[var(--color-background)] p-3 rounded-[8px] border border-[var(--color-border)] max-h-[160px] overflow-y-auto">
                      {aiBrief.description}
                    </p>
                  )}
                </div>

                {/* Risks & Mitigations */}
                {aiBrief.keyRisks && aiBrief.keyRisks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-[var(--color-warning-amber)]" />
                      Identified Risk Factors
                    </p>
                    <ul className="space-y-1 pl-2 text-[11px] text-[var(--color-text-secondary)]">
                      {aiBrief.keyRisks.map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning-amber)] mt-1 shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Skills */}
                {aiBrief.recommendedSkills && aiBrief.recommendedSkills.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold uppercase flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-[var(--color-accent-cyan)]" />
                      Recommended Skill Criteria
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {aiBrief.recommendedSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* CARD ACTION BUTTONS */}
                <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                  {isEditingBrief ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveBriefEdits}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Summary Edits</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant={isBriefAttached ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={handleAttachBrief}
                        className={`w-full flex items-center justify-center gap-2 ${
                          isBriefAttached ? 'border-[var(--color-success-green)] text-[var(--color-success-green)]' : ''
                        }`}
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{isBriefAttached ? 'Re-Attach Brief to Project' : 'Attach to Project'}</span>
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsEditingBrief(true)}
                          className="flex items-center justify-center gap-1.5 text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Summary</span>
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleRegenerate}
                          className="flex items-center justify-center gap-1.5 text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Regenerate</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3 bg-[var(--color-background)] rounded-[10px] border border-dashed border-[var(--color-border)]">
                <Bot className="w-8 h-8 text-[var(--color-accent-cyan)] mx-auto opacity-70" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">No Brief Card Generated Yet</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                    Answer the AI assistant's questions in the chat, or click "Synthesize Brief" above to compile a brief card.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => generateBrief(messages)}
                  className="flex items-center gap-2 mx-auto text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                  <span>Generate Brief Now</span>
                </Button>
              </div>
            )}
          </Card>

          {/* HUMAN ACTION REQUIRED NOTICE */}
          <Card className="p-4 border-[var(--color-warning-amber)]/30 bg-[var(--color-warning-amber)]/5 space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-warning-amber)]">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-bold">Human Action Required</h4>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
              Per PreSync governance rules, AI output is never auto-committed. You must explicitly click{' '}
              <strong className="text-[var(--color-text-primary)] font-semibold">"Attach to Project"</strong> on the brief summary card to enable the "Continue" button.
            </p>
          </Card>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] flex items-center justify-between gap-4 shadow-none">
        <Button
          variant="secondary"
          size="md"
          onClick={handleBack}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleContinue}
            disabled={saving || !isBriefAttached}
            className={`flex items-center gap-2 ${
              !isBriefAttached ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
