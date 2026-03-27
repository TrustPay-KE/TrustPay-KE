/**
 * TrustPay KE - Authentication Module
 * Handles user authentication with Appwrite
 */

import { client, account, databases, ID, DATABASE_IDS, COLLECTION_IDS, USER_ROLES } from "./appwrite.js";

/**
 * Sign up new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} name - User's full name
 * @param {string} phone - User's phone number (M-Pesa)
 * @returns {Object} Result with user data or error
 */
export async function signupUser(email, password, name, phone) {
    try {
        // Validate inputs
        if (!email || !password || !name || !phone) {
            return { success: false, error: "All fields are required" };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: "Invalid email format" };
        }

        // Validate password strength (min 8 chars, 1 upper, 1 lower, 1 number)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return { 
                success: false, 
                error: "Password must be at least 8 characters with uppercase, lowercase, and number" 
            };
        }

        // Validate phone (Kenyan format)
        const phoneRegex = /^254[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            return { success: false, error: "Phone must be in format 254XXXXXXXXX" };
        }

        // Create user account
        const user = await account.create(ID.unique(), email, password, name);

        // Create email password session (auto login)
        await account.createEmailPasswordSession(email, password);

        // Create user profile in database
        await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            user.$id,
            {
                userId: user.$id,
                name: name,
                email: email,
                phone: phone,
                kycStatus: "not_started",
                role: USER_ROLES.USER,
                isVerified: false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        return { success: true, user };

    } catch (error) {
        console.error("Signup error:", error);
        
        // Handle specific errors
        if (error.code === 409) {
            return { success: false, error: "Email already registered" };
        }
        if (error.code === 400) {
            return { success: false, error: "Invalid input data" };
        }
        
        return { success: false, error: error.message || "Registration failed" };
    }
}

/**
 * Login user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} Result with session or error
 */
export async function loginUser(email, password) {
    try {
        // Validate inputs
        if (!email || !password) {
            return { success: false, error: "Email and password are required" };
        }

        // Create session
        await account.createEmailPasswordSession(email, password);
        
        // Get current user
        const user = await getCurrentUser();
        
        if (!user) {
            return { success: false, error: "Login failed" };
        }

        return { success: true, user };

    } catch (error) {
        console.error("Login error:", error);
        
        if (error.code === 401) {
            return { success: false, error: "Invalid email or password" };
        }
        
        return { success: false, error: error.message || "Login failed" };
    }
}

/**
 * Logout current user
 * @returns {Object} Result
 */
export async function logoutUser() {
    try {
        // Get all sessions
        const sessions = await account.listSessions();
        
        // Delete all sessions for security
        for (const session of sessions.sessions) {
            await account.deleteSession(session.$id);
        }

        // Clear local storage
        localStorage.removeItem("trustpay_user");
        localStorage.removeItem("trustpay_orders");

        return { success: true };

    } catch (error) {
        console.error("Logout error:", error);
        return { success: false, error: error.message || "Logout failed" };
    }
}

/**
 * Get current logged-in user
 * @returns {Object|null} User object or null
 */
export async function getCurrentUser() {
    try {
        const user = await account.get();
        
        // Fetch additional user data from database
        let userData = {
            id: user.$id,
            email: user.email,
            name: user.name,
            phone: user.phone || "",
            role: "user"
        };

        try {
            const dbUser = await databases.getDocument(
                DATABASE_IDS.MAIN,
                COLLECTION_IDS.USERS,
                user.$id
            );
            userData = { ...userData, ...dbUser };
        } catch (e) {
            // User document might not exist yet
            console.log("User profile not found in database");
        }

        // Cache in localStorage
        localStorage.setItem("trustpay_user", JSON.stringify(userData));

        return userData;

    } catch (error) {
        // No active session
        if (error.code === 401) {
            return null;
        }
        console.error("Get user error:", error);
        return null;
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}

/**
 * Request password reset
 * @param {string} email - User's email
 * @returns {Object} Result
 */
export async function requestPasswordReset(email) {
    try {
        if (!email) {
            return { success: false, error: "Email is required" };
        }

        const resetUrl = window.location.origin + "/reset-password.html";
        await account.createRecovery(email, resetUrl);

        // Always return success for security (don't reveal if email exists)
        return { success: true, message: "Password reset link sent to email" };

    } catch (error) {
        console.error("Password reset error:", error);
        // Return success anyway for security
        return { success: true, message: "If account exists, reset link has been sent" };
    }
}

/**
 * Complete password reset
 * @param {string} userId - User ID from reset URL
 * @param {string} secret - Secret from reset URL
 * @param {string} newPassword - New password
 * @returns {Object} Result
 */
export async function completePasswordReset(userId, secret, newPassword) {
    try {
        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return { 
                success: false, 
                error: "Password must be at least 8 characters with uppercase, lowercase, and number" 
            };
        }

        await account.updateRecovery(userId, secret, newPassword);

        return { success: true, message: "Password updated successfully" };

    } catch (error) {
        console.error("Complete password reset error:", error);
        
        if (error.code === 401) {
            return { success: false, error: "Reset link has expired. Please request a new one." };
        }
        
        return { success: false, error: error.message || "Failed to reset password" };
    }
}

/**
 * Update user profile
 * @param {Object} data - Data to update { name?, phone? }
 * @returns {Object} Result
 */
export async function updateUserProfile(data) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const updates = {};
        if (data.name) updates.name = data.name;
        if (data.phone) updates.phone = data.phone;

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            user.id,
            updates
        );

        // Refresh user data
        await getCurrentUser();

        return { success: true };

    } catch (error) {
        console.error("Update profile error:", error);
        return { success: false, error: error.message || "Failed to update profile" };
    }
}

/**
 * Store user session in localStorage
 * @param {Object} user - User object
 */
export function storeUserSession(user) {
    const sessionData = {
        id: user.id || user.$id,
        email: user.email,
        name: user.name,
        phone: user.phone || "",
        role: user.role || "user"
    };
    localStorage.setItem("trustpay_user", JSON.stringify(sessionData));
}

/**
 * Get stored user from localStorage
 * @returns {Object|null}
 */
export function getStoredUser() {
    const data = localStorage.getItem("trustpay_user");
    return data ? JSON.parse(data) : null;
}

/**
 * Check if user has admin role
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isAdmin(user) {
    return user && user.role === USER_ROLES.ADMIN;
}

/**
 * Check if user is verified (KYC)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isVerified(user) {
    return user && user.kycStatus === "verified";
}

/**
 * Update user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} Result
 */
export async function updatePassword(currentPassword, newPassword) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate new password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return { 
                success: false, 
                error: "Password must be at least 8 characters with uppercase, lowercase, and number" 
            };
        }

        // Update password in Appwrite
        await account.updatePassword(newPassword);

        return { success: true, message: "Password updated successfully" };

    } catch (error) {
        console.error("Update password error:", error);
        return { success: false, error: error.message || "Failed to update password" };
    }
}

/**
 * Update user email
 * @param {string} newEmail - New email address
 * @param {string} password - Current password for verification
 * @returns {Object} Result
 */
export async function updateEmail(newEmail, password) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return { success: false, error: "Invalid email format" };
        }

        // Update email in Appwrite
        await account.updateEmail(newEmail, password);

        // Update email in database
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            user.id,
            { email: newEmail, updatedAt: new Date().toISOString() }
        );

        // Refresh user data
        await getCurrentUser();

        return { success: true, message: "Email updated successfully" };

    } catch (error) {
        console.error("Update email error:", error);
        
        if (error.code === 401) {
            return { success: false, error: "Current password is incorrect" };
        }
        
        return { success: false, error: error.message || "Failed to update email" };
    }
}

/**
 * Enable/disable email notifications
 * @param {boolean} enabled - Whether notifications are enabled
 * @returns {Object} Result
 */
export async function updateNotificationPreferences(preferences) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            user.id,
            { 
                notificationPreferences: preferences,
                updatedAt: new Date().toISOString()
            }
        );

        // Refresh user data
        await getCurrentUser();

        return { success: true };

    } catch (error) {
        console.error("Update notification preferences error:", error);
        return { success: false, error: error.message || "Failed to update preferences" };
    }
}

/**
 * Delete user account (soft delete - deactivate)
 * @param {string} password - Password for confirmation
 * @returns {Object} Result
 */
export async function deleteAccount(password) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Soft delete - deactivate account
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            user.id,
            { 
                isActive: false,
                updatedAt: new Date().toISOString()
            }
        );

        // Logout user
        await logoutUser();

        return { success: true, message: "Account deactivated successfully" };

    } catch (error) {
        console.error("Delete account error:", error);
        return { success: false, error: error.message || "Failed to delete account" };
    }
}

/**
 * Get all active sessions for current user
 * @returns {Array} Array of sessions
 */
export async function getActiveSessions() {
    try {
        const sessions = await account.listSessions();
        return sessions.sessions || [];
    } catch (error) {
        console.error("Get sessions error:", error);
        return [];
    }
}

/**
 * Revoke a specific session
 * @param {string} sessionId - Session ID to revoke
 * @returns {Object} Result
 */
export async function revokeSession(sessionId) {
    try {
        await account.deleteSession(sessionId);
        return { success: true };
    } catch (error) {
        console.error("Revoke session error:", error);
        return { success: false, error: error.message || "Failed to revoke session" };
    }
}

/**
 * Check if user can create escrow (KYC verified)
 * @returns {Object} Result with canCreate flag and reason
 */
export async function canCreateEscrow() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { canCreate: false, reason: "Not authenticated" };
        }

        if (!user.isActive) {
            return { canCreate: false, reason: "Account is deactivated" };
        }

        if (user.kycStatus !== "verified") {
            return { canCreate: false, reason: "KYC verification required" };
        }

        return { canCreate: true };

    } catch (error) {
        console.error("Can create escrow check error:", error);
        return { canCreate: false, reason: "Failed to verify permissions" };
    }
}
