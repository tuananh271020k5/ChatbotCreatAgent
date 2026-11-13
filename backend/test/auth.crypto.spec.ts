import { describe, expect, it } from 'vitest';
import {
  decryptAesGcm,
  encryptAesGcm,
  generateOpaqueToken,
  generatePkce,
  hashToken,
} from '../src/modules/auth/crypto.util';

describe('Auth Crypto Utilities', () => {
  const sampleKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('hashToken trả về chuỗi SHA-256 hex có độ dài 64 ký tự', () => {
    const hash = hashToken('test-raw-token');
    expect(hash).toHaveLength(64);
    expect(hashToken('test-raw-token')).toBe(hash);
  });

  it('generateOpaqueToken sinh chuỗi hex ngẫu nhiên', () => {
    const token1 = generateOpaqueToken(32);
    const token2 = generateOpaqueToken(32);
    expect(token1).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('generatePkce sinh cặp codeVerifier và codeChallenge S256', () => {
    const { codeVerifier, codeChallenge } = generatePkce();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeChallenge.length).toBeGreaterThan(0);
    expect(codeVerifier).not.toBe(codeChallenge);
  });

  it('encrypt và decrypt AES-256-GCM chính xác', () => {
    const secret = 'super-secret-api-key-12345';
    const encrypted = encryptAesGcm(secret, sampleKey, 1);

    expect(encrypted.ciphertext).not.toBe(secret);
    expect(encrypted.keyVersion).toBe(1);
    expect(encrypted.iv).toHaveLength(24);
    expect(encrypted.tag).toHaveLength(32);

    const decrypted = decryptAesGcm(encrypted, sampleKey);
    expect(decrypted).toBe(secret);
  });

  it('từ chối giải mã nếu sai auth tag hoặc bị can thiệp', () => {
    const secret = 'super-secret-data';
    const encrypted = encryptAesGcm(secret, sampleKey, 1);

    const tampered = {
      ...encrypted,
      tag: '00'.repeat(16),
    };

    expect(() => decryptAesGcm(tampered, sampleKey)).toThrow();
  });
});
