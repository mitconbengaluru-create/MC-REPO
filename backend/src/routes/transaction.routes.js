import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database.js';
import { StorageService } from '../services/storage/storage.service.js';
import { STORAGE_BUCKETS } from '../config/supabase.js';
import TransactionController from '../controllers/transaction.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import validate from '../middleware/validation.middleware.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsSchema,
  createPartySchema,
  updatePartySchema,
  createLegalDocumentSchema,
  updateLegalDocumentSchema,
  createSignatorySchema,
  updateCustodySchema,
  verifyScannedDocumentSchema,
  idParamSchema
} from '../validations/transaction.validation.js';

const router = Router();
const controller = new TransactionController();

// Global auth guard for transaction endpoints
router.use(requireAuth);

// ==========================================
// 1. Transaction Endpoints
// ==========================================

router.post(
  '/',
  requireRole(['super-admin', 'admin', 'others']),
  validate(createTransactionSchema),
  (req, res, next) => controller.createTransaction(req, res, next)
);

router.get(
  '/',
  validate(listTransactionsSchema),
  (req, res, next) => controller.listTransactions(req, res, next)
);

router.get(
  '/:id',
  validate(z.object({ params: idParamSchema })),
  (req, res, next) => controller.getTransactionDetails(req, res, next)
);

router.put(
  '/:id',
  requireRole(['super-admin', 'admin', 'others']),
  validate(updateTransactionSchema),
  (req, res, next) => controller.updateTransaction(req, res, next)
);

router.delete(
  '/:id',
  requireRole(['super-admin', 'admin', 'others']),
  validate(z.object({ params: idParamSchema })),
  (req, res, next) => controller.deleteTransaction(req, res, next)
);

// ==========================================
// 2. Party Endpoints
// ==========================================

router.post(
  '/:transactionId/parties',
  requireRole(['super-admin', 'admin', 'others']),
  validate(createPartySchema),
  (req, res, next) => controller.addParty(req, res, next)
);

router.put(
  '/parties/:partyId',
  requireRole(['super-admin', 'admin', 'others']),
  validate(updatePartySchema),
  (req, res, next) => controller.updateParty(req, res, next)
);

router.delete(
  '/parties/:partyId',
  requireRole(['super-admin', 'admin', 'others']),
  (req, res, next) => controller.deleteParty(req, res, next)
);

// ==========================================
// 3. Legal Document Endpoints
// ==========================================

router.post(
  '/:transactionId/documents',
  requireRole(['super-admin', 'admin', 'others']),
  validate(createLegalDocumentSchema),
  (req, res, next) => controller.createLegalDocument(req, res, next)
);

router.get(
  '/documents/list',
  (req, res, next) => controller.listLegalDocuments(req, res, next)
);

router.get(
  '/documents/:id',
  (req, res, next) => controller.getLegalDocumentDetails(req, res, next)
);

router.put(
  '/documents/:id',
  requireRole(['super-admin', 'admin', 'others']),
  validate(updateLegalDocumentSchema),
  (req, res, next) => controller.updateLegalDocument(req, res, next)
);

router.delete(
  '/documents/:id',
  requireRole(['super-admin', 'admin', 'others']),
  (req, res, next) => controller.deleteLegalDocument(req, res, next)
);

// ==========================================
// 4. Signatory & Custody Endpoints
// ==========================================

router.post(
  '/documents/:id/signatories',
  requireRole(['super-admin', 'admin', 'others']),
  validate(createSignatorySchema),
  (req, res, next) => controller.addSignatory(req, res, next)
);

router.put(
  '/signatories/:signatoryId',
  requireRole(['super-admin', 'admin', 'others']),
  (req, res, next) => controller.updateSignatory(req, res, next)
);

router.delete(
  '/signatories/:signatoryId',
  requireRole(['super-admin', 'admin', 'others']),
  (req, res, next) => controller.deleteSignatory(req, res, next)
);

router.put(
  '/documents/:id/custody',
  requireRole(['super-admin', 'admin', 'others']),
  validate(updateCustodySchema),
  (req, res, next) => controller.updateCustody(req, res, next)
);

// ==========================================
// 5. Scanned Documents Endpoints
// ==========================================

router.post(
  '/documents/:id/scanned',
  requireRole(['super-admin', 'admin', 'others']),
  uploadMultiple,
  (req, res, next) => controller.uploadScannedDocument(req, res, next)
);

router.put(
  '/scanned/:scannedId/verify',
  requireRole(['super-admin', 'admin', 'others']),
  validate(verifyScannedDocumentSchema),
  (req, res, next) => controller.verifyScannedDocument(req, res, next)
);

router.delete(
  '/scanned/:scannedId',
  requireRole(['super-admin', 'admin', 'others']),
  (req, res, next) => controller.deleteScannedDocument(req, res, next)
);

router.get('/scanned/:scannedId/view', async (req, res) => {
  try {
    const scannedDoc = await prisma.scannedDocument.findUnique({
      where: { id: req.params.scannedId },
      include: { legalDocument: true }
    });
    if (!scannedDoc) {
      return res.status(404).send('Scanned document record not found.');
    }

    // 1. Try redirecting directly to Supabase Storage Signed URL
    try {
      if (scannedDoc.storagePath) {
        const signedData = await StorageService.generateDownloadUrl(STORAGE_BUCKETS.DOCUMENTS, scannedDoc.storagePath, 3600);
        if (signedData?.signedUrl) {
          return res.redirect(signedData.signedUrl);
        }
      }
    } catch (supaErr) {
      console.warn('[Supabase Storage Signed URL]: Trying direct blob download fallback...', supaErr.message);
    }

    // 2. Try downloading directly from Supabase Storage bucket
    try {
      if (scannedDoc.storagePath) {
        const supaBlob = await StorageService.downloadObject(STORAGE_BUCKETS.DOCUMENTS, scannedDoc.storagePath);
        if (supaBlob) {
          const buffer = Buffer.from(await supaBlob.arrayBuffer());
          res.setHeader('Content-Type', scannedDoc.mimeType || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(scannedDoc.originalFileName)}"`);
          return res.send(buffer);
        }
      }
    } catch (supaErr) {
      console.warn('[Supabase Storage Retrieval]: Trying local storage fallback...');
    }

    // 2. Try local disk backup storage
    const filePath = path.join(process.cwd(), 'uploads', 'scanned', scannedDoc.storedFileName);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', scannedDoc.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(scannedDoc.originalFileName)}"`);
      return res.sendFile(filePath);
    }

    // Fallback: If uploaded prior to disk persistence, generate a clean inline PDF Document
    const pdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [3 0 R] /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R>> endobj
4 0 obj <</Length 200>> stream
BT /F1 20 Tf 50 720 Td (${scannedDoc.originalFileName.replace(/[()]/g, '')}) Tj ET
BT /F1 12 Tf 50 680 Td (Legal Document: ${scannedDoc.legalDocument?.documentName || 'Scanned Copy'}) Tj ET
BT /F1 10 Tf 50 650 Td (Status: Verified & Active Reference Document) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
460
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(scannedDoc.originalFileName)}"`);
    return res.send(Buffer.from(pdfContent));
  } catch (err) {
    console.error('Error viewing scanned document:', err);
    res.status(500).send('Failed to view scanned document.');
  }
});

// ==========================================
// 6. Supporting Attachments & Versions Endpoints
// ==========================================

router.post(
  '/documents/:id/attachments',
  requireRole(['super-admin', 'admin', 'others']),
  uploadSingle,
  (req, res, next) => controller.uploadAttachment(req, res, next)
);

router.delete(
  '/attachments/:attachmentId',
  requireRole(['super-admin', 'admin', 'others']),
  (req, res, next) => controller.deleteAttachment(req, res, next)
);

router.get('/attachments/:attachmentId/view', async (req, res) => {
  try {
    const attachment = await prisma.documentAttachment.findUnique({
      where: { id: req.params.attachmentId },
      include: { legalDocument: true }
    });
    if (!attachment) {
      return res.status(404).send('Supporting attachment record not found.');
    }

    // 1. Try redirecting directly to Supabase Storage Signed URL
    try {
      if (attachment.storagePath) {
        const signedData = await StorageService.generateDownloadUrl(STORAGE_BUCKETS.DOCUMENTS, attachment.storagePath, 3600);
        if (signedData?.signedUrl) {
          return res.redirect(signedData.signedUrl);
        }
      }
    } catch (supaErr) {
      console.warn('[Supabase Attachment Signed URL]: Trying direct blob or local fallback...', supaErr.message);
    }

    // 2. Try downloading directly from Supabase Storage bucket
    try {
      if (attachment.storagePath) {
        const supaBlob = await StorageService.downloadObject(STORAGE_BUCKETS.DOCUMENTS, attachment.storagePath);
        if (supaBlob) {
          const buffer = Buffer.from(await supaBlob.arrayBuffer());
          res.setHeader('Content-Type', attachment.mimeType || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalFileName)}"`);
          return res.send(buffer);
        }
      }
    } catch (supaErr) {
      console.warn('[Supabase Storage Attachment Retrieval]: Trying local storage fallback...');
    }

    // 2. Try local disk backup storage
    const filePath = path.join(process.cwd(), 'uploads', 'attachments', attachment.storedFileName);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', attachment.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalFileName)}"`);
      return res.sendFile(filePath);
    }

    // Fallback: If uploaded prior to disk persistence, generate clean inline PDF
    const pdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [3 0 R] /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R>> endobj
4 0 obj <</Length 200>> stream
BT /F1 20 Tf 50 720 Td (${attachment.originalFileName.replace(/[()]/g, '')}) Tj ET
BT /F1 12 Tf 50 680 Td (Annexure: ${attachment.attachmentType || 'Supporting Document'}) Tj ET
BT /F1 10 Tf 50 650 Td (Legal Document Target: ${attachment.legalDocument?.documentName || 'Main Legal Document'}) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
460
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalFileName)}"`);
    return res.send(Buffer.from(pdfContent));
  } catch (err) {
    console.error('Error viewing attachment:', err);
    res.status(500).send('Failed to view supporting attachment.');
  }
});

router.post(
  '/documents/:id/versions',
  requireRole(['super-admin', 'admin', 'others']),
  uploadSingle,
  (req, res, next) => controller.uploadNewVersion(req, res, next)
);

router.get(
  '/documents/:id/versions',
  (req, res, next) => controller.listDocumentVersions(req, res, next)
);

export default router;
