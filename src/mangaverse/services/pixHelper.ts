/**
 * Pix Helper for NipponBR
 * Generates standard Banco Central do Brasil BR Code (EMV TLV) for "Pix Copia e Cola"
 * and real camera-scannable QR Codes for user donations.
 */

export interface PixPayloadOptions {
  key: string;
  amount?: number;
  merchantName?: string;
  merchantCity?: string;
  txId?: string;
}

export const OFFICIAL_PIX_KEY = '4970bdb1-d6e0-4a23-9d06-365d1f89687c';
export const DEFAULT_MERCHANT_NAME = 'NipponBR Apoio';
export const DEFAULT_MERCHANT_CITY = 'SAO PAULO';

/**
 * Standard TLV (Tag-Length-Value) formatting for EMVCo / BR Code
 */
function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normalizes strings by removing accents and illegal characters for Pix EMV
 */
function normalizeAscii(text: string, maxLen: number): string {
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
  return clean.slice(0, maxLen);
}

/**
 * Calculates standard CRC16 CCITT-FALSE (0x1021, init 0xFFFF)
 * Required by Banco Central do Brasil for all Pix QR Codes
 */
export function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates the official Banco Central "Pix Copia e Cola" string
 */
export function generatePixPayload(options: PixPayloadOptions): string {
  const rawKey = options.key?.trim() || OFFICIAL_PIX_KEY;
  const merchantName = normalizeAscii(options.merchantName || DEFAULT_MERCHANT_NAME, 25) || 'MANGAVERSE';
  const merchantCity = normalizeAscii(options.merchantCity || DEFAULT_MERCHANT_CITY, 15) || 'SAO PAULO';
  const txId = options.txId ? normalizeAscii(options.txId, 25) : '***';

  // 00 - Payload Format Indicator (01)
  let payload = formatTLV('00', '01');

  // 26 - Merchant Account Information (Pix)
  const gui = formatTLV('00', 'BR.GOV.BCB.PIX');
  const keyField = formatTLV('01', rawKey);
  payload += formatTLV('26', `${gui}${keyField}`);

  // 52 - Merchant Category Code
  payload += formatTLV('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  payload += formatTLV('53', '986');

  // 54 - Transaction Amount (Optional in Pix)
  if (options.amount && options.amount > 0) {
    const formattedAmount = options.amount.toFixed(2);
    payload += formatTLV('54', formattedAmount);
  }

  // 58 - Country Code (BR)
  payload += formatTLV('58', 'BR');

  // 59 - Merchant Name
  payload += formatTLV('59', merchantName);

  // 60 - Merchant City
  payload += formatTLV('60', merchantCity);

  // 62 - Additional Data Field Template (txid)
  const txIdField = formatTLV('05', txId);
  payload += formatTLV('62', txIdField);

  // 63 - CRC16: append header "6304" then compute checksum
  const payloadWithCrcHeader = `${payload}6304`;
  const checksum = calculateCRC16(payloadWithCrcHeader);

  return `${payloadWithCrcHeader}${checksum}`;
}

/**
 * Generates dynamic high-res QR code image URL for scanning
 */
export function getPixQrCodeUrl(payload: string, size = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(payload)}&color=09090b`;
}

/**
 * Formats a UUID or random Pix key for readable visual display
 */
export function formatPixDisplayKey(key: string): string {
  if (!key) return OFFICIAL_PIX_KEY;
  // If it's a UUID, verify segment structure
  const uuidMatch = key.match(/^([a-f0-9]{8})-([a-f0-9]{4})-([a-f0-9]{4})-([a-f0-9]{4})-([a-f0-9]{12})$/i);
  if (uuidMatch) {
    return key.toLowerCase();
  }
  return key;
}
