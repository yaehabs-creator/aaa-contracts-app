/**
 * Document Upload Service
 * Handles file upload, naming validation, and Supabase Storage integration
 * for the full contract ingestion system
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ContractDocument,
  DocumentGroup,
  DocumentGroupLabels,
  DocumentStatus,
  FileUploadRequest,
  FileUploadResult,
  BatchUploadProgress,
  FileNamingValidation,
  validateFileName,
  IngestionJob
} from '../types';

// Storage bucket name for contract documents
const STORAGE_BUCKET = 'contract-docs';

// Supported file types
const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  excel: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet'
  ],
  word: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  image: ['image/png', 'image/jpeg', 'image/tiff']
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  pdf: 100 * 1024 * 1024,     // 100MB for PDFs
  excel: 50 * 1024 * 1024,    // 50MB for Excel
  word: 50 * 1024 * 1024,     // 50MB for Word
  image: 20 * 1024 * 1024     // 20MB for images
};

export interface DocumentUploadOptions {
  validateNaming?: boolean;
  autoRename?: boolean;
  createIngestionJob?: boolean;
}

export class DocumentUploadService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Validate file type and size
   */
  validateFile(file: File): { valid: boolean; error?: string; fileType?: string } {
    // Determine file type category
    let fileType: string | undefined;
    for (const [type, mimeTypes] of Object.entries(SUPPORTED_FILE_TYPES)) {
      if (mimeTypes.includes(file.type)) {
        fileType = type;
        break;
      }
    }

    if (!fileType) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Supported types: PDF, Excel, Word, Images`
      };
    }

    // Check file size
    const maxSize = MAX_FILE_SIZES[fileType];
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size for ${fileType} is ${maxSize / (1024 * 1024)}MB`
      };
    }

    return { valid: true, fileType };
  }

  /**
   * Generate standardized file path in storage
   */
  generateFilePath(contractId: string, documentGroup: DocumentGroup, filename: string): string {
    // Format: contracts/{contractId}/{group}/{filename}
    return `contracts/${contractId}/${documentGroup}/${filename}`;
  }

  /**
   * Generate a valid filename from an invalid one
   */
  generateValidFilename(
    originalFilename: string,
    documentGroup: DocumentGroup,
    sequenceNumber: number
  ): string {
    const ext = originalFilename.split('.').pop() || 'pdf';
    const baseName = originalFilename
      .replace(/\.[^/.]+$/, '')  // Remove extension
      .replace(/[^A-Za-z0-9_-]/g, '_')  // Replace invalid chars
      .replace(/_+/g, '_')  // Collapse multiple underscores
      .substring(0, 50);  // Limit length

    const seq = sequenceNumber.toString().padStart(3, '0');
    return `${documentGroup}${seq}_${baseName}.${ext}`;
  }

  /**
   * Get next sequence number for a document group
   */
  async getNextSequenceNumber(contractId: string, documentGroup: DocumentGroup): Promise<number> {
    const { data, error } = await this.supabase
      .from('contract_documents')
      .select('sequence_number')
      .eq('contract_id', contractId)
      .eq('document_group', documentGroup)
      .order('sequence_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting sequence number:', error);
      return 1;
    }

    return data && data.length > 0 ? data[0].sequence_number + 1 : 1;
  }

  /**
   * Upload a single document
   */
  async uploadDocument(
    request: FileUploadRequest,
    options: DocumentUploadOptions = {}
  ): Promise<FileUploadResult> {
    const { file, contractId, documentGroup, sequenceNumber, effectiveDate, supersedesDocumentId } = request;
    const { validateNaming = true, autoRename = true, createIngestionJob = true } = options;

    try {
      // Validate file
      const fileValidation = this.validateFile(file);
      if (!fileValidation.valid) {
        return { success: false, error: fileValidation.error };
      }

      // Validate or generate filename
      let finalFilename = file.name;
      const seq = sequenceNumber || await this.getNextSequenceNumber(contractId, documentGroup);

      if (validateNaming) {
        const namingValidation = validateFileName(file.name);
        if (!namingValidation.isValid) {
          if (autoRename) {
            finalFilename = this.generateValidFilename(file.name, documentGroup, seq);
          } else {
            return {
              success: false,
              error: `Invalid filename: ${namingValidation.errors.join(', ')}`
            };
          }
        }
      }

      // Generate storage path
      const filePath = this.generateFilePath(contractId, documentGroup, finalFilename);

      // Upload to Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Handle duplicate file
        if (uploadError.message.includes('duplicate')) {
          return { success: false, error: 'A file with this name already exists' };
        }
        throw uploadError;
      }

      // Create document record
      const documentRecord: Partial<ContractDocument> = {
        contract_id: contractId,
        document_group: documentGroup,
        name: finalFilename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        original_filename: file.name,
        file_path: filePath,
        file_type: fileValidation.fileType!,
        file_size_bytes: file.size,
        sequence_number: seq,
        effective_date: effectiveDate,
        supersedes_document_id: supersedesDocumentId,
        status: 'pending' as DocumentStatus
      };

      const { data: docData, error: docError } = await this.supabase
        .from('contract_documents')
        .insert(documentRecord)
        .select()
        .single();

      if (docError) {
        // Rollback: delete uploaded file
        await this.supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        throw docError;
      }

      // Create ingestion job if requested
      if (createIngestionJob && docData) {
        await this.createIngestionJob(contractId, docData.id);
      }

      return {
        success: true,
        documentId: docData.id,
        filePath
      };
    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload multiple documents with progress tracking
   */
  async uploadBatch(
    files: File[],
    contractId: string,
    documentGroup: DocumentGroup,
    onProgress?: (progress: BatchUploadProgress) => void,
    options: DocumentUploadOptions = {}
  ): Promise<BatchUploadProgress> {
    const progress: BatchUploadProgress = {
      totalFiles: files.length,
      completedFiles: 0,
      errors: []
    };

    // Sort files by name to maintain order
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      progress.currentFile = file.name;
      onProgress?.(progress);

      const result = await this.uploadDocument(
        {
          file,
          contractId,
          documentGroup,
          sequenceNumber: i + 1
        },
        options
      );

      if (!result.success) {
        progress.errors.push({ filename: file.name, error: result.error || 'Unknown error' });
      }

      progress.completedFiles++;
      onProgress?.(progress);
    }

    progress.currentFile = undefined;
    onProgress?.(progress);

    return progress;
  }

  /**
   * Create an ingestion job for a document
   */
  async createIngestionJob(contractId: string, documentId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('ingestion_jobs')
      .insert({
        contract_id: contractId,
        document_id: documentId,
        job_type: 'full_ingestion',
        status: 'queued',
        progress: 0
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating ingestion job:', error);
      return null;
    }

    return data.id;
  }

  /**
   * Get all documents for a contract, organized by group
   */
  async getContractDocuments(contractId: string): Promise<Record<DocumentGroup, ContractDocument[]>> {
    const { data, error } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('document_group')
      .order('sequence_number');

    if (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }

    // Organize by group
    const result: Record<DocumentGroup, ContractDocument[]> = {
      [DocumentGroup.A]: [],
      [DocumentGroup.B]: [],
      [DocumentGroup.C]: [],
      [DocumentGroup.D]: [],
      [DocumentGroup.I]: [],
      [DocumentGroup.N]: []
    };

    for (const doc of data || []) {
      const group = doc.document_group as DocumentGroup;
      if (result[group]) {
        result[group].push(doc);
      }
    }

    return result;
  }

  /**
   * Get document download URL
   */
  async getDocumentUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error getting document URL:', error);
      return null;
    }

    return data.signedUrl;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    // Get document info first
    const { data: doc, error: fetchError } = await this.supabase
      .from('contract_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      console.error('Error fetching document for deletion:', fetchError);
      return false;
    }

    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.file_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with database deletion anyway
    }

    // Delete from database (will cascade to chunks, references, etc.)
    const { error: dbError } = await this.supabase
      .from('contract_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Error deleting document record:', dbError);
      return false;
    }

    return true;
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    error?: string
  ): Promise<boolean> {
    const update: Partial<ContractDocument> = { status };
    if (error) {
      update.processing_error = error;
    }
    if (status === 'completed') {
      update.processed_at = new Date().toISOString();
    }

    const { error: updateError } = await this.supabase
      .from('contract_documents')
      .update(update)
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document status:', updateError);
      return false;
    }

    return true;
  }

  /**
   * Get ingestion job status
   */
  async getIngestionJobStatus(jobId: string): Promise<IngestionJob | null> {
    const { data, error } = await this.supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job status:', error);
      return null;
    }

    return data;
  }

  /**
   * Update ingestion job progress
   */
  async updateIngestionJob(
    jobId: string,
    updates: Partial<IngestionJob>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('ingestion_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating ingestion job:', error);
      return false;
    }

    return true;
  }

  /**
   * Ensure storage bucket exists
   */
  async ensureStorageBucket(): Promise<boolean> {
    try {
      // Check if bucket exists
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

      if (!bucketExists) {
        // Create bucket
        const { error } = await this.supabase.storage.createBucket(STORAGE_BUCKET, {
          public: false,
          fileSizeLimit: 100 * 1024 * 1024 // 100MB
        });

        if (error) {
          console.error('Error creating storage bucket:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error ensuring storage bucket:', error);
      return false;
    }
  }
}

// Singleton instance
let uploadService: DocumentUploadService | null = null;

export function getDocumentUploadService(): DocumentUploadService {
  if (!uploadService) {
    uploadService = new DocumentUploadService();
  }
  return uploadService;
}

export default DocumentUploadService;
