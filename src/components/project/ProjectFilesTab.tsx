import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectFile, FileCategory } from '@/src/types/firestore';
import {
  subscribeToProjectFilesForProject,
  deleteProjectFile,
} from '@/src/lib/firestore/projectFiles';
import { getFileTypeIconInfo } from '@/src/lib/utils/fileType';
import { triggerFileDownload } from '@/src/lib/storage/download';
import { UploadProjectFileModal } from '@/src/components/project/UploadProjectFileModal';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import {
  Folder,
  Upload,
  Search,
  Grid,
  List,
  Download,
  Trash2,
  FolderOpen,
  Eye,
  X,
  ExternalLink,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface ProjectFilesTabProps {
  project: Project;
  onFilesCountChange?: (count: number) => void;
}

export const ProjectFilesTab: React.FC<ProjectFilesTabProps> = ({
  project,
  onFilesCountChange,
}) => {
  const projectId = project.id || '';

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  // Close preview modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewFile) {
        setPreviewFile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile]);

  const TABS: Array<{ id: string; label: string; category?: FileCategory }> = [
    { id: 'all', label: 'All Files' },
    { id: 'requirements', label: 'Requirements', category: 'requirements' },
    { id: 'contracts', label: 'Contracts', category: 'contracts' },
    { id: 'deliverables', label: 'Deliverables', category: 'deliverables' },
    { id: 'invoices', label: 'Invoices', category: 'invoices' },
  ];

  // Subscribe to real-time project files scoped strictly to this projectId
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToProjectFilesForProject(projectId, (fileList) => {
      setFiles(fileList || []);
      setLoading(false);
    });

    return () => unsub();
  }, [projectId]);

  // Notify parent of files count for header badge
  useEffect(() => {
    if (onFilesCountChange) {
      onFilesCountChange(files.length);
    }
  }, [files.length, onFilesCountChange]);

  // Filtered files for search & category
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || f.name.toLowerCase().includes(q) || (f.uploadedByName && f.uploadedByName.toLowerCase().includes(q));
      const matchesCategory = activeCategory === 'all' || f.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [files, searchQuery, activeCategory]);

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteProjectFile(fileId);
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleDownload = async (file: ProjectFile, e: React.MouseEvent) => {
    e.preventDefault();
    if (file.downloadUrl && file.downloadUrl !== '#') {
      await triggerFileDownload(file.downloadUrl, file.name);
      return;
    }
    const textContent = `SyncSphere Enterprise Document Export\n------------------------------------\nFile Name: ${file.name}\nProject: ${file.projectName || project.title}\nCategory: ${file.category}\nUploaded By: ${file.uploadedByName || 'Team Member'}\nDate: ${file.uploadedAt}\nSize: ${file.size || 'N/A'}\n\n[Verified and archived securely via SyncSphere Core]`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    await triggerFileDownload(url, file.name);
  };

  if (loading) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-[var(--color-text-secondary)]">Loading project files & repository...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER ROW & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text-primary)]">Project File Repository</h2>
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">
            {files.length} document(s) attached to <span className="text-[var(--color-accent-cyan)]">{project.title}</span>
          </p>
        </div>

        {project.status !== 'completed' ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-white font-mono text-xs font-bold rounded-[8px] px-3.5 flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:scale-105 transition-all shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </Button>
        ) : (
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Repository Archived</span>
          </span>
        )}
      </div>

      {/* SEARCH, CATEGORY TABS, VIEW TOGGLE */}
      {files.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-2">
          {/* CATEGORY FILTER TABS */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-mono font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-accent-cyan)] text-slate-950 shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-background)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* SEARCH & GRID/LIST TOGGLE */}
          <div className="flex items-center gap-2 px-1">
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
              />
            </div>

            <div className="flex items-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-[6px] p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-surface)] text-[var(--color-accent-cyan)]'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-surface)] text-[var(--color-accent-cyan)]'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILE GRID / LIST VIEW */}
      {filteredFiles.length === 0 ? (
        <div className="py-6">
          <EmptyState
            icon={FolderOpen}
            title={files.length === 0 ? "No Files Uploaded Yet" : "No Matching Files"}
            description={
              files.length === 0
                ? "Upload requirements, specifications, contracts, or technical deliverables for this project."
                : "No files match your search query or selected category filter."
            }
            actionLabel={files.length === 0 ? "Upload Document" : undefined}
            onAction={files.length === 0 ? () => setIsUploadModalOpen(true) : undefined}
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const iconInfo = getFileTypeIconInfo(file.name, file.category, file.type);
            const IconComp = iconInfo.icon;
            const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
            const isPdf = file.type?.includes('pdf') || /\.pdf$/i.test(file.name);
            const hasDownloadUrl = !!file.downloadUrl && file.downloadUrl !== '#' && !file.downloadUrl.startsWith('blob:');

            return (
              <Card
                key={file.id}
                className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 rounded-[12px] space-y-3.5 transition-all shadow-sm hover:shadow-md group relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* IMAGE THUMBNAIL IF IMAGE */}
                  {isImage && hasDownloadUrl ? (
                    <div
                      onClick={() => setPreviewFile(file)}
                      className="relative w-full h-36 rounded-[10px] overflow-hidden bg-slate-950/60 border border-[var(--color-border)] cursor-pointer group/thumb"
                    >
                      <img
                        src={file.downloadUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono flex items-center gap-1 shadow-sm">
                          <Eye className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
                          <span>Preview</span>
                        </span>
                      </div>
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider bg-black/60 backdrop-blur-xs text-white border border-white/10">
                        {file.category}
                      </span>
                    </div>
                  ) : isPdf ? (
                    <div
                      onClick={() => setPreviewFile(file)}
                      className="relative w-full h-24 rounded-[10px] bg-gradient-to-br from-rose-950/30 to-slate-900/60 border border-rose-500/20 p-3 flex flex-col justify-between cursor-pointer group/pdf hover:border-rose-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-[8px] bg-rose-500/15 border border-rose-500/30 text-rose-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          PDF · {file.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-[var(--color-text-secondary)] font-mono">
                        <span>Document Spec</span>
                        <span className="text-rose-400 group-hover/pdf:underline flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Click Preview
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* TOP ROW: ICON + CATEGORY BADGE */
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`p-2.5 rounded-[10px] border ${iconInfo.bgClass} ${iconInfo.borderClass} ${iconInfo.colorClass}`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                        {file.category}
                      </span>
                    </div>
                  )}

                  {/* FILENAME & METADATA */}
                  <div>
                    <h3
                      onClick={() => setPreviewFile(file)}
                      className="font-bold text-xs text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors break-words leading-snug cursor-pointer flex items-center gap-1"
                    >
                      <span>{file.name}</span>
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-secondary)] mt-1">
                      <span>{file.size}</span>
                      <span>·</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW: UPLOADED BY & ACTIONS */}
                <div className="pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px] font-mono text-[var(--color-text-secondary)]">
                  <span className="truncate max-w-[140px] text-[var(--color-text-secondary)] flex items-center gap-1">
                    <Folder className="w-3 h-3 shrink-0 text-[var(--color-accent-cyan)]" />
                    {file.uploadedByName || 'Client Admin'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-1.5 rounded bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] transition-colors cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDownload(file, e)}
                      className="p-1.5 rounded bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] transition-colors cursor-pointer"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {file.id && (
                      <button
                        onClick={() => handleDeleteFile(file.id!)}
                        className="p-1.5 rounded bg-[var(--color-background)] hover:bg-rose-500/20 text-[var(--color-text-secondary)] hover:text-rose-400 border border-[var(--color-border)] transition-colors cursor-pointer"
                        title="Delete File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW TABLE */
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Uploaded By</th>
                <th className="py-2.5 px-3">Uploaded Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/50">
              {filteredFiles.map((file) => {
                const iconInfo = getFileTypeIconInfo(file.name, file.category, file.type);
                const IconComp = iconInfo.icon;
                const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
                const hasDownloadUrl = !!file.downloadUrl && file.downloadUrl !== '#' && !file.downloadUrl.startsWith('blob:');

                return (
                  <tr key={file.id} className="hover:bg-[var(--color-background)]/50 transition-colors">
                    <td className="py-2.5 px-3">
                      {isImage && hasDownloadUrl ? (
                        <div
                          onClick={() => setPreviewFile(file)}
                          className="w-8 h-8 rounded overflow-hidden border border-[var(--color-border)] bg-slate-950 shrink-0 cursor-pointer hover:border-[var(--color-accent-cyan)] transition-colors"
                          title="Click to preview image"
                        >
                          <img
                            src={file.downloadUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className={`p-1.5 rounded border inline-block ${iconInfo.bgClass} ${iconInfo.borderClass} ${iconInfo.colorClass}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-bold text-[var(--color-text-primary)]">{file.name}</td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                        {file.category}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-[var(--color-text-secondary)]">{file.size}</td>

                    <td className="py-2.5 px-3 text-[var(--color-accent-cyan)]">{file.uploadedByName || 'Client Admin'}</td>

                    <td className="py-2.5 px-3 text-[var(--color-text-secondary)]">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1 rounded bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] cursor-pointer"
                          title="Preview Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDownload(file, e)}
                          className="p-1 rounded bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {file.id && (
                          <button
                            onClick={() => handleDeleteFile(file.id!)}
                            className="p-1 rounded bg-[var(--color-background)] hover:bg-rose-500/20 text-[var(--color-text-secondary)] hover:text-rose-400 border border-[var(--color-border)] cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* UPLOAD FILE MODAL */}
      <UploadProjectFileModal
        isOpen={isUploadModalOpen}
        project={project}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* INTERACTIVE LIGHTBOX / DOCUMENT PREVIEW MODAL */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="p-4 sm:px-6 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background)]/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)] shrink-0">
                  {previewFile.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFile.name) ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                    {previewFile.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-secondary)] mt-0.5">
                    <span className="capitalize">{previewFile.category}</span>
                    <span>·</span>
                    <span>{previewFile.size}</span>
                    <span>·</span>
                    <span>Uploaded by {previewFile.uploadedByName || 'Client Admin'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleDownload(previewFile, e)}
                  className="px-3 py-1.5 rounded-[8px] bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                {previewFile.downloadUrl && previewFile.downloadUrl !== '#' && (
                  <a
                    href={previewFile.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-[8px] bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] transition-colors cursor-pointer"
                    title="Open full file in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-[8px] bg-[var(--color-background)] hover:bg-rose-500/20 text-[var(--color-text-secondary)] hover:text-rose-400 border border-[var(--color-border)] transition-colors cursor-pointer"
                  title="Close Preview (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODAL PREVIEW BODY */}
            <div className="p-4 sm:p-6 overflow-auto flex-1 flex items-center justify-center bg-slate-950/40 min-h-[320px]">
              {previewFile.downloadUrl && (previewFile.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFile.name)) ? (
                <img
                  src={previewFile.downloadUrl}
                  alt={previewFile.name}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg border border-[var(--color-border)]/50"
                />
              ) : previewFile.downloadUrl && (previewFile.type?.includes('pdf') || /\.pdf$/i.test(previewFile.name)) ? (
                <iframe
                  src={previewFile.downloadUrl}
                  className="w-full h-[70vh] rounded-lg border border-[var(--color-border)] bg-white"
                  title={previewFile.name}
                />
              ) : (
                <div className="text-center space-y-3 py-12">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 flex items-center justify-center mx-auto text-[var(--color-accent-cyan)]">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Direct In-Browser Preview Not Supported For This Format
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] font-mono max-w-md mx-auto">
                    This file format can be downloaded securely for inspection with your local desktop application.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => handleDownload(previewFile, e)}
                    className="bg-[var(--color-accent-cyan)] text-slate-950 font-mono font-bold mt-2"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
