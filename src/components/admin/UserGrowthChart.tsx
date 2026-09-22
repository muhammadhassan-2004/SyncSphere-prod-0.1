import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyUserCount } from '@/src/lib/firestore/userGrowthSeries';

export function UserGrowthChart({ data, loading }: { data: MonthlyUserCount[] | null; loading: boolean }) {
  if (loading) {
    return <div className="h-64 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">Loading…</div>;
  }
  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return <div className="h-64 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">No user growth data yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
        <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
        <Area type="monotone" dataKey="count" stroke="#22D3EE" fill="url(#userGrowthFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
