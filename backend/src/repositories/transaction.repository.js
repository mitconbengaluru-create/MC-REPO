import { prisma } from '../config/database.js';

/**
 * Repository exception model for Transaction and Legal Document operations.
 */
export class TransactionRepositoryError extends Error {
  constructor(message, code = 'REPOSITORY_ERROR', originalError = null) {
    super(message);
    this.name = 'TransactionRepositoryError';
    this.code = code;
    this.originalError = originalError;
  }
}

function handlePrismaError(err, operationName) {
  console.error(`[TransactionRepository] Error in ${operationName}:`, err);
  if (err.code === 'P2002') {
    const fields = err.meta?.target ? err.meta.target.join(', ') : 'fields';
    throw new TransactionRepositoryError(
      `Unique constraint violation on ${fields}.`,
      'DUPLICATE_RECORD',
      err
    );
  }
  if (err.code === 'P2025') {
    throw new TransactionRepositoryError(
      `Target record for ${operationName} was not found.`,
      'RECORD_NOT_FOUND',
      err
    );
  }
  throw new TransactionRepositoryError(
    `Database error in ${operationName}: ${err.message}`,
    'DATABASE_ERROR',
    err
  );
}

export class TransactionRepository {
  // ==========================================
  // 1. Transaction Operations
  // ==========================================

  async createTransaction(data) {
    try {
      const { parties, ...txData } = data;
      return await prisma.transaction.create({
        data: {
          ...txData,
          parties: parties && parties.length > 0 ? {
            create: parties
          } : undefined
        },
        include: {
          parties: true,
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'createTransaction');
    }
  }

  async findTransactionById(id) {
    try {
      return await prisma.transaction.findUnique({
        where: { id },
        include: {
          parties: true,
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } },
          legalDocuments: {
            include: {
              signatories: true,
              custody: true,
              scannedDocuments: true,
              attachments: true,
              versions: { orderBy: { versionNumber: 'desc' } }
            }
          }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'findTransactionById');
    }
  }

  async findTransactionByNumber(transactionNumber) {
    try {
      return await prisma.transaction.findUnique({
        where: { transactionNumber }
      });
    } catch (err) {
      handlePrismaError(err, 'findTransactionByNumber');
    }
  }

  async listTransactions(params = {}) {
    try {
      const { page = 1, limit = 10, status, transactionType, search } = params;
      const skip = (Number(page) - 1) * Number(limit);

      const where = {};
      if (status) where.status = status;
      if (transactionType) where.transactionType = transactionType;
      if (search) {
        where.OR = [
          { transactionNumber: { contains: search, mode: 'insensitive' } },
          { transactionType: { contains: search, mode: 'insensitive' } },
          { remarks: { contains: search, mode: 'insensitive' } },
          { executionPlace: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [transactions, total] = await prisma.$transaction([
        prisma.transaction.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            parties: {
              select: {
                id: true,
                partyType: true,
                name: true,
                address: true,
                email: true,
                phone: true,
                remarks: true
              }
            },
            createdBy: { select: { id: true, name: true, email: true } },
            updatedBy: { select: { id: true, name: true, email: true } },
            legalDocuments: {
              include: {
                signatories: true,
                custody: true,
                scannedDocuments: {
                  select: {
                    id: true,
                    originalFileName: true,
                    storagePath: true,
                    mimeType: true,
                    fileSize: true,
                    verified: true,
                    verificationStatus: true,
                    uploadedDate: true
                  }
                },
                attachments: {
                  select: {
                    id: true,
                    originalFileName: true,
                    storagePath: true,
                    mimeType: true,
                    fileSize: true,
                    attachmentType: true,
                    description: true
                  }
                },
                versions: {
                  orderBy: { versionNumber: 'desc' },
                  select: {
                    id: true,
                    versionNumber: true,
                    storagePath: true,
                    currentVersionFlag: true,
                    createdDate: true
                  }
                }
              }
            },
            _count: { select: { legalDocuments: true } }
          }
        }),
        prisma.transaction.count({ where })
      ]);

      return { transactions, total };
    } catch (err) {
      handlePrismaError(err, 'listTransactions');
    }
  }



  async updateTransaction(id, data) {
    try {
      return await prisma.transaction.update({
        where: { id },
        data,
        include: {
          parties: true,
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'updateTransaction');
    }
  }

  async deleteTransaction(id) {
    try {
      return await prisma.transaction.delete({ where: { id } });
    } catch (err) {
      handlePrismaError(err, 'deleteTransaction');
    }
  }

  // ==========================================
  // 2. Party Operations
  // ==========================================

  async createParty(data) {
    try {
      return await prisma.party.create({ data });
    } catch (err) {
      handlePrismaError(err, 'createParty');
    }
  }

  async updateParty(id, data) {
    try {
      return await prisma.party.update({ where: { id }, data });
    } catch (err) {
      handlePrismaError(err, 'updateParty');
    }
  }

  async deleteParty(id) {
    try {
      return await prisma.party.delete({ where: { id } });
    } catch (err) {
      handlePrismaError(err, 'deleteParty');
    }
  }

  // ==========================================
  // 3. Legal Document Operations
  // ==========================================

  async createLegalDocument(data) {
    try {
      return await prisma.legalDocument.create({
        data,
        include: {
          signatories: true,
          custody: true,
          scannedDocuments: true,
          attachments: true,
          versions: true
        }
      });
    } catch (err) {
      handlePrismaError(err, 'createLegalDocument');
    }
  }

  async findLegalDocumentById(id) {
    try {
      return await prisma.legalDocument.findUnique({
        where: { id },
        include: {
          transaction: { select: { id: true, transactionNumber: true, transactionType: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          signatories: true,
          custody: true,
          scannedDocuments: true,
          attachments: true,
          versions: { orderBy: { versionNumber: 'desc' } }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'findLegalDocumentById');
    }
  }

  async findLegalDocumentByNumber(documentNumber) {
    try {
      if (!documentNumber) return null;
      return await prisma.legalDocument.findFirst({
        where: { documentNumber }
      });
    } catch (err) {
      handlePrismaError(err, 'findLegalDocumentByNumber');
    }
  }

  async listLegalDocuments(params = {}) {
    try {
      const { page = 1, limit = 10, transactionId, documentType, status, search } = params;
      const skip = (page - 1) * limit;

      const where = {};
      if (transactionId) where.transactionId = transactionId;
      if (documentType) where.documentType = documentType;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { documentName: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [documents, total] = await prisma.$transaction([
        prisma.legalDocument.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            transaction: { select: { id: true, transactionNumber: true } },
            custody: true,
            _count: { select: { scannedDocuments: true, attachments: true, versions: true } }
          }
        }),
        prisma.legalDocument.count({ where })
      ]);

      return { documents, total };
    } catch (err) {
      handlePrismaError(err, 'listLegalDocuments');
    }
  }

  async updateLegalDocument(id, data) {
    try {
      return await prisma.legalDocument.update({
        where: { id },
        data,
        include: {
          signatories: true,
          custody: true,
          scannedDocuments: true,
          attachments: true,
          versions: true
        }
      });
    } catch (err) {
      handlePrismaError(err, 'updateLegalDocument');
    }
  }

  async deleteLegalDocument(id) {
    try {
      return await prisma.legalDocument.delete({ where: { id } });
    } catch (err) {
      handlePrismaError(err, 'deleteLegalDocument');
    }
  }

  // ==========================================
  // 4. Signatory Operations
  // ==========================================

  async createSignatory(data) {
    try {
      return await prisma.signatory.create({ data });
    } catch (err) {
      handlePrismaError(err, 'createSignatory');
    }
  }

  async updateSignatory(id, data) {
    try {
      return await prisma.signatory.update({ where: { id }, data });
    } catch (err) {
      handlePrismaError(err, 'updateSignatory');
    }
  }

  async deleteSignatory(id) {
    try {
      return await prisma.signatory.delete({ where: { id } });
    } catch (err) {
      handlePrismaError(err, 'deleteSignatory');
    }
  }

  // ==========================================
  // 5. Custody Operations
  // ==========================================

  async upsertCustody(legalDocumentId, data) {
    try {
      return await prisma.custody.upsert({
        where: { legalDocumentId },
        create: { ...data, legalDocumentId },
        update: data
      });
    } catch (err) {
      handlePrismaError(err, 'upsertCustody');
    }
  }

  async findCustodyByLegalDocumentId(legalDocumentId) {
    try {
      return await prisma.custody.findUnique({
        where: { legalDocumentId }
      });
    } catch (err) {
      handlePrismaError(err, 'findCustodyByLegalDocumentId');
    }
  }

  // ==========================================
  // 6. Scanned Document Operations
  // ==========================================

  async createScannedDocument(data) {
    try {
      return await prisma.scannedDocument.create({
        data,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'createScannedDocument');
    }
  }

  async findScannedDocumentById(id) {
    try {
      return await prisma.scannedDocument.findUnique({
        where: { id },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          verifiedBy: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'findScannedDocumentById');
    }
  }

  async updateScannedDocumentVerification(id, verificationStatus, verifiedById, remarks) {
    try {
      const verified = verificationStatus === 'VERIFIED';
      return await prisma.scannedDocument.update({
        where: { id },
        data: {
          verificationStatus,
          verified,
          verifiedById,
          verifiedDate: new Date(),
          remarks: remarks || undefined
        }
      });
    } catch (err) {
      handlePrismaError(err, 'updateScannedDocumentVerification');
    }
  }

  async deleteScannedDocument(id) {
    try {
      return await prisma.scannedDocument.delete({ where: { id } });
    } catch (err) {
      handlePrismaError(err, 'deleteScannedDocument');
    }
  }

  // ==========================================
  // 7. Document Attachment Operations
  // ==========================================

  async createAttachment(data) {
    try {
      return await prisma.documentAttachment.create({
        data,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'createAttachment');
    }
  }

  async findAttachmentById(id) {
    try {
      return await prisma.documentAttachment.findUnique({
        where: { id }
      });
    } catch (err) {
      handlePrismaError(err, 'findAttachmentById');
    }
  }

  async deleteAttachment(id) {
    try {
      return await prisma.documentAttachment.delete({ where: { id } });
    } catch (err) {
      handlePrismaError(err, 'deleteAttachment');
    }
  }

  // ==========================================
  // 8. Document Version Operations
  // ==========================================

  async createDocumentVersion(data) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Reset current version flags for this legal document if new version is marked current
        if (data.currentVersionFlag) {
          await tx.documentVersion.updateMany({
            where: { legalDocumentId: data.legalDocumentId },
            data: { currentVersionFlag: false }
          });
        }

        const newVersion = await tx.documentVersion.create({ data });

        // Update current version count on LegalDocument
        await tx.legalDocument.update({
          where: { id: data.legalDocumentId },
          data: { currentVersion: data.versionNumber }
        });

        return newVersion;
      });
    } catch (err) {
      handlePrismaError(err, 'createDocumentVersion');
    }
  }

  async listDocumentVersions(legalDocumentId) {
    try {
      return await prisma.documentVersion.findMany({
        where: { legalDocumentId },
        orderBy: { versionNumber: 'desc' },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (err) {
      handlePrismaError(err, 'listDocumentVersions');
    }
  }

  async findDocumentVersionById(id) {
    try {
      return await prisma.documentVersion.findUnique({
        where: { id }
      });
    } catch (err) {
      handlePrismaError(err, 'findDocumentVersionById');
    }
  }
}

export default TransactionRepository;
