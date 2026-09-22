import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicNavbar } from '@/src/components/layout/PublicNavbar';
import { PublicFooter } from '@/src/components/layout/PublicFooter';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusPill } from '@/src/components/ui/badge';
import {
  Search,
  HelpCircle,
  Mail,
  FileText,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Users,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Headphones,
  BookOpen,
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  tags: string[];
  readTime: string;
}

export const HelpCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({
    'presync-ai-briefs': true,
    'milestone-invoicing': true,
  });
  const [feedback, setFeedback] = useState<Record<string, 'yes' | 'no'>>({});

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const categories = [
    { id: 'all', label: 'All Topics', icon: HelpCircle, count: 8 },
    { id: 'getting-started', label: 'Getting Started', icon: Users, count: 2 },
    { id: 'presync-ai', label: 'PreSync AI & Briefs', icon: Sparkles, count: 2 },
    { id: 'billing', label: 'Billing & Invoicing', icon: CreditCard, count: 2 },
    { id: 'workspace', label: 'Workspace & Milestones', icon: Briefcase, count: 2 },
  ];

  const popularSearches = ['PreSync AI', 'Time tracking', 'Invoices', 'Specialist rate', 'Milestones'];

  const articles: HelpArticle[] = [
    {
      id: 'presync-ai-briefs',
      title: 'How does PreSync AI create project briefs and requirements?',
      category: 'presync-ai',
      excerpt: 'PreSync AI asks interactive discovery questions based on your budget, timeline, and stack requirements.',
      content:
        'During Step 3 of the project creation wizard, PreSync AI analyzes your initial scope, budget range, and required technology tags. It engages you in an interactive conversational discovery session to clarify deliverables, identify potential architectural risks, and synthesize a comprehensive executive project brief. You can review, refine, and attach the synthesized brief with one click.',
      tags: ['PreSync AI', 'Discovery', 'Scope Synthesis'],
      readTime: '3 min read',
    },
    {
      id: 'milestone-invoicing',
      title: 'How does task time tracking and milestone invoicing work?',
      category: 'billing',
      excerpt: 'Track task hours accurately, generate transparent itemized invoices, and settle directly upon completion.',
      content:
        'SyncSphere ensures transparency through task-level time tracking. Business owners define estimated hours per task, and Specialists record actual hours using the live stopwatch. Upon completing a milestone deliverable, an itemized invoice is automatically generated reflecting verified hours and agreed rates for direct client settlement.',
      tags: ['Invoicing', 'Time Tracking', 'Milestones', 'Payments'],
      readTime: '4 min read',
    },
    {
      id: 'human-in-the-loop',
      title: 'What is the Human-in-the-Loop AI governance policy?',
      category: 'presync-ai',
      excerpt: 'AI recommendations and brief summaries are never auto-committed without explicit human confirmation.',
      content:
        'In strict compliance with SyncSphere AI Governance rules, PreSync AI never automatically commits changes, hires specialists, or publishes binding contracts without human authorization. Every AI-suggested milestone, code brief, or candidate match score requires affirmative approval by the user before taking effect.',
      tags: ['Governance', 'Safety', 'PreSync AI'],
      readTime: '2 min read',
    },
    {
      id: 'symbiote-registration',
      title: 'How do I register and qualify as a Symbiote specialist?',
      category: 'getting-started',
      excerpt: 'Create a Specialist account, complete your skills taxonomy, and submit your portfolio for neural matching.',
      content:
        'Navigate to Sign Up and select "I want to work as an IT Specialist (Symbiote)". After verifying your email, you will complete the guided onboarding flow where you set your hourly rate, primary technical stack (e.g. React, Python, PyTorch, Rust), previous work experience, and bio. Once saved, your profile becomes discoverable by PreSync AI neural candidate scoring.',
      tags: ['Symbiote', 'Onboarding', 'Specialist Profile'],
      readTime: '3 min read',
    },
    {
      id: 'client-onboarding',
      title: 'How do clients post their first AI/IT project?',
      category: 'getting-started',
      excerpt: 'Use the step-by-step project wizard with AI brief assistance to publish project milestones in under 5 minutes.',
      content:
        'As a client, click "Post Project" in your client portal. Enter your project title, objective, required technology stack, and budget model (Fixed Milestones or Hourly). You can then collaborate with PreSync AI in Step 3 to refine the brief, configure payment terms in Step 4, and publish or save as a draft instantly.',
      tags: ['Client', 'Create Project', 'Post Brief'],
      readTime: '3 min read',
    },
    {
      id: 'candidate-matching-score',
      title: 'How does the PreSync AI matching engine calculate candidate fit scores?',
      category: 'presync-ai',
      excerpt: 'Over 50 technical, delivery cadence, and skill taxonomy parameters are evaluated with full explainability.',
      content:
        'The PreSync AI matching engine cross-references project skill tags, budget bandwidth, delivery cadence, and specialist profile telemetry to produce a quantified match score (e.g. 96% Match) alongside a clear, written explanation of why the candidate was recommended for the project.',
      tags: ['Matching Engine', 'Neural Fit', 'Candidates'],
      readTime: '3 min read',
    },
    {
      id: 'time-tracking-invoicing',
      title: 'How do time tracking and invoice generation work?',
      category: 'workspace',
      excerpt: 'Specialists log hours against active project milestones to generate itemized, downloadable invoices.',
      content:
        'Within the Symbiote Workspace, specialists can record billable hours against specific contract milestones. Time logs aggregate into automated, itemized invoice drafts with timestamps and milestone tags that clients can review and approve directly from their billing dashboard.',
      tags: ['Time Tracking', 'Invoices', 'Billing'],
      readTime: '2 min read',
    },
    {
      id: 'milestone-dispute-resolution',
      title: 'What happens if a deliverable requires revision or dispute arbitration?',
      category: 'workspace',
      excerpt: 'Clients can request revisions during the review window or escalate to SyncSphere arbitration.',
      content:
        'When a milestone is submitted, clients have a designated inspection period to submit revision requests with specific feedback. If an impasse occurs, either party can trigger the Dispute Resolution Desk where a SyncSphere technical mediator reviews git logs and contract requirements to make a fair determination.',
      tags: ['Disputes', 'Revisions', 'Arbitration'],
      readTime: '4 min read',
    },
  ];

  const filteredArticles = articles.filter((art) => {
    const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const toggleArticle = (id: string) => {
    setExpandedArticles((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFeedback = (id: string, choice: 'yes' | 'no') => {
    setFeedback((prev) => ({ ...prev, [id]: choice }));
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased selection:bg-[var(--color-accent-cyan)]/20 selection:text-[var(--color-accent-cyan)] flex flex-col relative overflow-hidden">
      {/* AMBIENT BACKGROUND GLOWS (MATCHING TERMS & PRIVACY) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-[var(--color-accent-cyan)]/10 via-[var(--color-accent-blue)]/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[400px] bg-[var(--color-accent-purple)]/5 blur-3xl pointer-events-none -z-10" />

      {/* HEADER / NAVBAR */}
      <PublicNavbar />

      <main className="flex-1 py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* TOP BAR WITH BACK BUTTON & BREADCRUMB META */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]/60">
            <div className="flex items-center gap-4">
              <button
                type="button"
                id="help-back-btn"
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 transition-all shadow-sm hover:shadow-cyan-500/10 cursor-pointer group"
                aria-label="Go back to previous screen"
              >
                <ArrowLeft className="w-4 h-4 text-[var(--color-accent-cyan)] transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </button>

              <div className="h-5 w-px bg-[var(--color-border)] hidden sm:block" />

              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)]">
                <Link to="/" className="hover:text-[var(--color-accent-cyan)] transition-colors">
                  Home
                </Link>
                <span>/</span>
                <span className="text-[var(--color-text-primary)] font-bold">Help Center</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusPill
                variant="cyan"
                icon={<HelpCircle className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />}
                label="Support Knowledge Base"
              />
              <span className="text-xs font-mono text-[var(--color-text-secondary)] hidden md:inline">
                24/7 Desk
              </span>
            </div>
          </div>

          {/* HERO TITLE & SEARCH SECTION */}
          <div className="space-y-4 text-left">
            <div className="inline-flex">
              <StatusPill
                variant="blue"
                icon={<Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-blue)]" />}
                label="Documentation & Answers"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)] leading-[1.2]">
              Help & <span className="text-accent-gradient">Support Center</span>
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
              Find instant answers regarding PreSync AI brief synthesis, task time tracking, candidate scoring, and workspace collaboration.
            </p>

            {/* Interactive Search Bar */}
            <div className="pt-2 max-w-2xl">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, guides, topics (e.g. invoicing, brief synthesis, rates)..."
                  className="w-full pl-12 pr-10 py-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 focus:outline-none focus:border-[var(--color-accent-cyan)] focus:ring-1 focus:ring-[var(--color-accent-cyan)] shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--color-text-secondary)] hover:text-white px-2 py-1 bg-[var(--color-surface-elevated)] rounded cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">Popular:</span>
                {popularSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSearchQuery(item)}
                    className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)]/40 transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN GRID (MATCHING TERMS & PRIVACY) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            {/* LEFT COLUMN: TOPIC CATEGORIES & CONTACT CARD (STICKY ON DESKTOP) */}
            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
              {/* Category Selector Card */}
              <Card className="p-5 border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-sm">
                <h3 className="text-xs font-bold font-mono text-[var(--color-text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                  Knowledge Categories
                </h3>
                <nav className="space-y-1">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] font-bold border border-[var(--color-accent-cyan)]/40 shadow-sm'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{cat.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-[var(--color-accent-cyan)] text-black font-bold'
                              : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]'
                          }`}
                        >
                          {cat.id === 'all'
                            ? articles.length
                            : articles.filter((a) => a.category === cat.id).length}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </Card>

              {/* Direct Support Desk Card */}
              <Card className="p-5 border-[var(--color-border)] bg-[var(--color-surface)] space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-accent-cyan)]">
                  <Headphones className="w-4 h-4" />
                  <span>24/7 Verified Support</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Cannot find what you need? Our technical and arbitration teams are active around the clock.
                </p>
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                    Direct Email:{' '}
                    <a
                      href="mailto:support@syncsphere.io"
                      className="text-[var(--color-accent-cyan)] hover:underline font-bold block"
                    >
                      support@syncsphere.io
                    </a>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Average Response SLA: &lt; 2 Hours</span>
                  </div>
                </div>
                <Link to="/contact" className="block pt-1">
                  <Button variant="secondary" size="sm" className="w-full text-xs font-bold gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Submit Support Ticket
                  </Button>
                </Link>
              </Card>

              {/* Quick Legal Links */}
              <div className="px-2 flex items-center justify-between text-[11px] font-mono text-[var(--color-text-secondary)]">
                <Link to="/terms" className="hover:text-[var(--color-accent-cyan)] transition-colors">
                  Terms of Service
                </Link>
                <span>•</span>
                <Link to="/privacy" className="hover:text-[var(--color-accent-cyan)] transition-colors">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link to="/about" className="hover:text-[var(--color-accent-cyan)] transition-colors">
                  About Us
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: GUIDES & FAQS ACCORDION */}
            <div className="lg:col-span-8 space-y-6">
              {/* Header count / Filter indicator */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Showing {filteredArticles.length} Article{filteredArticles.length === 1 ? '' : 's'}
                  </span>
                  {activeCategory !== 'all' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)] border border-[var(--color-accent-cyan)]/30 font-bold uppercase">
                      {categories.find((c) => c.id === activeCategory)?.label}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                      Query: "{searchQuery}"
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const allOpen = Object.keys(expandedArticles).length === articles.length;
                    if (allOpen) {
                      setExpandedArticles({});
                    } else {
                      const expandedMap: Record<string, boolean> = {};
                      articles.forEach((a) => {
                        expandedMap[a.id] = true;
                      });
                      setExpandedArticles(expandedMap);
                    }
                  }}
                  className="text-xs font-mono text-[var(--color-accent-cyan)] hover:underline cursor-pointer"
                >
                  {Object.keys(expandedArticles).length === articles.length ? 'Collapse All' : 'Expand All'}
                </button>
              </div>

              {/* Articles List */}
              {filteredArticles.length === 0 ? (
                <Card className="p-10 text-center border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
                  <HelpCircle className="w-10 h-10 text-[var(--color-text-secondary)] mx-auto opacity-40" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                      No matching articles found
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto">
                      We couldn't find any results for "{searchQuery}". Try searching with different keywords or contact our support team.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveCategory('all');
                      }}
                      className="text-xs"
                    >
                      Reset Filters
                    </Button>
                    <Link to="/contact">
                      <Button variant="primary" size="sm" className="text-xs font-bold gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        Ask Support Desk
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredArticles.map((art) => {
                    const isExpanded = !!expandedArticles[art.id];
                    const userFeedback = feedback[art.id];

                    return (
                      <Card
                        key={art.id}
                        className={`border transition-all overflow-hidden ${
                          isExpanded
                            ? 'border-[var(--color-accent-cyan)]/40 bg-[var(--color-surface)] shadow-md shadow-cyan-500/5'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border)]/90'
                        }`}
                      >
                        {/* Article Header Button */}
                        <button
                          type="button"
                          onClick={() => toggleArticle(art.id)}
                          className="w-full p-5 text-left flex items-start justify-between gap-4 cursor-pointer focus:outline-none"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-accent-cyan)] uppercase font-semibold">
                                {categories.find((c) => c.id === art.category)?.label || art.category}
                              </span>
                              <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                                • {art.readTime}
                              </span>
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)] leading-snug">
                              {art.title}
                            </h3>

                            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                              {art.excerpt}
                            </p>
                          </div>

                          <div
                            className={`p-2 rounded-lg transition-transform duration-200 shrink-0 ${
                              isExpanded
                                ? 'rotate-180 bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]'
                                : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]'
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </button>

                        {/* Collapsible Content */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)]/20 space-y-4 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed animate-in fade-in duration-200">
                            <p className="text-[var(--color-text-primary)] pt-1">{art.content}</p>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2">
                              <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                                Related Tags:
                              </span>
                              {art.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* Helpful Feedback Box */}
                            <div className="pt-3 border-t border-[var(--color-border)]/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                              <span className="text-[var(--color-text-secondary)]">
                                Was this answer helpful?
                              </span>
                              <div className="flex items-center gap-2">
                                {userFeedback ? (
                                  <span className="text-emerald-400 text-xs inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Thank you for your feedback!
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleFeedback(art.id, 'yes')}
                                      className="px-2.5 py-1 rounded bg-[var(--color-surface)] hover:bg-emerald-500/10 hover:text-emerald-400 border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center gap-1 transition-colors cursor-pointer text-xs"
                                    >
                                      <ThumbsUp className="w-3 h-3" />
                                      <span>Yes</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleFeedback(art.id, 'no')}
                                      className="px-2.5 py-1 rounded bg-[var(--color-surface)] hover:bg-red-500/10 hover:text-red-400 border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center gap-1 transition-colors cursor-pointer text-xs"
                                    >
                                      <ThumbsDown className="w-3 h-3" />
                                      <span>No</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* BOTTOM CONTACT PROMOTION BANNER */}
              <Card className="p-6 sm:p-8 border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-elevated)] to-[var(--color-surface)] shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-accent-cyan)]">
                      <Sparkles className="w-4 h-4" />
                      <span>Dedicated Engineering Desk</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
                      Still have questions about your integration?
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-lg leading-relaxed">
                      Our developer success engineers can help configure your workspace, milestones, and custom AI agents.
                    </p>
                  </div>

                  <div className="shrink-0">
                    <Link to="/contact">
                      <Button
                        variant="primary"
                        size="md"
                        className="font-bold gap-2 bg-[var(--color-accent-cyan)] text-black hover:bg-cyan-400"
                      >
                        <span>Contact Support</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>

              {/* BOTTOM NAV / NAVIGATION LINKS */}
              <div className="pt-4 flex items-center justify-between border-t border-[var(--color-border)]/60 text-xs font-mono">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to previous</span>
                </button>

                <Link
                  to="/contact"
                  className="text-[var(--color-accent-cyan)] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Open Contact Form</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
};
