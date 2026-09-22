import React from 'react';

export function CopyrightText({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      © {new Date().getFullYear()} SyncSphere Inc. All rights reserved.
    </span>
  );
}
