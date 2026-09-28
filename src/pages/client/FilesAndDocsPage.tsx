import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/src/context/AuthContext';
import { ProjectFile, FileCategory, Project } from '@/src/types/firestore';
import {
  subscribeToProjectFilesForClient,
  subscribeToAllProjectFiles,
  createProjectFile,
  deleteProjectFile,
} from '@/src/lib/firestore/projectFiles';
import { subscribeToProjectsByOwner } from '@/src/lib/firestore/projects';
import { getFileTypeIconInfo } from '@/src/lib/utils/fileType';
import { uploadFileToCloudinary } from '@/src/lib/storage/cloudinary';
import { triggerFileDownload } from '@/src/lib/storage/download';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ContractSigningModal, ContractDetails } from '@/src/components/workspace/ContractSigningModal';
import {
  Folder,
  FileText,
  Upload,
  Search,
  Grid,
  List,
  Download,
  Trash2,
  X,
  Plus,
  Tag,
  Calendar,
  HardDrive,
  User,
  Filter,
  Check,
  AlertCircle,
  ExternalLink,
  PenTool,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';

export const FilesAndDocsPage: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const clientId = firebaseUser?.uid || '';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTypeParam = searchParams.get('type') || 'all';

  // State
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('requirements');
  const [uploading, setUploading] = useState<boolean>(false);

  // E-Signature Contract Modal State (Issue #4)
  const [showContractModal, setShowContractModal] = useState<boolean>(false);
  const [selectedContractProject, setSelectedContractProject] = useState<Project | null>(null);

  // Filter tab list
  const TABS: Array<{ id: string; label: string; category?: FileCategory }> = [
    { id: 'all', label: 'All Files' },
    { id: 'requirements', label: 'Requirements', category: 'requirements' },
    { id: 'contracts', label: 'Contracts', category: 'contracts' },
    { id: 'deliverables', label: 'Deliverables', category: 'deliverables' },
    { id: 'invoices', label: 'Invoices', category: 'invoices' },
  ];

  // 1. Subscribe to Projects
  useEffect(() => {
    if (!clientId) return;
    const unsub = subscribeToProjectsByOwner(clientId, (pList) => {
      setProjects(pList);
      if (pList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(pList[0].id || '');
      }
    });
    return () => unsub();
  }, [clientId]);

  // Project ID -> Title mapping
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => {
      if (p.id) map[p.id] = p.title;
    });
    return map;
  }, [projects]);

  // 2. Subscribe to Real-Time Project Files
  useEffect(() => {
    setLoading(true);
    const projectIds = projects.map((p) => p.id).filter(Boolean) as string[];

    const unsub = subscribeToProjectFilesForClient(
      clientId,
      (fileList) => {
        setFiles(fileList || []);
        setLoading(false);
      },
      projectIds
    );

    return () => unsub();
  }, [clientId, projects]);

  // Synchronize Tab change with URL Search Params
  const handleTabChange = (tabId: string) => {
    if (tabId === 'all') {
      searchParams.delete('type');
    } else {
      searchParams.set('type', tabId);
    }
    setSearchParams(searchParams);
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const resolvedProjectName = f.projectName || (f.projectId ? projectMap[f.projectId] : '') || '';
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        resolvedProjectName.toLowerCase().includes(q) ||
        (f.uploadedByName && f.uploadedByName.toLowerCase().includes(q));

      const matchesTab =
        activeTypeParam === 'all' || f.category === activeTypeParam;

      return matchesSearch && matchesTab;
    });
  }, [files, searchQuery, activeTypeParam, projectMap]);

  // Upload File Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || uploading) return;

    if (!selectedProjectId) {
      setErrorMsg('Please select a project before uploading.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      const sizeMB = (uploadFile.size / (1024 * 1024)).toFixed(1);
      const formattedSize =
        uploadFile.size > 1024 * 1024 ? `${sizeMB} MB` : `${Math.round(uploadFile.size / 1024)} KB`;

      const targetProjId = selectedProjectId;
      const targetProjName = projectMap[targetProjId] || 'General Documents';

      // Upload directly to Cloudinary storage
      const uploadRes = await uploadFileToCloudinary(uploadFile, {
        projectId: targetProjId,
        folder: `syncsphere/projects/${targetProjId}`,
        fileName: uploadFile.name,
      });

      const newFilePayload: Omit<ProjectFile, 'id'> = {
        projectId: targetProjId,
        projectName: targetProjName,
        clientId: clientId || firebaseUser?.uid || '',
        name: uploadFile.name,
        size: formattedSize,
        sizeBytes: uploadRes.bytes || uploadFile.size,
        type: uploadFile.type || uploadFile.name.split('.').pop() || 'file',
        category: selectedCategory,
        downloadUrl: uploadRes.url,
        uploadedBy: firebaseUser?.uid || '',
        uploadedByName: userProfile?.displayName || firebaseUser?.displayName || 'Client Admin',
        uploadedAt: new Date().toISOString(),
      };

      await createProjectFile(newFilePayload);

      setUploadFile(null);
      setShowUploadModal(false);
    } catch (err: any) {
      console.error('Failed to upload file:', err);
      setErrorMsg(err?.message || 'Error uploading file to Cloudinary storage.');
    } finally {
      setUploading(false);
    }
  };

  // Delete file handler
  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteProjectFile(fileId);
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Robust download handler
  const handleDownload = async (file: ProjectFile, e: React.MouseEvent) => {
    e.preventDefault();
    if (file.downloadUrl && file.downloadUrl !== '#') {
      await triggerFileDownload(file.downloadUrl, file.name);
      return;
    }
    const textContent = `SyncSphere Enterprise Document Export\n------------------------------------\nFile Name: ${file.name}\nProject: ${file.projectName || 'General'}\nCategory: ${file.category}\nUploaded By: ${file.uploadedByName || 'Team Member'}\nDate: ${file.uploadedAt}\nSize: ${file.size || 'N/A'}\n\n[Verified and archived securely via SyncSphere Core]`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    await triggerFileDownload(url, file.name);
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. PAGE HEADER (§11.11) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                All Project Files & Resources
              </h1>
              <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                Centralized repository for all project requirements, contracts, deliverables, and resources.
              </p>
            </div>
          </div>
        </div>

        {/* HEADER ACTIONS: SEARCH & UPLOAD */}
        <div className="flex items-center gap-3">
          {/* E-SIGN CONTRACT BUTTON */}
          <Button
            onClick={() => {
              const activeProj = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
              setSelectedContractProject(activeProj);
              setShowContractModal(true);
            }}
            variant="outline"
            className="h-10 border-[var(--color-accent-cyan)]/40 text-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)]/10 font-mono text-xs font-bold rounded-[8px] px-3.5 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PenTool className="w-4 h-4" />
            <span>Generate & Sign Contract</span>
          </Button>

          {/* UPLOAD BUTTON */}
          <Button
            onClick={() => setShowUploadModal(true)}
            className="h-10 bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-mono text-xs font-bold rounded-[8px] px-4 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:scale-105 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-[8px] bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. FILTER TAB ROW & VIEW TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-2">
        {/* CATEGORY TABS */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTypeParam === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-[8px] text-xs font-mono font-semibold whitespace-nowrap transition-all ${
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

        {/* RIGHT CONTROLS: SEARCH & GRID/LIST TOGGLE */}
        <div className="flex items-center gap-2.5 px-1">
          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by filename or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 rounded-[6px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
            />
          </div>

          {/* VIEW TOGGLE */}
          <div className="flex items-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-[6px] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${
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
              className={`p-1 rounded ${
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

      {/* 3. FILE CARD GRID / LIST (§11.11) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const iconInfo = getFileTypeIconInfo(file.name, file.category, file.type);
            const IconComp = iconInfo.icon;
            const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
            const isPdf = file.type?.includes('pdf') || /\.pdf$/i.test(file.name);
            const hasDownloadUrl = Boolean(file.downloadUrl && file.downloadUrl !== '#' && !file.downloadUrl.startsWith('blob:'));

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
                      className="relative w-full h-32 rounded-[10px] overflow-hidden bg-slate-950/60 border border-[var(--color-border)] cursor-pointer group/thumb"
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

                  {/* FILENAME (BOLD) §11.11 */}
                  <div>
                    <h3
                      onClick={() => setPreviewFile(file)}
                      className="font-bold text-xs text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors break-words leading-snug cursor-pointer flex items-center gap-1"
                    >
                      <span>{file.name}</span>
                    </h3>

                    {/* METADATA LINE (SIZE · DATE) §11.11 */}
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-secondary)] mt-1">
                      <span>{file.size}</span>
                      <span>·</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW: PROJECT TAG & DOWNLOAD / DELETE ACTIONS */}
                <div className="pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px] font-mono text-[var(--color-text-secondary)]">
                  <span className="truncate max-w-[150px] text-[var(--color-accent-cyan)] flex items-center gap-1">
                    <Folder className="w-3 h-3 shrink-0" />
                    {file.projectName || projectMap[file.projectId] || 'Project Brief'}
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
                        className="p-1.5 rounded bg-[var(--color-background)] hover:bg-rose-500/20 text-[var(--color-text-secondary)] hover:text-rose-400 border border-[var(--color-border)] transition-colors"
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

          {filteredFiles.length === 0 && !loading && (
            <div className="col-span-full py-8">
              <EmptyState
                icon={Folder}
                title="No files uploaded"
                description="Upload requirement specs, contracts, or deliverables for your projects."
                actionLabel="Upload Document"
                onAction={() => setShowUploadModal(true)}
              />
            </div>
          )}
        </div>
      ) : (
        /* LIST VIEW TABLE */
        <Card className="p-4 bg-[var(--color-surface)] border-[var(--color-border)] rounded-[12px] overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Filename</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Uploaded Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/50">
              {filteredFiles.map((file) => {
                const iconInfo = getFileTypeIconInfo(file.name, file.category, file.type);
                const IconComp = iconInfo.icon;

                return (
                  <tr
                    key={file.id}
                    className="hover:bg-[var(--color-background)]/50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div
                        className={`p-1.5 rounded border inline-block ${iconInfo.bgClass} ${iconInfo.borderClass} ${iconInfo.colorClass}`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                    </td>

                    <td className="py-3 px-3 font-bold text-[var(--color-text-primary)]">
                      {file.name}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                        {file.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[var(--color-text-secondary)]">
                      {file.size}
                    </td>

                    <td className="py-3 px-3 text-[var(--color-accent-cyan)]">
                      {file.projectName || projectMap[file.projectId] || 'Project Brief'}
                    </td>

                    <td className="py-3 px-3 text-[var(--color-text-secondary)]">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1.5 rounded bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] cursor-pointer"
                          title="Preview Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDownload(file, e)}
                          className="p-1.5 rounded bg-[var(--color-background)] hover:bg-[var(--color-accent-cyan)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] border border-[var(--color-border)] cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {file.id && (
                          <button
                            onClick={() => handleDeleteFile(file.id!)}
                            className="p-1.5 rounded bg-[var(--color-background)] hover:bg-rose-500/20 text-[var(--color-text-secondary)] hover:text-rose-400 border border-[var(--color-border)]"
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

              {filteredFiles.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-6">
                    <EmptyState
                      icon={Folder}
                      title="No files uploaded"
                      description="Upload requirement specs, contracts, or deliverables for your projects."
                      actionLabel="Upload Document"
                      onAction={() => setShowUploadModal(true)}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadSubmit}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-2xl animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <span>Upload Project Document</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* FILE PICKER */}
              <div>
                <label className="block text-[var(--color-text-secondary)] mb-1">
                  Select File *
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-[var(--color-text-primary)] file:mr-3 file:py-2 file:px-3 file:rounded-[6px] file:border-0 file:text-xs file:font-mono file:bg-[var(--color-accent-cyan)]/20 file:text-[var(--color-accent-cyan)] hover:file:bg-[var(--color-accent-cyan)]/30 cursor-pointer"
                  required
                />
              </div>

              {/* EMPTY PROJECT WARNING BANNER */}
              {projects.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>No active projects found. Create a project before uploading documents.</span>
                  </div>
                  <Link
                    to="/client/create-project"
                    className="underline font-bold text-amber-200 hover:text-white shrink-0 font-mono text-[11px]"
                  >
                    Create Project &rarr;
                  </Link>
                </div>
              )}

              {/* PROJECT SELECTOR */}
              <div>
                <label className="block text-[var(--color-text-secondary)] mb-1">
                  Target Project Brief *
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projects.length === 0}
                  required
                  className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] disabled:opacity-50"
                >
                  {projects.length === 0 ? (
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      No projects available
                    </option>
                  ) : (
                    <>
                      <option value="" disabled className="bg-slate-900 text-slate-400">
                        Select a project...
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                          {p.title}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* CATEGORY TAG SELECTOR (Requirements / Contracts / Deliverables / Invoices) */}
              <div>
                <label className="block text-[var(--color-text-secondary)] mb-1">
                  Category Tag *
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as FileCategory)}
                  className="w-full h-9 px-3 rounded-[8px] bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)]"
                >
                  <option value="requirements" className="bg-slate-900 text-white">
                    Requirements
                  </option>
                  <option value="contracts" className="bg-slate-900 text-white">
                    Contracts
                  </option>
                  <option value="deliverables" className="bg-slate-900 text-white">
                    Deliverables
                  </option>
                  <option value="invoices" className="bg-slate-900 text-white">
                    Invoices
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setShowUploadModal(false)}
                variant="outline"
                className="h-9 border-[var(--color-border)] text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!uploadFile || uploading || projects.length === 0 || !selectedProjectId}
                className="h-9 bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-slate-950 font-mono text-xs font-bold px-4 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 4. DIGITAL CONTRACT GENERATOR & SIGNING MODAL (Issue #4) */}
      <ContractSigningModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        currentUserRole="client"
        currentUserName={userProfile?.displayName || 'Client Principal'}
        contract={{
          projectId: selectedContractProject?.id || '',
          projectTitle: selectedContractProject?.title || 'SyncSphere Work Agreement',
          clientName: userProfile?.displayName || firebaseUser?.displayName || 'Client Principal',
          clientEmail: firebaseUser?.email || userProfile?.email || '',
          symbioteName: selectedContractProject?.assignedSymbioteName || selectedContractProject?.teamMembers?.[0]?.displayName || (selectedContractProject as any)?.symbioteName || 'Specialist Partner',
          symbioteEmail: (selectedContractProject as any)?.symbioteEmail || selectedContractProject?.teamMembers?.[0]?.email || '',
          effectiveDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          scopeOfWork: selectedContractProject?.description || 'Delivery of milestone tasks and approved deliverables as agreed in the project scope.',
          totalAmount: selectedContractProject?.totalSpent || 0,
          currency: 'USD',
        }}
        onSigned={async (_signatureUrl, pdfBlob) => {
          if (!pdfBlob) return;
          try {
            const fileName = `${(selectedContractProject?.title || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}_Executed_Contract.pdf`;
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            // Upload executed contract to cloud storage pipeline
            const uploadRes = await uploadFileToCloudinary(file, { folder: 'contracts' });
            
            // Record into projectFiles Firestore collection
            await createProjectFile({
              projectId: selectedContractProject?.id || 'proj-general',
              projectName: selectedContractProject?.title || 'General Services',
              name: fileName,
              downloadUrl: uploadRes.url || '',
              category: 'contracts',
              uploadedBy: clientId,
              uploadedByName: userProfile?.displayName || 'Client Principal',
              size: `${(file.size / 1024).toFixed(1)} KB`,
              type: 'application/pdf',
              uploadedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Failed to auto-archive executed contract:', err);
          }
        }}
      />

      {/* 5. INTERACTIVE DOCUMENT & IMAGE PREVIEW MODAL */}
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
                    <span>{previewFile.projectName || projectMap[previewFile.projectId] || 'Project Brief'}</span>
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
                    title="Open in new tab"
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
                    This file format can be downloaded securely for inspection with your local application.
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
