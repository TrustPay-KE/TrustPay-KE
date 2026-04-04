/**
 * TrustPay KE - Authentication Helper Functions
 * Supabase v2 Implementation
 */

// Store current user
let currentUser = null;

/**
 * Get current session
 */
async function getSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Session error:', error.message);
        return null;
    }
}

/**
 * Get current user
 */
async function getUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('User error:', error.message);
        return null;
    }
}

/**
 * Check if user is authenticated
 */
async function isAuthenticated() {
    const session = await getSession();
    return !!session?.user;
}

/**
 * Get stored user from localStorage
 */
function getStoredUser() {
    const userData = localStorage.getItem('trustpay_user');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Store user in localStorage
 */
function storeUser(user, metadata = {}) {
    const userData = {
        id: user.id,
        email: user.email,
        name: metadata.name || user.user_metadata?.name || user.email.split('@')[0],
        phone: metadata.phone || user.user_metadata?.phone || '',
        role: metadata.role || user.user_metadata?.role || 'user',
        created_at: new Date().toISOString()
    };
    localStorage.setItem('trustpay_user', JSON.stringify(userData));
    return userData;
}

/**
 * Clear stored user
 */
function clearStoredUser() {
    localStorage.removeItem('trustpay_user');
    localStorage.removeItem('trustpay_orders');
}

/**
 * Sign up new user
 */
async function signUp(email, password, metadata = {}) {
    try {
        const redirectUrl = window.location.origin + '/login.html';
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: metadata,
                emailRedirectTo: redirectUrl
            }
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Sign up error:', error.message);
        return { data: null, error: error.message };
    }
}

/**
 * Sign in user
 */
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        
        if (data.user && !data.user.email_confirmed_at) {
            return { 
                data: null, 
                error: 'Please verify your email first. Check your inbox for the confirmation link.' 
            };
        }

        // Store user data
        storeUser(data.user, data.user.user_metadata);
        
        return { data, error: null };
    } catch (error) {
        console.error('Sign in error:', error.message);
        
        // Return generic message for security
        if (error.message.includes('Invalid login credentials')) {
            return { data: null, error: 'Invalid email or password' };
        }
        
        return { data: null, error: error.message };
    }
}

/**
 * Sign out user
 */
async function signOut() {
    try {
        clearStoredUser();
        await supabase.auth.signOut();
        return { error: null };
    } catch (error) {
        console.error('Sign out error:', error.message);
        return { error: error.message };
    }
}

/**
 * Send password reset email
 */
async function resetPasswordForEmail(email) {
    try {
        const redirectUrl = window.location.origin + '/reset-password.html';
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Reset password error:', error.message);
        
        // Always return success for security (don't reveal if email exists)
        return { error: null };
    }
}

/**
 * Update user password
 */
async function updatePassword(newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Update password error:', error.message);
        return { data: null, error: error.message };
    }
}

/**
 * Resend confirmation email
 */
async function resendConfirmationEmail(email) {
    try {
        const redirectUrl = window.location.origin + '/login.html';
        
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: redirectUrl
            }
        });

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Resend confirmation error:', error.message);
        return { error: error.message };
    }
}

/**
 * Check if user has specific role
 */
function hasRole(requiredRole) {
    const user = getStoredUser();
    if (!user) return false;
    
    if (requiredRole === 'admin') {
        return ['admin', 'director'].includes(user.role);
    }
    
    return user.role === requiredRole;
}

/**
 * Redirect based on auth state
 */
async function redirectBasedOnAuth() {
    const authenticated = await isAuthenticated();
    const userData = getStoredUser();
    
    if (authenticated || userData) {
        // Check if user has admin role
        const isAdmin = userData && ['admin', 'director'].includes(userData.role);
        window.location.href = isAdmin ? 'operations.html' : 'dashboard.html';
        return true;
    }
    return false;
}

/**
 * Protect route - redirect to login if not authenticated
 */
async function protectRoute() {
    const authenticated = await isAuthenticated();
    const userData = getStoredUser();
    
    if (!authenticated && !userData) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

/**
 * Listen to auth state changes
 */
function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
            storeUser(session.user, session.user.user_metadata);
        } else if (event === 'SIGNED_OUT') {
            clearStoredUser();
        }
        
        callback(event, session);
    });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function validatePassword(password) {
    const result = {
        isValid: true,
        errors: [],
        strength: 0
    };
    
    if (password.length < 8) {
        result.isValid = false;
        result.errors.push('At least 8 characters required');
    } else {
        result.strength += 25;
    }
    
    if (!/[a-z]/.test(password)) {
        result.isValid = false;
        result.errors.push('At least one lowercase letter (a-z) required');
    } else {
        result.strength += 25;
    }
    
    if (!/[A-Z]/.test(password)) {
        result.isValid = false;
        result.errors.push('At least one uppercase letter (A-Z) required');
    } else {
        result.strength += 25;
    }
    
    if (!/[0-9]/.test(password)) {
        result.isValid = false;
        result.errors.push('At least one number (0-9) required');
    } else {
        result.strength += 25;
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        // Symbol is optional but adds strength
        result.strength += 10;
    }
    
    return result;
}

/**
 * Get password strength label
 */
function getPasswordStrengthLabel(strength) {
    if (strength <= 25) return 'Very Weak';
    if (strength <= 50) return 'Weak';
    if (strength <= 75) return 'Good';
    if (strength <= 90) return 'Strong';
    return 'Very Strong';
}

/**
 * Get password strength color
 */
function getPasswordStrengthColor(strength) {
    if (strength <= 25) return '#ef4444'; // red
    if (strength <= 50) return '#f97316'; // orange
    if (strength <= 75) return '#eab308'; // yellow
    if (strength <= 90) return '#22c55e'; // green
    return '#10b981'; // dark green
}

// Export for use in HTML files
window.trustpayAuth = {
    supabase,
    getSession,
    getUser,
    isAuthenticated,
    getStoredUser,
    storeUser,
    clearStoredUser,
    signUp,
    signIn,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    resendConfirmationEmail,
    hasRole,
    redirectBasedOnAuth,
    protectRoute,
    onAuthStateChange,
    isValidEmail,
    validatePassword,
    getPasswordStrengthLabel,
    getPasswordStrengthColor,
    currentUser
};
