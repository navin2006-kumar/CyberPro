'use strict';
/**
 * CyberPro — Authentication & RBAC Middleware
 * Enforces: requireAuth (session must exist) and requireRole (role hierarchy).
 * Roles in ascending privilege order: student < instructor < admin
 */

const ROLE_LEVELS = { student: 1, instructor: 2, admin: 3 };

/**
 * requireAuth — ensures a valid session exists.
 * Returns 401 if not authenticated.
 */
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHENTICATED'
    });
};

/**
 * requireRole(minRole) — ensures the authenticated user has at least the given role.
 * Returns 403 if the user's role is insufficient.
 * @param {string} minRole - 'student' | 'instructor' | 'admin'
 */
const requireRole = (minRole) => (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'UNAUTHENTICATED'
        });
    }

    const userLevel = ROLE_LEVELS[req.session.role] || 0;
    const requiredLevel = ROLE_LEVELS[minRole] || 99;

    if (userLevel < requiredLevel) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role: ${minRole}`,
            code: 'INSUFFICIENT_ROLE'
        });
    }

    return next();
};

/**
 * auditLog — logs sensitive admin actions. Attach after requireRole('admin').
 */
const auditLog = (action) => (req, res, next) => {
    if (req.app.locals.db) {
        req.app.locals.db.logUserActivity(
            req.session.userId,
            action,
            `${req.method} ${req.originalUrl} | IP: ${req.ip}`
        ).catch(() => {}); // Non-blocking
    }
    next();
};

module.exports = { requireAuth, requireRole, auditLog };
