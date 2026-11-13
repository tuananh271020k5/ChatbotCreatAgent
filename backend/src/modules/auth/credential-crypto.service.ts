import { Injectable, Logger } from '@nestjs/common';
import { decryptAesGcm, encryptAesGcm, type EncryptedPayload } from './crypto.util';

@Injectable()
export class CredentialCryptoService {
  private readonly logger = new Logger(CredentialCryptoService.name);
  private readonly keyRing = new Map<number, string>();
  private currentVersion = 1;

  constructor() {
    this.initializeKeyring();
  }

  private initializeKeyring(): void {
    const rawKeyring = process.env.APPLICATION_KEYRING;
    if (rawKeyring) {
      try {
        const parsed = JSON.parse(rawKeyring) as Record<string, string>;
        for (const [ver, key] of Object.entries(parsed)) {
          const v = Number(ver);
          this.keyRing.set(v, key);
          if (v > this.currentVersion) {
            this.currentVersion = v;
          }
        }
      } catch {
        // Nếu không phải JSON, coi là 1 key hex duy nhất
        this.keyRing.set(1, rawKeyring);
      }
    } else {
      // Fallback key cho dev local / test nếu chưa set env
      const fallbackKey =
        process.env.APP_SECRET_KEY ??
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      this.keyRing.set(1, fallbackKey);
    }
  }

  encrypt(plaintext: string): EncryptedPayload {
    const key = this.keyRing.get(this.currentVersion);
    if (!key) {
      throw new Error(`Không tìm thấy khóa mã hóa phiên bản hiện hành: ${this.currentVersion}`);
    }
    return encryptAesGcm(plaintext, key, this.currentVersion);
  }

  decrypt(payload: EncryptedPayload): string {
    const key = this.keyRing.get(payload.keyVersion);
    if (!key) {
      throw new Error(`Không tìm thấy khóa giải mã cho phiên bản: ${payload.keyVersion}`);
    }
    try {
      return decryptAesGcm(payload, key);
    } catch (cause) {
      this.logger.error('Giải mã thất bại do sai tag hoặc sai khóa', cause);
      throw new Error('Dữ liệu mã hóa không hợp lệ hoặc bị can thiệp', { cause });
    }
  }

  rotateCredential(
    payload: EncryptedPayload,
    targetVersion = this.currentVersion,
  ): EncryptedPayload {
    if (payload.keyVersion === targetVersion) {
      return payload; // Đã ở version mới nhất
    }
    const decrypted = this.decrypt(payload);
    const newKey = this.keyRing.get(targetVersion);
    if (!newKey) {
      throw new Error(`Không tìm thấy khóa mục tiêu phiên bản: ${targetVersion}`);
    }
    return encryptAesGcm(decrypted, newKey, targetVersion);
  }

  getCurrentVersion(): number {
    return this.currentVersion;
  }
}
