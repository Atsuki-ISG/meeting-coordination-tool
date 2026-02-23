import { describe, it, expect, afterEach, vi } from 'vitest';
import { encrypt, decrypt } from './encryption';

// ENCRYPTION_KEY は vitest.config.ts の env で設定済み:
// 'test-encryption-key-for-vitest-32chars!!'

describe('encrypt / decrypt', () => {
  it('encrypt した文字列を decrypt すると元に戻る', () => {
    const original = 'my-google-refresh-token';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('空文字列も正しく暗号化・復号できる', () => {
    const original = '';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('日本語文字列も正しく暗号化・復号できる', () => {
    const original = 'テスト用トークン文字列';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('暗号化されたデータは元の文字列と異なる', () => {
    const original = 'my-secret-token';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
  });

  it('同じ入力でも毎回異なる暗号文が生成される（IV がランダム）', () => {
    const original = 'same-input-token';
    const encrypted1 = encrypt(original);
    const encrypted2 = encrypt(original);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('暗号文の形式が iv:authTag:encrypted の3パートである', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);

    // iv は 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // authTag は 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // 暗号文部分は空でない
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('長いトークン文字列も正しく処理できる', () => {
    const original = 'a'.repeat(500);
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  describe('decrypt のエラーケース', () => {
    it('パート数が3でない場合は例外を投げる（2パート）', () => {
      expect(() => decrypt('aaa:bbb')).toThrow('Invalid encrypted data format');
    });

    it('パート数が3でない場合は例外を投げる（4パート）', () => {
      expect(() => decrypt('aaa:bbb:ccc:ddd')).toThrow('Invalid encrypted data format');
    });

    it('不正な暗号文は復号に失敗する', () => {
      // 形式は正しいが内容が不正
      const fake = 'deadbeefdeadbeefdeadbeefdeadbeef:deadbeefdeadbeefdeadbeefdeadbeef:deadbeef';
      expect(() => decrypt(fake)).toThrow();
    });

    it('改ざんされた暗号文は復号に失敗する（認証タグ検証）', () => {
      const encrypted = encrypt('original-token');
      // 暗号文部分の最後の文字を変える
      const parts = encrypted.split(':');
      const tampered = parts[0] + ':' + parts[1] + ':' + parts[2].slice(0, -2) + 'ff';
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('ENCRYPTION_KEY が未設定の場合', () => {
    afterEach(() => {
      // テスト後に環境変数を戻す
      process.env.ENCRYPTION_KEY = 'test-encryption-key-for-vitest-32chars!!';
    });

    it('ENCRYPTION_KEY が未設定なら encrypt は例外を投げる', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY is not set');
    });

    it('ENCRYPTION_KEY が未設定なら decrypt は例外を投げる', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => decrypt('aaa:bbb:ccc')).toThrow('ENCRYPTION_KEY is not set');
    });
  });
});
