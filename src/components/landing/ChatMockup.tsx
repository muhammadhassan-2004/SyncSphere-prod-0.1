import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Sparkles, Bot, Send, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  recommendation?: {
    team: string;
    timeline: string;
    budget: string;
  };
}

const SAMPLE_PROMPTS = [
  'B2B SaaS fleet tracking dashboard',
  'Healthcare patient portal with HIPAA compliance',
  'AI document search with vector embeddings',
];

export const ChatMockup: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hi! I'm PreSync AI. What software or engineering project do you want to build?",
      time: '10:42 AM',
    },
    {
      id: 'm2',
      sender: 'user',
      text: 'We need a B2B SaaS dashboard for real-time fleet telematics and reporting.',
      time: '10:43 AM',
    },
    {
      id: 'm3',
      sender: 'ai',
      text: 'Understood! I will analyze required stacks (React, TypeScript, WebSocket telemetry, AWS IoT).',
      time: '10:43 AM',
      recommendation: {
        team: '1 Lead Frontend Architect (React), 1 Cloud Backend Engineer (Node/Go), 1 DevOps Specialist',
        timeline: '8–12 Weeks',
        budget: '$32,000 – $48,000',
      },
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `Synthesizing project brief for "${text.trim()}". Candidate matching criteria compiled across 50+ vetting dimensions.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendation: {
          team: '2 Senior Full-Stack Engineers, 1 Product UI/UX Designer',
          timeline: '6–10 Weeks',
          budget: '$24,000 – $38,000',
        },
      };
      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <Card className="w-full max-w-xl mx-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden text-left p-0">
      {/* Chat Header */}
      <div className="px-5 py-3.5 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 flex items-center justify-center text-[var(--color-accent-cyan)] shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">PreSync AI</span>
              <span className="w-2 h-2 rounded-full bg-[var(--color-success-green)]" title="Online" />
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)]">Project Architecture Assistant</span>
          </div>
        </div>
        <div className="p-1.5 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-accent-cyan)] flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>Interactive Demo</span>
        </div>
      </div>

      {/* Interactive Prompt Pills */}
      <div className="px-4 py-2 bg-[var(--color-surface-elevated)]/50 border-b border-[var(--color-border)] flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-[var(--color-text-tertiary)] font-mono text-[10px] uppercase shrink-0">Try prompt:</span>
        {SAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors whitespace-nowrap cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Thread */}
      <div className="p-5 space-y-4 bg-[var(--color-surface)] text-xs leading-relaxed max-h-[340px] overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end ml-auto max-w-[85%]' : 'items-start max-w-[90%]'
            } space-y-1`}
          >
            <div
              className={`p-3.5 rounded-2xl ${
                msg.sender === 'user'
                  ? 'rounded-tr-sm bg-accent-gradient text-slate-950 font-semibold shadow-md'
                  : 'rounded-tl-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
              }`}
            >
              <p>{msg.text}</p>
              {msg.recommendation && (
                <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] space-y-2 text-left">
                  <div className="flex items-start gap-1.5 text-[11px] font-medium text-[var(--color-text-primary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success-green)] shrink-0 mt-0.5" />
                    <span>Recommended: {msg.recommendation.team}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-accent-cyan)] pt-1">
                    <span>Est: {msg.recommendation.timeline}</span>
                    <span>Budget: {msg.recommendation.budget}</span>
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] px-1">
              {msg.time}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-1.5 p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] w-fit text-[11px] text-[var(--color-accent-cyan)] font-mono animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PreSync AI is analyzing tech requirements...</span>
          </div>
        )}
      </div>

      {/* Input Bar & Direct Launch Action */}
      <div className="p-3 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type your tech stack or project requirement..."
            className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2 rounded-lg bg-[var(--color-accent-cyan)] text-slate-950 hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
            title="Send requirement to PreSync AI"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
            Instant AI project scoping engine
          </span>
          <Link to="/portal-select">
            <Button variant="text-link" size="sm" className="text-xs font-bold text-[var(--color-accent-cyan)] gap-1 p-0 h-auto">
              Start Full AI Intake <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
