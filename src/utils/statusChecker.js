/**
 * Evaluates the status of a requirement according to Section 5.
 * 
 * Statuses:
 * - Missing: Required document, no file matched (Blocking: Yes)
 * - Expiry date needed: has_expiry = true and a file is matched, but no expiry date entered (Blocking: Yes)
 * - Expired: Expiry date is strictly before submission deadline (Blocking: Yes)
 * - Not provided: Optional document, no file matched (Blocking: No)
 * - OK: File matched, and (if has_expiry) expiry date is on or after submission deadline (Blocking: No)
 */
export function evaluateRequirementStatus({ req, matchedFileName, expiryDate, submissionDeadline }) {
  if (!matchedFileName) {
    if (req.mandatory) {
      return {
        status: 'Missing',
        isBlocking: true,
        reasonEn: `Mandatory document "${req.title_en}" has no file matched.`,
        reasonBn: `বাধ্যতামূলক ডকুমেন্ট "${req.title_bn}" এ কোনো ফাইল যুক্ত করা হয়নি।`
      };
    } else {
      return {
        status: 'Not provided',
        isBlocking: false,
        reasonEn: `Optional document "${req.title_en}" is omitted.`,
        reasonBn: `ঐচ্ছিক ডকুমেন্ট "${req.title_bn}" প্রদান করা হয়নি।`
      };
    }
  }

  // File is matched
  if (req.has_expiry) {
    if (!expiryDate || expiryDate.trim() === '') {
      return {
        status: 'Expiry date needed',
        isBlocking: true,
        reasonEn: `Expiry date required for "${req.title_en}".`,
        reasonBn: `"${req.title_bn}" এর জন্য মেয়াদ উত্তীর্ণের তারিখ আবশ্যক।`
      };
    }

    // Compare date strings (YYYY-MM-DD format works lexicographically)
    const normExpiry = expiryDate.trim();
    const normDeadline = (submissionDeadline || '').trim();

    if (normDeadline && normExpiry < normDeadline) {
      return {
        status: 'Expired',
        isBlocking: true,
        reasonEn: `"${req.title_en}" expires on ${normExpiry}, which is before the deadline ${normDeadline}.`,
        reasonBn: `"${req.title_bn}" এর মেয়াদ ${normExpiry} তারিখে শেষ হবে, যা জমার শেষ তারিখ ${normDeadline} এর পূর্বে।`
      };
    }
  }

  return {
    status: 'OK',
    isBlocking: false,
    reasonEn: null,
    reasonBn: null
  };
}

/**
 * Computes SHA-256 hash of an ArrayBuffer using Web Crypto API.
 */
export async function computeFileHash(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Identifies duplicate files by hash and returns a duplicate analysis map.
 */
export function identifyDuplicates(filesList) {
  const hashToFiles = new Map();
  
  for (const file of filesList) {
    if (!file.hash) continue;
    if (!hashToFiles.has(file.hash)) {
      hashToFiles.set(file.hash, []);
    }
    hashToFiles.get(file.hash).push(file.name);
  }

  const duplicatesMap = {};
  for (const [hash, fileNames] of hashToFiles.entries()) {
    if (fileNames.length > 1) {
      for (const name of fileNames) {
        duplicatesMap[name] = {
          isDuplicate: true,
          copies: fileNames.filter(n => n !== name)
        };
      }
    }
  }

  return duplicatesMap;
}
