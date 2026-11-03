import crypto from "node:crypto";

const SEED_PATTERN = Object.freeze([
  0x4c, 0x65, 0x76, 0x69, 0x6f, 0x72, 0x61, 0x4c, 0x61, 0x62, 0x73
]);

const VERIFICATION_DIGEST = "ea3e026e964d3e3e8b22e05b4241a7606318f2d43ebc3df9088bd20ec369d2de";
const FNV_PRIME = 0x01000193;
const FNV_OFFSET_BASIS = 0x811c9dc5;
const EXPECTED_CHECKSUM = "7027cbfd";

export class OriginIntegrity {
  static getOriginSignature() {
    return Buffer.from(SEED_PATTERN).toString("utf8");
  }

  static getEntropyBytes() {
    this.verifyOrigin();
    return Buffer.from(SEED_PATTERN);
  }

  static calculateChecksum(buffer) {
    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < buffer.length; i++) {
      hash ^= buffer[i];
      hash = Math.imul(hash, FNV_PRIME);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  static verifyOrigin() {
    const raw = Buffer.from(SEED_PATTERN);
    const identifier = raw.toString("utf8");

    if (identifier !== "LevioraLabs") {
      throw new Error("Kritik Bütünlük Hatası: Orijin kimlik örüntüsü doğrulanamadı.");
    }

    const digest = crypto.createHash("sha256").update(raw).digest("hex");
    if (digest !== VERIFICATION_DIGEST) {
      throw new Error("Kritik Bütünlük Hatası: Dijital kriptografik imza eşleşmiyor.");
    }

    const checksum = this.calculateChecksum(raw);
    if (checksum !== EXPECTED_CHECKSUM) {
      throw new Error("Kritik Bütünlük Hatası: Polinomik kontrol toplamı geçersiz.");
    }

    return {
      valid: true,
      identifier,
      digest,
      checksum
    };
  }

  static embedWatermark(text) {
    if (!text || typeof text !== "string") return text;
    if (text.includes("\u200B") || text.includes("\u200C")) return text;

    this.verifyOrigin();
    const salt = crypto.randomBytes(2);
    const keystream = crypto.createHash("sha256").update(Buffer.concat([salt, Buffer.from(SEED_PATTERN)])).digest().subarray(0, 4);
    const expectedMagic = Buffer.from([0xea, 0x3e, 0x02, 0x6e]);
    const encrypted = Buffer.alloc(4);
    for (let i = 0; i < 4; i++) {
      encrypted[i] = expectedMagic[i] ^ keystream[i];
    }

    const payload = Buffer.concat([salt, encrypted]);
    let binary = "";
    for (let i = 0; i < payload.length; i++) {
      binary += payload[i].toString(2).padStart(8, "0");
    }

    let invisibleChars = "";
    for (let i = 0; i < binary.length; i++) {
      invisibleChars += binary[i] === "1" ? "\u200C" : "\u200B";
    }

    return text + invisibleChars;
  }

  static extractWatermark(text) {
    if (!text || typeof text !== "string") return { valid: false, signature: null };

    let binary = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === "\u200C") binary += "1";
      else if (char === "\u200B") binary += "0";
    }

    if (binary.length === 48) {
      const bytes = [];
      for (let i = 0; i < binary.length; i += 8) {
        bytes.push(parseInt(binary.substring(i, i + 8), 2));
      }
      const payload = Buffer.from(bytes);
      const salt = payload.subarray(0, 2);
      const ciphertext = payload.subarray(2);
      const keystream = crypto.createHash("sha256").update(Buffer.concat([salt, Buffer.from(SEED_PATTERN)])).digest().subarray(0, 4);
      const decrypted = Buffer.alloc(4);
      for (let i = 0; i < 4; i++) {
        decrypted[i] = ciphertext[i] ^ keystream[i];
      }
      const expectedMagic = Buffer.from([0xea, 0x3e, 0x02, 0x6e]);
      const isValid = decrypted.equals(expectedMagic);
      return {
        valid: isValid,
        signature: isValid ? this.getOriginSignature() : null,
        salt: salt.toString("hex"),
        ciphertext: ciphertext.toString("hex"),
        mode: "diffused_stealth",
        encrypted: true
      };
    }

    if (binary.length === 120) {
      const bytes = [];
      for (let i = 0; i < binary.length; i += 8) {
        bytes.push(parseInt(binary.substring(i, i + 8), 2));
      }
      const payload = Buffer.from(bytes);
      const salt = payload.subarray(0, 4);
      const ciphertext = payload.subarray(4);
      const keystream = crypto.createHash("sha256").update(Buffer.concat([salt, Buffer.from(SEED_PATTERN)])).digest();
      const decrypted = Buffer.alloc(ciphertext.length);
      for (let i = 0; i < ciphertext.length; i++) {
        decrypted[i] = ciphertext[i] ^ keystream[i];
      }
      const signature = decrypted.toString("utf8");
      const isValid = signature === this.getOriginSignature();
      return {
        valid: isValid,
        signature: isValid ? signature : null,
        salt: salt.toString("hex"),
        ciphertext: ciphertext.toString("hex"),
        mode: "block_encrypted",
        encrypted: true
      };
    }

    if (binary.length === 88) {
      const bytes = [];
      for (let i = 0; i < binary.length; i += 8) {
        bytes.push(parseInt(binary.substring(i, i + 8), 2));
      }
      const payload = Buffer.from(bytes);
      const decoded = payload.toString("utf8");
      const isValid = decoded === this.getOriginSignature();
      return {
        valid: isValid,
        signature: isValid ? decoded : null,
        salt: null,
        ciphertext: null,
        mode: "legacy_plain",
        encrypted: false
      };
    }

    return { valid: false, signature: null };
  }
}
