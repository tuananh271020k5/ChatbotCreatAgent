import { describe, expect, it } from 'vitest';
import { CredentialCryptoService } from '../src/modules/auth/credential-crypto.service';

describe('CredentialCryptoService', () => {
  it('mã hóa và giải mã bằng keyring hiện hành', () => {
    const service = new CredentialCryptoService();
    const secret = 'my-third-party-api-secret-key';

    const encrypted = service.encrypt(secret);
    expect(encrypted.keyVersion).toBe(service.getCurrentVersion());

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });
});
