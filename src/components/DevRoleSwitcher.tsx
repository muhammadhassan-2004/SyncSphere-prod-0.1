import React, { useState } from 'react';
import { useAuth, UserRole } from '@/src/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { StatusPill } from '@/src/components/ui/badge';
import { Shield, User, Bot, LogOut, ChevronUp, ChevronDown, Layers, Terminal } from 'lucide-react';

export const DevRoleSwitcher: React.FC = () => {
  const { currentRole, setRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const roles: { role: UserRole; label: string; color: 'blue' | 'green' | 'red' | 'gray'; icon: React.ReactNode; path: string }[] = [
    { role: 'client', label: 'Client Portal', color: 'blue', icon: <User className="w-3.5 h-3.5" />, path: '/client/dashboard' },
    { role: 'symbiote', label: 'Symbiote Portal', color: 'green', icon: <Bot className="w-3.5 h-3.5" />, path: '/symbiote/dashboard' },
    { role: 'admin', label: 'Admin Portal', color: 'red', icon: <Shield className="w-3.5 h-3.5" />, path: '/admin/dashboard' },
    { role: null, label: 'Unauthenticated (Null)', color: 'gray', icon: <LogOut className="w-3.5 h-3.5" />, path: '/login' },
  ];

  const handleRoleSelect = (targetRole: UserRole, targetPath: string) => {
    if (targetRole) {
      localStorage.setItem('syncsphere_demo_mode', 'true');
    } else {
      localStorage.removeItem('syncsphere_demo_mode');
    }
    setRole(targetRole);
    if (targetPath) {
      navigate(targetPath);
    }
  };

  const getRoleVariant = (r: UserRole): 'blue' | 'green' | 'red' | 'gray' => {
    if (r === 'client') return 'blue';
    if (r === 'symbiote') return 'green';
    if (r === 'admin') return 'red';
    return 'gray';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none font-sans">
      {isOpen && (
        <div className="mb-2 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] w-64 space-y-2.5 shadow-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <span className="text-[11px] font-mono font-bold text-[var(--color-text-secondary)] uppercase">
              Dev Role Switcher
            </span>
            <span className="text-[10px] text-[var(--color-accent-cyan)] font-mono">Simulated Auth</span>
          </div>

          <div className="space-y-1">
            {roles.map((item) => {
              const isSelected = currentRole === item.role;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleRoleSelect(item.role, item.path)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <StatusPill variant={item.color} className="text-[9px] px-1.5 py-0">
                    {item.role || 'None'}
                  </StatusPill>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/dev/primitives')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[11px] font-mono rounded-[6px] border border-[var(--color-border)] ${
                location.pathname === '/dev/primitives'
                  ? 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]/40'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-background)]'
              }`}
            >
              <Terminal className="w-3 h-3" /> QA Bench
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-2 py-1 text-[11px] font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-background)]"
            >
              Landing
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 rounded-[10px] text-xs font-medium transition-all text-[var(--color-text-primary)]"
      >
        <Layers className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
        <span>Role:</span>
        <StatusPill variant={getRoleVariant(currentRole)} className="text-[10px] uppercase font-bold">
          {currentRole || 'Guest'}
        </StatusPill>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" /> : <ChevronUp className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />}
      </button>
    </div>
  );
};
