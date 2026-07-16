import bcrypt from "bcryptjs";
import { md5 } from "@noble/hashes/legacy.js";
import { utf8ToBytes, concatBytes } from "@noble/hashes/utils.js";

// phpass (WordPress pre-6.8 / Drupal 7 / phpBB3) portable hash alphabet.
const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function encode64(input: Uint8Array, count: number): string {
  let output = "";
  let i = 0;
  while (i < count) {
    let value = input[i++];
    output += ITOA64[value & 0x3f];
    if (i < count) value |= input[i] << 8;
    output += ITOA64[(value >> 6) & 0x3f];
    if (i++ >= count) break;
    if (i < count) value |= input[i] << 16;
    output += ITOA64[(value >> 12) & 0x3f];
    if (i++ >= count) break;
    output += ITOA64[(value >> 18) & 0x3f];
  }
  return output;
}

function verifyPhpass(password: string, hash: string): boolean {
  const countLog2 = ITOA64.indexOf(hash[3]);
  if (countLog2 < 7 || countLog2 > 30) return false;
  const salt = hash.slice(4, 12);
  const count = 1 << countLog2;
  const passwordBytes = utf8ToBytes(password);
  let checksum = md5(concatBytes(utf8ToBytes(salt), passwordBytes));
  for (let i = 0; i < count; i++) {
    checksum = md5(concatBytes(checksum, passwordBytes));
  }
  return hash.slice(0, 12) + encode64(checksum, 16) === hash;
}

// True for password hashes carried over from the old WordPress/WooCommerce site:
// WP 6.8+ bcrypt (prefixed "$wp$") or the legacy phpass ($P$/$H$) format.
export function isLegacyHash(hash: string): boolean {
  return hash.startsWith("$wp$2y$") || /^\$2[aby]\$/.test(hash) || /^\$[PH]\$/.test(hash);
}

export async function verifyLegacyPassword(hash: string, password: string): Promise<boolean> {
  if (hash.startsWith("$wp$2y$")) {
    // WordPress namespaces its bcrypt hashes with a "$wp$" prefix over an
    // otherwise-standard bcrypt hash; strip it to get a "$2y$..." bcryptjs can read.
    return bcrypt.compare(password, hash.slice(3));
  }
  if (/^\$2[aby]\$/.test(hash)) {
    return bcrypt.compare(password, hash);
  }
  if (/^\$[PH]\$/.test(hash)) {
    return verifyPhpass(password, hash);
  }
  return false;
}
