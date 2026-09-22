import React, { useState } from 'react';
import { Card } from '@/src/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'How does PreSync AI talent matching work?',
    answer: 'PreSync AI analyzes your project brief, required tech stack, budget, and timeline against thousands of pre-vetted talent profiles. It evaluates over 50 technical and soft-skill parameters to recommend candidates with a 94% average match accuracy.',
  },
  {
    id: 'faq-2',
    question: 'What types of IT professionals can I hire on SyncSphere?',
    answer: 'You can hire full-stack developers, frontend/backend engineers, DevOps specialists, UI/UX designers, AI/ML engineers, QA automation experts, and cybersecurity consultants across a wide range of experience levels.',
  },
  {
    id: 'faq-3',
    question: 'How is payment and milestone billing handled?',
    answer: 'Payments are managed transparently through task time tracking and milestone invoicing. Upon client review and approval of deliverables, itemized invoices are generated for direct settlement with verifiable payment records.',
  },
  {
    id: 'faq-4',
    question: 'Can I hire entire teams or individual professionals?',
    answer: 'Both! SyncSphere supports individual contractor hires for specialized tasks as well as pre-assembled cross-functional teams for end-to-end software development projects.',
  },
  {
    id: 'faq-5',
    question: 'Is there a free trial or commitment required to get started?',
    answer: 'Getting started is completely free. You can post projects, chat with PreSync AI, and review recommended candidates without any upfront cost or subscription commitment.',
  },
];

export const FaqAccordion: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg divide-y divide-[var(--color-border)] overflow-hidden text-left">
      {FAQ_DATA.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="transition-colors">
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 font-semibold text-base sm:text-lg text-[var(--color-text-primary)] hover:text-[var(--color-accent-cyan)] transition-colors focus:outline-none cursor-pointer"
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition-transform duration-200',
                  isOpen && 'rotate-180 text-[var(--color-accent-cyan)]'
                )}
              />
            </button>
            {isOpen && (
              <div className="px-6 pb-5 pt-1 text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed animate-in fade-in-50 duration-200">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
};
