// audit-logger-template.ts

import { AuthUser } from './access-control-template';

/**
 * أنواع الأحداث التي سيتم تسجيلها في سجل المراجعة.
 */
export enum AuditEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    JOB_CREATED = 'JOB_CREATED',
    JOB_DELETED = 'JOB_DELETED',
    SECRET_ACCESS = 'SECRET_ACCESS',
    ROLE_CHANGE = 'ROLE_CHANGE',
}

/**
 * واجهة لبيانات سجل المراجعة.
 */
export interface AuditLog {
    timestamp: Date;
    eventType: AuditEventType;
    userId: string;
    sourceIp: string;
    details: Record<string, any>;
    success: boolean;
}

/**
 * خدمة تسجيل المراجعة (Audit Logger).
 * في بيئة الإنتاج، يجب أن ترسل هذه السجلات إلى نظام تسجيل مركزي آمن (مثل ELK Stack أو Splunk).
 */
export class AuditLogger {
    private log(logEntry: AuditLog): void {
        // في التطبيق الحقيقي، سيتم إرسال هذا السجل إلى نظام تسجيل مركزي آمن
        // لضمان عدم قابليته للتغيير (Immutability).
        const logString = JSON.stringify(logEntry);
        console.log(`[AUDIT] ${logString}`);
    }

    /**
     * تسجيل حدث أمني.
     * @param eventType نوع الحدث.
     * @param user المستخدم الذي قام بالعملية.
     * @param success هل نجحت العملية.
     * @param details تفاصيل إضافية للحدث.
     */
    public logEvent(
        eventType: AuditEventType,
        user: AuthUser,
        success: boolean,
        details: Record<string, any> = {},
    ): void {
        const logEntry: AuditLog = {
            timestamp: new Date(),
            eventType,
            userId: user.id,
            sourceIp: details.sourceIp || 'N/A', // يجب الحصول على IP من سياق الطلب
            details,
            success,
        };
        this.log(logEntry);
    }

    // دوال مساعدة لأحداث شائعة
    public logLoginSuccess(user: AuthUser, ip: string): void {
        this.logEvent(AuditEventType.LOGIN_SUCCESS, user, true, { sourceIp: ip });
    }

    public logJobCreation(user: AuthUser, jobId: string): void {
        this.logEvent(AuditEventType.JOB_CREATED, user, true, { jobId });
    }
}

// مثال للاستخدام:
// const auditLogger = new AuditLogger();
// const user: AuthUser = { id: 'user-123', role: UserRole.BASIC, permissions: [] };
// auditLogger.logLoginSuccess(user, '192.168.1.1');
// auditLogger.logJobCreation(user, 'job-abc-456');
