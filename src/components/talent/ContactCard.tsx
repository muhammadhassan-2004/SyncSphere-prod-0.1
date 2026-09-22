import React from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { SymbioteProfile } from '@/src/data/symbiotes';
import {
  MessageSquare,
  Mail,
  Clock,
  MapPin,
  ShieldCheck,
  Globe,
} from 'lucide-react';

interface ContactCardProps {
  symbiote: SymbioteProfile;
  onMessageClick: () => void;
  isMessaging?: boolean;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  symbiote,
  onMessageClick,
  isMessaging,
}) => {
  return (
    <Card className="p-5 bg-[var(--color-surface)] border-[var(--color-border)] space-y-4">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
        <Mail className="w-4 h-4 text-[var(--color-accent-cyan)]" />
        <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider font-mono">
          Contact & Communication
        </h3>
      </div>

      <div className="space-y-3">
        <Button
          variant="primary"
          onClick={onMessageClick}
          disabled={isMessaging}
          className="w-full flex items-center justify-center gap-2 text-xs py-2.5"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{isMessaging ? 'Connecting...' : 'Send Direct Message'}</span>
        </Button>

        <div className="space-y-2.5 pt-1 text-xs">
          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              Response Time:
            </span>
            <span className="font-mono font-semibold text-[var(--color-text-primary)]">
              &lt; 1 hour
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Globe className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              Location:
            </span>
            <span className="font-mono font-semibold text-[var(--color-text-primary)]">
              {symbiote.location}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              Identity Verification:
            </span>
            <span className="font-mono font-bold text-[var(--color-success-green)]">
              Verified
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
