import React from 'react';
import { cn } from '@/src/lib/utils';

interface SyncSphereLogoIconProps {
  className?: string;
  size?: number | string;
}

export const SyncSphereLogoIcon: React.FC<SyncSphereLogoIconProps> = ({
  className,
  size = 28,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200 hover:scale-105", className)}
    >
      <defs>
        {/* Cyan Gradient */}
        <linearGradient id="ss-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F5D4" />
          <stop offset="100%" stopColor="#00B4D8" />
        </linearGradient>

        {/* Emerald Gradient */}
        <linearGradient id="ss-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F5D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Full Orb Soft Glow */}
        <linearGradient id="ss-orb-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.25" />
        </linearGradient>

        {/* Pedestal Base Gradient */}
        <linearGradient id="ss-pedestal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00B4D8" />
          <stop offset="50%" stopColor="#00F5D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        <radialGradient id="ss-bg-radial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00F5D4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle Background Radial Glow */}
      <circle cx="32" cy="28" r="26" fill="url(#ss-bg-radial)" />

      {/* Globe Lat/Long Wireframe Overlay (Subtle Tech Mesh) */}
      <g stroke="url(#ss-cyan-grad)" strokeOpacity="0.35" strokeWidth="0.8" fill="none">
        <circle cx="32" cy="28" r="22" strokeWidth="1" strokeOpacity="0.5" />
        <ellipse cx="32" cy="28" rx="22" ry="9" />
        <ellipse cx="32" cy="28" rx="10" ry="22" />
        <line x1="10" y1="28" x2="54" y2="28" />
        <line x1="32" y1="6" x2="32" y2="50" />
      </g>

      {/* YIN-YANG DUAL SYMBIOTE SWIRL */}
      {/* Outer Sphere Clip path bounds */}
      <g>
        {/* Top Swirl (Cyan) */}
        <path
          d="M 32 6 
             A 22 22 0 0 1 32 50 
             A 11 11 0 0 1 32 28 
             A 11 11 0 0 0 32 6 Z"
          fill="url(#ss-cyan-grad)"
        />

        {/* Bottom Swirl (Emerald) */}
        <path
          d="M 32 50 
             A 22 22 0 0 1 32 6 
             A 11 11 0 0 1 32 28 
             A 11 11 0 0 0 32 50 Z"
          fill="url(#ss-emerald-grad)"
        />

        {/* Top Node Eye Dot (Emerald inside Cyan) */}
        <circle cx="32" cy="17" r="3.5" fill="#0D1117" />
        <circle cx="32" cy="17" r="1.8" fill="url(#ss-emerald-grad)" />

        {/* Bottom Node Eye Dot (Cyan inside Emerald) */}
        <circle cx="32" cy="39" r="3.5" fill="#0D1117" />
        <circle cx="32" cy="39" r="1.8" fill="url(#ss-cyan-grad)" />
      </g>

      {/* Sphere Highlights & Outer Rim Accent */}
      <circle
        cx="32"
        cy="28"
        r="22"
        stroke="url(#ss-cyan-grad)"
        strokeWidth="1.5"
        strokeOpacity="0.8"
        fill="none"
      />

      {/* BASE ORBITAL PEDESTAL RINGS */}
      {/* Outer Pedestal Oval */}
      <ellipse
        cx="32"
        cy="56"
        rx="20"
        ry="5"
        stroke="url(#ss-pedestal-grad)"
        strokeWidth="2.2"
        fill="none"
      />

      {/* Inner Pedestal Oval Accent */}
      <ellipse
        cx="32"
        cy="56"
        rx="12"
        ry="3"
        stroke="url(#ss-cyan-grad)"
        strokeWidth="1.2"
        strokeDasharray="3 2"
        fill="none"
      />
    </svg>
  );
};
