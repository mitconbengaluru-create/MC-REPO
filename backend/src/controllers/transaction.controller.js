import TransactionService from '../services/transaction.service.js';
import { broadcastSystemNotification } from '../utils/notification.util.js';

const transactionService = new TransactionService();

export class TransactionController {
  // ==========================================
  // 1. Transaction Handlers
  // ==========================================

  async createTransaction(req, res, next) {
    try {
      const userId = req.user?.id;
      const result = await transactionService.createTransaction(req.body, userId);
      
      await broadcastSystemNotification(
        "Legal Transaction Registered",
        `New transaction "${result.transactionType || 'Legal Transaction'}" [Ref: ${result.transactionNumber}] was registered.`
      );

      res.status(201).json({
        success: true,
        message: 'Legal transaction registered successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getTransactionDetails(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transactionService.getTransactionDetails(id);
      res.status(200).json({
        success: true,
        message: 'Transaction details retrieved successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async listTransactions(req, res, next) {
    try {
      const result = await transactionService.listTransactions(req.query);
      res.status(200).json({
        success: true,
        message: 'Transactions listed successfully.',
        data: result.transactions,
        meta: {
          total: result.total,
          page: Number(req.query?.page || 1),
          limit: Number(req.query?.limit || 10)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await transactionService.updateTransaction(id, req.body, userId);
      res.status(200).json({
        success: true,
        message: 'Transaction updated successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const reason = req.headers['x-deletion-reason'] || req.body?.reason || '';
      const userId = req.user?.id;
      await transactionService.deleteTransaction(id, reason, userId);

      await broadcastSystemNotification(
        "Legal Transaction Deleted",
        `Legal transaction [ID: ${id}] was deleted from repository.`
      );

      res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 2. Party Handlers
  // ==========================================

  async addParty(req, res, next) {
    try {
      const { transactionId } = req.params;
      const result = await transactionService.addParty(transactionId, req.body);
      res.status(201).json({
        success: true,
        message: 'Party added to transaction successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async updateParty(req, res, next) {
    try {
      const { partyId } = req.params;
      const result = await transactionService.updateParty(partyId, req.body);
      res.status(200).json({
        success: true,
        message: 'Party details updated successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteParty(req, res, next) {
    try {
      const { partyId } = req.params;
      await transactionService.deleteParty(partyId);
      res.status(200).json({
        success: true,
        message: 'Party removed successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 3. Legal Document Handlers
  // ==========================================

  async createLegalDocument(req, res, next) {
    try {
      const { transactionId } = req.params;
      const userId = req.user?.id;
      const result = await transactionService.createLegalDocument(transactionId, req.body, userId);
      
      await broadcastSystemNotification(
        "Legal Document Registered",
        `New document "${result.documentName}" [Ref: ${result.documentNumber || result.id}] was registered.`
      );

      res.status(201).json({
        success: true,
        message: 'Legal document registered successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getLegalDocumentDetails(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transactionService.getLegalDocumentDetails(id);
      res.status(200).json({
        success: true,
        message: 'Legal document details retrieved successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async listLegalDocuments(req, res, next) {
    try {
      const result = await transactionService.listLegalDocuments(req.query);
      res.status(200).json({
        success: true,
        message: 'Legal documents listed successfully.',
        data: result.documents,
        meta: {
          total: result.total,
          page: Number(req.query?.page || 1),
          limit: Number(req.query?.limit || 10)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLegalDocument(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transactionService.updateLegalDocument(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Legal document metadata updated successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteLegalDocument(req, res, next) {
    try {
      const { id } = req.params;
      await transactionService.deleteLegalDocument(id);

      await broadcastSystemNotification(
        "Legal Document Deleted",
        `Legal document [ID: ${id}] was deleted from repository vault.`
      );

      res.status(200).json({
        success: true,
        message: 'Legal document deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 4. Signatory & Custody Handlers
  // ==========================================

  async addSignatory(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transactionService.addSignatory(id, req.body);
      res.status(201).json({
        success: true,
        message: 'Signatory added successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSignatory(req, res, next) {
    try {
      const { signatoryId } = req.params;
      const result = await transactionService.updateSignatory(signatoryId, req.body);
      res.status(200).json({
        success: true,
        message: 'Signatory updated successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSignatory(req, res, next) {
    try {
      const { signatoryId } = req.params;
      await transactionService.deleteSignatory(signatoryId);
      res.status(200).json({
        success: true,
        message: 'Signatory removed successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCustody(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transactionService.updateCustody(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Custody information updated successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 5. Scanned Documents Upload & Verification
  // ==========================================

  async uploadScannedDocument(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (req.file) {
        const result = await transactionService.uploadScannedDocument(id, req.file, userId, req.body?.remarks);
        return res.status(201).json({
          success: true,
          message: 'Scanned document uploaded successfully.',
          data: result
        });
      }

      if (req.files && req.files.length > 0) {
        const results = [];
        for (const file of req.files) {
          const result = await transactionService.uploadScannedDocument(id, file, userId, req.body?.remarks);
          results.push(result);
        }
        return res.status(201).json({
          success: true,
          message: `${results.length} scanned documents uploaded successfully.`,
          data: results
        });
      }

      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'No file payload was transmitted.' }
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyScannedDocument(req, res, next) {
    try {
      const { scannedId } = req.params;
      const userId = req.user?.id;
      const { verificationStatus, remarks } = req.body;
      const result = await transactionService.verifyScannedDocument(scannedId, verificationStatus, userId, remarks);
      res.status(200).json({
        success: true,
        message: `Scanned document status set to ${verificationStatus}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteScannedDocument(req, res, next) {
    try {
      const { scannedId } = req.params;
      await transactionService.deleteScannedDocument(scannedId);
      res.status(200).json({
        success: true,
        message: 'Scanned document removed successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // 6. Supporting Attachments & Versions
  // ==========================================

  async uploadAttachment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { attachmentType, description } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_FAILED', message: 'No file payload was transmitted for attachment.' }
        });
      }

      const result = await transactionService.uploadAttachment(id, req.file, attachmentType, description, userId);
      res.status(201).json({
        success: true,
        message: 'Supporting attachment uploaded successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteAttachment(req, res, next) {
    try {
      const { attachmentId } = req.params;
      await transactionService.deleteAttachment(attachmentId);
      res.status(200).json({
        success: true,
        message: 'Attachment deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  async uploadNewVersion(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { remarks } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_FAILED', message: 'No file payload transmitted for version upload.' }
        });
      }

      const result = await transactionService.uploadNewVersion(id, req.file, userId, remarks);
      res.status(201).json({
        success: true,
        message: 'New document version uploaded successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async listDocumentVersions(req, res, next) {
    try {
      const { id } = req.params;
      const result = await transactionService.listDocumentVersions(id);
      res.status(200).json({
        success: true,
        message: 'Document versions retrieved successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

export default TransactionController;
