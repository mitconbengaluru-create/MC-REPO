-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CLOSED', 'TERMINATED', 'PENDING');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PENDING_REVIEW', 'VERIFIED', 'ARCHIVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('COMPANY', 'BORROWER', 'TRUSTEE', 'GUARANTOR', 'LENDER', 'OTHERS');

-- CreateEnum
CREATE TYPE "CustodyStatus" AS ENUM ('IN_SAFE', 'CHECKED_OUT', 'IN_TRANSIT', 'RETURNED', 'MISSING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DEED', 'AGREEMENT', 'MORTGAGE', 'GUARANTEE', 'RESOLUTION', 'CERTIFICATE', 'LETTER', 'UNDERTAKING', 'OTHERS');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "execution_date" TIMESTAMP(3),
    "execution_place" TEXT,
    "transaction_value" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "validity_start" TIMESTAMP(3),
    "validity_end" TIMESTAMP(3),
    "status" "TransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "party_type" "PartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_name" TEXT NOT NULL,
    "document_number" TEXT,
    "category" TEXT,
    "description" TEXT,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatories" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "organization" TEXT,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "signing_date" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signatories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custodies" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "custodian_name" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "original_available" BOOLEAN NOT NULL DEFAULT true,
    "scanned_available" BOOLEAN NOT NULL DEFAULT true,
    "number_of_original_sets" INTEGER NOT NULL DEFAULT 1,
    "received_date" TIMESTAMP(3),
    "returned_date" TIMESTAMP(3),
    "status" "CustodyStatus" NOT NULL DEFAULT 'IN_SAFE',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custodies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scanned_documents" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "stored_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "page_count" INTEGER,
    "storage_path" TEXT NOT NULL,
    "uploaded_by_id" TEXT,
    "uploaded_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by_id" TEXT,
    "verified_date" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scanned_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_attachments" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "attachment_type" TEXT,
    "original_file_name" TEXT NOT NULL,
    "stored_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_by_id" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "storage_path" TEXT,
    "uploaded_by_id" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "current_version_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_number_key" ON "transactions"("transaction_number");
CREATE INDEX "transactions_transaction_number_idx" ON "transactions"("transaction_number");
CREATE INDEX "transactions_execution_date_idx" ON "transactions"("execution_date");

-- CreateIndex
CREATE INDEX "parties_name_idx" ON "parties"("name");
CREATE INDEX "parties_party_type_idx" ON "parties"("party_type");

-- CreateIndex
CREATE INDEX "legal_documents_document_number_idx" ON "legal_documents"("document_number");
CREATE INDEX "legal_documents_status_idx" ON "legal_documents"("status");
CREATE INDEX "legal_documents_document_type_idx" ON "legal_documents"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "custodies_legal_document_id_key" ON "custodies"("legal_document_id");
CREATE INDEX "custodies_custodian_name_idx" ON "custodies"("custodian_name");
CREATE INDEX "custodies_status_idx" ON "custodies"("status");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatories" ADD CONSTRAINT "signatories_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custodies" ADD CONSTRAINT "custodies_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scanned_documents" ADD CONSTRAINT "scanned_documents_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scanned_documents" ADD CONSTRAINT "scanned_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scanned_documents" ADD CONSTRAINT "scanned_documents_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_legal_document_id_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
