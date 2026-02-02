import * as crypto from 'crypto';

const DEFAULT_KEY = 'a3K8Bx%2r8Y7#xDh';

export class EncryptionService {
  /**
   * Decrypt UDP message
   * @param input Response object with encrypted pack
   * @param key AES key (defaults to general key)
   * @returns Decrypted message object
   */
  static decrypt(input: { pack: string }, key: string = DEFAULT_KEY): any {
    const decipher = crypto.createDecipheriv('aes-128-ecb', key, '');
    const str = decipher.update(input.pack, 'base64', 'utf8');
    const response = JSON.parse(str + decipher.final('utf8'));
    return response;
  }

  /**
   * Encrypt UDP message
   * @param output Request object to encrypt
   * @param key AES key (defaults to general key)
   * @returns Encrypted string
   */
  static encrypt(output: any, key: string = DEFAULT_KEY): string {
    const cipher = crypto.createCipheriv('aes-128-ecb', key, '');
    const str = cipher.update(JSON.stringify(output), 'utf8', 'base64');
    const request = str + cipher.final('base64');
    return request;
  }
}
