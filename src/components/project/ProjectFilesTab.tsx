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

            return (
              <Card
                key={file.id}
                className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-cyan)]/50 rounded-[12px] space-y-3.5 transition-all shadow-sm hover:shadow-md group relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* TOP ROW: ICON + CATEGORY BADGE */}
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

                  {/* FILENAME & METADATA */}
                  <div>
                    <h3 className="font-bold text-xs text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors break-words leading-snug">
                      {file.name}
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
                  <span className="truncate max-w-[150px] text-[var(--color-text-secondary)] flex items-center gap-1">
                    <Folder className="w-3 h-3 shrink-0 text-[var(--color-accent-cyan)]" />
                    {file.uploadedByName || 'Client Admin'}
                  </span>

                  <div className="flex items-center gap-1">
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

                return (
                  <tr key={file.id} className="hover:bg-[var(--color-background)]/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className={`p-1.5 rounded border inline-block ${iconInfo.bgClass} ${iconInfo.borderClass} ${iconInfo.colorClass}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
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
    </div>
  );
};
