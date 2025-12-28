// access-control-template.ts

/**
 * أنواع الأدوار المعتمدة في النظام (RBAC).
 */
export enum UserRole {
    ADMIN = 'admin',
    PREMIUM = 'premium',
    BASIC = 'basic',
    GUEST = 'guest',
}

/**
 * واجهة تمثل بيانات المستخدم المستخرجة من رمز JWT.
 */
export interface AuthUser {
    id: string;
    role: UserRole;
    permissions: string[];
}

/**
 * خدمة للتحقق من الصلاحيات (Authorization Service).
 */
export class AuthorizationService {
    /**
     * التحقق من أن المستخدم لديه الدور المطلوب.
     * @param user المستخدم المصادق عليه.
     * @param requiredRole الدور المطلوب للوصول.
     * @returns صحيح إذا كان المستخدم يمتلك الدور أو دورًا أعلى.
     */
    public hasRole(user: AuthUser, requiredRole: UserRole): boolean {
        const roleHierarchy = [UserRole.ADMIN, UserRole.PREMIUM, UserRole.BASIC, UserRole.GUEST];
        const userRoleIndex = roleHierarchy.indexOf(user.role);
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

        // إذا كان دور المستخدم أعلى أو يساوي الدور المطلوب في التسلسل الهرمي
        return userRoleIndex <= requiredRoleIndex;
    }

    /**
     * التحقق من أن المستخدم يمتلك صلاحية معينة (ABAC/Permission Check).
     * @param user المستخدم المصادق عليه.
     * @param permission الصلاحية المطلوبة (مثل 'job:create', 'user:read').
     * @returns صحيح إذا كان المستخدم يمتلك الصلاحية.
     */
    public hasPermission(user: AuthUser, permission: string): boolean {
        return user.permissions.includes(permission);
    }

    /**
     * التحقق من الملكية (ABAC - Attribute-Based Access Control).
     * @param user المستخدم المصادق عليه.
     * @param resourceOwnerId معرف مالك المورد.
     * @returns صحيح إذا كان المستخدم هو المالك أو لديه دور إداري.
     */
    public isOwnerOrAdmin(user: AuthUser, resourceOwnerId: string): boolean {
        if (user.role === UserRole.ADMIN) {
            return true; // المسؤولون يمكنهم الوصول إلى كل شيء
        }
        return user.id === resourceOwnerId;
    }
}

// مثال للاستخدام في طبقة Middleware:
// const authService = new AuthorizationService();
// const currentUser: AuthUser = { id: 'user-123', role: UserRole.BASIC, permissions: ['job:create'] };
// const requiredRole = UserRole.PREMIUM;

// if (!authService.hasRole(currentUser, requiredRole)) {
//     // إرجاع 403 Forbidden
// }
