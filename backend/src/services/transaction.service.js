import AppError from '../utils/AppError.js';
import TransactionRepository from '../repositories/transaction.repository.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { StorageService } from './storage/storage.service.js';
import { STORAGE_BUCKETS } from '../config/supabase.js';

export class TransactionServiceError extends AppError {
  constructor(message, statusCode = 400, errorCode = 'TRANSACTION_SERVICE_ERROR') {
    super(message, statusCode, errorCode);
    this.name = 'TransactionServiceError';
  }
}

export class TransactionService {
  constructor() {
    this.transactionRepository = new TransactionRepository();
  }

  // ==========================================
  // 1. Transaction Business Logic
  // ==========================================

  async createTransaction(data, userId) {
    if (!data.transactionNumber || !data.transactionNumber.trim()) {
      throw new TransactionServiceError('Transaction number is required.', 400, 'VALIDATION_FAILED');
    }
    if (!data.transactionType || !data.transactionType.trim()) {
      throw new TransactionServiceError('Transaction type is required.', 400, 'VALIDATION_FAILED');
    }

    // Check duplicate transaction number
    const existing = await this.transactionRepository.findTransactionByNumber(data.transactionNumber.trim());
    if (existing) {
      throw new TransactionServiceError(`Transaction number "${data.transactionNumber}" already exists.`, 409, 'DUPLICATE_TRANSACTION');
    }

    // Validate validity dates
    if (data.validityStart && data.validityEnd) {
      const start = new Date(data.validityStart);
      const end = new Date(data.validityEnd);
      if (start > end) {
        throw new TransactionServiceError('Validity start date cannot be after validity end date.', 400, 'INVALID_DATE_RANGE');
      }
    }

    const payload = {
      transactionNumber: data.transactionNumber.trim(),
      transactionType: data.transactionType.trim(),
      executionDate: data.executionDate ? new Date(data.executionDate) : null,
      executionPlace: data.executionPlace ? data.executionPlace.trim() : null,
      transactionValue: data.transactionValue !== undefined && data.transactionValue !== null ? Number(data.transactionValue) : null,
      currency: data.currency ? data.currency.trim() : 'INR',
      validityStart: data.validityStart ? new Date(data.validityStart) : null,
      validityEnd: data.validityEnd ? new Date(data.validityEnd) : null,
      status: data.status || 'DRAFT',
      remarks: data.remarks ? data.remarks.trim() : null,
      createdById: userId || null,
      updatedById: userId || null,
      parties: Array.isArray(data.parties) ? data.parties.map(p => ({
        partyType: p.partyType,
        name: p.name.trim(),
        address: p.address ? p.address.trim() : null,
        email: p.email ? p.email.trim() : null,
        phone: p.phone ? p.phone.trim() : null,
        remarks: p.remarks ? p.remarks.trim() : null
      })) : []
    };

    return await this.transactionRepository.createTransaction(payload);
  }

  async getTransactionDetails(id) {
    const tx = await this.transactionRepository.findTransactionById(id);
    if (!tx) {
      throw new TransactionServiceError('Transaction record not found.', 404, 'TRANSACTION_NOT_FOUND');
    }
    return tx;
  }

  async listTransactions(params = {}) {
    return await this.transactionRepository.listTransactions(params);
  }

  async updateTransaction(id, data, userId) {
    await this.getTransactionDetails(id);

    if (data.transactionNumber) {
      const existing = await this.transactionRepository.findTransactionByNumber(data.transactionNumber.trim());
      if (existing && existing.id !== id) {
        throw new TransactionServiceError(`Transaction number "${data.transactionNumber}" already in use.`, 409, 'DUPLICATE_TRANSACTION');
      }
    }

    if (data.validityStart && data.validityEnd) {
      const start = new Date(data.validityStart);
      const end = new Date(data.validityEnd);
      if (start > end) {
        throw new TransactionServiceError('Validity start date cannot be after validity end date.', 400, 'INVALID_DATE_RANGE');
      }
    }

    const payload = {
      ...(data.transactionNumber && { transactionNumber: data.transactionNumber.trim() }),
      ...(data.transactionType && { transactionType: data.transactionType.trim() }),
      ...(data.executionDate !== undefined && { executionDate: data.executionDate ? new Date(data.executionDate) : null }),
      ...(data.executionPlace !== undefined && { executionPlace: data.executionPlace ? data.executionPlace.trim() : null }),
      ...(data.transactionValue !== undefined && { transactionValue: data.transactionValue !== null ? Number(data.transactionValue) : null }),
      ...(data.currency && { currency: data.currency.trim() }),
      ...(data.validityStart !== undefined && { validityStart: data.validityStart ? new Date(data.validityStart) : null }),
      ...(data.validityEnd !== undefined && { validityEnd: data.validityEnd ? new Date(data.validityEnd) : null }),
      ...(data.status && { status: data.status }),
      ...(data.remarks !== undefined && { remarks: data.remarks ? data.remarks.trim() : null }),
      updatedById: userId || null
    };

    return await this.transactionRepository.updateTransaction(id, payload);
  }

  async deleteTransaction(id, reason = '', userId = null) {
    const tx = await this.getTransactionDetails(id);
    console.log(`[Audit Log - Delete Transaction] Transaction ${id} (${tx?.transactionNumber}) deleted. Reason: "${reason}". Operator ID: ${userId || 'N/A'}`);
    return await this.transactionRepository.deleteTransaction(id);
  }

  // ==========================================
  // 2. Party Business Logic
  // ==========================================

  async addParty(transactionId, partyData) {
    await this.getTransactionDetails(transactionId);
    if (!partyData.name || !partyData.name.trim()) {
      throw new TransactionServiceError('Party name is required.', 400, 'VALIDATION_FAILED');
    }
    if (!partyData.partyType) {
      throw new TransactionServiceError('Party type is required.', 400, 'VALIDATION_FAILED');
    }

    return await this.transactionRepository.createParty({
      transactionId,
      partyType: partyData.partyType,
      name: partyData.name.trim(),
      address: partyData.address ? partyData.address.trim() : null,
      email: partyData.email ? partyData.email.trim() : null,
      phone: partyData.phone ? partyData.phone.trim() : null,
      remarks: partyData.remarks ? partyData.remarks.trim() : null
    });
  }

  async updateParty(partyId, partyData) {
    return await this.transactionRepository.updateParty(partyId, {
      ...(partyData.partyType && { partyType: partyData.partyType }),
      ...(partyData.name && { name: partyData.name.trim() }),
      ...(partyData.address !== undefined && { address: partyData.address ? partyData.address.trim() : null }),
      ...(partyData.email !== undefined && { email: partyData.email ? partyData.email.trim() : null }),
      ...(partyData.phone !== undefined && { phone: partyData.phone ? partyData.phone.trim() : null }),
      ...(partyData.remarks !== undefined && { remarks: partyData.remarks ? partyData.remarks.trim() : null })
    });
  }

  async deleteParty(partyId) {
    return await this.transactionRepository.deleteParty(partyId);
  }

  // ==========================================
  // 3. Legal Document Business Logic
  // ==========================================

  async createLegalDocument(transactionId, data, userId) {
    await this.getTransactionDetails(transactionId);

    if (!data.documentName || !data.documentName.trim()) {
      throw new TransactionServiceError('Document name is required.', 400, 'VALIDATION_FAILED');
    }
    if (!data.documentType) {
      throw new TransactionServiceError('Document type is required.', 400, 'VALIDATION_FAILED');
    }

    if (data.documentNumber && data.documentNumber.trim()) {
      const existing = await this.transactionRepository.findLegalDocumentByNumber(data.documentNumber.trim());
      if (existing) {
        throw new TransactionServiceError(`Document number "${data.documentNumber}" already exists.`, 409, 'DUPLICATE_DOCUMENT');
      }
    }

    const docPayload = {
      transactionId,
      documentType: data.documentType,
      documentName: data.documentName.trim(),
      documentNumber: data.documentNumber ? data.documentNumber.trim() : null,
      category: data.category ? data.category.trim() : null,
      description: data.description ? data.description.trim() : null,
      status: data.status || 'DRAFT',
      createdById: userId || null
    };

    const legalDoc = await this.transactionRepository.createLegalDocument(docPayload);

    // Initialize default custody record
    if (data.custodianName) {
      await this.transactionRepository.upsertCustody(legalDoc.id, {
        custodianName: data.custodianName.trim(),
        department: data.department ? data.department.trim() : null,
        location: data.location ? data.location.trim() : null,
        originalAvailable: data.originalAvailable !== undefined ? Boolean(data.originalAvailable) : true,
        scannedAvailable: false,
        numberOfOriginalSets: data.numberOfOriginalSets ? Number(data.numberOfOriginalSets) : 1,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
        status: data.custodyStatus || 'IN_SAFE'
      });
    }

    return await this.getLegalDocumentDetails(legalDoc.id);
  }

  async getLegalDocumentDetails(id) {
    const doc = await this.transactionRepository.findLegalDocumentById(id);
    if (!doc) {
      throw new TransactionServiceError('Legal document record not found.', 404, 'DOCUMENT_NOT_FOUND');
    }
    return doc;
  }

  async listLegalDocuments(params = {}) {
    return await this.transactionRepository.listLegalDocuments(params);
  }

  async updateLegalDocument(id, data) {
    await this.getLegalDocumentDetails(id);

    if (data.documentNumber && data.documentNumber.trim()) {
      const existing = await this.transactionRepository.findLegalDocumentByNumber(data.documentNumber.trim());
      if (existing && existing.id !== id) {
        throw new TransactionServiceError(`Document number "${data.documentNumber}" already in use.`, 409, 'DUPLICATE_DOCUMENT');
      }
    }

    const payload = {
      ...(data.documentType && { documentType: data.documentType }),
      ...(data.documentName && { documentName: data.documentName.trim() }),
      ...(data.documentNumber !== undefined && { documentNumber: data.documentNumber ? data.documentNumber.trim() : null }),
      ...(data.category !== undefined && { category: data.category ? data.category.trim() : null }),
      ...(data.description !== undefined && { description: data.description ? data.description.trim() : null }),
      ...(data.status && { status: data.status })
    };

    return await this.transactionRepository.updateLegalDocument(id, payload);
  }

  async deleteLegalDocument(id) {
    await this.getLegalDocumentDetails(id);
    return await this.transactionRepository.deleteLegalDocument(id);
  }

  // ==========================================
  // 4. Signatory Business Logic
  // ==========================================

  async addSignatory(legalDocumentId, signatoryData) {
    await this.getLegalDocumentDetails(legalDocumentId);
    if (!signatoryData.name || !signatoryData.name.trim()) {
      throw new TransactionServiceError('Signatory name is required.', 400, 'VALIDATION_FAILED');
    }

    return await this.transactionRepository.createSignatory({
      legalDocumentId,
      name: signatoryData.name.trim(),
      designation: signatoryData.designation ? signatoryData.designation.trim() : null,
      organization: signatoryData.organization ? signatoryData.organization.trim() : null,
      signed: Boolean(signatoryData.signed),
      signingDate: signatoryData.signingDate ? new Date(signatoryData.signingDate) : null,
      remarks: signatoryData.remarks ? signatoryData.remarks.trim() : null
    });
  }

  async updateSignatory(signatoryId, signatoryData) {
    return await this.transactionRepository.updateSignatory(signatoryId, {
      ...(signatoryData.name && { name: signatoryData.name.trim() }),
      ...(signatoryData.designation !== undefined && { designation: signatoryData.designation ? signatoryData.designation.trim() : null }),
      ...(signatoryData.organization !== undefined && { organization: signatoryData.organization ? signatoryData.organization.trim() : null }),
      ...(signatoryData.signed !== undefined && { signed: Boolean(signatoryData.signed) }),
      ...(signatoryData.signingDate !== undefined && { signingDate: signatoryData.signingDate ? new Date(signatoryData.signingDate) : null }),
      ...(signatoryData.remarks !== undefined && { remarks: signatoryData.remarks ? signatoryData.remarks.trim() : null })
    });
  }

  async deleteSignatory(signatoryId) {
    return await this.transactionRepository.deleteSignatory(signatoryId);
  }

  // ==========================================
  // 5. Custody Business Logic
  // ==========================================

  async updateCustody(legalDocumentId, custodyData) {
    await this.getLegalDocumentDetails(legalDocumentId);
    if (!custodyData.custodianName || !custodyData.custodianName.trim()) {
      throw new TransactionServiceError('Custodian name is required.', 400, 'VALIDATION_FAILED');
    }

    const payload = {
      custodianName: custodyData.custodianName.trim(),
      department: custodyData.department ? custodyData.department.trim() : null,
      location: custodyData.location ? custodyData.location.trim() : null,
      originalAvailable: custodyData.originalAvailable !== undefined ? Boolean(custodyData.originalAvailable) : true,
      scannedAvailable: custodyData.scannedAvailable !== undefined ? Boolean(custodyData.scannedAvailable) : true,
      numberOfOriginalSets: custodyData.numberOfOriginalSets ? Number(custodyData.numberOfOriginalSets) : 1,
      receivedDate: custodyData.receivedDate ? new Date(custodyData.receivedDate) : null,
      returnedDate: custodyData.returnedDate ? new Date(custodyData.returnedDate) : null,
      status: custodyData.status || 'IN_SAFE',
      remarks: custodyData.remarks ? custodyData.remarks.trim() : null
    };

    return await this.transactionRepository.upsertCustody(legalDocumentId, payload);
  }

  // ==========================================
  // 6. Scanned Documents Upload & Verification
  // ==========================================

  async uploadScannedDocument(legalDocumentId, file, userId, remarks) {
    const doc = await this.getLegalDocumentDetails(legalDocumentId);
    if (!file) {
      throw new TransactionServiceError('No file payload was transmitted for scanned document upload.', 400, 'VALIDATION_FAILED');
    }

    const ext = path.extname(file.originalname) || '.pdf';
    const storedFileName = `scanned_${legalDocumentId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const storagePath = `secure/legal/scanned/${storedFileName}`;

    // 1. Upload to Supabase Storage bucket
    try {
      if (file.buffer) {
        await StorageService.uploadObject(
          STORAGE_BUCKETS.DOCUMENTS,
          storagePath,
          file.buffer,
          { contentType: file.mimetype || 'application/pdf' }
        );
      }
    } catch (supaErr) {
      console.warn('[Supabase Storage]: Local disk fallback stored. Warning:', supaErr.message);
    }

    // 2. Local disk backup storage
    const uploadsDir = path.join(process.cwd(), 'uploads', 'scanned');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (file.buffer) {
      fs.writeFileSync(path.join(uploadsDir, storedFileName), file.buffer);
    }

    const scannedDoc = await this.transactionRepository.createScannedDocument({
      legalDocumentId,
      originalFileName: file.originalname,
      storedFileName,
      mimeType: file.mimetype,
      fileSize: file.size,
      pageCount: file.pageCount ? Number(file.pageCount) : null,
      storagePath,
      uploadedById: userId || null,
      uploadedDate: new Date(),
      verified: false,
      verificationStatus: 'PENDING',
      remarks: remarks ? remarks.trim() : null
    });

    // Update custody scannedAvailable flag
    const existingCustody = await this.transactionRepository.findCustodyByLegalDocumentId(legalDocumentId);
    if (existingCustody) {
      await this.transactionRepository.upsertCustody(legalDocumentId, {
        custodianName: existingCustody.custodianName,
        scannedAvailable: true
      });
    }

    return scannedDoc;
  }

  async verifyScannedDocument(scannedId, verificationStatus, userId, remarks) {
    const scannedDoc = await this.transactionRepository.findScannedDocumentById(scannedId);
    if (!scannedDoc) {
      throw new TransactionServiceError('Scanned document record not found.', 404, 'SCANNED_DOC_NOT_FOUND');
    }

    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(verificationStatus)) {
      throw new TransactionServiceError('Invalid verification status.', 400, 'INVALID_VERIFICATION_STATUS');
    }

    return await this.transactionRepository.updateScannedDocumentVerification(scannedId, verificationStatus, userId, remarks);
  }

  async deleteScannedDocument(scannedId) {
    const scannedDoc = await this.transactionRepository.findScannedDocumentById(scannedId);
    if (!scannedDoc) {
      throw new TransactionServiceError('Scanned document record not found.', 404, 'SCANNED_DOC_NOT_FOUND');
    }
    return await this.transactionRepository.deleteScannedDocument(scannedId);
  }

  // ==========================================
  // 7. Supporting Attachments Business Logic
  // ==========================================

  async uploadAttachment(legalDocumentId, file, attachmentType, description, userId) {
    await this.getLegalDocumentDetails(legalDocumentId);
    if (!file) {
      throw new TransactionServiceError('No file payload transmitted for attachment.', 400, 'VALIDATION_FAILED');
    }

    const ext = path.extname(file.originalname) || '.pdf';
    const storedFileName = `attachment_${legalDocumentId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const storagePath = `secure/legal/attachments/${storedFileName}`;

    // 1. Upload to Supabase Storage bucket
    try {
      if (file.buffer) {
        await StorageService.uploadObject(
          STORAGE_BUCKETS.DOCUMENTS,
          storagePath,
          file.buffer,
          { contentType: file.mimetype || 'application/pdf' }
        );
      }
    } catch (supaErr) {
      console.warn('[Supabase Storage Attachment]: Local disk fallback stored. Warning:', supaErr.message);
    }

    // 2. Local disk backup storage
    const uploadsDir = path.join(process.cwd(), 'uploads', 'attachments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (file.buffer) {
      fs.writeFileSync(path.join(uploadsDir, storedFileName), file.buffer);
    }

    return await this.transactionRepository.createAttachment({
      legalDocumentId,
      attachmentType: attachmentType ? attachmentType.trim() : 'Supporting Annexure',
      originalFileName: file.originalname,
      storedFileName,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath,
      description: description ? description.trim() : null,
      uploadedById: userId || null,
      createdDate: new Date()
    });
  }

  async deleteAttachment(attachmentId) {
    const att = await this.transactionRepository.findAttachmentById(attachmentId);
    if (!att) {
      throw new TransactionServiceError('Document attachment record not found.', 404, 'ATTACHMENT_NOT_FOUND');
    }
    return await this.transactionRepository.deleteAttachment(attachmentId);
  }

  // ==========================================
  // 8. Document Versions Business Logic
  // ==========================================

  async uploadNewVersion(legalDocumentId, file, userId, remarks) {
    const doc = await this.getLegalDocumentDetails(legalDocumentId);
    if (!file) {
      throw new TransactionServiceError('No file payload transmitted for version upload.', 400, 'VALIDATION_FAILED');
    }

    const newVersionNumber = doc.currentVersion + 1;
    const storedFileName = `version_v${newVersionNumber}_${legalDocumentId}_${Date.now()}`;
    const storagePath = `secure/legal/versions/${storedFileName}`;

    return await this.transactionRepository.createDocumentVersion({
      legalDocumentId,
      versionNumber: newVersionNumber,
      storagePath,
      uploadedById: userId || null,
      createdDate: new Date(),
      remarks: remarks ? remarks.trim() : `Uploaded version ${newVersionNumber}`,
      currentVersionFlag: true
    });
  }

  async listDocumentVersions(legalDocumentId) {
    await this.getLegalDocumentDetails(legalDocumentId);
    return await this.transactionRepository.listDocumentVersions(legalDocumentId);
  }
}

export default TransactionService;
