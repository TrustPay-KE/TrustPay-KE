// Authentication System using Supabase
import { supabase, TABLES } from './supabase.js';

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.authListeners = [];
        this.init();
    }

    // Initialize auth system
    async init() {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.loadUserProfile();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.currentUser = session.user;
                this.loadUserProfile();
            } else {
                this.currentUser = null;
            }
            this.notifyListeners(event, session);
        });
    }

    // Load user profile from database
    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading user profile:', error);
                return;
            }

            if (data) {
                this.currentUser.profile = data;
            } else {
                // Create user profile if it doesn't exist
                await this.createUserProfile();
            }
        } catch (error) {
            console.error('Error in loadUserProfile:', error);
        }
    }

    // Create user profile in database
    async createUserProfile() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .upsert({
                    id: this.currentUser.id,
                    email: this.currentUser.email,
                    name: this.currentUser.user_metadata?.name || '',
                    phone: this.currentUser.user_metadata?.phone || '',
                    role: 'user',
                    kyc_status: 'not_started',
                    is_verified: this.currentUser.email_confirmed,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            
            this.currentUser.profile = data;
            return data;
        } catch (error) {
            console.error('Error creating user profile:', error);
            // Don't throw error, just log it - this prevents login loops
            return null;
        }
    }

    // Sign up new user
    async signUp(email, password, name, phone) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        phone
                    }
                }
            });

            if (error) throw error;

            // Create user profile immediately after signup
            if (data.user) {
                try {
                    await this.createUserProfileForUser(data.user, name, phone);
                } catch (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Don't fail signup if profile creation fails
                }
            }

            return {
                success: true,
                message: 'Account created successfully! Please check your email to verify your account.',
                user: data.user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Create user profile for a specific user
    async createUserProfileForUser(user, name, phone) {
        try {
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .upsert({
                    id: user.id,
                    email: user.email,
                    name: name || user.user_metadata?.name || '',
                    phone: phone || user.user_metadata?.phone || '',
                    role: 'user',
                    kyc_status: 'not_started',
                    is_verified: user.email_confirmed,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    // Sign in user
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Login successful!',
                user: data.user,
                session: data.session
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Sign out user
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;

            this.currentUser = null;
            return {
                success: true,
                message: 'Logged out successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email);

            if (error) throw error;

            return {
                success: true,
                message: 'Password reset email sent! Please check your inbox.',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Update user profile
    async updateProfile(updates) {
        if (!this.currentUser) {
            return { success: false, message: 'No user logged in' };
        }

        try {
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            // Update current user profile
            this.currentUser.profile = data;

            return {
                success: true,
                message: 'Profile updated successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Update password
    async updatePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            return { success: false, message: 'No user logged in' };
        }

        try {
            // First verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: this.currentUser.email,
                password: currentPassword
            });

            if (signInError) {
                return { success: false, message: 'Current password is incorrect' };
            }

            // Update password
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Password updated successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Update email
    async updateEmail(newEmail, password) {
        if (!this.currentUser) {
            return { success: false, message: 'No user logged in' };
        }

        try {
            // Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: this.currentUser.email,
                password
            });

            if (signInError) {
                return { success: false, message: 'Password is incorrect' };
            }

            // Update email
            const { data, error } = await supabase.auth.updateUser({
                email: newEmail
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Email updated successfully! Please check your new email for verification.',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Deactivate account
    async deactivateAccount(password) {
        if (!this.currentUser) {
            return { success: false, message: 'No user logged in' };
        }

        try {
            // Verify password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: this.currentUser.email,
                password
            });

            if (signInError) {
                return { success: false, message: 'Password is incorrect' };
            }

            // Update user status
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // Sign out
            await this.signOut();

            return {
                success: true,
                message: 'Account deactivated successfully!',
                data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
    }

    // Check if user is admin
    isAdmin() {
        return this.currentUser?.profile?.role === 'admin';
    }

    // Check if user is verified
    isVerified() {
        return this.currentUser?.profile?.is_verified || false;
    }

    // Check KYC status
    getKycStatus() {
        return this.currentUser?.profile?.kyc_status || 'not_started';
    }

    // Add auth state listener
    addAuthListener(callback) {
        this.authListeners.push(callback);
    }

    // Remove auth state listener
    removeAuthListener(callback) {
        const index = this.authListeners.indexOf(callback);
        if (index > -1) {
            this.authListeners.splice(index, 1);
        }
    }

    // Notify all listeners
    notifyListeners(event, session) {
        this.authListeners.forEach(callback => {
            callback(event, session);
        });
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// Create and export auth system instance
const authSystem = new AuthSystem();
export default authSystem;
