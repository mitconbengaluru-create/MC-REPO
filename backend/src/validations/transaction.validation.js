import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().uuid('ID parameter must be a valid UUID format.')
});

export const transactionIdParamSchema = z.object({
  transactionId: z.string().uuid('Transaction ID parameter must be a valid UUID format.')
});

export const legalDocumentIdParamSchema = z.object({
  legalDocumentId: z.string().uuid('Legal Document ID parameter must be a valid UUID format.')
});

export const partyTypeEnum = z.enum(['COMPANY', 'BORROWER', 'TRUSTEE', 'GUARANTOR', 'LENDER', 'OTHERS']);
export const transactionStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'CLOSED', 'TERMINATED', 'PENDING']);
export const documentStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PENDING_REVIEW', 'VERIFIED', 'ARCHIVED', 'SUPERSEDED']);
export const custodyStatusEnum = z.enum(['IN_SAFE', 'CHECKED_OUT', 'IN_TRANSIT', 'RETURNED', 'MISSING', 'ARCHIVED']);
export const verificationStatusEnum = z.enum(['PENDING', 'VERIFIED', 'REJECTED']);
export const documentTypeEnum = z.enum(['DEED', 'AGREEMENT', 'MORTGAGE', 'GUARANTEE', 'RESOLUTION', 'CERTIFICATE', 'LETTER', 'UNDERTAKING', 'OTHERS']);

// Party input schema
export const partySchema = z.object({
  partyType: partyTypeEnum,
  name: z.string().trim().min(1, 'Party name is required.').max(255),
  address: z.string().trim().max(500).optional(),
  email: z.string().trim().email('Invalid email address format.').optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional(),
  remarks: z.string().trim().max(1000).optional()
});

export const createPartySchema = z.object({
  params: transactionIdParamSchema,
  body: partySchema
});

export const updatePartySchema = z.object({
  params: z.object({ partyId: z.string().uuid('Party ID must be a valid UUID.') }),
  body: partySchema.partial()
});

// Create Transaction Schema
export const createTransactionSchema = z.object({
  body: z.object({
    transactionNumber: z.string().trim().max(100).optional().or(z.literal('')),
    transactionType: z.string().trim().max(100).optional().or(z.literal('')),
    executionDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).nullable().optional(),
    executionPlace: z.string().trim().max(255).nullable().optional(),
    transactionValue: z.union([z.number(), z.string()]).nullable().optional(),
    currency: z.string().trim().max(10).default('INR'),
    validityStart: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).nullable().optional(),
    validityEnd: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).nullable().optional(),
    status: transactionStatusEnum.default('DRAFT'),
    remarks: z.string().trim().max(2000).nullable().optional(),
    parties: z.array(partySchema).optional()
  })
});

// Update Transaction Schema
export const updateTransactionSchema = z.object({
  params: idParamSchema,
  body: z.object({
    transactionNumber: z.string().trim().min(1).max(100).optional(),
    transactionType: z.string().trim().min(1).max(100).optional(),
    executionDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).nullable().optional(),
    executionPlace: z.string().trim().max(255).nullable().optional(),
    transactionValue: z.union([z.number(), z.string()]).nullable().optional(),
    currency: z.string().trim().max(10).optional(),
    validityStart: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).nullable().optional(),
    validityEnd: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).nullable().optional(),
    status: transactionStatusEnum.optional(),
    remarks: z.string().trim().max(2000).nullable().optional()
  })
});

// List Transactions Schema
export const listTransactionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: transactionStatusEnum.optional(),
    transactionType: z.string().trim().optional(),
    search: z.string().trim().optional()
  }).optional()
});

// Create Legal Document Schema
export const createLegalDocumentSchema = z.object({
  body: z.object({
    documentType: documentTypeEnum,
    documentName: z.string().trim().min(1, 'Document name is required.').max(255),
    documentNumber: z.string().trim().max(100).nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    status: documentStatusEnum.default('DRAFT'),
    custodianName: z.string().trim().max(255).nullable().optional(),
    department: z.string().trim().max(255).nullable().optional(),
    location: z.string().trim().max(255).nullable().optional(),
    originalAvailable: z.boolean().default(true),
    numberOfOriginalSets: z.coerce.number().int().min(0).default(1),
    receivedDate: z.string().nullable().optional(),
    custodyStatus: custodyStatusEnum.default('IN_SAFE')
  })
});

// Update Legal Document Schema
export const updateLegalDocumentSchema = z.object({
  params: idParamSchema,
  body: z.object({
    documentType: documentTypeEnum.optional(),
    documentName: z.string().trim().min(1).max(255).optional(),
    documentNumber: z.string().trim().max(100).nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    status: documentStatusEnum.optional()
  })
});

// Signatory Schema
export const createSignatorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Signatory name is required.').max(255),
    designation: z.string().trim().max(255).optional(),
    organization: z.string().trim().max(255).optional(),
    signed: z.boolean().default(false),
    signingDate: z.string().optional(),
    remarks: z.string().trim().max(1000).optional()
  })
});

// Custody Schema
export const updateCustodySchema = z.object({
  body: z.object({
    custodianName: z.string().trim().min(1, 'Custodian name is required.').max(255),
    department: z.string().trim().max(255).optional(),
    location: z.string().trim().max(255).optional(),
    originalAvailable: z.boolean().optional(),
    scannedAvailable: z.boolean().optional(),
    numberOfOriginalSets: z.coerce.number().int().min(0).optional(),
    receivedDate: z.string().optional(),
    returnedDate: z.string().optional(),
    status: custodyStatusEnum.optional(),
    remarks: z.string().trim().max(1000).optional()
  })
});

// Verification Schema
export const verifyScannedDocumentSchema = z.object({
  body: z.object({
    verificationStatus: verificationStatusEnum,
    remarks: z.string().trim().max(1000).optional()
  })
});
