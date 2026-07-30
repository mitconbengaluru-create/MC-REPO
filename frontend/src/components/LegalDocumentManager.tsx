import React, { useState, useMemo } from 'react';
import {
  FileText, Shield, Plus, Trash2, Edit3, Eye, Search, Filter, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, FileCheck, Layers, Upload, Download,
  Building, UserCheck, ShieldAlert, ArrowUpDown, ChevronLeft, ChevronRight,
  SlidersHorizontal, X, Calendar, MapPin, DollarSign,
  FileCode, Paperclip, ExternalLink, ShieldCheck, Tag, Info
} from 'lucide-react';
import {
  User, Transaction, LegalDocument, Party, Signatory, Custody, ScannedDocument,
  DocumentAttachment, PartyType, DocumentType, TransactionStatus, DocumentStatus,
  CustodyStatus, VerificationStatus
} from '../types';

interface LegalDocumentManagerProps {
  transactions: Transaction[];
  currentUser: User;
  onRefresh: () => void;
}

export interface LegalDocFormEntry {
  docName: string;
  docType: DocumentType;
  docNumber: string;
  docCategory: string;
  docDescription: string;
  docStatus: DocumentStatus;
  custodianName: string;
  department: string;
  location: string;
  originalAvailable: boolean;
  numberOfOriginalSets: number;
  receivedDate: string;
  custodyStatus: CustodyStatus;
}

export default function LegalDocumentManager({
  transactions,
  currentUser,
  onRefresh,
}: LegalDocumentManagerProps) {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [custodyFilter, setCustodyFilter] = useState<string>('ALL');
  const [scanFilter, setScanFilter] = useState<string>('ALL');
  const [expiringFilter, setExpiringFilter] = useState<boolean>(false);

  const resetFilters = () => {
    setCompanyFilter('ALL');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCustodyFilter('ALL');
    setScanFilter('ALL');
    setExpiringFilter(false);
  };

  // Derive unique company names for quick keyword filter dropdown
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      tx.parties?.forEach(p => {
        if (p.name?.trim()) set.add(p.name.trim());
      });
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Sorting and Pagination
  const [sortField, setSortField] = useState<string>('documentName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    documentName: true,
    company: true,
    documentNumber: true,
    documentType: true,
    transactionNumber: true,
    borrower: true,
    trustee: true,
    status: true,
    custodian: true,
    originalAvailable: true,
    scanAvailable: true,
    lastUpdated: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // Modal States
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'tx' | 'parties' | 'docs' | 'signatories' | 'custody' | 'scans' | 'attachments'>('tx');

  // Deletion Modal State
  const [deleteTargetTx, setDeleteTargetTx] = useState<{ id: string; txNumber: string; docName: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    transactionNumber: string;
    transactionType: string;
    executionDate: string;
    executionPlace: string;
    transactionValue: string;
    currency: string;
    validityStart: string;
    validityEnd: string;
    status: TransactionStatus;
    remarks: string;
    parties: Party[];
    legalDocuments: LegalDocFormEntry[];
    docName: string;
    docType: DocumentType;
    docNumber: string;
    docCategory: string;
    docDescription: string;
    docStatus: DocumentStatus;
    signatories: Signatory[];
    custodianName: string;
    department: string;
    location: string;
    originalAvailable: boolean;
    scannedAvailable: boolean;
    numberOfOriginalSets: number;
    receivedDate: string;
    returnedDate: string;
    custodyStatus: CustodyStatus;
    custodyRemarks: string;
  }>({
    transactionNumber: '',
    transactionType: 'Facility Agreement',
    executionDate: new Date().toISOString().split('T')[0],
    executionPlace: 'Mumbai',
    transactionValue: '',
    currency: 'INR',
    validityStart: new Date().toISOString().split('T')[0],
    validityEnd: '',
    status: 'ACTIVE',
    remarks: '',
    parties: [
      { partyType: 'COMPANY', name: '', address: '', email: '', phone: '', remarks: '' },
    ],
    legalDocuments: [
      {
        docName: '',
        docType: 'AGREEMENT',
        docNumber: '',
        docCategory: 'Credit Documentation',
        docDescription: 'Original executed document set',
        docStatus: 'ACTIVE',
        custodianName: currentUser.name || 'Safe Custody Officer',
        department: 'Legal & Secretarial',
        location: 'Main Safe Vault, Level 2',
        originalAvailable: true,
        numberOfOriginalSets: 1,
        receivedDate: new Date().toISOString().split('T')[0],
        custodyStatus: 'IN_SAFE'
      }
    ],
    docName: '',
    docType: 'AGREEMENT',
    docNumber: '',
    docCategory: 'Credit Documentation',
    docDescription: '',
    docStatus: 'ACTIVE',
    signatories: [],
    custodianName: currentUser.name || 'Safe Custody Officer',
    department: 'Legal & Secretarial',
    location: 'Main Safe Vault, Level 2',
    originalAvailable: true,
    scannedAvailable: false,
    numberOfOriginalSets: 1,
    receivedDate: new Date().toISOString().split('T')[0],
    returnedDate: '',
    custodyStatus: 'IN_SAFE',
    custodyRemarks: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [scannedFilesMap, setScannedFilesMap] = useState<Record<number, File[]>>({});
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  // RBAC Permission Check
  const canModify = currentUser.role === 'super-admin' || currentUser.role === 'admin' || currentUser.role === 'others';

  // Computed Dashboard Metrics
  const metrics = useMemo(() => {
    let totalDocsCount = 0;
    let activeDocsCount = 0;
    let inCustodyCount = 0;
    let withoutScanCount = 0;
    let expiringCount = 0;

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const tx of transactions) {
      if (tx.validityEnd) {
        const vEnd = new Date(tx.validityEnd);
        if (vEnd >= now && vEnd <= thirtyDays) expiringCount++;
      }

      if (tx.legalDocuments && tx.legalDocuments.length > 0) {
        for (const doc of tx.legalDocuments) {
          totalDocsCount++;
          if (doc.status === 'ACTIVE' || doc.status === 'VERIFIED') activeDocsCount++;
          if (doc.custody?.status === 'IN_SAFE') inCustodyCount++;
          if (!doc.scannedDocuments || doc.scannedDocuments.length === 0) withoutScanCount++;
        }
      } else {
        totalDocsCount++;
        if (tx.status === 'ACTIVE') activeDocsCount++;
        withoutScanCount++;
      }
    }

    return {
      totalTransactions: transactions.length,
      totalDocs: totalDocsCount,
      activeDocs: activeDocsCount,
      inCustody: inCustodyCount,
      withoutScan: withoutScanCount,
      expiring: expiringCount,
    };
  }, [transactions]);

  // Flattened Data Rows for Enterprise Table
  const tableRows = useMemo(() => {
    const rows: Array<{
      tx: Transaction;
      doc?: LegalDocument;
      id: string;
      transactionNumber: string;
      documentNumber: string;
      documentName: string;
      documentType: string;
      company: string;
      borrower: string;
      trustee: string;
      status: string;
      custodian: string;
      custodyStatus: string;
      originalAvailable: boolean;
      scanAvailable: boolean;
      isExpiring: boolean;
      lastUpdated: string;
    }> = [];

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const tx of transactions) {
      const company = tx.parties?.find((p) => p.partyType === 'COMPANY' || p.partyType === 'LENDER')?.name || 'N/A';
      const borrower = tx.parties?.find((p) => p.partyType === 'BORROWER')?.name || 'N/A';
      const trustee = tx.parties?.find((p) => p.partyType === 'TRUSTEE')?.name || 'N/A';
      const isExpiring = tx.validityEnd ? (new Date(tx.validityEnd) >= now && new Date(tx.validityEnd) <= thirtyDays) : false;

      if (tx.legalDocuments && tx.legalDocuments.length > 0) {
        for (const doc of tx.legalDocuments) {
          rows.push({
            tx,
            doc,
            id: `${tx.id}-${doc.id}`,
            transactionNumber: tx.transactionNumber,
            documentNumber: doc.documentNumber || 'N/A',
            documentName: doc.documentName,
            documentType: doc.documentType,
            company,
            borrower,
            trustee,
            status: doc.status,
            custodian: doc.custody?.custodianName || 'N/A',
            custodyStatus: doc.custody?.status || 'IN_SAFE',
            originalAvailable: doc.custody?.originalAvailable ?? true,
            scanAvailable: (doc.scannedDocuments && doc.scannedDocuments.length > 0) || false,
            isExpiring,
            lastUpdated: new Date(doc.updatedAt || tx.updatedAt).toLocaleDateString('en-IN'),
          });
        }
      } else {
        rows.push({
          tx,
          id: tx.id,
          transactionNumber: tx.transactionNumber,
          documentNumber: 'N/A',
          documentName: tx.transactionType,
          documentType: 'AGREEMENT',
          company,
          borrower,
          trustee,
          status: tx.status,
          custodian: 'N/A',
          custodyStatus: 'IN_SAFE',
          originalAvailable: true,
          scanAvailable: false,
          isExpiring,
          lastUpdated: new Date(tx.updatedAt).toLocaleDateString('en-IN'),
        });
      }
    }
    return rows;
  }, [transactions]);

  // Filtered & Sorted Rows
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      // Text search
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        row.transactionNumber.toLowerCase().includes(term) ||
        row.documentName.toLowerCase().includes(term) ||
        row.documentNumber.toLowerCase().includes(term) ||
        row.company.toLowerCase().includes(term) ||
        row.borrower.toLowerCase().includes(term) ||
        row.custodian.toLowerCase().includes(term);

      // Company keyword filter
      const matchesCompany =
        companyFilter === 'ALL' ||
        row.company.toLowerCase().includes(companyFilter.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;

      // Document Type filter
      const matchesType = typeFilter === 'ALL' || row.documentType === typeFilter;

      // Scan availability filter
      const matchesScan =
        scanFilter === 'ALL' ||
        (scanFilter === 'YES' && row.scanAvailable) ||
        (scanFilter === 'NO' && !row.scanAvailable);

      // Custody status filter
      const matchesCustody = custodyFilter === 'ALL' || row.custodyStatus === custodyFilter;

      // Expiring filter
      const matchesExpiring = !expiringFilter || row.isExpiring;

      return matchesSearch && matchesCompany && matchesStatus && matchesType && matchesScan && matchesCustody && matchesExpiring;
    }).sort((a, b) => {
      let valA: any = (a as any)[sortField] || '';
      let valB: any = (b as any)[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableRows, searchTerm, companyFilter, statusFilter, typeFilter, scanFilter, custodyFilter, expiringFilter, sortField, sortDirection]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;



  // Reset Form
  const resetForm = () => {
    setFormData({
      transactionNumber: `TX-${Date.now().toString().slice(-6)}`,
      transactionType: 'Facility Agreement',
      executionDate: new Date().toISOString().split('T')[0],
      executionPlace: 'Mumbai',
      transactionValue: '50000000',
      currency: 'INR',
      validityStart: new Date().toISOString().split('T')[0],
      validityEnd: '',
      status: 'ACTIVE',
      remarks: '',
      parties: [
        { partyType: 'COMPANY', name: 'MITCON Credentia Trustees', address: 'Mumbai', email: 'corporate@mitconindia.com', phone: '', remarks: '' },
        { partyType: 'BORROWER', name: '', address: '', email: '', phone: '', remarks: '' }
      ],
      legalDocuments: [
        {
          docName: '',
          docType: 'AGREEMENT',
          docNumber: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
          docCategory: 'Credit Agreement',
          docDescription: 'Original executed document set',
          docStatus: 'ACTIVE',
          custodianName: currentUser.name || 'Custody Manager',
          department: 'Legal & Vault Compliance',
          location: 'Vault A, Locker 4',
          originalAvailable: true,
          numberOfOriginalSets: 1,
          receivedDate: new Date().toISOString().split('T')[0],
          custodyStatus: 'IN_SAFE',
        }
      ],
      docName: '',
      docType: 'AGREEMENT',
      docNumber: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
      docCategory: 'Credit Agreement',
      docDescription: 'Original executed document set',
      docStatus: 'ACTIVE',
      signatories: [
        { name: '', designation: 'Authorized Signatory', organization: '', signed: true, signingDate: new Date().toISOString().split('T')[0], remarks: '' }
      ],
      custodianName: currentUser.name || 'Custody Manager',
      department: 'Legal & Vault Compliance',
      location: 'Vault A, Locker 4',
      originalAvailable: true,
      scannedAvailable: false,
      numberOfOriginalSets: 1,
      receivedDate: new Date().toISOString().split('T')[0],
      returnedDate: '',
      custodyStatus: 'IN_SAFE',
      custodyRemarks: '',
    });
    setFormErrors({});
    setUploadFiles([]);
    setScannedFilesMap({});
    setAttachmentFiles([]);
    setIsEditing(false);
    setActiveFormTab('tx');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  // Execute Deletion with Mandatory Reason
  const confirmDeleteTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTargetTx || !deleteReason.trim()) return;

    setIsDeleting(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem("bcd_token");
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/transactions/${deleteTargetTx.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Deletion-Reason': deleteReason.trim(),
          ...authHeader,
          'X-Operator-Name': currentUser.name,
          'X-Operator-Role': currentUser.role,
        },
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete transaction record.');
      }

      setDeleteTargetTx(null);
      setDeleteReason('');
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting transaction record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Details Modal
  const [selectedDocDetails, setSelectedDocDetails] = useState<{ tx: Transaction; doc?: LegalDocument } | null>(null);
  const handleViewDetails = (tx: Transaction, doc?: LegalDocument) => {
    const targetDoc = doc || tx.legalDocuments?.[0];
    setSelectedTx(tx);
    setSelectedDocDetails({ tx, doc: targetDoc });
    setShowDetailsModal(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    const firstPartyName = formData.parties[0]?.name?.trim();
    if (!firstPartyName) {
      errors.companyName = 'At least one primary Party Name is required in Section 2.';
      errors.submit = 'Please enter a Company / Party Name in Section 2 (Parties).';
      setActiveFormTab('parties');
      setFormErrors(errors);
      return false;
    }

    const firstDocName = formData.legalDocuments?.[0]?.docName?.trim() || formData.docName?.trim();
    if (!firstDocName) {
      errors.docName = 'Legal Document Name is required in Section 3.';
      errors.submit = 'Please enter a Legal Document Name in Section 3 (Legal Document).';
      setActiveFormTab('docs');
      setFormErrors(errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  // Submit Transaction Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const autoTxNumber = formData.transactionNumber.trim() || `TX-${Date.now()}`;
      const payload = {
        transactionNumber: autoTxNumber,
        transactionType: formData.transactionType.trim() || 'Legal Transaction',
        executionDate: formData.executionDate ? new Date(formData.executionDate).toISOString() : null,
        executionPlace: formData.executionPlace.trim(),
        transactionValue: formData.transactionValue ? parseFloat(formData.transactionValue) : null,
        currency: formData.currency || 'INR',
        validityStart: formData.validityStart ? new Date(formData.validityStart).toISOString() : null,
        validityEnd: formData.validityEnd ? new Date(formData.validityEnd).toISOString() : null,
        status: formData.status || 'DRAFT',
        remarks: formData.remarks,
        parties: formData.parties.filter((p) => p.name.trim().length > 0),
      };

      const endpoint = isEditing && formData.id ? `/api/transactions/${formData.id}` : '/api/transactions';
      const method = isEditing ? 'PUT' : 'POST';
      const token = localStorage.getItem("bcd_token");
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          'X-Operator-Name': currentUser.name,
          'X-Operator-Role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || responseData.error?.message || 'Failed to save transaction.');
      }

      const createdTx: Transaction = responseData.data || responseData.transaction || responseData;

      // Add Legal Documents under created Transaction
      const docsToProcess = (formData.legalDocuments && formData.legalDocuments.length > 0)
        ? formData.legalDocuments
        : [{
            docName: formData.docName.trim(),
            docType: formData.docType || 'OTHERS',
            docNumber: formData.docNumber.trim(),
            docCategory: formData.docCategory.trim(),
            docDescription: formData.docDescription.trim(),
            docStatus: formData.docStatus || 'DRAFT',
            custodianName: formData.custodianName.trim(),
            department: formData.department.trim(),
            location: formData.location.trim(),
            originalAvailable: formData.originalAvailable,
            numberOfOriginalSets: formData.numberOfOriginalSets || 1,
            receivedDate: formData.receivedDate ? new Date(formData.receivedDate).toISOString() : new Date().toISOString(),
            custodyStatus: formData.custodyStatus || 'IN_SAFE',
          }];

      if (createdTx && createdTx.id && docsToProcess.length > 0) {
        for (let docIdx = 0; docIdx < docsToProcess.length; docIdx++) {
          const docItem = docsToProcess[docIdx];
          if (!docItem.docName.trim()) continue;

          const autoDocNumber = docItem.docNumber.trim() || `DOC-${Date.now()}-${docIdx}`;
          const docPayload = {
            documentType: docItem.docType || 'OTHERS',
            documentName: docItem.docName.trim(),
            documentNumber: autoDocNumber,
            category: docItem.docCategory.trim() || 'General',
            description: docItem.docDescription.trim(),
            status: docItem.docStatus || 'DRAFT',
            custodianName: formData.custodianName.trim() || docItem.custodianName.trim() || 'Safe Custody Officer',
            department: formData.department.trim() || docItem.department.trim() || 'Legal & Vault Compliance',
            location: formData.location.trim() || docItem.location.trim() || 'Main Safe Vault',
            originalAvailable: formData.originalAvailable !== undefined ? formData.originalAvailable : docItem.originalAvailable,
            numberOfOriginalSets: formData.numberOfOriginalSets || docItem.numberOfOriginalSets || 1,
            receivedDate: formData.receivedDate ? new Date(formData.receivedDate).toISOString() : new Date().toISOString(),
            custodyStatus: formData.custodyStatus || docItem.custodyStatus || 'IN_SAFE',
          };

          const docRes = await fetch(`/api/transactions/${createdTx.id}/documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeader,
              'X-Operator-Name': currentUser.name,
              'X-Operator-Role': currentUser.role,
            },
            body: JSON.stringify(docPayload),
          });

          const createdDocData = await docRes.json();
          const createdDoc: LegalDocument = createdDocData.data || createdDocData.document || createdDocData;

          // Add Signatories
          if (createdDoc && createdDoc.id && formData.signatories.length > 0) {
            for (const sig of formData.signatories) {
              if (sig.name.trim()) {
                await fetch(`/api/transactions/documents/${createdDoc.id}/signatories`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                    'X-Operator-Name': currentUser.name,
                    'X-Operator-Role': currentUser.role,
                  },
                  body: JSON.stringify({
                    name: sig.name,
                    designation: sig.designation,
                    organization: sig.organization,
                    signed: sig.signed,
                    signingDate: sig.signingDate ? new Date(sig.signingDate).toISOString() : null,
                    remarks: sig.remarks,
                  }),
                });
              }
            }
          }

          // Handle Scanned Document Uploads bound to this Document Name Key
          const mappedScannedFiles = scannedFilesMap[docIdx] || (docIdx === 0 ? uploadFiles : []);
          if (createdDoc && createdDoc.id && mappedScannedFiles.length > 0) {
            const fileData = new FormData();
            mappedScannedFiles.forEach((file) => fileData.append('files', file));

            await fetch(`/api/transactions/documents/${createdDoc.id}/scanned`, {
              method: 'POST',
              headers: {
                ...authHeader,
                'X-Operator-Name': currentUser.name,
                'X-Operator-Role': currentUser.role,
              },
              body: fileData,
            });
          }

          // Handle Supporting Document Attachments
          if (createdDoc && createdDoc.id && attachmentFiles.length > 0) {
            for (const attFile of attachmentFiles) {
              const attData = new FormData();
              attData.append('file', attFile);
              attData.append('description', 'Supporting Document Annexure');

              await fetch(`/api/transactions/documents/${createdDoc.id}/attachments`, {
                method: 'POST',
                headers: {
                  ...authHeader,
                  'X-Operator-Name': currentUser.name,
                  'X-Operator-Role': currentUser.role,
                },
                body: attData,
              });
            }
          }
        }
      }

      setShowFormModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Error executing legal document transaction.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic Party Management
  const addParty = () => {
    setFormData((prev) => ({
      ...prev,
      parties: [...prev.parties, { partyType: 'BORROWER', name: '', address: '', email: '', phone: '', remarks: '' }],
    }));
  };

  const removeParty = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index),
    }));
  };

  const updateParty = (index: number, field: keyof Party, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.parties];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, parties: updated };
    });
  };

  // Dynamic Signatory Management
  const addSignatory = () => {
    setFormData((prev) => ({
      ...prev,
      signatories: [
        ...prev.signatories,
        { name: '', designation: '', organization: '', signed: false, signingDate: new Date().toISOString().split('T')[0], remarks: '' },
      ],
    }));
  };

  const removeSignatory = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      signatories: prev.signatories.filter((_, i) => i !== index),
    }));
  };

  const updateSignatory = (index: number, field: keyof Signatory, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.signatories];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, signatories: updated };
    });
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'VERIFIED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">ACTIVE</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">DRAFT</span>;
      case 'PENDING_REVIEW':
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">PENDING</span>;
      case 'EXPIRED':
      case 'TERMINATED':
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">{status}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">

      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-amber-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Legal Document Management</h1>
              <p className="text-xs text-slate-500">Transaction Custody & Scanned Document Repository</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'dashboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Document Table</span>
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {canModify && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Legal Document</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: DASHBOARD */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">

          {/* METRIC CARDS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <button
              onClick={() => { resetFilters(); setViewMode('table'); }}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-400 transition-all text-left cursor-pointer"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Documents</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{metrics.totalDocs}</span>
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{metrics.totalTransactions} Transactions</p>
            </button>

            <button
              onClick={() => { resetFilters(); setStatusFilter('ACTIVE'); setViewMode('table'); }}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500/40 transition-all text-left cursor-pointer"
            >
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active Documents</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-700">{metrics.activeDocs}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="mt-1 text-[10px] text-emerald-600 font-medium">Verified & Active</p>
            </button>

            <button
              onClick={() => { resetFilters(); setCustodyFilter('IN_SAFE'); setViewMode('table'); }}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-500/40 transition-all text-left cursor-pointer"
            >
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">In Custody</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-blue-700">{metrics.inCustody}</span>
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <p className="mt-1 text-[10px] text-blue-600 font-medium">Stored in Vault</p>
            </button>

            <button
              onClick={() => { resetFilters(); setScanFilter('NO'); setViewMode('table'); }}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-500/40 transition-all text-left cursor-pointer"
            >
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Without Scan</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-700">{metrics.withoutScan}</span>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <p className="mt-1 text-[10px] text-amber-600 font-medium">Physical Only</p>
            </button>

            <button
              onClick={() => { resetFilters(); setExpiringFilter(true); setViewMode('table'); }}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-500/40 transition-all text-left cursor-pointer"
            >
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Expiring Soon</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-rose-700">{metrics.expiring}</span>
                <Clock className="w-5 h-5 text-rose-500" />
              </div>
              <p className="mt-1 text-[10px] text-rose-600 font-medium">Next 30 Days</p>
            </button>

            <button
              onClick={() => { resetFilters(); setSortField('updatedAt'); setSortDirection('desc'); setViewMode('table'); }}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-500/40 transition-all text-left cursor-pointer"
            >
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Recent Activity</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-purple-700">{transactions.length > 0 ? transactions.length : 0}</span>
                <FileCheck className="w-5 h-5 text-purple-500" />
              </div>
              <p className="mt-1 text-[10px] text-purple-600 font-medium">Updated Records</p>
            </button>
          </div>

          {/* QUICK ACTIONS & ACTIVITY GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* RECENTLY REGISTERED TRANSACTIONS LIST */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recently Registered Legal Documents</h3>
                  <p className="text-[11px] text-slate-500">Manual registration entries in secure repository</p>
                </div>
                <button
                  onClick={() => setViewMode('table')}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <span>View All Table</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const flattenedDocs: Array<{ tx: Transaction; doc: LegalDocument; companyName: string }> = [];
                transactions.forEach(tx => {
                  const companyName = tx.parties?.find(p => p.partyType === 'COMPANY' || p.partyType === 'LENDER')?.name || 'N/A';
                  if (tx.legalDocuments && tx.legalDocuments.length > 0) {
                    tx.legalDocuments.forEach(doc => {
                      flattenedDocs.push({ tx, doc, companyName });
                    });
                  } else {
                    flattenedDocs.push({
                      tx,
                      doc: { id: tx.id, transactionId: tx.id, documentType: 'AGREEMENT', documentName: tx.transactionType, currentVersion: 1, status: 'ACTIVE', createdAt: tx.createdAt, updatedAt: tx.updatedAt } as LegalDocument,
                      companyName
                    });
                  }
                });

                if (flattenedDocs.length === 0) {
                  return (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-500">No legal document transactions registered yet.</p>
                      {canModify && (
                        <button
                          onClick={handleOpenCreateModal}
                          className="mt-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                        >
                          Register First Legal Document
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100">
                    {flattenedDocs.slice(0, 10).map(({ tx, doc, companyName }, idx) => {
                      const hasValidRef = tx.transactionNumber && tx.transactionNumber !== 'NA' && tx.transactionNumber.trim() !== '';

                      return (
                        <div key={`${tx.id}-${doc.id}`} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 p-2.5 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-500 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-900">{doc.documentName}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200" title="Company Name">
                                  {companyName}
                                </span>
                                {doc.documentNumber && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200" title="Document Serial Number">
                                    {doc.documentNumber}
                                  </span>
                                )}
                                {hasValidRef && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200" title="Subsidiary Reference">
                                    Ref: {tx.transactionNumber}
                                  </span>
                                )}
                                {getStatusBadge(doc.status || tx.status)}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Type: {doc.documentType} | Custody: {doc.custody?.status || 'IN_SAFE'} | Location: {doc.custody?.location || 'Main Vault'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(tx, doc)}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* QUICK CUSTODY STATS & ACTIONS SIDEBAR */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold">Physical Custody Policy</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All original legal document sets are physically held inside Vault Custody Safe. Scanned attachments are strictly references — no OCR or AI parsing is performed.
                </p>
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Manual Entry Verified</span>
                  <span className="text-amber-400 font-bold">100% Manual</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Filter Views</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => { setStatusFilter('ACTIVE'); setViewMode('table'); }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-xs font-medium text-slate-700 flex items-center justify-between"
                  >
                    <span>Show Active Legal Docs</span>
                    <span className="font-bold text-slate-900">{metrics.activeDocs}</span>
                  </button>
                  <button
                    onClick={() => { setScanFilter('NO'); setViewMode('table'); }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-xs font-medium text-slate-700 flex items-center justify-between"
                  >
                    <span>Show Only Physical Copies</span>
                    <span className="font-bold text-amber-600">{metrics.withoutScan}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODE 2: ENTERPRISE DATA TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">

          {/* SEARCH, FILTER & COLUMN CONTROLS BAR */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pb-4 border-b border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Company Name (Keyword), Doc Name, Doc Number, Tx Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                title="Filter documents by Company Name keyword"
              >
                <option value="ALL">All Companies (Keyword)</option>
                {companyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_REVIEW">PENDING</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Doc Types</option>
                <option value="AGREEMENT">AGREEMENT</option>
                <option value="DEED">DEED</option>
                <option value="MORTGAGE">MORTGAGE</option>
                <option value="GUARANTEE">GUARANTEE</option>
                <option value="RESOLUTION">RESOLUTION</option>
                <option value="UNDERTAKING">UNDERTAKING</option>
              </select>

              <select
                value={scanFilter}
                onChange={(e) => setScanFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Scan Status</option>
                <option value="YES">Scan Uploaded</option>
                <option value="NO">Physical</option>
              </select>

              <div className="relative">
                <button
                  onClick={() => setShowColumnToggle(!showColumnToggle)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Columns</span>
                </button>

                {showColumnToggle && (
                  <div className="absolute right-0 top-11 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Column Visibility</p>
                    {Object.keys(visibleColumns).map((col) => (
                      <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(visibleColumns as any)[col]}
                          onChange={() =>
                            setVisibleColumns((prev) => ({
                              ...prev,
                              [col]: !(prev as any)[col],
                            }))
                          }
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* DATA TABLE */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider select-none">


                  {visibleColumns.company && (
                    <th
                      onClick={() => { setSortField('company'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}
                      className="p-3.5 cursor-pointer hover:text-amber-400"
                    >
                      <div className="flex items-center gap-1">
                        <span>Company Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.documentName && (
                    <th
                      onClick={() => { setSortField('documentName'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}
                      className="p-3.5 cursor-pointer hover:text-amber-400"
                    >
                      <div className="flex items-center gap-1">
                        <span>Doc Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.documentNumber && <th className="p-3.5">Doc Number</th>}
                  {visibleColumns.documentType && <th className="p-3.5">Type</th>}

                  {visibleColumns.transactionNumber && (
                    <th
                      onClick={() => { setSortField('transactionNumber'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}
                      className="p-3.5 cursor-pointer hover:text-amber-400"
                    >
                      <div className="flex items-center gap-1 text-slate-400 font-normal">
                        <span>Tx Number (Subsidiary)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.borrower && <th className="p-3.5">Borrower</th>}
                  {visibleColumns.status && <th className="p-3.5">Status</th>}
                  {visibleColumns.custodian && <th className="p-3.5">Custodian</th>}
                  {visibleColumns.originalAvailable && <th className="p-3.5 text-center">Original</th>}
                  {visibleColumns.scanAvailable && <th className="p-3.5 text-center">Scan Available</th>}
                  {visibleColumns.lastUpdated && <th className="p-3.5">Last Updated</th>}
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      No legal document records matching search filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-all">


                      {visibleColumns.company && (
                        <td className="p-3.5 font-bold text-slate-900">
                          <span>{row.company}</span>
                        </td>
                      )}
                      {visibleColumns.documentName && (
                        <td className="p-3.5 font-semibold text-slate-800">{row.documentName}</td>
                      )}
                      {visibleColumns.documentNumber && (
                        <td className="p-3.5 text-slate-600 font-mono">{row.documentNumber}</td>
                      )}
                      {visibleColumns.documentType && (
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                            {row.documentType}
                          </span>
                        </td>
                      )}
                      {visibleColumns.transactionNumber && (
                        <td className="p-3.5 font-mono">
                          <span className="px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100 border border-slate-200" title="Subsidiary Transaction Number">
                            Ref: {row.transactionNumber}
                          </span>
                        </td>
                      )}
                      {visibleColumns.borrower && <td className="p-3.5 text-slate-600">{row.borrower}</td>}
                      {visibleColumns.status && <td className="p-3.5">{getStatusBadge(row.status)}</td>}
                      {visibleColumns.custodian && <td className="p-3.5 text-slate-600">{row.custodian}</td>}
                      {visibleColumns.originalAvailable && (
                        <td className="p-3.5 text-center">
                          {row.originalAvailable ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                      )}
                      {visibleColumns.scanAvailable && (
                        <td className="p-3.5 text-center">
                          {row.scanAvailable ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Physical
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.lastUpdated && (
                        <td className="p-3.5 text-slate-500 font-mono">{row.lastUpdated}</td>
                      )}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDetails(row.tx, row.doc)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>

                          {canModify && (
                            <button
                              onClick={() => setDeleteTargetTx({ id: row.tx.id, txNumber: row.transactionNumber, docName: row.documentName })}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="Delete Legal Document"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600 font-medium">
            <div>
              Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} legal records
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* CREATE / EDIT SINGLE MULTI-SECTION FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* MODAL HEADER */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Register Legal Document & Custody</h3>
                  <p className="text-xs text-slate-400">Single Multi-Section Manual Registration Form</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MULTI-SECTION TAB SELECTOR */}
            <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center gap-1 overflow-x-auto shrink-0 text-xs font-semibold">
              <button
                onClick={() => setActiveFormTab('tx')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'tx' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                1. Transaction Info
              </button>
              <button
                onClick={() => setActiveFormTab('parties')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'parties' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                2. Parties
              </button>
              <button
                onClick={() => setActiveFormTab('docs')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'docs' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                3. Legal Document
              </button>
              <button
                onClick={() => setActiveFormTab('signatories')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'signatories' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                4. Signatories
              </button>
              <button
                onClick={() => setActiveFormTab('custody')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'custody' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                5. Custody Info
              </button>
              <button
                onClick={() => setActiveFormTab('scans')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'scans' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                6. Scanned Copy
              </button>
              <button
                onClick={() => setActiveFormTab('attachments')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'attachments' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                7. Annexures
              </button>
            </div>

            {/* FORM CONTENT SCROLLABLE BODY */}
            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-6 flex-1">

              {formErrors.submit && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* SECTION 1: TRANSACTION INFO */}
              {activeFormTab === 'tx' && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Section 1: Transaction Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Number *</label>
                      <input
                        type="text"
                        value={formData.transactionNumber}
                        onChange={(e) => setFormData({ ...formData, transactionNumber: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-amber-500/50"
                      />
                      {formErrors.transactionNumber && <p className="text-[10px] text-rose-500 mt-1">{formErrors.transactionNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Type *</label>
                      <input
                        type="text"
                        value={formData.transactionType}
                        onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                        required
                        placeholder="Facility Agreement / Deed of Hypothecation"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date of Execution</label>
                      <input
                        type="date"
                        value={formData.executionDate}
                        onChange={(e) => setFormData({ ...formData, executionDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Place of Execution</label>
                      <input
                        type="text"
                        value={formData.executionPlace}
                        onChange={(e) => setFormData({ ...formData, executionPlace: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Value</label>
                      <input
                        type="number"
                        value={formData.transactionValue}
                        onChange={(e) => setFormData({ ...formData, transactionValue: e.target.value })}
                        placeholder="50000000"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Valid From</label>
                      <input
                        type="date"
                        value={formData.validityStart}
                        onChange={(e) => setFormData({ ...formData, validityStart: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until</label>
                      <input
                        type="date"
                        value={formData.validityEnd}
                        onChange={(e) => setFormData({ ...formData, validityEnd: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Internal Notes</label>
                    <textarea
                      rows={2}
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: PARTIES */}
              {activeFormTab === 'parties' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Section 2: Parties Involved</h4>
                    <button
                      type="button"
                      onClick={addParty}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Party</span>
                    </button>
                  </div>

                  {formData.parties.map((party, index) => (
                    <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">Party #{index + 1}</span>
                        {formData.parties.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParty(index)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Party Type *</label>
                          <select
                            value={party.partyType}
                            onChange={(e) => updateParty(index, 'partyType', e.target.value as PartyType)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          >
                            <option value="COMPANY">COMPANY (Lender / Institution)</option>
                            <option value="BORROWER">BORROWER</option>
                            <option value="TRUSTEE">TRUSTEE</option>
                            <option value="GUARANTOR">GUARANTOR</option>
                            <option value="LENDER">LENDER</option>
                            <option value="OTHERS">OTHERS</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Name *</label>
                          <input
                            type="text"
                            value={party.name}
                            onChange={(e) => updateParty(index, 'name', e.target.value)}
                            placeholder="Full Legal Company / Individual Name"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Address</label>
                          <input
                            type="text"
                            value={party.address || ''}
                            onChange={(e) => updateParty(index, 'address', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Email / Phone</label>
                          <input
                            type="text"
                            value={party.email || ''}
                            onChange={(e) => updateParty(index, 'email', e.target.value)}
                            placeholder="email@company.com"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 3: LEGAL DOCUMENTS */}
              {activeFormTab === 'docs' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Section 3: Legal Document Details</h4>
                      <p className="text-[11px] text-slate-500">Register one or multiple legal documents under this transaction</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          legalDocuments: [
                            ...prev.legalDocuments,
                            {
                              docName: '',
                              docType: 'AGREEMENT',
                              docNumber: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
                              docCategory: 'Credit Agreement',
                              docDescription: 'Original executed document set',
                              docStatus: 'ACTIVE',
                              custodianName: currentUser.name || 'Custody Manager',
                              department: 'Legal & Vault Compliance',
                              location: 'Vault A, Locker 4',
                              originalAvailable: true,
                              numberOfOriginalSets: 1,
                              receivedDate: new Date().toISOString().split('T')[0],
                              custodyStatus: 'IN_SAFE',
                            },
                          ],
                        }));
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Another Legal Document</span>
                    </button>
                  </div>

                  {formData.legalDocuments.map((doc, docIdx) => (
                    <div key={docIdx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 relative shadow-xs">
                      <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">{docIdx + 1}</span>
                          <span>Legal Document Entry #{docIdx + 1}</span>
                        </span>
                        {formData.legalDocuments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                legalDocuments: prev.legalDocuments.filter((_, i) => i !== docIdx),
                              }));
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Document Name *</label>
                          <input
                            type="text"
                            value={doc.docName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => {
                                const updated = [...prev.legalDocuments];
                                updated[docIdx] = { ...updated[docIdx], docName: val };
                                return { ...prev, legalDocuments: updated, docName: docIdx === 0 ? val : prev.docName };
                              });
                            }}
                            required
                            placeholder="Deed of Personal Guarantee / Loan Agreement"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Document Type *</label>
                          <select
                            value={doc.docType}
                            onChange={(e) => {
                              const val = e.target.value as DocumentType;
                              setFormData((prev) => {
                                const updated = [...prev.legalDocuments];
                                updated[docIdx] = { ...updated[docIdx], docType: val };
                                return { ...prev, legalDocuments: updated, docType: docIdx === 0 ? val : prev.docType };
                              });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                          >
                            <option value="AGREEMENT">AGREEMENT</option>
                            <option value="DEED">DEED</option>
                            <option value="MORTGAGE">MORTGAGE</option>
                            <option value="GUARANTEE">GUARANTEE</option>
                            <option value="RESOLUTION">RESOLUTION</option>
                            <option value="CERTIFICATE">CERTIFICATE</option>
                            <option value="LETTER">LETTER</option>
                            <option value="UNDERTAKING">UNDERTAKING</option>
                            <option value="OTHERS">OTHERS</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Document Serial Number</label>
                          <input
                            type="text"
                            value={doc.docNumber}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => {
                                const updated = [...prev.legalDocuments];
                                updated[docIdx] = { ...updated[docIdx], docNumber: val };
                                return { ...prev, legalDocuments: updated };
                              });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                          <select
                            value={doc.docStatus}
                            onChange={(e) => {
                              const val = e.target.value as DocumentStatus;
                              setFormData((prev) => {
                                const updated = [...prev.legalDocuments];
                                updated[docIdx] = { ...updated[docIdx], docStatus: val };
                                return { ...prev, legalDocuments: updated };
                              });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="PENDING_REVIEW">PENDING REVIEW</option>
                            <option value="VERIFIED">VERIFIED</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Document Description</label>
                        <textarea
                          rows={2}
                          value={doc.docDescription}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const updated = [...prev.legalDocuments];
                              updated[docIdx] = { ...updated[docIdx], docDescription: val };
                              return { ...prev, legalDocuments: updated };
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 4: SIGNATORIES */}
              {activeFormTab === 'signatories' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Section 4: Signatories</h4>
                    <button
                      type="button"
                      onClick={addSignatory}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Signatory</span>
                    </button>
                  </div>

                  {formData.signatories.map((sig, index) => (
                    <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800">Signatory #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeSignatory(index)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Name *</label>
                          <input
                            type="text"
                            value={sig.name}
                            onChange={(e) => updateSignatory(index, 'name', e.target.value)}
                            placeholder="Signatory Full Name"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation</label>
                          <input
                            type="text"
                            value={sig.designation || ''}
                            onChange={(e) => updateSignatory(index, 'designation', e.target.value)}
                            placeholder="Director / Authorized Officer"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Organization</label>
                          <input
                            type="text"
                            value={sig.organization || ''}
                            onChange={(e) => updateSignatory(index, 'organization', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sig.signed}
                            onChange={(e) => updateSignatory(index, 'signed', e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-500"
                          />
                          <span>Document Signed</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 5: CUSTODY INFO */}
              {activeFormTab === 'custody' && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Section 5: Physical Safe Custody Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Custodian Name *</label>
                      <input
                        type="text"
                        value={formData.custodianName}
                        onChange={(e) => setFormData({ ...formData, custodianName: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Physical Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Main Safe Vault, Locker 4"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Custody Status</label>
                      <select
                        value={formData.custodyStatus}
                        onChange={(e) => setFormData({ ...formData, custodyStatus: e.target.value as CustodyStatus })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      >
                        <option value="IN_SAFE">IN SAFE (Vault Safe)</option>
                        <option value="CHECKED_OUT">CHECKED OUT</option>
                        <option value="IN_TRANSIT">IN TRANSIT</option>
                        <option value="RETURNED">RETURNED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.originalAvailable}
                          onChange={(e) => setFormData({ ...formData, originalAvailable: e.target.checked })}
                          className="rounded text-amber-500 focus:ring-amber-500"
                        />
                        <span>Original Set Available</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Number Of Original Sets</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.numberOfOriginalSets}
                        onChange={(e) => setFormData({ ...formData, numberOfOriginalSets: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: SCANNED DOCUMENTS */}
              {activeFormTab === 'scans' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-blue-600" />
                    <span>Upload scanned files for each legal document. The Document Name acts as the reference key linking the file to the document.</span>
                  </div>

                  {formData.legalDocuments.map((doc, docIdx) => {
                    const keyName = doc.docName.trim() || `Document #${docIdx + 1}`;
                    const docFiles = scannedFilesMap[docIdx] || [];

                    return (
                      <div key={docIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-900">
                            Scanned Copy for: <span className="text-amber-800 font-extrabold">{keyName}</span>
                          </label>
                          {doc.docNumber && (
                            <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Ref Key: {doc.docNumber}
                            </span>
                          )}
                        </div>

                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.docx"
                          onChange={(e) => {
                            const selected = Array.from(e.target.files || []);
                            setScannedFilesMap((prev) => ({
                              ...prev,
                              [docIdx]: selected,
                            }));
                          }}
                          className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                        />

                        {docFiles.length > 0 && (
                          <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Attached Files for Key: {keyName} ({docFiles.length})</p>
                            {docFiles.map((file, i) => (
                              <div key={i} className="flex justify-between items-center text-xs font-mono text-slate-700">
                                <span className="truncate">{file.name}</span>
                                <span className="text-[10px] text-slate-400 font-sans">{Math.round(file.size / 1024)} KB</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 7: SUPPORTING DOCUMENTS */}
              {activeFormTab === 'attachments' && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Section 7: Supporting Annexures & Letters</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Upload Annexures / Letters</label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                      onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
                      className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                    />
                  </div>

                  {attachmentFiles.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Selected Annexure Files ({attachmentFiles.length})</p>
                      {attachmentFiles.map((file, i) => (
                        <div key={i} className="flex justify-between items-center text-xs font-mono text-slate-700">
                          <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL FOOTER */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex gap-2">
                  {activeFormTab !== 'tx' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: Array<typeof activeFormTab> = ['tx', 'parties', 'docs', 'signatories', 'custody', 'scans', 'attachments'];
                        const idx = tabs.indexOf(activeFormTab);
                        if (idx > 0) setActiveFormTab(tabs[idx - 1]);
                      }}
                      className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                    >
                      Back
                    </button>
                  )}
                  {activeFormTab !== 'attachments' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: Array<typeof activeFormTab> = ['tx', 'parties', 'docs', 'signatories', 'custody', 'scans', 'attachments'];
                        const idx = tabs.indexOf(activeFormTab);
                        if (idx < tabs.length - 1) setActiveFormTab(tabs[idx + 1]);
                      }}
                      className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                    >
                      Next Section
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitForm(e)}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    <span>{isSubmitting ? 'Saving Transaction...' : 'Save Transaction & Documents'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* READ-ONLY DETAILS MODAL */}
      {showDetailsModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {(() => {
              const activeDoc = selectedDocDetails?.doc || selectedTx.legalDocuments?.[0];
              const docName = activeDoc?.documentName || selectedTx.transactionType;
              const companyName = selectedTx.parties?.find(p => p.partyType === 'COMPANY' || p.partyType === 'LENDER')?.name || 'N/A';

              return (
                <>
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          <span>{docName}</span>
                          {activeDoc?.documentNumber && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 bg-amber-500/20 border border-amber-500/30">
                              {activeDoc.documentNumber}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                            Ref: {selectedTx.transactionNumber}
                          </span>
                        </h3>
                        <p className="text-xs text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                          <span>Company: {companyName}</span>
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setShowDetailsModal(false)} className="p-2 text-slate-400 hover:text-white rounded-xl cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

                    {/* TRANSACTION & COMPANY CONTEXT */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Transaction & Company Context</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Status</span>
                          {getStatusBadge(activeDoc?.status || selectedTx.status)}
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Execution Date</span>
                          <span className="font-semibold text-slate-800">{selectedTx.executionDate ? new Date(selectedTx.executionDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Place of Execution</span>
                          <span className="font-semibold text-slate-800">{selectedTx.executionPlace || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Transaction Value</span>
                          <span className="font-semibold text-slate-800">{selectedTx.transactionValue ? `${selectedTx.currency} ${Number(selectedTx.transactionValue).toLocaleString('en-IN')}` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* PARTIES */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Parties ({selectedTx.parties?.length || 0})</h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                        {selectedTx.parties?.map((p, i) => (
                          <div key={i} className="p-3 bg-white flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-900">{p.name}</span>
                              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{p.partyType}</span>
                            </div>
                            <span className="text-slate-500 font-mono">{p.email || p.phone || 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SPECIFIC INDIVIDUAL LEGAL DOCUMENT DETAILS */}
                    {activeDoc && (
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Specific Legal Document Details</h4>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-200/80 pb-3">
                            <div>
                              <span className="text-sm font-extrabold text-slate-900">{activeDoc.documentName}</span>
                              {activeDoc.documentNumber && (
                                <span className="ml-2 font-mono text-slate-500">({activeDoc.documentNumber})</span>
                              )}
                            </div>
                            {getStatusBadge(activeDoc.status)}
                          </div>

                          <div className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Custodian</span>
                              <span className="font-semibold text-slate-800">{activeDoc.custody?.custodianName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Vault Location</span>
                              <span className="font-semibold text-slate-800">{activeDoc.custody?.location || 'Main Vault'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Original Available</span>
                              <span className="font-semibold text-emerald-600">{activeDoc.custody?.originalAvailable ? 'Yes (Physical Set)' : 'No'}</span>
                            </div>
                          </div>

                          {/* SCANNED COPIES SPECIFIC TO THIS SPECIFIC DOCUMENT */}
                          <div className="pt-2 space-y-3">
                            <div>
                              <span className="font-bold text-slate-800 block mb-2 text-[11px]">
                                Scanned Copy File for: <span className="text-amber-800 font-bold">{activeDoc.documentName}</span>
                              </span>
                              {activeDoc.scannedDocuments && activeDoc.scannedDocuments.length > 0 ? (
                                <div className="space-y-2">
                                  {activeDoc.scannedDocuments.map((scan) => (
                                    <div key={scan.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-[11px]">
                                      <div className="flex items-center gap-2.5">
                                        <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <div>
                                          <span className="font-mono text-slate-900 font-bold">{scan.originalFileName}</span>
                                          <span className="text-slate-400 ml-2 font-mono">({(scan.fileSize / 1024).toFixed(1)} KB)</span>
                                          <p className="text-[10px] text-slate-400 mt-0.5">Uploaded {new Date(scan.uploadedDate).toLocaleDateString('en-IN')}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                          Scanned Copy
                                        </span>
                                        <a
                                          href={`/api/transactions/scanned/${scan.id}/view?token=${encodeURIComponent(localStorage.getItem("bcd_token") || "")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> View Copy
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-amber-600 text-[11px] italic block p-3 bg-white rounded-xl border border-slate-200">
                                  No scanned document copy uploaded for {activeDoc.documentName}.
                                </span>
                              )}
                            </div>

                            {/* SUPPORTING ANNEXURES */}
                            <div>
                              <span className="font-bold text-slate-800 block mb-2 text-[11px]">
                                Supporting Annexures & Letters for: <span className="text-amber-800 font-bold">{activeDoc.documentName}</span>
                              </span>
                              {activeDoc.attachments && activeDoc.attachments.length > 0 ? (
                                <div className="space-y-2">
                                  {activeDoc.attachments.map((att) => (
                                    <div key={att.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-[11px]">
                                      <div className="flex items-center gap-2.5">
                                        <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                                        <div>
                                          <span className="font-mono text-slate-900 font-bold">{att.originalFileName}</span>
                                          <span className="text-slate-400 ml-2 font-mono">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                                          <p className="text-[10px] text-slate-400 mt-0.5">{att.attachmentType || 'Supporting Document'} • Uploaded {new Date(att.createdDate).toLocaleDateString('en-IN')}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                          Annexure
                                        </span>
                                        <a
                                          href={`/api/transactions/attachments/${att.id}/view?token=${encodeURIComponent(localStorage.getItem("bcd_token") || "")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> View Annexure
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic block p-3 bg-white rounded-xl border border-slate-200">
                                  No supporting annexures attached to {activeDoc.documentName}.
                                </span>
                              )}
                            </div>

                            {/* CHRONOLOGICAL TIMELINE & AUDIT TRAIL */}
                            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Document Timeline & Audit Trail</h4>
                              </div>
                              <div className="space-y-3 pl-2 border-l-2 border-slate-700">
                                <div className="relative pl-4">
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 absolute -left-[18px] top-1" />
                                  <p className="font-bold text-slate-100">Transaction Registered</p>
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(selectedTx.createdAt).toLocaleString('en-IN')} • Executed by {selectedTx.createdBy?.name || 'Authorized Custodian'}
                                  </p>
                                  <p className="text-[11px] text-slate-300 mt-0.5">Transaction #{selectedTx.transactionNumber} ({selectedTx.transactionType}) created with initial custody parameters.</p>
                                </div>

                                {selectedTx.legalDocuments?.map((doc, idx) => (
                                  <div key={idx} className="relative pl-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -left-[18px] top-1" />
                                    <p className="font-bold text-slate-100">Legal Document Attached: {doc.documentName}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(doc.createdAt).toLocaleString('en-IN')} • Document #{doc.documentNumber || 'N/A'}
                                    </p>
                                    <p className="text-[11px] text-slate-300 mt-0.5">
                                      Status: {doc.status} • Custodian: {doc.custody?.custodianName || 'Vault Manager'} ({doc.custody?.location || 'Main Vault'})
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl cursor-pointer">
                      Close Details
                    </button>
                  </div>
                </>
              );
            })()}

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL WITH REASON */}
      {deleteTargetTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Legal Document</h3>
                <p className="text-xs text-slate-500">Transaction #{deleteTargetTx.txNumber}</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <p className="font-semibold">Target Document: {deleteTargetTx.docName}</p>
              <p className="text-[11px] text-rose-700">Warning: This action will delete the legal document record. A mandatory reason is required for audit logging.</p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 font-medium">
                {deleteError}
              </div>
            )}

            <form onSubmit={confirmDeleteTx} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Deletion *
                </label>
                <textarea
                  required
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Provide mandatory reason for removing this document record..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setDeleteTargetTx(null); setDeleteReason(''); setDeleteError(''); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!deleteReason.trim() || isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
