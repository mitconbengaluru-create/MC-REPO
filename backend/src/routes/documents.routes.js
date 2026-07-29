import { Router } from 'express';
import { prisma } from '../config/database.js';
import { getIO } from '../config/socket.js';
import { broadcastSystemNotification } from '../utils/notification.util.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import crypto from 'crypto';
import { initialDocuments } from '../config/initialDocuments.js';

const router = Router();

// All document routes require authentication
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const documents = await prisma.document.findMany();
    res.status(200).json(documents);
  } catch (err) {
    console.error("Error reading documents from PostgreSQL:", err);
    res.status(500).json({ message: "Failed to read documents." });
  }
});

router.get('/:id/view', async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${doc.documentName} - MITCON Credentia Core Vault</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
        .container { max-width: 800px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .header { border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: 800; color: #f59e0b; letter-spacing: 1px; }
        .badge { background: #10b981; color: #064e3b; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
        h1 { font-size: 22px; color: #ffffff; margin-top: 0; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin: 30px 0; background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
        .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .val { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-top: 4px; }
        .security-stamp { margin-top: 40px; border-top: 1px dashed #475569; padding-top: 20px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MITCON CREDENTIA</div>
          <div class="badge">VERIFIED VAULT RECORD</div>
        </div>
        <h1>${doc.documentName}</h1>
        <p style="color: #94a3b8; font-size: 13px;">Official Registered Repository Asset Profile</p>
        
        <div class="grid">
          <div><div class="label">Document ID</div><div class="val" style="font-family: monospace;">${doc.documentId}</div></div>
          <div><div class="label">Client / Entity</div><div class="val">${doc.client}</div></div>
          <div><div class="label">Registration Date</div><div class="val">${doc.dateOfRegistration}</div></div>
          <div><div class="label">Vault Location</div><div class="val">${doc.placeOfHolding}</div></div>
          <div><div class="label">Status</div><div class="val" style="color: #34d399;">${doc.status}</div></div>
          <div><div class="label">Registered By</div><div class="val">${doc.uploadedBy}</div></div>
        </div>

        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-top: 30px;">
          <p style="color: #fbbf24; font-size: 13px; font-weight: 600; margin: 0;">🔒 Physical Document Secured in Vault</p>
          <p style="color: #cbd5e1; font-size: 12px; margin-top: 6px;">Original set is preserved in safe custody under ref #${doc.id}. Digital tracking active.</p>
        </div>

        <div class="security-stamp">
          <div>System Identifier: ${doc.id}</div>
          <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
        </div>
      </div>
    </body>
    </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to load document view." });
  }
});

router.post('/', async (req, res) => {
  const doc = req.body;

  if (!doc.client || !doc.client.trim()) {
    return res.status(400).json({ message: "Client name is required." });
  }
  if (!doc.documentName || !doc.documentName.trim()) {
    return res.status(400).json({ message: "Document Name is required." });
  }
  if (!doc.dateOfRegistration || !doc.dateOfRegistration.trim()) {
    return res.status(400).json({ message: "Date of registration is required." });
  }
  if (!doc.placeOfHolding || !doc.placeOfHolding.trim()) {
    return res.status(400).json({ message: "Place of document holding is required." });
  }

  try {
    const newDocId = `doc-${Date.now()}`;
    const newDoc = await prisma.document.create({
      data: {
        id: newDocId,
        documentId: crypto.randomUUID(), // unique id assigned on random
        documentName: doc.documentName.trim(),
        dateUploaded: new Date(),
        expiryDate: doc.expiryDate || null,
        filePath: `secure/repository/${newDocId}.pdf`,
        status: "Available",
        uploadedBy: doc.uploadedBy || "System",
        client: doc.client.trim(),
        dateOfRegistration: doc.dateOfRegistration.trim(),
        placeOfHolding: doc.placeOfHolding.trim()
      }
    });

    // Notify all users
    await broadcastSystemNotification(
      "Document Registered & Uploaded",
      `${newDoc.uploadedBy} registered new document "${newDoc.documentName}" for ${newDoc.client}.`
    );

    res.status(200).json(newDoc);
  } catch (err) {
    console.error("Error creating document in PostgreSQL:", err);
    if (err.code === 'P2002') {
      return res.status(400).json({ message: "A document with this randomly assigned ID already exists (collision). Please try again." });
    }
    res.status(500).json({ message: err.message || "Failed to create document record." });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return res.status(404).json({ message: "Document not found." });
    }

    await prisma.document.delete({ where: { id } });

    await broadcastSystemNotification(
      "Document Deleted",
      `Document "${doc.documentName}" [Ref: ${doc.documentId}] was permanently deleted.`
    );

    res.sendStatus(204);
  } catch (err) {
    console.error("Error deleting document from PostgreSQL:", err);
    res.status(500).json({ message: "Failed to delete document." });
  }
});

router.post('/restore-seed', async (req, res) => {
  try {
    await prisma.document.deleteMany();

    for (const d of initialDocuments) {
      await prisma.document.create({
        data: {
          id: d.id,
          documentId: crypto.randomUUID(),
          documentName: d.documentName,
          dateUploaded: new Date(),
          expiryDate: null,
          filePath: `secure/repository/${d.id}.pdf`,
          status: "Available",
          uploadedBy: "System",
          client: d.client,
          dateOfRegistration: d.dateOfRegistration,
          placeOfHolding: "Bengaluru Office"
        }
      });
    }

    res.status(200).json({ message: "Seed documents successfully restored." });
  } catch (err) {
    console.error("Error restoring documents seed in PostgreSQL:", err);
    res.status(500).json({ message: "Failed to restore seed." });
  }
});

export default router;
