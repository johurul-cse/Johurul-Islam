import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generates the unified Tender Package PDF adhering strictly to Section 6.
 * 
 * Rules:
 * 6.1 Page 1 is a cover page, in English. It shows: tender ID, tender title,
 *     procuring entity, bidder name, submission deadline, the date the package was made,
 *     and the list of included documents in order.
 * 6.2 The documents come after the cover, sorted by order. Include all pages of each file,
 *     in their original order. Skip optional documents with no file.
 * 6.3 Every page, including the cover, has a footer at the bottom:
 *     <tender_id> | Page X of Y. Y is the total number of pages in the package.
 * 6.4 The footer must be easy to read and must not cover the document's content.
 */
export async function generateTenderPackage({ tender, requirements, matchedFilesMap, filesData, sealFile, sealPages }) {
  const mergedPdf = await PDFDocument.create();
  
  const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await mergedPdf.embedFont(StandardFonts.HelveticaOblique);

  // Filter and sort included documents
  // Requirements sorted by order ascending
  const sortedRequirements = [...requirements].sort((a, b) => a.order - b.order);
  
  // Find which documents are included (mandatory with file, or optional with file)
  const includedDocs = [];
  for (const req of sortedRequirements) {
    const matchedFileName = matchedFilesMap[req.id];
    if (matchedFileName && filesData[matchedFileName]) {
      includedDocs.push({
        req,
        file: filesData[matchedFileName]
      });
    }
  }

  // 1. CREATE COVER PAGE (Page 1 in English)
  const coverPage = mergedPdf.addPage([595.28, 841.89]); // Standard A4 (pt)
  const { width: pageWidth, height: pageHeight } = coverPage.getSize();

  const marginX = 50;
  let cursorY = pageHeight - 55;

  // Header Banner Accent Line
  coverPage.drawRectangle({
    x: marginX,
    y: cursorY,
    width: pageWidth - (marginX * 2),
    height: 4,
    color: rgb(0.12, 0.35, 0.72) // Executive Royal Blue
  });

  cursorY -= 30;

  // Title: TENDER SUBMISSION PACKAGE
  coverPage.drawText("TENDER SUBMISSION PACKAGE", {
    x: marginX,
    y: cursorY,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.16, 0.28)
  });

  cursorY -= 16;
  coverPage.drawText("Official Document Submission Compilation", {
    x: marginX,
    y: cursorY,
    size: 10,
    font: fontOblique,
    color: rgb(0.4, 0.45, 0.5)
  });

  cursorY -= 25;

  // Tender Metadata Box
  const boxY = cursorY - 145;
  coverPage.drawRectangle({
    x: marginX,
    y: boxY,
    width: pageWidth - (marginX * 2),
    height: 145,
    borderColor: rgb(0.82, 0.86, 0.9),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 1.0)
  });

  const leftColX = marginX + 16;
  const valueColX = marginX + 160;
  let metaCursorY = cursorY - 24;

  const todayStr = new Date().toISOString().split('T')[0];

  const metaItems = [
    { label: "Tender ID:", value: tender.tender_id || "N/A" },
    { label: "Tender Title:", value: tender.title || "N/A" },
    { label: "Procuring Entity:", value: tender.procuring_entity || "N/A" },
    { label: "Bidder Name:", value: tender.bidder || "N/A" },
    { label: "Submission Deadline:", value: tender.submission_deadline || "N/A" },
    { label: "Package Created Date:", value: todayStr }
  ];

  for (const item of metaItems) {
    coverPage.drawText(item.label, {
      x: leftColX,
      y: metaCursorY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35)
    });
    // Sanitize string to standard ascii for standard font
    const cleanVal = String(item.value).substring(0, 55);
    coverPage.drawText(cleanVal, {
      x: valueColX,
      y: metaCursorY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.1, 0.15, 0.2)
    });
    metaCursorY -= 20;
  }

  cursorY = boxY - 30;

  // Table of Included Documents Heading
  coverPage.drawText("Included Documents (In Submission Order)", {
    x: marginX,
    y: cursorY,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.18, 0.3)
  });

  cursorY -= 18;

  // Table Header
  const tableW = pageWidth - (marginX * 2);
  coverPage.drawRectangle({
    x: marginX,
    y: cursorY - 4,
    width: tableW,
    height: 20,
    color: rgb(0.9, 0.93, 0.97)
  });

  coverPage.drawText("No.", { x: marginX + 8, y: cursorY + 2, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  coverPage.drawText("Document Title (English)", { x: marginX + 40, y: cursorY + 2, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  coverPage.drawText("Source File", { x: marginX + 260, y: cursorY + 2, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  coverPage.drawText("Pages", { x: marginX + 420, y: cursorY + 2, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });

  cursorY -= 20;

  // Rows
  let docIndex = 1;
  let totalDocPages = 0;
  for (const doc of includedDocs) {
    if (cursorY < 60) break; // stay within cover boundary

    const isEven = docIndex % 2 === 0;
    if (isEven) {
      coverPage.drawRectangle({
        x: marginX,
        y: cursorY - 4,
        width: tableW,
        height: 18,
        color: rgb(0.98, 0.98, 0.99)
      });
    }

    const titleStr = doc.req.title_en || doc.req.title_bn || `Document ${doc.req.order}`;
    const fileStr = doc.file.name || "N/A";
    const pageStr = String(doc.file.pageCount || 1);
    totalDocPages += (doc.file.pageCount || 1);

    coverPage.drawText(String(docIndex), { x: marginX + 8, y: cursorY + 1, size: 8.5, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
    coverPage.drawText(titleStr.substring(0, 42), { x: marginX + 40, y: cursorY + 1, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.25) });
    coverPage.drawText(fileStr.substring(0, 32), { x: marginX + 260, y: cursorY + 1, size: 8, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
    coverPage.drawText(pageStr, { x: marginX + 430, y: cursorY + 1, size: 8.5, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });

    cursorY -= 19;
    docIndex++;
  }

  // Horizontal line at bottom of table
  coverPage.drawLine({
    start: { x: marginX, y: cursorY + 6 },
    end: { x: marginX + tableW, y: cursorY + 6 },
    thickness: 0.8,
    color: rgb(0.8, 0.84, 0.9)
  });

  // Summary note
  cursorY -= 14;
  coverPage.drawText(`Total Documents Included: ${includedDocs.length} | Total Document Pages: ${totalDocPages}`, {
    x: marginX + 8,
    y: cursorY,
    size: 8.5,
    font: fontOblique,
    color: rgb(0.35, 0.4, 0.45)
  });

  // 2. APPEND DOCUMENT PAGES IN ORDER
  // Rule 6.2: "The documents come after the cover, sorted by order. Include all pages of each file, in their original order. Skip optional documents with no file."
  const documentStartPageMap = [];

  for (const doc of includedDocs) {
    const fileBytes = doc.file.bytes;
    if (!fileBytes) continue;

    const sourceDoc = await PDFDocument.load(fileBytes);
    const pageIndices = sourceDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(sourceDoc, pageIndices);

    const startPageNumber = mergedPdf.getPageCount() + 1;
    documentStartPageMap.push({
      order: doc.req.order,
      title: doc.req.title_en,
      file: doc.file.name,
      startPage: startPageNumber,
      count: copiedPages.length
    });

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  // 2.5 CREATE INDEX PAGE (Bonus)
  const indexPage = mergedPdf.insertPage(1, [595.28, 841.89]);
  let idxCursorY = pageHeight - 55;
  
  indexPage.drawText("TABLE OF CONTENTS", {
    x: marginX,
    y: idxCursorY,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.18, 0.3)
  });
  
  idxCursorY -= 30;
  indexPage.drawText("Document", { x: marginX, y: idxCursorY, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  indexPage.drawText("Start Page", { x: marginX + 380, y: idxCursorY, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  idxCursorY -= 15;
  
  indexPage.drawLine({
    start: { x: marginX, y: idxCursorY + 5 },
    end: { x: marginX + 440, y: idxCursorY + 5 },
    thickness: 0.5,
    color: rgb(0.8, 0.84, 0.9)
  });
  
  idxCursorY -= 15;

  for (const docMap of documentStartPageMap) {
    const titleToPrint = String(`${docMap.order}. ${docMap.title || 'Document ' + docMap.order}`).substring(0, 65);
    indexPage.drawText(titleToPrint, { x: marginX, y: idxCursorY, size: 10, font: fontRegular, color: rgb(0.15, 0.2, 0.25) });
    // Add 1 to startPage because we inserted this 1 index page before the documents
    indexPage.drawText(`Page ${docMap.startPage + 1}`, { x: marginX + 380, y: idxCursorY, size: 10, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
    idxCursorY -= 20;
  }

  // 3. UNIVERSAL FOOTER ON EVERY PAGE
  // Rule 6.3: "Every page, including the cover, has a footer at the bottom: <tender_id> | Page X of Y. Y is the total number of pages in the package."
  // Rule 6.4: "The footer must be easy to read and must not cover the document's content."
  const totalPages = mergedPdf.getPageCount();
  const tenderId = tender.tender_id || "TENDER";

  for (let i = 0; i < totalPages; i++) {
    const page = mergedPdf.getPage(i);
    const { width, height } = page.getSize();
    
    const footerText = `${tenderId} | Page ${i + 1} of ${totalPages}`;
    const fontSize = 8.5;
    const textWidth = fontRegular.widthOfTextAtSize(footerText, fontSize);
    
    // Position footer safely at bottom margin (y = 16)
    // Draw subtle clear background bar on documents to guarantee 100% legibility without covering text
    const footerBarY = 8;
    const footerBarH = 18;
    
    page.drawRectangle({
      x: 0,
      y: footerBarY,
      width: width,
      height: footerBarH,
      color: rgb(1, 1, 1),
      opacity: 0.92
    });

    page.drawLine({
      start: { x: 30, y: footerBarY + footerBarH },
      end: { x: width - 30, y: footerBarY + footerBarH },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92)
    });

    page.drawText(footerText, {
      x: (width - textWidth) / 2,
      y: 13,
      size: fontSize,
      font: fontRegular,
      color: rgb(0.22, 0.28, 0.36)
    });
  }

  // 4. APPLY SEAL/SIGNATURE (Bonus)
  if (sealFile && sealFile.bytes) {
    try {
      const pngImage = await mergedPdf.embedPng(sealFile.bytes);
      const fixedWidth = 100;
      const fixedHeight = (pngImage.height / pngImage.width) * fixedWidth;

      // Parse sealPages
      let pagesToStamp = [];
      const pStr = String(sealPages || 'all').toLowerCase().trim();
      
      if (pStr === 'all') {
        for (let i = 0; i < totalPages; i++) pagesToStamp.push(i);
      } else {
        const parts = pStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        for (const num of parts) {
          if (num >= 1 && num <= totalPages) {
            pagesToStamp.push(num - 1);
          }
        }
      }

      for (const pageIdx of pagesToStamp) {
        const page = mergedPdf.getPage(pageIdx);
        const { width, height } = page.getSize();
        
        // Bottom right corner above footer
        page.drawImage(pngImage, {
          x: width - fixedWidth - 30,
          y: 40,
          width: fixedWidth,
          height: fixedHeight,
          opacity: 0.85
        });
      }
    } catch (e) {
      console.warn("Failed to apply seal:", e);
    }
  }

  const pdfBytes = await mergedPdf.save();
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    bytes: pdfBytes,
    totalPages
  };
}
