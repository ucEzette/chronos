// ENTERPRISE-GRADE FILE VALIDATION & SECURITY SCANNER

const MAGIC_NUMBERS: Record<string, string> = {
  'ffd8ff': 'image/jpeg',
  '89504e47': 'image/png',
  '25504446': 'application/pdf',
  '494433': 'audio/mp3', // ID3 tag
  'fffb': 'audio/mp3',     // MPEG frame
  '52494646': 'audio/wav', // RIFF
  '00000018': 'video/mp4', // ftyp
  '00000020': 'video/mp4',
  '66747970': 'video/mp4',
};

// Dangerous signatures (Executables, Scripts)
const BLACKLIST_SIGNATURES = [
  '4d5a', // .exe (DOS MZ)
  '7f454c46', // ELF (Linux Binary)
  'cafebabe', // Java Class
];

const blobToHexString = async (blob: Blob, length: number = 4): Promise<string> => {
  const arrayBuffer = await blob.slice(0, length).arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase();
};

export const scanFile = async (file: File): Promise<{ safe: boolean; error?: string; detectedType?: string }> => {
  const header = await blobToHexString(file, 4);

  // 1. Check Blacklist (Virus/Malware blocking)
  if (BLACKLIST_SIGNATURES.some(sig => header.startsWith(sig))) {
    return { safe: false, error: "Security Alert: Executable files are not permitted." };
  }

  // 2. Validate Extension vs Content (Anti-Spoofing)
  // e.g., prevents "virus.exe" renamed to "image.jpg"
  let isValid = true;
  let detectedType = 'unknown';

  if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
    isValid = header.startsWith('ffd8ff');
    detectedType = 'image/jpeg';
  } else if (file.name.endsWith('.png')) {
    isValid = header.startsWith('89504e47');
    detectedType = 'image/png';
  } else if (file.name.endsWith('.pdf')) {
    isValid = header.startsWith('25504446');
    detectedType = 'application/pdf';
  }
  
  // Audio/Video allow looser checks due to variable headers, but we block executables above.
  
  if (!isValid) {
    return { 
      safe: false, 
      error: `File spoofing detected. This file claims to be ${file.type} but the binary header does not match.` 
    };
  }

  return { safe: true, detectedType };
};