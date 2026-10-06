import React, { useState, useEffect, useMemo, useRef } from 'react';
import { translations } from './translations';
import { defaultSampleRequirements } from './sampleData';
import { generateTenderPackage } from './utils/pdfGenerator';
import { evaluateRequirementStatus, computeFileHash, identifyDuplicates } from './utils/statusChecker';
import { PDFDocument } from 'pdf-lib';
import { 
  FileText, Upload, Trash2, CheckCircle2, AlertTriangle, XCircle, 
  Clock, Download, Eye, Sparkles, FileSpreadsheet, RefreshCw, Layers
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  // Tender & requirements state
  const [tenderData, setTenderData] = useState(() => {
    const saved = localStorage.getItem('tender_data');
    return saved ? JSON.parse(saved) : defaultSampleRequirements;
  });

  // Uploaded files: map of fileName -> { name, bytes, size, pageCount, hash, error }
  const [filesData, setFilesData] = useState({});
  const [uploadWarning, setUploadWarning] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // Matching map: reqId -> fileName
  const [matchedFiles, setMatchedFiles] = useState(() => {
    const saved = localStorage.getItem('matched_files');
    return saved ? JSON.parse(saved) : {};
  });

  // Expiry dates map: reqId -> YYYY-MM-DD
  const [expiryDates, setExpiryDates] = useState(() => {
    const saved = localStorage.getItem('expiry_dates');
    return saved ? JSON.parse(saved) : {};
  });

  // Generated package state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoMatchMessage, setAutoMatchMessage] = useState('');

  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const sealInputRef = useRef(null);

  // Seal / Signature state
  const [sealFile, setSealFile] = useState(null);
  const [sealPages, setSealPages] = useState('all');

  // Persistence to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tender_data', JSON.stringify(tenderData));
      localStorage.setItem('matched_files', JSON.stringify(matchedFiles));
      localStorage.setItem('expiry_dates', JSON.stringify(expiryDates));
    } catch (e) {
      console.warn("LocalStorage save error", e);
    }
  }, [tenderData, matchedFiles, expiryDates]);

  // Duplicates detection
  const duplicatesMap = useMemo(() => {
    return identifyDuplicates(Object.values(filesData));
  }, [filesData]);

  // Requirement status evaluation
  const evaluatedRequirements = useMemo(() => {
    if (!tenderData || !tenderData.requirements) return [];
    
    const sorted = [...tenderData.requirements].sort((a, b) => a.order - b.order);
    return sorted.map(req => {
      const matchedFileName = matchedFiles[req.id];
      const expiryDate = expiryDates[req.id];
      const evalResult = evaluateRequirementStatus({
        req,
        matchedFileName,
        expiryDate,
        submissionDeadline: tenderData.tender?.submission_deadline
      });

      return {
        ...req,
        matchedFileName,
        expiryDate,
        ...evalResult
      };
    });
  }, [tenderData, matchedFiles, expiryDates]);

  // Blocking issues check
  const blockingIssues = useMemo(() => {
    return evaluatedRequirements.filter(item => item.isBlocking);
  }, [evaluatedRequirements]);

  const canGenerate = blockingIssues.length === 0 && Object.keys(filesData).length > 0;

  // Handle requirements.json upload
  const handleJsonUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.tender && Array.isArray(parsed.requirements)) {
          setTenderData(parsed);
          setMatchedFiles({});
          setExpiryDates({});
          setGeneratedPdfBlob(null);
          setGeneratedPdfUrl(null);
          setUploadWarning('');
        } else {
          setUploadWarning(lang === 'en' 
            ? 'Invalid requirements.json format: Missing "tender" or "requirements".' 
            : 'অকার্যকর requirements.json ফাইল: "tender" বা "requirements" অনুপস্থিত।');
        }
      } catch (err) {
        setUploadWarning(lang === 'en' ? 'Could not parse JSON file.' : 'JSON ফাইল পড়া সম্ভব হয়নি।');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Load default sample tender
  const handleLoadSample = () => {
    setTenderData(defaultSampleRequirements);
    setUploadWarning('');
  };

  // Handle PDF files upload (multiple)
  const handleFilesUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessingFiles(true);
    setUploadWarning('');

    const newFilesMap = { ...filesData };
    const invalidFiles = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Rule 4.2: If a file is not a PDF, reject it and show a clear message.
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      if (!isPdf) {
        invalidFiles.push(file.name);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const hash = await computeFileHash(arrayBuffer);
        let pageCount = 1;
        let isCorrupted = false;

        try {
          const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          pageCount = doc.getPageCount();
        } catch (pdfErr) {
          console.warn("Could not parse PDF page count:", file.name, pdfErr);
          isCorrupted = true;
        }

        newFilesMap[file.name] = {
          name: file.name,
          bytes: new Uint8Array(arrayBuffer),
          size: file.size,
          pageCount: isCorrupted ? '?' : pageCount,
          hash,
          isCorrupted
        };
      } catch (err) {
        console.error("Error reading file:", file.name, err);
      }
    }

    setFilesData(newFilesMap);
    setIsProcessingFiles(false);

    if (invalidFiles.length > 0) {
      setUploadWarning(
        `"${invalidFiles.join(', ')}" ${t.invalidPdfWarning}`
      );
    }
  };

  // Remove uploaded file
  const handleRemoveFile = (fileName) => {
    const updated = { ...filesData };
    delete updated[fileName];
    setFilesData(updated);

    // Also unmatch from any requirement
    const updatedMatches = { ...matchedFiles };
    for (const reqId in updatedMatches) {
      if (updatedMatches[reqId] === fileName) {
        delete updatedMatches[reqId];
      }
    }
    setMatchedFiles(updatedMatches);
  };

  // Match file to requirement (Rule 4.3 & 4.6)
  const handleMatchChange = (reqId, fileName) => {
    if (!fileName) {
      // Unmatch
      const updated = { ...matchedFiles };
      delete updated[reqId];
      setMatchedFiles(updated);
      return;
    }

    // Check if duplicate of this file is already matched to another document
    const fileMeta = filesData[fileName];
    if (fileMeta && fileMeta.hash) {
      const dupFiles = duplicatesMap[fileName]?.copies || [];
      const dupAlreadyMatched = Object.entries(matchedFiles).some(
        ([rId, fName]) => rId !== reqId && dupFiles.includes(fName)
      );
      if (dupAlreadyMatched) {
        alert(t.duplicateAlert);
        return;
      }
    }

    // Assign match
    setMatchedFiles(prev => ({
      ...prev,
      [reqId]: fileName
    }));
  };

  // Update expiry date (Rule 4.4)
  const handleExpiryChange = (reqId, dateVal) => {
    setExpiryDates(prev => ({
      ...prev,
      [reqId]: dateVal
    }));
  };

  // Auto-Match Bonus Feature
  const handleAutoMatch = () => {
    const currentAvailableFiles = Object.keys(filesData);
    const newMatches = { ...matchedFiles };
    let matchedCount = 0;

    const keywords = [
      { id: 'R01', keys: ['trade', 'license'] },
      { id: 'R02', keys: ['tin'] },
      { id: 'R03', keys: ['vat'] },
      { id: 'R04', keys: ['solvency', 'bank'] },
      { id: 'R05', keys: ['experience'] },
      { id: 'R06', keys: ['audited', 'financial_statement'] },
      { id: 'R07', keys: ['manufacturer', 'authorization'] },
      { id: 'R08', keys: ['technical', 'proposal'] },
      { id: 'R09', keys: ['financial', 'proposal'] },
      { id: 'R10', keys: ['declaration', 'signed'] }
    ];

    // Track used hashes to avoid matching duplicates to different documents
    const usedHashes = new Set();
    Object.entries(newMatches).forEach(([rId, fName]) => {
      const h = filesData[fName]?.hash;
      if (h) usedHashes.add(h);
    });

    for (const kw of keywords) {
      if (newMatches[kw.id]) continue; // already matched

      // Find file that best matches
      const matchedFile = currentAvailableFiles.find(fName => {
        // Must not be already matched
        if (Object.values(newMatches).includes(fName)) return false;
        
        // Hash must not be already used by a duplicate
        const fHash = filesData[fName]?.hash;
        if (fHash && usedHashes.has(fHash)) return false;

        const lower = fName.toLowerCase();
        // Priority for trade license: prefer trade_license_2026 over 2025 if both exist
        if (kw.id === 'R01') {
          return lower.includes('trade') || lower.includes('license');
        }
        return kw.keys.some(k => lower.includes(k));
      });

      if (matchedFile) {
        newMatches[kw.id] = matchedFile;
        const fHash = filesData[matchedFile]?.hash;
        if (fHash) usedHashes.add(fHash);
        matchedCount++;
      }
    }

    setMatchedFiles(newMatches);
    setAutoMatchMessage(`${t.autoMatchedNotice} (${matchedCount})`);
    setTimeout(() => setAutoMatchMessage(''), 4000);
  };

  // Export Checklist CSV Bonus Feature
  const handleExportCsv = () => {
    let csv = "Order,Document ID,Document Title (EN),Document Title (BN),Mandatory,Matched File,Pages,Expiry Date,Status\n";
    for (const item of evaluatedRequirements) {
      const fileInfo = filesData[item.matchedFileName];
      const pageStr = fileInfo ? fileInfo.pageCount : "";
      const row = [
        item.order,
        `"${item.id}"`,
        `"${item.title_en || ''}"`,
        `"${item.title_bn || ''}"`,
        item.mandatory ? "Yes" : "No",
        `"${item.matchedFileName || ''}"`,
        pageStr,
        `"${item.expiryDate || ''}"`,
        `"${item.status}"`
      ];
      csv += row.join(",") + "\n";
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${tenderData.tender?.tender_id || 'Tender'}_Checklist.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset All
  const handleReset = () => {
    if (window.confirm(t.confirmReset)) {
      setFilesData({});
      setMatchedFiles({});
      setExpiryDates({});
      setGeneratedPdfBlob(null);
      setGeneratedPdfUrl(null);
      setUploadWarning('');
      localStorage.removeItem('matched_files');
      localStorage.removeItem('expiry_dates');
    }
  };

  // Generate Final PDF Package (Rules 4.7, 4.8, 6.1-6.4)
  const handleGeneratePackage = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);

    try {
      const result = await generateTenderPackage({
        tender: tenderData.tender,
        requirements: tenderData.requirements,
        matchedFilesMap: matchedFiles,
        filesData,
        sealFile,
        sealPages
      });

      setGeneratedPdfBlob(result.blob);
      const url = URL.createObjectURL(result.blob);
      setGeneratedPdfUrl(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert(lang === 'en' ? `Failed to generate PDF: ${err.message}` : `PDF তৈরিতে ত্রুটি: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Package
  const handleDownload = () => {
    if (!generatedPdfBlob) return;
    const tenderId = tenderData.tender?.tender_id || 'Tender';
    const filename = `${tenderId}_Package.pdf`;
    
    const link = document.createElement('a');
    link.href = generatedPdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to check if file is disabled in dropdown
  const isFileOptionDisabled = (fileName, currentReqId) => {
    // If assigned to a different requirement
    const isAssignedElsewhere = Object.entries(matchedFiles).some(
      ([rId, fName]) => rId !== currentReqId && fName === fileName
    );
    if (isAssignedElsewhere) return true;

    // If duplicate of this file is assigned to a different requirement
    const dupCopies = duplicatesMap[fileName]?.copies || [];
    const isDuplicateAssignedElsewhere = Object.entries(matchedFiles).some(
      ([rId, fName]) => rId !== currentReqId && dupCopies.includes(fName)
    );
    if (isDuplicateAssignedElsewhere) return true;

    return false;
  };

  const handleSealUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      alert(lang === 'en' ? 'Only PNG images are supported for seal/signature.' : 'সিল/স্বাক্ষরের জন্য শুধুমাত্র PNG ছবি সমর্থিত।');
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    setSealFile({
      name: file.name,
      bytes: new Uint8Array(arrayBuffer),
      url: URL.createObjectURL(file)
    });
  };

  return (
    <div className="container">
      {/* App Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="brand-title">{t.appTitle}</h1>
            <p className="brand-subtitle">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Language Switcher */}
          <div className="lang-switch">
            <button 
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              English
            </button>
            <button 
              className={`lang-btn ${lang === 'bn' ? 'active' : ''}`}
              onClick={() => setLang('bn')}
            >
              বাংলা
            </button>
          </div>

          <button className="btn btn-outline" onClick={handleExportCsv} title="Export CSV">
            <FileSpreadsheet size={16} />
            {t.exportCsvBtn}
          </button>

          <button className="btn btn-danger-outline" onClick={handleReset} title="Reset All">
            <RefreshCw size={15} />
            {t.resetBtn}
          </button>
        </div>
      </header>

      {/* SECTION 1: Tender Requirements & JSON Loader */}
      <section className="card">
        <div className="card-title-bar">
          <div className="card-title">
            <FileText size={20} color="#2563eb" />
            {t.loadRequirements}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-outline"
              onClick={() => jsonInputRef.current?.click()}
            >
              <Upload size={16} />
              {t.uploadJsonBtn}
            </button>
            <input 
              type="file" 
              ref={jsonInputRef} 
              style={{ display: 'none' }} 
              accept=".json,application/json" 
              onChange={handleJsonUpload} 
            />

            <button 
              className="btn btn-outline" 
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
              onClick={handleLoadSample}
            >
              <Sparkles size={16} />
              {t.loadSampleBtn}
            </button>
          </div>
        </div>

        {/* Tender Metadata Card */}
        {tenderData?.tender && (
          <div className="metadata-grid">
            <div className="meta-item">
              <div className="meta-label">{t.tenderId}</div>
              <div className="meta-value">{tenderData.tender.tender_id}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">{t.tenderDetails}</div>
              <div className="meta-value">{tenderData.tender.title}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">{t.procuringEntity}</div>
              <div className="meta-value">{tenderData.tender.procuring_entity}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">{t.bidder}</div>
              <div className="meta-value">{tenderData.tender.bidder}</div>
            </div>
            <div className="meta-item">
              <div className="meta-label">{t.deadline}</div>
              <div className="meta-value" style={{ color: '#b91c1c' }}>
                {tenderData.tender.submission_deadline}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: Document Uploads */}
      <section className="card">
        <div className="card-title-bar">
          <div className="card-title">
            <Upload size={20} color="#2563eb" />
            {t.uploadFilesTitle}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {autoMatchMessage && (
              <span style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>
                {autoMatchMessage}
              </span>
            )}
            <button 
              className="btn btn-primary"
              onClick={handleAutoMatch}
              disabled={Object.keys(filesData).length === 0}
              title={t.autoMatchTooltip}
            >
              <Sparkles size={16} />
              {t.autoMatchBtn}
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <div 
          className="dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('dragover'); }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            handleFilesUpload(e.dataTransfer.files);
          }}
        >
          <Upload className="dropzone-icon" />
          <div className="dropzone-text">{t.dropFilesHere}</div>
          <div className="dropzone-hint">{t.supportedFormats}</div>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            multiple 
            accept=".pdf,application/pdf"
            onChange={(e) => handleFilesUpload(e.target.files)} 
          />
        </div>

        {/* Processing Spinner / Message */}
        {isProcessingFiles && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#2563eb' }}>
            {t.uploadingFiles}
          </div>
        )}

        {/* Warning Alert if non-PDF rejected */}
        {uploadWarning && (
          <div className="banner banner-warning" style={{ marginTop: '16px' }}>
            <AlertTriangle size={20} />
            <div>
              <div className="banner-title">{lang === 'en' ? 'Upload Notice' : 'আপলোড সতর্কতা'}</div>
              <div className="banner-desc">{uploadWarning}</div>
            </div>
          </div>
        )}

        {/* Uploaded Files Chips */}
        {Object.keys(filesData).length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
              {t.uploadedFilesCount} ({Object.keys(filesData).length})
            </div>
            <div className="files-grid">
              {Object.values(filesData).map(file => {
                const isDup = duplicatesMap[file.name]?.isDuplicate;
                const copies = duplicatesMap[file.name]?.copies || [];
                return (
                  <div key={file.name} className={`file-chip ${isDup ? 'is-duplicate' : ''}`}>
                    <div className="file-chip-info">
                      <FileText className="file-chip-icon" />
                      <div>
                        <div className="file-chip-name" title={file.name}>{file.name}</div>
                        <div className="file-chip-meta">
                          {file.pageCount} {t.pages} • {(file.size / 1024).toFixed(1)} KB
                        </div>
                        {isDup && (
                          <div className="badge badge-duplicate-warn" style={{ marginTop: '4px' }}>
                            {t.duplicateBadge}: {copies[0]}
                          </div>
                        )}
                        {file.isCorrupted && (
                          <div className="badge badge-expired" style={{ marginTop: '4px' }}>
                            {t.corruptedPdf}
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      className="chip-remove-btn" 
                      onClick={() => handleRemoveFile(file.name)}
                      title={t.removeFile}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: Matching & Verification Checklist */}
      <section className="card">
        <div className="card-title-bar">
          <div>
            <div className="card-title">
              <CheckCircle2 size={20} color="#2563eb" />
              {t.checklistTitle}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {t.checklistSubtitle}
            </div>
          </div>
        </div>

        <div className="checklist-container">
          <table className="checklist-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>{t.order}</th>
                <th>{t.documentName}</th>
                <th style={{ width: '110px' }}>{t.type}</th>
                <th style={{ minWidth: '240px' }}>{t.matchedFile}</th>
                <th style={{ minWidth: '170px' }}>{t.expiryDate}</th>
                <th style={{ width: '160px' }}>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {evaluatedRequirements.map((item) => {
                const title = lang === 'bn' ? (item.title_bn || item.title_en) : (item.title_en || item.title_bn);
                const hasFile = !!item.matchedFileName;
                
                return (
                  <tr key={item.id}>
                    {/* Order */}
                    <td style={{ fontWeight: 600, color: '#64748b' }}>#{item.order}</td>
                    
                    {/* Document Name */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{title}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        ID: {item.id} {item.has_expiry && `• Expiry tracked`}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td>
                      <span className={`badge ${item.mandatory ? 'badge-mandatory' : 'badge-optional'}`}>
                        {item.mandatory ? t.mandatory : t.optional}
                      </span>
                    </td>

                    {/* Matched File Dropdown */}
                    <td>
                      <select 
                        className="select-input"
                        value={item.matchedFileName || ''}
                        onChange={(e) => handleMatchChange(item.id, e.target.value)}
                      >
                        <option value="">{t.selectFilePlaceholder}</option>
                        {Object.values(filesData).map(file => {
                          const disabled = isFileOptionDisabled(file.name, item.id);
                          const isCurrent = item.matchedFileName === file.name;
                          return (
                            <option 
                              key={file.name} 
                              value={file.name} 
                              disabled={disabled && !isCurrent}
                            >
                              {file.name} ({file.pageCount} p)
                              {disabled && !isCurrent ? ` - ${t.fileAlreadyMatched}` : ''}
                            </option>
                          );
                        })}
                      </select>
                      {hasFile && (
                        <button 
                          style={{
                            background: 'none', border: 'none', color: '#64748b', 
                            fontSize: '11px', cursor: 'pointer', marginLeft: '8px', textDecoration: 'underline'
                          }}
                          onClick={() => handleMatchChange(item.id, '')}
                        >
                          {t.unmatch}
                        </button>
                      )}
                    </td>

                    {/* Expiry Date Input (Task 4.4) */}
                    <td>
                      {item.has_expiry ? (
                        <div>
                          <input 
                            type="date" 
                            className="date-input"
                            value={item.expiryDate || ''}
                            disabled={!hasFile}
                            onChange={(e) => handleExpiryChange(item.id, e.target.value)}
                          />
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Deadline: {tenderData.tender?.submission_deadline}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                      )}
                    </td>

                    {/* Status Badge (Section 5) */}
                    <td>
                      {item.status === 'OK' && (
                        <span className="badge badge-ok">
                          <CheckCircle2 size={13} /> {t.statusOk}
                        </span>
                      )}
                      {item.status === 'Missing' && (
                        <span className="badge badge-missing">
                          <XCircle size={13} /> {t.statusMissing}
                        </span>
                      )}
                      {item.status === 'Expiry date needed' && (
                        <span className="badge badge-needed">
                          <Clock size={13} /> {t.statusExpiryNeeded}
                        </span>
                      )}
                      {item.status === 'Expired' && (
                        <span className="badge badge-expired">
                          <AlertTriangle size={13} /> {t.statusExpired}
                        </span>
                      )}
                      {item.status === 'Not provided' && (
                        <span className="badge badge-optional">
                          {t.statusNotProvided}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 4: Seal / Signature Upload (Optional Bonus) */}
      <section className="card">
        <div className="card-title-bar">
          <div>
            <div className="card-title">
              <Sparkles size={20} color="#2563eb" />
              {t.sealUploadTitle}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {t.sealUploadSubtitle}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '16px' }}>
          <div>
            <button className="btn btn-outline" onClick={() => sealInputRef.current?.click()}>
              <Upload size={16} />
              {t.sealImagePlaceholder}
            </button>
            <input 
              type="file" 
              ref={sealInputRef} 
              style={{ display: 'none' }} 
              accept=".png,image/png" 
              onChange={handleSealUpload} 
            />
            {sealFile && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                {sealFile.name} 
                <button 
                  style={{ background: 'none', border: 'none', color: '#ef4444', marginLeft: '10px', cursor: 'pointer' }}
                  onClick={() => setSealFile(null)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
          {sealFile && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                {t.pagesToStampLabel}
              </label>
              <input 
                type="text" 
                className="select-input"
                style={{ width: '100%', maxWidth: '300px' }}
                value={sealPages}
                onChange={(e) => setSealPages(e.target.value)}
                placeholder="all, 1, 3, 5"
              />
            </div>
          )}
          {sealFile && (
            <img src={sealFile.url} alt="Seal Preview" style={{ maxWidth: '100px', maxHeight: '60px', objectFit: 'contain', border: '1px dashed #cbd5e1', padding: '4px' }} />
          )}
        </div>
      </section>

      {/* SECTION 4: Validation Banner & Package Generator Bar */}
      {blockingIssues.length > 0 ? (
        <div className="banner banner-danger">
          <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div className="banner-title">{t.blockingBannerTitle} ({blockingIssues.length})</div>
            <div className="banner-desc">{t.blockingBannerDesc}</div>
            <ul className="banner-list">
              {blockingIssues.map(issue => (
                <li key={issue.id}>
                  {lang === 'bn' ? issue.reasonBn : issue.reasonEn}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="banner banner-success">
          <CheckCircle2 size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div className="banner-title">{t.readyBannerTitle}</div>
            <div className="banner-desc">{t.readyBannerDesc}</div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <div className="actions-bar">
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>
            {tenderData.tender?.tender_id || 'Tender'} Package
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {canGenerate 
              ? t.allResolved
              : `${blockingIssues.length} blocking issues remaining`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {generatedPdfUrl && (
            <>
              <button 
                className="btn btn-outline" 
                onClick={() => setPreviewOpen(true)}
              >
                <Eye size={17} />
                {t.previewBtn}
              </button>

              <button 
                className="btn btn-success" 
                onClick={handleDownload}
              >
                <Download size={17} />
                {t.downloadPackageBtn} ({tenderData.tender?.tender_id}_Package.pdf)
              </button>
            </>
          )}

          <button 
            className="btn btn-primary btn-lg"
            disabled={!canGenerate || isGenerating}
            onClick={handleGeneratePackage}
          >
            <Layers size={18} />
            {isGenerating ? t.generatingPackage : t.generatePackageBtn}
          </button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewOpen && generatedPdfUrl && (
        <div className="preview-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <div style={{ fontWeight: 700, fontSize: '16px' }}>
                {tenderData.tender?.tender_id}_Package.pdf Preview
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={handleDownload}>
                  <Download size={16} />
                  {t.downloadPackageBtn}
                </button>
                <button className="btn btn-outline" onClick={() => setPreviewOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <iframe 
              src={generatedPdfUrl} 
              className="preview-iframe" 
              title="PDF Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
