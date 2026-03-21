
/**
 * Document Upload Service (Local Mock)
 * Supabase has been removed. All storage operations are now simulated or local.
 */

export enum DocumentGroup {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  I = 'I',
  N = 'N'
}

export class DocumentUploadService {
  constructor() {}

  validateFile(file: File) {
    return { valid: true, fileType: 'pdf' };
  }

  generateFilePath(contractId: string, documentGroup: string, filename: string) {
    return `local://contracts/${contractId}/${documentGroup}/${filename}`;
  }

  async getNextSequenceNumber() {
    return 1;
  }

  async uploadDocument(request: any) {
    console.log('Local simulation: Document uploaded:', request.file.name);
    return {
      success: true,
      documentId: `local_${Date.now()}`,
      filePath: `local://${request.file.name}`
    };
  }

  async uploadBatch(files: File[]) {
    return {
      totalFiles: files.length,
      completedFiles: files.length,
      errors: []
    };
  }

  async createIngestionJob() {
    return `job_${Date.now()}`;
  }

  async getContractDocuments() {
    return {
      A: [], B: [], C: [], D: [], I: [], N: []
    } as any;
  }

  async getDocumentUrl() {
    return null;
  }

  async deleteDocument() {
    return true;
  }

  async updateDocumentStatus() {
    return true;
  }

  async getIngestionJobStatus() {
    return null;
  }

  async updateIngestionJob() {
    return true;
  }

  async ensureStorageBucket() {
    return true;
  }
}

let uploadService: DocumentUploadService | null = null;

export function getDocumentUploadService(): DocumentUploadService {
  if (!uploadService) {
    uploadService = new DocumentUploadService();
  }
  return uploadService;
}

export default DocumentUploadService;
