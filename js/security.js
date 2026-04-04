/**
 * TrustPay KE - Security Utilities
 * XSS protection, input validation, rate limiting
 */

// XSS Protection
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/[<>]/g, '') // Remove basic HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}

// Input Validation
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePhone(phone) {
    // Kenya phone format: 254XXXXXXXXX or 07XXXXXXXXX
    const phoneRegex = /^(254|0)?[7]\d{8}$/;
    return phoneRegex.test(phone);
}

export function validateAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M KES
}

// Rate Limiting
export function checkRateLimit(action, limitMs = 1000) {
    const storageKey = `rate_limit_${action}`;
    const lastExecution = localStorage.getItem(storageKey);
    
    if (lastExecution) {
        const timeSinceLast = Date.now() - parseInt(lastExecution);
        if (timeSinceLast < limitMs) {
            return false;
        }
    }
    
    localStorage.setItem(storageKey, Date.now().toString());
    return true;
}

// CSRF Protection
export function generateCSRFToken() {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('csrf_token', token);
    return token;
}

export function validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrf_token');
    return storedToken && token === storedToken;
}

// Password Strength
export function checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    return {
        score,
        strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
        suggestions: getPasswordSuggestions(password)
    };
}

function getPasswordSuggestions(password) {
    const suggestions = [];
    
    if (password.length < 8) suggestions.push('Use at least 8 characters');
    if (!/[a-z]/.test(password)) suggestions.push('Include lowercase letters');
    if (!/[A-Z]/.test(password)) suggestions.push('Include uppercase letters');
    if (!/[0-9]/.test(password)) suggestions.push('Include numbers');
    if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Include special characters');
    
    return suggestions;
}

// Secure Headers (for reference)
export const securityHeaders = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// Session Security
export function secureSession() {
    // Check for session hijacking
    const sessionStart = sessionStorage.getItem('session_start');
    if (!sessionStart) {
        sessionStorage.setItem('session_start', Date.now().toString());
    } else {
        const sessionAge = Date.now() - parseInt(sessionStart);
        const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours
        
        if (sessionAge > maxSessionAge) {
            // Force re-authentication
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = '/login.html?reason=session_expired';
            return false;
        }
    }
    
    return true;
}

// File Upload Security
export function validateFileUpload(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'File type not allowed' };
    }
    
    if (file.size > maxSize) {
        return { valid: false, error: 'File size too large (max 5MB)' };
    }
    
    return { valid: true };
}

// API Security
export function secureAPICall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Add CSRF token if available
    const csrfToken = sessionStorage.getItem('csrf_token');
    if (csrfToken) {
        mergedOptions.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return fetch(endpoint, mergedOptions);
}
