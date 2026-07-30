import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function purgeAllDocuments() {
  console.log('🚀 Starting complete purge of uploaded documents and transaction records...');

  try {
    // 1. Delete dependent tables
    console.log('Clearing Document Versions...');
    await prisma.documentVersion.deleteMany({});

    console.log('Clearing Supporting Attachments...');
    await prisma.documentAttachment.deleteMany({});

    console.log('Clearing Scanned Documents...');
    await prisma.scannedDocument.deleteMany({});

    console.log('Clearing Custody Records...');
    await prisma.custody.deleteMany({});

    console.log('Clearing Signatories...');
    await prisma.signatory.deleteMany({});

    console.log('Clearing Transaction Parties...');
    await prisma.party.deleteMany({});

    console.log('Clearing Legal Documents...');
    await prisma.legalDocument.deleteMany({});

    console.log('Clearing Transactions...');
    await prisma.transaction.deleteMany({});

    console.log('Clearing Return Logs...');
    await prisma.return.deleteMany({});

    console.log('Clearing Checkout Logs...');
    await prisma.checkout.deleteMany({});

    console.log('Clearing Repository Documents...');
    await prisma.document.deleteMany({});

    console.log('✅ PostgreSQL database document tables purged successfully.');

    // 2. Clear local data-store.json if present
    const dataStorePath = path.join(process.cwd(), 'src', 'data-store.json');
    if (fs.existsSync(dataStorePath)) {
      try {
        const raw = fs.readFileSync(dataStorePath, 'utf8');
        const data = JSON.parse(raw);
        data.documents = [];
        data.checkouts = [];
        data.returns = [];
        fs.writeFileSync(dataStorePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ Local data-store.json document records cleared.');
      } catch (storeErr) {
        console.warn('Warning updating data-store.json:', storeErr.message);
      }
    }

    console.log('🎉 Database is fresh, clean, and ready for new document uploads!');
  } catch (err) {
    console.error('❌ Failed to purge documents:', err);
  } finally {
    await prisma.$disconnect();
  }
}

purgeAllDocuments();
