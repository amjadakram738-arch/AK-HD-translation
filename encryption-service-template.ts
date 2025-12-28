// encryption-service-template.ts

import * as crypto from 'crypto';

// يجب أن يتم سحب هذا المفتاح من نظام إدارة الأسرار (Vault/KMS)
// لا يجب تخزينه في الكود المصدري
const ENCRYPTION_KEY_HEX = process.env.DATA_ENCRYPTION_KEY || 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16;

/**
 * خدمة التشفير القياسية باستخدام AES-256-GCM.
 * يتم استخدام مفتاح تشفير رئيسي (DEK) يتم سحبه من بيئة التشغيل.
 */
export class EncryptionService {
    private readonly key: Buffer;

    constructor() {
        if (ENCRYPTION_KEY_HEX.length !== KEY_LENGTH * 2) {
            throw new Error('Encryption key must be 64 hex characters (256 bits).');
        }
        this.key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
    }

    /**
     * تشفير البيانات باستخدام AES-256-GCM.
     * @param text البيانات المراد تشفيرها.
     * @returns سلسلة نصية مشفرة تحتوي على IV و AuthTag والبيانات المشفرة.
     */
    public encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // التنسيق: IV (hex) + AuthTag (hex) + Encrypted Data (hex)
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * فك تشفير البيانات.
     * @param encryptedText السلسلة النصية المشفرة.
     * @returns البيانات الأصلية.
     */
    public decrypt(encryptedText: string): string {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format.');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
            throw new Error('Invalid IV or AuthTag length.');
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

// مثال للاستخدام:
// const encryptionService = new EncryptionService();
// const sensitiveData = 'This is a secret message.';
// const encrypted = encryptionService.encrypt(sensitiveData);
// console.log('Encrypted:', encrypted);
// const decrypted = encryptionService.decrypt(encrypted);
// console.log('Decrypted:', decrypted);
