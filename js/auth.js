/**
 * TrustPay KE - Authentication Helper
 * Clean auth functions using Supabase
 */

const Auth = {
    /**
     * Sign up new user
     */
    async signUp(email, password, userData) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: userData.name || '',
                        phone: userData.phone || ''
                    }
                }
            });

            if (error) throw error;

            // Create profile in users table
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('users')
                    .upsert({
                        id: data.user.id,
                        email: email,
                        name: userData.name || '',
                        phone: userData.phone || '',
                        role: 'user',
                        created_at: new Date().toISOString()
                    });

                if (profileError) {
                    console.warn('Profile creation warning:', profileError.message);
                }
            }

            return { success: true, data };

        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sign in user
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            return { success: true, data };

        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sign out user
     */
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Clear local storage
            localStorage.removeItem('trustpay_user');
            localStorage.removeItem('trustpay_orders');
            
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get current session
     */
    async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            return { success: true, session };
        } catch (error) {
            return { success: false, session: null, error: error.message };
        }
    },

    /**
     * Get current user
     */
    async getUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return { success: true, user };
        } catch (error) {
            return { success: false, user: null, error: error.message };
        }
    },

    /**
     * Check if user is logged in
     */
    async isLoggedIn() {
        const { session } = await this.getSession();
        return session !== null;
    },

    /**
     * Get stored user from localStorage
     */
    getStoredUser() {
        const data = localStorage.getItem('trustpay_user');
        return data ? JSON.parse(data) : null;
    },

    /**
     * Store user in localStorage
     */
    storeUser(user, metadata = {}) {
        const userData = {
            id: user.id,
            email: user.email,
            name: metadata.name || user.user_metadata?.name || user.email.split('@')[0],
            phone: metadata.phone || user.user_metadata?.phone || '',
            role: metadata.role || user.user_metadata?.role || 'user'
        };
        localStorage.setItem('trustpay_user', JSON.stringify(userData));
        return userData;
    },

    /**
     * Request password reset
     */
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update password
     */
    async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Listen for auth state changes
     */
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }
};

// Export for global use
window.Auth = Auth;
