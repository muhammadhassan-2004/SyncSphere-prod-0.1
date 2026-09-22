import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input, Textarea } from '@/src/components/ui/input';
import { Card } from '@/src/components/ui/card';
import { StatusPill } from '@/src/components/ui/badge';
import { Avatar } from '@/src/components/ui/avatar';
import { SyncSphereLogo } from '@/src/components/ui/SyncSphereLogo';

// Widgets
import { KPIStatCard } from '@/src/components/widgets/KPIStatCard';
import { ProgressBar } from '@/src/components/widgets/ProgressBar';
import { TabNavigation, TabItem } from '@/src/components/widgets/TabNavigation';
import { ToggleSwitch } from '@/src/components/widgets/ToggleSwitch';
import { TableShell, Column } from '@/src/components/widgets/TableShell';
import { EmptyStateBlock } from '@/src/components/widgets/EmptyStateBlock';
import { WizardStepIndicator } from '@/src/components/widgets/WizardStepIndicator';

import {
  Download,
  MoreVertical,
  RefreshCw,
  Activity,
  Users,
  ShieldCheck,
  Zap,
  Trash2,
  ExternalLink,
  Plus,
  FolderOpen,
} from 'lucide-react';

interface SampleRowData {
  id: string;
  name: string;
  role: 'Client' | 'Symbiote' | 'Admin';
  status: 'active' | 'pending' | 'review' | 'failed';
  capacity: number;
  lastActive: string;
}

export function DevPrimitivesQA() {
  // Primitives State
  const [textVal, setTextVal] = useState('SyncSphere User');
  const [emailVal, setEmailVal] = useState('user@syncsphere.io');
  const [passwordVal, setPasswordVal] = useState('Secret123!');
  const [searchVal, setSearchVal] = useState('');
  const [bioVal, setBioVal] = useState(
    'SyncSphere primitives foundation testing live character counter and form state handling.'
  );

  // Widgets State
  const [kpiLoading, setKpiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableEmpty, setTableEmpty] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 0-indexed: step 2 active

  const sampleTabs: TabItem[] = [
    { id: 'all', label: 'All Projects', count: 18 },
    { id: 'active', label: 'Active Symbiotes', count: 12 },
    { id: 'review', label: 'Pending Review', count: 4 },
    { id: 'archived', label: 'Archived', count: 2, disabled: false },
  ];

  const sampleTableData: SampleRowData[] = [
    {
      id: 'SYM-001',
      name: 'Nexus Alpha Synthesizer',
      role: 'Symbiote',
      status: 'active',
      capacity: 88,
      lastActive: '2 mins ago',
    },
    {
      id: 'CLT-104',
      name: 'Aetheria Systems Ltd',
      role: 'Client',
      status: 'review',
      capacity: 42,
      lastActive: '1 hour ago',
    },
    {
      id: 'ADM-902',
      name: 'Root Security Kernel',
      role: 'Admin',
      status: 'active',
      capacity: 95,
      lastActive: 'Just now',
    },
    {
      id: 'SYM-009',
      name: 'Quantum Data Relay',
      role: 'Symbiote',
      status: 'pending',
      capacity: 15,
      lastActive: 'Yesterday',
    },
  ];

  const tableColumns: Column<SampleRowData>[] = [
    {
      key: 'name',
      header: 'Entity / Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" statusDot={row.status === 'active' ? 'green' : 'amber'} />
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">{row.name}</p>
            <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">{row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role Accent',
      render: (row) => {
        if (row.role === 'Client') return <StatusPill variant="blue" label="Client (Info)" />;
        if (row.role === 'Symbiote') return <StatusPill variant="green" label="Symbiote (Success)" />;
        return <StatusPill variant="red" label="Admin (Danger)" />;
      },
    },
    {
      key: 'capacity',
      header: 'Load Capacity',
      render: (row) => (
        <div className="w-32">
          <ProgressBar value={row.capacity} variant="compact" color="gradient" />
        </div>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      align: 'right',
      render: (row) => <span className="text-caption font-mono">{row.lastActive}</span>,
    },
  ];

  const projectWizardSteps = [
    { id: 'step-1', label: 'Basic Info', description: 'Name & Domain' },
    { id: 'step-2', label: 'Role Assign', description: 'Symbiote selection' },
    { id: 'step-3', label: 'Data Policy', description: 'Access control' },
    { id: 'step-4', label: 'Deploy Sync', description: 'Launch sphere' },
  ];

  const authWizardSteps = [
    { id: 'auth-1', label: 'Verify Email' },
    { id: 'auth-2', label: 'New Secret' },
    { id: 'auth-3', label: 'Confirm' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] p-6 md:p-10 max-w-6xl mx-auto space-y-12 font-sans">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] pb-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent-cyan)]">
              /dev/primitives
            </span>
            <SyncSphereLogo iconSize={32} textSize="xl" />
          </div>
          <div className="flex items-center gap-2">
            <StatusPill variant="green" label="Primitives 0.2" />
            <StatusPill variant="blue" label="Widgets 0.3" />
          </div>
        </div>
        <p className="text-caption">
          Comprehensive visual QA showcase for primitives (0.2) and composite widgets (0.3) mapped strictly to dark-mode tokens.
        </p>
      </header>

      {/* SECTION A: PRIMITIVES SHOWCASE */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2">
          <h2 className="text-h1 text-[18px] text-[var(--color-accent-cyan)] font-mono">
            // Part 1: Primitive Components
          </h2>
          <span className="text-caption font-mono">Button, Input, Card, Badge, Avatar</span>
        </div>

        {/* 1. Button Primitive Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 flex items-center gap-2">1. Button Component</h2>
            <span className="text-caption font-mono">Variants & Sizes</span>
          </div>

          <Card className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Medium Size (Default)
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" size="md">
                  Primary Action (Cyan→Green)
                </Button>
                <Button variant="secondary" size="md">
                  Secondary Action
                </Button>
                <Button variant="destructive" size="md">
                  Revoke Access
                </Button>
                <Button variant="text-link" size="md">
                  View all logs
                </Button>
                <Button variant="icon-only" size="md" title="Download report">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="icon-only" size="md" title="More options">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Small Size & Disabled States
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" size="sm">
                  Small Primary
                </Button>
                <Button variant="secondary" size="sm">
                  Small Secondary
                </Button>
                <Button variant="destructive" size="sm">
                  Small Destructive
                </Button>
                <Button variant="text-link" size="sm">
                  Small Text Link
                </Button>
                <Button variant="icon-only" size="sm" title="Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>

                <div className="h-4 w-[1px] bg-[var(--color-border)] mx-1" />

                <Button variant="primary" size="sm" disabled>
                  Disabled Primary
                </Button>
                <Button variant="secondary" size="sm" disabled>
                  Disabled Secondary
                </Button>
                <Button variant="destructive" size="sm" disabled>
                  Disabled Red
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* 2. Input Component Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">2. Input & Textarea Components</h2>
            <span className="text-caption font-mono">Rest, Focus & Counter</span>
          </div>

          <Card className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                variant="text"
                label="Standard Text Input"
                placeholder="Enter full name..."
                value={textVal}
                onChange={(e) => setTextVal(e.target.value)}
                helperText="Rest state has 1px --border; click to see cyan focus ring."
              />

              <Input
                variant="email"
                label="Email Input"
                placeholder="name@company.com"
                value={emailVal}
                onChange={(e) => setEmailVal(e.target.value)}
              />

              <Input
                variant="password"
                label="Password Input (With Eye Toggle)"
                placeholder="Enter secure password"
                value={passwordVal}
                onChange={(e) => setPasswordVal(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Input
                variant="search"
                label="Search Input (Left Magnifying Glass)"
                placeholder="Search projects, symbiotes, or clients..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />

              <Textarea
                label="Textarea (With Live Char Counter)"
                placeholder="Write task brief or system prompt..."
                rows={3}
                maxLength={300}
                value={bioVal}
                onChange={(e) => setBioVal(e.target.value)}
                helperText="Counter updates dynamically at bottom-right."
              />

              <Input variant="text" label="Disabled Field" value="System generated identifier" disabled />
            </div>
          </Card>
        </section>

        {/* 3. Card Primitive Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">3. Card Component</h2>
            <span className="text-caption font-mono">Surface Fill & 1px Hairline Border</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">CLIENT ROLE</span>
                <StatusPill variant="blue" label="Client" />
              </div>
              <h3 className="text-h2">Alpha Enterprise</h3>
              <p className="text-caption">
                1px --border hairline, --surface dark navy fill, 16px padding, 10px corner radius, zero drop shadow.
              </p>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">SYMBIOTE ROLE</span>
                <StatusPill variant="green" label="Symbiote" />
              </div>
              <h3 className="text-h2">Core AI Synthesizer</h3>
              <p className="text-caption">
                Flat dark UI style with structured hierarchy and seamless CSS variable mapping.
              </p>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">ADMIN ROLE</span>
                <StatusPill variant="red" label="Admin" />
              </div>
              <h3 className="text-h2">System Superuser</h3>
              <p className="text-caption">
                Strict execution with high contrast light-on-dark legibility and 14px body typography.
              </p>
            </Card>
          </div>
        </section>

        {/* 4. StatusPill / Badge Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">4. StatusPill / Badge Component</h2>
            <span className="text-caption font-mono">Pill Radius & Soft Background Fill</span>
          </div>

          <Card className="space-y-4">
            <p className="text-caption">
              All 6 status variants feature 12px font, soft background opacity fill, and matching text accents:
            </p>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 border border-[var(--color-border)] p-2 rounded-[8px] bg-[var(--color-background)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Info:</span>
                <StatusPill variant="blue" label="Client Role" />
              </div>

              <div className="flex items-center gap-2 border border-[var(--color-border)] p-2 rounded-[8px] bg-[var(--color-background)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Success:</span>
                <StatusPill variant="green" label="Symbiote Active" />
              </div>

              <div className="flex items-center gap-2 border border-[var(--color-border)] p-2 rounded-[8px] bg-[var(--color-background)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Warning:</span>
                <StatusPill variant="amber" label="Pending Sync" />
              </div>

              <div className="flex items-center gap-2 border border-[var(--color-border)] p-2 rounded-[8px] bg-[var(--color-background)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Review:</span>
                <StatusPill variant="purple" label="In Review" />
              </div>

              <div className="flex items-center gap-2 border border-[var(--color-border)] p-2 rounded-[8px] bg-[var(--color-background)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Danger:</span>
                <StatusPill variant="red" label="Admin Action" />
              </div>

              <div className="flex items-center gap-2 border border-[var(--color-border)] p-2 rounded-[8px] bg-[var(--color-background)]">
                <span className="text-xs text-[var(--color-text-secondary)]">Neutral:</span>
                <StatusPill variant="gray" label="Archived" />
              </div>
            </div>
          </Card>
        </section>

        {/* 5. Avatar Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">5. Avatar Component</h2>
            <span className="text-caption font-mono">Gradient Fill & Status Indicator</span>
          </div>

          <Card className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <Avatar name="Sync Sphere" size="sm" />
              <div>
                <p className="text-xs font-semibold">Small (32px)</p>
                <p className="text-caption">No status dot</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name="Alex Rivera" size="sm" statusDot="online" />
              <div>
                <p className="text-xs font-semibold">Small + Online</p>
                <p className="text-caption">Green dot</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name="Dev Operator" size="lg" statusDot="online" />
              <div>
                <p className="text-xs font-semibold">Large (64px)</p>
                <p className="text-caption">Cyan→Green gradient background</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name="Symbiote AI" size="lg" statusDot="purple" />
              <div>
                <p className="text-xs font-semibold">Large + Review</p>
                <p className="text-caption">Purple status indicator</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar initials="AD" size="lg" statusDot="busy" />
              <div>
                <p className="text-xs font-semibold">Explicit Initials</p>
                <p className="text-caption">Red busy indicator</p>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* SECTION B: COMPOSITE WIDGETS SHOWCASE */}
      <div className="space-y-8 pt-6 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2">
          <h2 className="text-h1 text-[18px] text-[var(--color-accent-green)] font-mono">
            // Part 2: Composite Widgets (0.3)
          </h2>
          <span className="text-caption font-mono">KPI, Progress, Tabs, Toggle, Table, EmptyState, Wizard</span>
        </div>

        {/* 1. KPI Stat Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">1. KPI Stat Cards</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setKpiLoading(!kpiLoading)}
                className="text-xs"
              >
                Toggle Loading Skeleton ({kpiLoading ? 'ON' : 'OFF'})
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIStatCard
              label="Active Symbiotes"
              value="24 / 30"
              icon={<Zap className="w-4 h-4" />}
              iconVariant="green"
              trend={{ value: '+4 this week', direction: 'up' }}
              isLoading={kpiLoading}
            />

            <KPIStatCard
              label="Client Accounts"
              value="142"
              icon={<Users className="w-4 h-4" />}
              iconVariant="blue"
              trend={{ value: '+12% vs last month', direction: 'up' }}
              isLoading={kpiLoading}
            />

            <KPIStatCard
              label="Sync Throughput"
              value="99.8%"
              icon={<Activity className="w-4 h-4" />}
              iconVariant="purple"
              trend={{ value: '-0.2% latencies', direction: 'down' }}
              isLoading={kpiLoading}
            />

            <KPIStatCard
              label="Pending Audit"
              value="3"
              icon={<ShieldCheck className="w-4 h-4" />}
              iconVariant="amber"
              trend={{ value: 'Stable queue', direction: 'neutral' }}
              isLoading={kpiLoading}
            />
          </div>
        </section>

        {/* 2. Progress Bar */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">2. Progress Bar Variants</h2>
            <span className="text-caption font-mono">Inline, Compact, Milestone</span>
          </div>

          <Card className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Variant: inline-with-label (Cyan→Green Gradient)
              </p>
              <ProgressBar value={76} label="Project Execution Phase" color="gradient" />
            </div>

            <div className="space-y-2 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Variant: milestone-row
              </p>
              <ProgressBar value={4} max={5} variant="milestone-row" label="Sprint Deliverable 4/5" color="gradient" />
            </div>

            <div className="space-y-2 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Variant: compact (for Table Cells)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ProgressBar value={92} variant="compact" color="gradient" />
                <ProgressBar value={45} variant="compact" color="gradient" />
                <ProgressBar value={100} variant="compact" color="gradient" />
              </div>
            </div>
          </Card>
        </section>

        {/* 3. Tab Navigation */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">3. Tab Navigation</h2>
            <span className="text-caption font-mono">Active Cyan Underline & Badges</span>
          </div>

          <Card className="space-y-4">
            <TabNavigation tabs={sampleTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />

            <div className="p-4 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] font-mono">
              Active Tab ID: <span className="text-[var(--color-accent-cyan)] font-bold">{activeTab}</span>
            </div>
          </Card>
        </section>

        {/* 4. Toggle Switch */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">4. Toggle Switch</h2>
            <span className="text-caption font-mono">ON/OFF & Aria-Checked</span>
          </div>

          <Card className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <ToggleSwitch
                checked={toggle1}
                onChange={setToggle1}
                label="Auto-Sync Symbiote Workspace"
                description="Automatically persist state updates every 15 seconds to cloud."
              />

              <ToggleSwitch
                checked={toggle2}
                onChange={setToggle2}
                label="Strict Audit Log Level"
                description="Record all RPC telemetry events to system log."
              />
            </div>

            <div className="space-y-4">
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                disabled
                label="System Maintenance Mode (Disabled)"
                description="Controlled by super-admin policy."
              />

              <div className="pt-2">
                <ToggleSwitch
                  checked={toggle1}
                  onChange={setToggle1}
                  size="sm"
                  label="Small Toggle Variant"
                />
              </div>
            </div>
          </Card>
        </section>

        {/* 5. Table Shell */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">5. Table Shell Component</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTableLoading(!tableLoading)}
                className="text-xs"
              >
                Skeleton ({tableLoading ? 'ON' : 'OFF'})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTableEmpty(!tableEmpty)}
                className="text-xs"
              >
                Empty State ({tableEmpty ? 'ON' : 'OFF'})
              </Button>
            </div>
          </div>

          <TableShell
            columns={tableColumns}
            data={tableEmpty ? [] : sampleTableData}
            keyExtractor={(row) => row.id}
            isLoading={tableLoading}
            emptyTitle="No Symbiotes Registered"
            emptyDescription="Create a new symbiote or assign a client project to begin synchronization."
            emptyAction={
              <Button variant="primary" size="sm">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Symbiote
              </Button>
            }
            renderActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <Button variant="icon-only" size="sm" title="View details">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <Button variant="icon-only" size="sm" title="Remove">
                  <Trash2 className="w-3.5 h-3.5 text-[var(--color-danger-red)]" />
                </Button>
              </div>
            )}
          />
        </section>

        {/* 6. Empty State Block */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">6. Empty State Block</h2>
            <span className="text-caption font-mono">Reusable No Data Fallback</span>
          </div>

          <EmptyStateBlock
            icon={<FolderOpen className="w-6 h-6" />}
            title="No Active Client Projects"
            description="You have not linked any client workspaces yet. Onboard a client to enable real-time Symbiote collaboration."
            action={
              <Button variant="primary" size="md">
                <Plus className="w-4 h-4 mr-1.5" /> Onboard First Client
              </Button>
            }
          />
        </section>

        {/* 7. Wizard Step Indicator */}
        <section className="space-y-4 pb-16">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">7. Wizard Step Indicator</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={wizardStep === 0}
                onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              >
                Prev Step
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={wizardStep === projectWizardSteps.length - 1}
                onClick={() => setWizardStep((s) => Math.min(projectWizardSteps.length - 1, s + 1))}
              >
                Next Step
              </Button>
            </div>
          </div>

          <Card className="space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Project Creation Wizard (4 Steps - Interactive Controls Above)
              </p>
              <WizardStepIndicator
                steps={projectWizardSteps}
                currentStepIndex={wizardStep}
                allowStepNavigation
                onStepClick={(idx) => setWizardStep(idx)}
              />
            </div>

            <div className="space-y-2 pt-6 border-t border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Auth Password Reset Wizard (3 Steps)
              </p>
              <WizardStepIndicator steps={authWizardSteps} currentStepIndex={1} />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
