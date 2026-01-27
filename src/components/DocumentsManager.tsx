/**
 * Documents Manager Component
 * Provides UI for managing contract documents with folder tree, upload wizard, and status indicators
 * Now integrated with Supabase for real document storage and retrieval
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ContractDocument,
  DocumentGroup,
  DocumentGroupLabels,
  DocumentStatus,
  IngestionJob,
  BatchUploadProgress,
  ValidationResult
} from '../../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Storage bucket name
const STORAGE_BUCKET = 'contract-docs';

// Supported file types
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Icons (using emoji for simplicity)
const Icons = {
  folder: '📁',
  folderOpen: '📂',
  file: '📄',
  pdf: '📕',
  excel: '📊',
  word: '📝',
  upload: '⬆️',
  processing: '⏳',
  completed: '✅',
  error: '❌',
  pending: '⏸️',
  refresh: '🔄',
  delete: '🗑️',
  download: '⬇️',
  expand: '▶️',
  collapse: '▼',
  warning: '⚠️',
  info: 'ℹ️',
  view: '👁️'
};

// Document group folder structure
const FOLDER_STRUCTURE: Array<{ group: DocumentGroup; icon: string; description: string }> = [
  { group: DocumentGroup.A, icon: '📋', description: 'Form of Agreement & Annexes' },
  { group: DocumentGroup.B, icon: '✉️', description: 'Signed Letter of Acceptance' },
  { group: DocumentGroup.C, icon: '📜', description: 'Conditions of Contract (GC/PC)' },
  { group: DocumentGroup.D, icon: '📑', description: 'Addendums & Modifications' },
  { group: DocumentGroup.I, icon: '💰', description: 'Priced BOQ & Measurements' },
  { group: DocumentGroup.N, icon: '📅', description: 'Schedules & Technical Appendices' }
];

interface DocumentsManagerProps {
  contractId: string;
  contractName?: string;
  onDocumentSelect?: (document: ContractDocument) => void;
  onRefreshNeeded?: () => void;
}

interface FolderState {
  isExpanded: boolean;
  documents: ContractDocument[];
  isLoading: boolean;
}

export const DocumentsManager: React.FC<DocumentsManagerProps> = ({
  contractId,
  contractName = 'Contract',
  onDocumentSelect,
  onRefreshNeeded
}) => {
  // State
  const [folders, setFolders] = useState<Record<DocumentGroup, FolderState>>(() => {
    const initial: Record<DocumentGroup, FolderState> = {} as any;
    for (const { group } of FOLDER_STRUCTURE) {
      initial[group] = { isExpanded: false, documents: [], isLoading: false };
    }
    return initial;
  });
  const [selectedDocument, setSelectedDocument] = useState<ContractDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<BatchUploadProgress | null>(null);
  const [activeJobs, setActiveJobs] = useState<IngestionJob[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DocumentGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents from Supabase
  const loadDocuments = useCallback(async () => {
    if (!supabase || !contractId) {
      setError('Supabase not configured or no contract selected');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .order('document_group')
        .order('sequence_number');

      if (fetchError) {
        throw fetchError;
      }

      // Organize by group
      setFolders(prev => {
        const updated = { ...prev };
        for (const group of Object.values(DocumentGroup)) {
          updated[group] = {
            ...updated[group],
            documents: (data || []).filter(d => d.document_group === group),
            isLoading: false
          };
        }
        return updated;
      });
      
      setError(null);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents. Make sure the database migration has been run.');
    } finally {
      setIsLoading(false);
    }
  }, [contractId]);

  // Load active jobs from Supabase
  const loadActiveJobs = useCallback(async () => {
    if (!supabase || !contractId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('ingestion_jobs')
        .select('*')
        .eq('contract_id', contractId)
        .in('status', ['processing', 'queued'])
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading jobs:', fetchError);
        return;
      }

      setActiveJobs(data || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  }, [contractId]);

  // Initial load
  useEffect(() => {
    if (contractId) {
      loadDocuments();
      loadActiveJobs();
      
      // Poll for job updates every 5 seconds
      const interval = setInterval(loadActiveJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [contractId, loadDocuments, loadActiveJobs]);

  // Toggle folder expansion
  const toggleFolder = (group: DocumentGroup) => {
    setFolders(prev => ({
      ...prev,
      [group]: { ...prev[group], isExpanded: !prev[group].isExpanded }
    }));
  };

  // Get next sequence number for a group
  const getNextSequenceNumber = async (group: DocumentGroup): Promise<number> => {
    if (!supabase) return 1;
    
    const { data } = await supabase
      .from('contract_documents')
      .select('sequence_number')
      .eq('contract_id', contractId)
      .eq('document_group', group)
      .order('sequence_number', { ascending: false })
      .limit(1);

    return data && data.length > 0 ? data[0].sequence_number + 1 : 1;
  };

  // Handle file upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedGroup || !supabase) return;

    setIsUploading(true);
    setUploadProgress({
      totalFiles: files.length,
      completedFiles: 0,
      errors: []
    });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => prev ? { ...prev, currentFile: file.name } : null);

        // Validate file type
        if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
          setUploadProgress(prev => prev ? {
            ...prev,
            errors: [...prev.errors, { filename: file.name, error: 'Unsupported file type' }]
          } : null);
          continue;
        }

        // Get sequence number
        const seq = await getNextSequenceNumber(selectedGroup);
        
        // Generate filename
        const ext = file.name.split('.').pop() || 'pdf';
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^A-Za-z0-9_-]/g, '_').substring(0, 50);
        const finalFilename = `${selectedGroup}${seq.toString().padStart(3, '0')}_${baseName}.${ext}`;
        
        // Generate storage path
        const filePath = `contracts/${contractId}/${selectedGroup}/${finalFilename}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          setUploadProgress(prev => prev ? {
            ...prev,
            errors: [...prev.errors, { filename: file.name, error: uploadError.message }]
          } : null);
          continue;
        }

        // Determine file type
        let fileType = 'pdf';
        if (file.type.includes('excel') || file.type.includes('spreadsheet')) fileType = 'excel';
        if (file.type.includes('word')) fileType = 'word';

        // Create document record
        const { error: dbError } = await supabase
          .from('contract_documents')
          .insert({
            contract_id: contractId,
            document_group: selectedGroup,
            name: baseName.replace(/_/g, ' '),
            original_filename: file.name,
            file_path: filePath,
            file_type: fileType,
            file_size_bytes: file.size,
            sequence_number: seq,
            status: 'pending'
          });

        if (dbError) {
          // Rollback storage upload
          await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
          setUploadProgress(prev => prev ? {
            ...prev,
            errors: [...prev.errors, { filename: file.name, error: dbError.message }]
          } : null);
          continue;
        }

        setUploadProgress(prev => prev ? {
          ...prev,
          completedFiles: prev.completedFiles + 1
        } : null);
      }

      // Refresh documents
      await loadDocuments();
      onRefreshNeeded?.();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed');
    } finally {
      setIsUploading(false);
      setShowUploadModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Open upload dialog
  const openUploadDialog = (group: DocumentGroup) => {
    setSelectedGroup(group);
    setShowUploadModal(true);
  };

  // Delete document
  const handleDeleteDocument = async (document: ContractDocument) => {
    if (!supabase) return;
    if (!confirm(`Delete "${document.name}"? This will also delete all associated data.`)) {
      return;
    }

    try {
      // Delete from storage
      await supabase.storage.from(STORAGE_BUCKET).remove([document.file_path]);

      // Delete from database (cascades to chunks, references)
      const { error: dbError } = await supabase
        .from('contract_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      await loadDocuments();
      onRefreshNeeded?.();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document');
    }
  };

  // Download document
  const handleDownloadDocument = async (document: ContractDocument) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(document.file_path, 3600);

      if (error) throw error;

      // Open in new tab or download
      const link = window.document.createElement('a');
      link.href = data.signedUrl;
      link.download = document.original_filename || document.name;
      link.click();
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
    }
  };

  // Preview document
  const handlePreviewDocument = async (document: ContractDocument) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(document.file_path, 3600);

      if (error) throw error;

      setPreviewUrl(data.signedUrl);
      setSelectedDocument(document);
      setShowPreview(true);
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to preview document');
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string): string => {
    if (fileType === 'pdf') return Icons.pdf;
    if (fileType === 'excel') return Icons.excel;
    if (fileType === 'word') return Icons.word;
    return Icons.file;
  };

  // Get status icon
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return Icons.completed;
      case 'processing': return Icons.processing;
      case 'error': return Icons.error;
      default: return Icons.pending;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render document item
  const renderDocumentItem = (doc: ContractDocument) => (
    <div
      key={doc.id}
      className={`document-item ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
      onClick={() => {
        setSelectedDocument(doc);
        onDocumentSelect?.(doc);
      }}
    >
      <span className="document-icon">{getFileIcon(doc.file_type)}</span>
      <div className="document-info">
        <span className="document-name">{doc.name}</span>
        <span className="document-meta">
          {formatFileSize(doc.file_size_bytes || 0)} • {doc.file_type?.toUpperCase()}
        </span>
      </div>
      <span className="document-status" title={doc.status}>
        {getStatusIcon(doc.status)}
      </span>
      <div className="document-actions">
        <button
          className="action-btn"
          onClick={(e) => { e.stopPropagation(); handlePreviewDocument(doc); }}
          title="Preview"
        >
          {Icons.view}
        </button>
        <button
          className="action-btn"
          onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc); }}
          title="Download"
        >
          {Icons.download}
        </button>
        <button
          className="action-btn delete"
          onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }}
          title="Delete"
        >
          {Icons.delete}
        </button>
      </div>
    </div>
  );

  // Render folder
  const renderFolder = (group: DocumentGroup, icon: string, description: string) => {
    const folder = folders[group];
    const documentCount = folder.documents.length;
    const processingCount = folder.documents.filter(d => d.status === 'processing').length;

    return (
      <div key={group} className="folder-container">
        <div className="folder-header" onClick={() => toggleFolder(group)}>
          <span className="folder-toggle">
            {folder.isExpanded ? Icons.collapse : Icons.expand}
          </span>
          <span className="folder-icon">{icon}</span>
          <div className="folder-info">
            <span className="folder-name">{DocumentGroupLabels[group]}</span>
            <span className="folder-description">{description}</span>
          </div>
          <span className="folder-count">({documentCount})</span>
          {processingCount > 0 && (
            <span className="processing-badge">{Icons.processing} {processingCount}</span>
          )}
          <button
            className="upload-btn"
            onClick={(e) => { e.stopPropagation(); openUploadDialog(group); }}
            title={`Upload to ${DocumentGroupLabels[group]}`}
          >
            {Icons.upload}
          </button>
        </div>
        
        {folder.isExpanded && (
          <div className="folder-content">
            {folder.documents.length === 0 ? (
              <div className="empty-folder">
                No documents uploaded. Click {Icons.upload} to upload files.
              </div>
            ) : (
              folder.documents.map(renderDocumentItem)
            )}
          </div>
        )}
      </div>
    );
  };

  // Calculate total documents
  const totalDocuments = Object.values(folders).reduce((sum, f) => sum + f.documents.length, 0);

  return (
    <div className="documents-manager">
      {/* Header */}
      <div className="dm-header">
        <h2>{Icons.folder} Contract Documents</h2>
        <div className="dm-stats">
          <span>{totalDocuments} document{totalDocuments !== 1 ? 's' : ''}</span>
        </div>
        <div className="dm-actions">
          <button onClick={loadDocuments} disabled={isLoading} title="Refresh">
            {isLoading ? Icons.processing : Icons.refresh} Refresh
          </button>
        </div>
      </div>

      {/* Connection status */}
      {!supabase && (
        <div className="dm-warning">
          {Icons.warning} Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="dm-error">
          {Icons.error} {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div className="dm-jobs">
          <h3>{Icons.processing} Processing ({activeJobs.length})</h3>
          {activeJobs.map(job => (
            <div key={job.id} className="job-item">
              <span>{job.job_type}</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${job.progress}%` }} />
              </div>
              <span>{job.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Folder tree */}
      <div className="dm-tree">
        {FOLDER_STRUCTURE.map(({ group, icon, description }) => renderFolder(group, icon, description))}
      </div>

      {/* Upload modal */}
      {showUploadModal && selectedGroup && (
        <div className="dm-modal-overlay" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div className="dm-modal" onClick={e => e.stopPropagation()}>
            <h3>{Icons.upload} Upload to {DocumentGroupLabels[selectedGroup]}</h3>
            
            <div className="upload-instructions">
              <p>Select files to upload. Supported formats:</p>
              <ul>
                <li>PDF documents (.pdf)</li>
                <li>Excel spreadsheets (.xlsx, .xls)</li>
                <li>Word documents (.docx, .doc)</li>
              </ul>
              <p className="naming-hint">
                Files will be automatically renamed to follow the naming convention: <code>{selectedGroup}001_Document_Name.pdf</code>
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.docx,.doc"
              onChange={handleFileSelect}
              disabled={isUploading}
            />

            {uploadProgress && (
              <div className="upload-progress">
                <p>
                  Uploading: {uploadProgress.completedFiles} / {uploadProgress.totalFiles}
                </p>
                {uploadProgress.currentFile && (
                  <p>Current: {uploadProgress.currentFile}</p>
                )}
                <div className="progress-bar">
                  <div
                    className="progress"
                    style={{
                      width: `${(uploadProgress.completedFiles / uploadProgress.totalFiles) * 100}%`
                    }}
                  />
                </div>
                {uploadProgress.errors.length > 0 && (
                  <div className="upload-errors">
                    {uploadProgress.errors.map((err, i) => (
                      <p key={i} className="error">
                        {Icons.error} {err.filename}: {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowUploadModal(false)} disabled={isUploading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && previewUrl && selectedDocument && (
        <div className="dm-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="dm-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{getFileIcon(selectedDocument.file_type)} {selectedDocument.name}</h3>
              <button onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="preview-content">
              {selectedDocument.file_type === 'pdf' ? (
                <iframe src={previewUrl} title="Document Preview" />
              ) : (
                <div className="preview-download">
                  <p>Preview not available for {selectedDocument.file_type?.toUpperCase()} files.</p>
                  <button onClick={() => handleDownloadDocument(selectedDocument)}>
                    {Icons.download} Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .documents-manager {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          max-width: 100%;
        }

        .dm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 10px;
        }

        .dm-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #1e293b;
        }

        .dm-stats {
          color: #64748b;
          font-size: 0.9rem;
        }

        .dm-actions button {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: #3b82f6;
          color: white;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .dm-actions button:hover:not(:disabled) {
          background: #2563eb;
        }

        .dm-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dm-warning {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          color: #92400e;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .dm-error {
          background: #fee2e2;
          border: 1px solid #ef4444;
          color: #b91c1c;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dm-error button {
          background: none;
          border: none;
          color: #b91c1c;
          cursor: pointer;
          font-size: 1.4rem;
          padding: 0 5px;
        }

        .dm-jobs {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }

        .dm-jobs h3 {
          margin: 0 0 10px 0;
          font-size: 1rem;
          color: #92400e;
        }

        .job-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 8px 0;
          font-size: 0.9rem;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s;
        }

        .dm-tree {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .folder-container {
          border-bottom: 1px solid #f1f5f9;
        }

        .folder-container:last-child {
          border-bottom: none;
        }

        .folder-header {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          cursor: pointer;
          user-select: none;
          background: #fafafa;
          transition: background 0.2s;
        }

        .folder-header:hover {
          background: #f1f5f9;
        }

        .folder-toggle {
          width: 24px;
          font-size: 0.8rem;
          color: #64748b;
        }

        .folder-icon {
          margin-right: 10px;
          font-size: 1.2rem;
        }

        .folder-info {
          flex: 1;
          min-width: 0;
        }

        .folder-name {
          font-weight: 600;
          color: #1e293b;
          display: block;
        }

        .folder-description {
          font-size: 0.75rem;
          color: #64748b;
        }

        .folder-count {
          color: #64748b;
          margin-right: 10px;
          font-size: 0.9rem;
        }

        .processing-badge {
          background: #fef3c7;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
          margin-right: 10px;
          color: #92400e;
        }

        .upload-btn {
          background: none;
          border: 1px solid #3b82f6;
          color: #3b82f6;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-btn:hover {
          background: #3b82f6;
          color: white;
        }

        .folder-content {
          padding: 8px 16px 16px 50px;
          background: white;
        }

        .empty-folder {
          color: #94a3b8;
          font-style: italic;
          padding: 16px 0;
          text-align: center;
        }

        .document-item {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          margin: 4px 0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .document-item:hover {
          background: #f1f5f9;
        }

        .document-item.selected {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .document-icon {
          margin-right: 10px;
          font-size: 1.2rem;
        }

        .document-info {
          flex: 1;
          min-width: 0;
        }

        .document-name {
          display: block;
          font-weight: 500;
          color: #1e293b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .document-meta {
          font-size: 0.75rem;
          color: #64748b;
        }

        .document-status {
          margin: 0 12px;
        }

        .document-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .document-item:hover .document-actions {
          opacity: 1;
        }

        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .action-btn:hover {
          background: #e2e8f0;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
        }

        .dm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .dm-modal {
          background: white;
          padding: 28px;
          border-radius: 16px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }

        .dm-modal h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
        }

        .upload-instructions {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
        }

        .upload-instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .naming-hint {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 10px;
        }

        .naming-hint code {
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .dm-modal input[type="file"] {
          display: block;
          width: 100%;
          padding: 16px;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          margin: 16px 0;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .dm-modal input[type="file"]:hover {
          border-color: #3b82f6;
        }

        .upload-progress {
          margin: 16px 0;
        }

        .upload-errors {
          margin-top: 12px;
        }

        .upload-errors .error {
          color: #b91c1c;
          font-size: 0.9rem;
          margin: 4px 0;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .modal-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          background: #e2e8f0;
          color: #475569;
          transition: all 0.2s;
        }

        .modal-actions button:hover:not(:disabled) {
          background: #cbd5e1;
        }

        .modal-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dm-preview-modal {
          background: white;
          border-radius: 16px;
          max-width: 90vw;
          max-height: 90vh;
          width: 900px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .preview-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
        }

        .preview-header button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
        }

        .preview-content {
          flex: 1;
          overflow: hidden;
        }

        .preview-content iframe {
          width: 100%;
          height: 70vh;
          border: none;
        }

        .preview-download {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #64748b;
        }

        .preview-download button {
          margin-top: 16px;
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .preview-download button:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default DocumentsManager;
