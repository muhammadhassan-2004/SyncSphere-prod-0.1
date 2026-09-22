import {
  FileText,
  DollarSign,
  Layers,
  Code,
  Archive,
  Image as ImageIcon,
  File,
  Film,
  Music,
} from 'lucide-react';

export interface FileTypeIconInfo {
  icon: any;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeLabel: string;
}

export function getFileTypeIconInfo(
  filename: string,
  category?: string,
  mimeType?: string
): FileTypeIconInfo {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // 1. Invoice-tagged files or .inv
  if (category === 'invoices' || ext === 'inv') {
    return {
      icon: DollarSign,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/15',
      borderClass: 'border-emerald-500/30',
      badgeLabel: 'Invoice',
    };
  }

  // 2. PDF Documents (Red doc icon)
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return {
      icon: FileText,
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-500/15',
      borderClass: 'border-rose-500/30',
      badgeLabel: 'PDF',
    };
  }

  // 3. Figma / Design files (Purple layers)
  if (['fig', 'figma', 'sketch', 'xd', 'ai', 'psd'].includes(ext)) {
    return {
      icon: Layers,
      colorClass: 'text-purple-400',
      bgClass: 'bg-purple-500/15',
      borderClass: 'border-purple-500/30',
      badgeLabel: 'Design',
    };
  }

  // 4. Code & Dev assets (Green / Emerald code icon)
  if (
    [
      'js',
      'ts',
      'tsx',
      'jsx',
      'py',
      'json',
      'html',
      'css',
      'yaml',
      'yml',
      'sql',
      'sh',
      'go',
      'rs',
    ].includes(ext)
  ) {
    return {
      icon: Code,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/15',
      borderClass: 'border-emerald-500/30',
      badgeLabel: 'Code',
    };
  }

  // 5. Text / Docs (Blue text icon)
  if (['doc', 'docx', 'txt', 'rtf', 'md', 'pages'].includes(ext)) {
    return {
      icon: FileText,
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-500/15',
      borderClass: 'border-blue-500/30',
      badgeLabel: 'Doc',
    };
  }

  // 6. Archives / Compressed (Amber archive icon)
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return {
      icon: Archive,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-400/15',
      borderClass: 'border-amber-400/30',
      badgeLabel: 'Archive',
    };
  }

  // 7. Images (Cyan image icon)
  if (
    ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'bmp'].includes(ext) ||
    mimeType?.startsWith('image/')
  ) {
    return {
      icon: ImageIcon,
      colorClass: 'text-cyan-400',
      bgClass: 'bg-cyan-500/15',
      borderClass: 'border-cyan-500/30',
      badgeLabel: 'Image',
    };
  }

  // 8. Video / Media (Indigo film icon)
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return {
      icon: Film,
      colorClass: 'text-indigo-400',
      bgClass: 'bg-indigo-500/15',
      borderClass: 'border-indigo-500/30',
      badgeLabel: 'Video',
    };
  }

  // Default File
  return {
    icon: File,
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-700',
    badgeLabel: 'File',
  };
}
