/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super-admin' | 'admin' | 'others';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  status: 'active' | 'suspended';
  designation?: string;
  mustChangePassword?: boolean;
}

export interface Document {
  id: string;
  documentId: string;
  documentName: string;
  dateUploaded: string;
  expiryDate?: string;
  filePath: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Checked Out' | 'Returned' | 'Archived';
  uploadedBy: string;
  client: string;
  dateOfRegistration: string;
  placeOfHolding: string;
}

export interface Checkout {
  id: string;
  documentId: string; // The custom tracking ID
  documentDbId: string; // The DB UUID
  documentName: string;
  
  // User info
  employeeName: string;
  employeeId: string;
  designation: string;
  
  // Checkout details
  checkoutDate: string;
  destination: string;
  purpose: string;
  expectedReturnDate: string;
  approvalAuthority: string;
  status: 'Checked Out' | 'Pending Return' | 'Returned' | 'Closed';
  signature: string; // Drawn canvas Base64 url OR uploaded signature OR typing hash
  signatureType: 'drawn' | 'uploaded' | 'typed';
}

export interface ReturnRecord {
  id: string;
  checkoutId: string;
  documentId: string;
  documentName: string;
  returnDate: string;
  returnTime: string;
  condition: 'Perfect' | 'Good' | 'Damaged' | 'Missing Pages' | 'Digital Copy Only';
  notes: string;
  returningEmployeeSignature: string; // Base64 signature
  returningEmployeeName: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  userId?: string;
  status: 'unread' | 'read';
  timestamp: string;
}

export interface SecurityPolicy {
  passwordMinLength: number;
  requireMfa: boolean;
  sessionTimeoutMinutes: number;
  allowedUploadFormats: string[];
  autoRejectExpiredCheckouts: boolean;
  maxCheckoutDurationDays: number;
}

// =========================================================================
// Legal Document Management Domain Types
// =========================================================================

export type TransactionStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CLOSED' | 'TERMINATED' | 'PENDING';
export type DocumentStatus = 'DRAFT' | 'ACTIVE' | 'PENDING_REVIEW' | 'VERIFIED' | 'ARCHIVED' | 'SUPERSEDED';
export type PartyType = 'COMPANY' | 'BORROWER' | 'TRUSTEE' | 'GUARANTOR' | 'LENDER' | 'OTHERS';
export type CustodyStatus = 'IN_SAFE' | 'CHECKED_OUT' | 'IN_TRANSIT' | 'RETURNED' | 'MISSING' | 'ARCHIVED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type DocumentType = 'DEED' | 'AGREEMENT' | 'MORTGAGE' | 'GUARANTEE' | 'RESOLUTION' | 'CERTIFICATE' | 'LETTER' | 'UNDERTAKING' | 'OTHERS';

export interface Party {
  id?: string;
  transactionId?: string;
  partyType: PartyType;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  remarks?: string;
}

export interface Signatory {
  id?: string;
  legalDocumentId?: string;
  name: string;
  designation?: string;
  organization?: string;
  signed: boolean;
  signingDate?: string;
  remarks?: string;
}

export interface Custody {
  id?: string;
  legalDocumentId?: string;
  custodianName: string;
  department?: string;
  location?: string;
  originalAvailable: boolean;
  scannedAvailable: boolean;
  numberOfOriginalSets: number;
  receivedDate?: string;
  returnedDate?: string;
  status: CustodyStatus;
  remarks?: string;
}

export interface ScannedDocument {
  id: string;
  legalDocumentId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  pageCount?: number;
  storagePath: string;
  uploadedById?: string;
  uploadedDate: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  verifiedById?: string;
  verifiedDate?: string;
  remarks?: string;
  uploadedBy?: { name: string; email: string };
  verifiedBy?: { name: string; email: string };
}

export interface DocumentAttachment {
  id: string;
  legalDocumentId: string;
  attachmentType?: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  description?: string;
  uploadedById?: string;
  createdDate: string;
  uploadedBy?: { name: string; email: string };
}

export interface DocumentVersion {
  id: string;
  legalDocumentId: string;
  versionNumber: number;
  storagePath?: string;
  uploadedById?: string;
  createdDate: string;
  remarks?: string;
  currentVersionFlag: boolean;
  uploadedBy?: { name: string; email: string };
}

export interface LegalDocument {
  id: string;
  transactionId: string;
  documentType: DocumentType;
  documentName: string;
  documentNumber?: string;
  category?: string;
  description?: string;
  currentVersion: number;
  status: DocumentStatus;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  signatories?: Signatory[];
  custody?: Custody;
  scannedDocuments?: ScannedDocument[];
  attachments?: DocumentAttachment[];
  versions?: DocumentVersion[];
  createdBy?: { name: string; email: string };
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  transactionType: string;
  executionDate?: string;
  executionPlace?: string;
  transactionValue?: number | string;
  currency: string;
  validityStart?: string;
  validityEnd?: string;
  status: TransactionStatus;
  remarks?: string;
  createdById?: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string; email: string };
  updatedBy?: { name: string; email: string };
  parties?: Party[];
  legalDocuments?: LegalDocument[];
}
