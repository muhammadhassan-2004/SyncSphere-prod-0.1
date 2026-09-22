import React, { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { ProjectFile, FileCategory, Project } from '@/src/types/firestore';
import { createProjectFile } from '@/src/lib/firestore/projectFiles';
import { uploadFileToCloudinary } from '@/src/lib/storage/cloudinary';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  Folder,
  Loader2,
} from 'lucide-react';

interface UploadProjectFileModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onFileUploaded?: () => void;
}

export const UploadProjectFileModal: React.FC<UploadProjectFileModalProps> = ({
  isOpen,
  project,
  onClose,
  onFileUploaded,
}) => {
  const { firebaseUser, userProfile } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<FileCategory>('requirements');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const formattedSize =
        file.size > 1024 * 1024 ? `${sizeMB} MB` : `${Math.round(file.size / 1024)} KB`;

      // Upload directly to Cloudinary storage
      const uploadRes = await uploadFileToCloudinary(file, {
        projectId: project.id,
        folder: `syncsphere/projects/${project.id || 'general'}`,
        fileName: file.name,
      });

      const filePayload: Omit<ProjectFile, 'id'> = {
        projectId: project.id || '',
        projectName: project.title,
        clientId: firebaseUser?.uid || project.ownerId || '',
        name: file.name,
        size: formattedSize,
        sizeBytes: uploadRes.bytes || file.size,
        type: file.type || file.name.split('.').pop() || 'file',
        category,
        downloadUrl: uploadRes.url,
        uploadedBy: firebaseUser?.uid || 'client-user',
        uploadedByName: userProfile?.displayName || 'Client Admin',
        uploadedAt: new Date().toISOString(),
      };

      await createProjectFile(filePayload);

      setFile(null);
      if (onFileUploaded) onFileUploaded();
      onClose();
    } catch (err: any) {
      console.error('Failed to upload file:', err);
      setErrorMsg(err?.message || 'Failed to upload document to Cloudinary storage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-[var(--color-accent-cyan)]/15 border border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Upload Project Document</h3>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                Project: <span className="text-[var(--color-accent-cyan)]">{project.title}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--color-background)] rounded-[6px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-[8px] bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FILE DROPZONE */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Select Document
            </label>
            <div className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] rounded-[10px] p-6 text-center space-y-2 bg-[var(--color-background)]/50 transition-colors">
              <input
                type="file"
                id="project-file-input"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="project-file-input"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <div className="p-3 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-accent-cyan)]">
                  <FileText className="w-6 h-6" />
                </div>
                {file ? (
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">{file.name}</p>
                    <p className="text-[10.5px] font-mono text-[var(--color-text-secondary)] mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Click to choose file or drag and drop
                    </p>
                    <p className="text-[10.5px] font-mono text-[var(--color-text-secondary)] mt-0.5">
                      PDF, DOCX, ZIP, XLSX, PNG, JPG (Up to 50MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* CATEGORY SELECTOR */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-mono text-[var(--color-text-secondary)] uppercase font-semibold block">
              Document Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FileCategory)}
              className="w-full p-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-[8px] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-cyan)] font-mono"
            >
              <option value="requirements">Requirements & Specifications</option>
              <option value="contracts">Contracts & Statements of Work</option>
              <option value="deliverables">Technical Deliverables & Code</option>
              <option value="invoices">Invoices & Financial Docs</option>
            </select>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!file || isSubmitting}
              className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-emerald-400 text-white font-bold font-mono text-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Uploading...' : 'Upload File'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
