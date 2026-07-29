import { prisma } from '../config/database.js';
import crypto from 'crypto';

/**
 * Standardized repository error class for Document Domain operations.
 */
export class DocumentRepositoryError extends Error {
  constructor(message, code = 'REPOSITORY_ERROR', originalError = null) {
    super(message);
    this.name = 'DocumentRepositoryError';
    this.code = code;
    this.originalError = originalError;
  }
}

function handlePrismaError(err, operationName) {
  console.error(`[DocumentRepository] Error in ${operationName}:`, err);
  if (err.code === 'P2002') {
    throw new DocumentRepositoryError(
      `Unique constraint violation in ${operationName}.`,
      'DUPLICATE_RECORD',
      err
    );
  }
  if (err.code === 'P2025') {
    throw new DocumentRepositoryError(
      `Target record for ${operationName} was not found.`,
      'RECORD_NOT_FOUND',
      err
    );
  }
  throw new DocumentRepositoryError(
    `Database error occurred during ${operationName}: ${err.message}`,
    'DATABASE_ERROR',
    err
  );
}

export class DocumentRepository {
  async create(data) {
    try {
      const id = data.id || `doc-${Date.now()}`;
      return await prisma.document.create({
        data: {
          id,
          documentId: data.documentId || crypto.randomUUID(),
          documentName: data.documentName || data.name || 'Untitled Document',
          dateUploaded: data.dateUploaded ? new Date(data.dateUploaded) : new Date(),
          expiryDate: data.expiryDate || null,
          filePath: data.filePath || `secure/repository/${id}.pdf`,
          status: data.status || 'Available',
          uploadedBy: data.uploadedBy || 'System',
          client: data.client || 'General',
          dateOfRegistration: data.dateOfRegistration || new Date().toISOString().split('T')[0],
          placeOfHolding: data.placeOfHolding || 'Main Safe Vault'
        }
      });
    } catch (err) {
      handlePrismaError(err, 'create');
    }
  }

  async update(id, data) {
    try {
      return await prisma.document.update({
        where: { id },
        data
      });
    } catch (err) {
      handlePrismaError(err, 'update');
    }
  }

  async findById(id) {
    try {
      return await prisma.document.findUnique({
        where: { id }
      });
    } catch (err) {
      handlePrismaError(err, 'findById');
    }
  }

  async findMany(params = {}) {
    try {
      return await prisma.document.findMany({
        orderBy: { dateUploaded: 'desc' }
      });
    } catch (err) {
      handlePrismaError(err, 'findMany');
    }
  }

  async delete(id) {
    try {
      return await prisma.document.delete({
        where: { id }
      });
    } catch (err) {
      handlePrismaError(err, 'delete');
    }
  }
}

export default DocumentRepository;
