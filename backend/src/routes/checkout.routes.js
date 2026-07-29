import { Router } from 'express';
import { prisma } from '../config/database.js';
import { getIO } from '../config/socket.js';
import { broadcastSystemNotification } from '../utils/notification.util.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All checkout and return routes require authentication
router.use(requireAuth);

router.get('/checkouts', async (req, res) => {
  try {
    const checkouts = await prisma.checkout.findMany({
      orderBy: { id: 'desc' }
    });
    res.status(200).json(checkouts);
  } catch (err) {
    console.error("Error fetching checkouts from PostgreSQL:", err);
    res.status(500).json({ message: "Failed to read checkouts." });
  }
});

router.post('/checkouts', async (req, res) => {
  const body = req.body;
  try {
    let docId = body.documentId;
    let docName = body.documentName;
    let docDbId = body.documentDbId;

    // Lookup in standard documents first
    let stdDoc = await prisma.document.findUnique({ where: { id: docDbId } }).catch(() => null);
    let legalDoc = null;

    if (!stdDoc) {
      // Lookup in legal documents
      legalDoc = await prisma.legalDocument.findUnique({
        where: { id: docDbId },
        include: { custody: true, transaction: true }
      }).catch(() => null);
    }

    if (!stdDoc && !legalDoc) {
      return res.status(404).json({ message: "Target document not found in repository." });
    }

    if (legalDoc) {
      docName = legalDoc.documentName;
      docId = legalDoc.documentNumber || legalDoc.transaction?.transactionNumber || legalDoc.id;
    } else if (stdDoc) {
      docName = stdDoc.documentName;
      docId = stdDoc.documentId;
    }

    const newCheckout = await prisma.checkout.create({
      data: {
        id: `chk-${Date.now()}`,
        documentId: docId,
        documentDbId: docDbId,
        documentName: docName,
        employeeName: body.employeeName,
        employeeId: body.employeeId || 'N/A',
        designation: body.designation || 'Staff',
        checkoutDate: new Date().toISOString().split('T')[0],
        destination: body.destination,
        purpose: body.purpose,
        expectedReturnDate: body.expectedReturnDate,
        approvalAuthority: body.approvalAuthority || "Self Check",
        status: "Checked Out",
        signature: body.signature || '',
        signatureType: body.signatureType || 'typed'
      }
    });

    if (stdDoc) {
      await prisma.document.update({
        where: { id: stdDoc.id },
        data: { status: "Checked Out" }
      });
    }

    if (legalDoc) {
      // Automatically update Legal Document physical custody record
      await prisma.custody.upsert({
        where: { legalDocumentId: legalDoc.id },
        create: {
          legalDocumentId: legalDoc.id,
          custodianName: body.employeeName,
          department: body.destination,
          status: 'CHECKED_OUT',
          receivedDate: new Date(),
          remarks: `Checked out for ${body.purpose}. Expected return: ${body.expectedReturnDate}`
        },
        update: {
          custodianName: body.employeeName,
          department: body.destination,
          status: 'CHECKED_OUT',
          remarks: `Checked out for ${body.purpose}. Expected return: ${body.expectedReturnDate}`
        }
      });
    }

    // Record Audit Trail Notification
    await broadcastSystemNotification(
      "Document Checked Out Alert",
      `${newCheckout.employeeName} checked out document "${newCheckout.documentName}" [Ref: ${newCheckout.documentId}] for ${newCheckout.destination}.`
    );

    res.status(200).json(newCheckout);
  } catch (err) {
    console.error("Error creating checkout in PostgreSQL:", err);
    res.status(500).json({ message: "Failed to perform checkout." });
  }
});

router.post('/checkouts/:id/return', async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  try {
    const checkout = await prisma.checkout.findUnique({ where: { id } });
    if (!checkout) {
      return res.status(404).json({ message: "Checkout record not found." });
    }

    const updatedCheckout = await prisma.checkout.update({
      where: { id },
      data: { status: "Returned" }
    });

    // Try updating standard document status
    const stdDoc = await prisma.document.findUnique({ where: { id: checkout.documentDbId } }).catch(() => null);
    if (stdDoc) {
      await prisma.document.update({
        where: { id: checkout.documentDbId },
        data: { status: "Available" }
      });
    }

    // Try updating legal document status & physical custody
    const legalDoc = await prisma.legalDocument.findUnique({ where: { id: checkout.documentDbId } }).catch(() => null);
    if (legalDoc) {
      await prisma.legalDocument.update({
        where: { id: checkout.documentDbId },
        data: { status: "ACTIVE" }
      });

      await prisma.custody.upsert({
        where: { legalDocumentId: checkout.documentDbId },
        create: {
          legalDocumentId: checkout.documentDbId,
          custodianName: body.returningEmployeeName || "Safe Custody Officer",
          status: "IN_SAFE",
          returnedDate: new Date(),
          remarks: `Returned by ${body.returningEmployeeName}. Condition: ${body.condition || 'Perfect'}. Notes: ${body.notes || 'None'}`
        },
        update: {
          status: "IN_SAFE",
          returnedDate: new Date(),
          remarks: `Returned by ${body.returningEmployeeName}. Condition: ${body.condition || 'Perfect'}. Notes: ${body.notes || 'None'}`
        }
      });
    }

    await prisma.return.create({
      data: {
        id: `ret-${Date.now()}`,
        checkoutId: checkout.id,
        documentId: checkout.documentId,
        documentName: checkout.documentName,
        returnDate: new Date().toISOString().split('T')[0],
        returnTime: new Date().toLocaleTimeString(),
        condition: body.condition || "Perfect",
        notes: body.notes || "",
        returningEmployeeSignature: body.returningEmployeeSignature,
        returningEmployeeName: body.returningEmployeeName
      }
    });

    // Record Audit Trail Notification
    await broadcastSystemNotification(
      "Document Checked In & Returned",
      `${body.returningEmployeeName} checked in/returned document "${checkout.documentName}". Condition: ${body.condition || 'Perfect'}.`
    );

    res.status(200).json(updatedCheckout);
  } catch (err) {
    console.error("Error executing return in PostgreSQL:", err);
    res.status(500).json({ message: "Failed to perform return." });
  }
});

router.get('/returns', async (req, res) => {
  try {
    const returns = await prisma.return.findMany({
      orderBy: { id: 'desc' }
    });
    res.status(200).json(returns);
  } catch (err) {
    console.error("Error fetching returns from PostgreSQL:", err);
    res.status(500).json({ message: "Failed to read returns." });
  }
});

export default router;
