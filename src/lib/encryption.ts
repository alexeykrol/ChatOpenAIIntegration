/**
 * Secure encryption utility for API keys using Web Crypto API
 * Uses AES-256-GCM with PBKDF2 key derivation
 *
 * SECURITY NOTE: This encrypts data at rest in the browser's localStorage.
 * For production, consider:
 * 1. Server-side encryption with proper key management
 * 2. Using environment variables instead of storing in browser
 * 3. Hardware security modules (HSM) for key storage
 */

class SecureEncryption {
  private readonly ITERATIONS = 100000; // PBKDF2 iterations
  private readonly KEY_LENGTH = 256; // AES-256
  private readonly SALT_LENGTH = 16; // 128 bits
  private readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates a secure password from browser fingerprint
   * WARNING: This is not truly secure as browser fingerprints can be replicated
   * For production, require user to set a master password
   */
  private async generateBrowserPassword(): Promise<string> {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width,
      screen.height,
    ].join('|');

    // Hash the fingerprint to create a consistent password
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypts text using AES-256-GCM
   * Returns base64-encoded string containing: salt + iv + ciphertext
   */
  async encrypt(text: string): Promise<string> {
    if (!text) return '';

    try {
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Derive encryption key
      const password = await this.generateBrowserPassword();
      const key = await this.deriveKey(password, salt);

      // Encrypt the text
      const encoder = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(text)
      );

      // Combine salt + iv + ciphertext
      const combined = new Uint8Array(
        salt.length + iv.length + encrypted.byteLength
      );
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Convert to base64 for storage
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts text that was encrypted with encrypt()
   */
  async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText) return '';

    try {
      // Decode from base64
      const combined = this.base64ToArrayBuffer(encryptedText);

      // Extract salt, iv, and ciphertext
      const salt = combined.slice(0, this.SALT_LENGTH);
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const ciphertext = combined.slice(this.SALT_LENGTH + this.IV_LENGTH);

      // Derive decryption key
      const password = await this.generateBrowserPassword();
      const key = await this.deriveKey(password, salt);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );

      // Convert back to text
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - data may be corrupted');
    }
  }

  /**
   * Test method to verify encryption/decryption works
   */
  async test(text: string): Promise<boolean> {
    try {
      const encrypted = await this.encrypt(text);
      const decrypted = await this.decrypt(encrypted);
      return text === decrypted;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }

  /**
   * Utility: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = String.fromCharCode(...buffer);
    return btoa(binary);
  }

  /**
   * Utility: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

export const encryption = new SecureEncryption();

/**
 * MIGRATION HELPER: Detect and migrate old XOR-encrypted data
 *
 * Old XOR encryption produced hex strings (only 0-9a-f characters)
 * New AES-GCM encryption produces base64 strings (contains +/= characters)
 */
export function isOldEncryption(data: string): boolean {
  // Old encryption is pure hex (only 0-9a-f)
  return /^[0-9a-f]+$/i.test(data);
}

/**
 * Decrypts old XOR-encrypted data (for migration only)
 * DO NOT USE FOR NEW ENCRYPTION
 */
export function decryptOldXOR(encryptedText: string): string {
  const key = 'bolt-chat-app-2025-fixed-key-32';
  let decrypted = '';

  try {
    for (let i = 0; i < encryptedText.length; i += 2) {
      const hexByte = encryptedText.substring(i, i + 2);
      const encryptedByte = parseInt(hexByte, 16);

      if (isNaN(encryptedByte)) {
        return encryptedText;
      }

      const keyChar = key.charCodeAt((i / 2) % key.length);
      decrypted += String.fromCharCode(encryptedByte ^ keyChar);
    }
    return decrypted;
  } catch (error) {
    console.error('Old decryption failed:', error);
    return encryptedText;
  }
}
