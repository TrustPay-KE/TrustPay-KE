/**
 * TrustPay KE - Invite System
 * Handles user invitations for escrow participation
 */

import { 
    databases, 
    ID, 
    DATABASE_IDS, 
    COLLECTION_IDS 
} from './appwrite.js';
import { getCurrentUser } from './auth.js';

/**
 * Generate unique invite code
 * @returns {string} Invite code
 */
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Create invite for new user (seller or buyer)
 * @param {string} escrowId - Escrow ID
 * @param {string} inviteType - Type (buyer/seller)
 * @param {string} email - Email address (optional)
 * @param {string} phone - Phone number (optional)
 * @param {string} customMessage - Custom message (optional)
 * @returns {Object} Result
 */
export async function createInvite(escrowId, inviteType, email = null, phone = null, customMessage = "") {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Validate inputs
        if (!escrowId || !inviteType) {
            return { success: false, error: "Escrow ID and invite type are required" };
        }

        if (!email && !phone) {
            return { success: false, error: "Either email or phone number is required" };
        }

        const validTypes = ['buyer', 'seller'];
        if (!validTypes.includes(inviteType)) {
            return { success: false, error: "Invalid invite type" };
        }

        // Validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { success: false, error: "Invalid email format" };
            }
        }

        // Validate phone format if provided
        if (phone) {
            const phoneRegex = /^254[0-9]{9}$/;
            if (!phoneRegex.test(phone)) {
                return { success: false, error: "Invalid phone format. Use 254XXXXXXXXX" };
            }
        }

        // Get escrow details
        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            escrowId
        );

        // Validate user is party to escrow
        if (escrow.buyerId !== user.id && escrow.sellerId !== user.id) {
            return { success: false, error: "You are not a party to this escrow" };
        }

        // Check if invite already exists for this contact
        const existingInvites = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            [
                { method: 'equal', attribute: 'escrowId', values: [escrowId] },
                { method: 'equal', attribute: 'inviteType', values: [inviteType] }
            ]
        );

        const existingInvite = existingInvites.documents.find(invite => 
            (email && invite.email === email) || (phone && invite.phone === phone)
        );

        if (existingInvite) {
            if (existingInvite.status === 'accepted') {
                return { success: false, error: "This contact has already accepted an invite for this escrow" };
            } else if (existingInvite.status === 'pending') {
                return { success: false, error: "An invite has already been sent to this contact" };
            }
        }

        // Generate invite code and set expiry
        const inviteCode = generateInviteCode();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invite
        const invite = await databases.createDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            ID.unique(),
            {
                inviteId: ID.unique(),
                escrowId: escrowId,
                invitedBy: user.id,
                inviteCode: inviteCode,
                inviteType: inviteType,
                email: email,
                phone: phone,
                status: 'pending',
                customMessage: customMessage.trim(),
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // TODO: Send invite via email/SMS
        // For now, just return the invite details

        const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;

        return {
            success: true,
            invite: {
                ...invite,
                inviteUrl: inviteUrl
            },
            message: `Invite created successfully. Share this link: ${inviteUrl}`
        };

    } catch (error) {
        console.error("Create invite error:", error);
        return { success: false, error: error.message || "Failed to create invite" };
    }
}

/**
 * Accept invite (for invited users)
 * @param {string} inviteCode - Invite code
 * @returns {Object} Result
 */
export async function acceptInvite(inviteCode) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        // Find invite by code
        const invites = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            [
                { method: 'equal', attribute: 'inviteCode', values: [inviteCode] }
            ]
        );

        const invite = invites.documents[0];
        if (!invite) {
            return { success: false, error: "Invalid invite code" };
        }

        // Validate invite status
        if (invite.status !== 'pending') {
            return { success: false, error: "Invite is no longer valid" };
        }

        // Check if invite has expired
        if (new Date() > new Date(invite.expiresAt)) {
            return { success: false, error: "Invite has expired" };
        }

        // Validate user email/phone matches invite
        if (invite.email && user.email !== invite.email) {
            return { success: false, error: "This invite was sent to a different email address" };
        }

        if (invite.phone && user.phone !== invite.phone) {
            return { success: false, error: "This invite was sent to a different phone number" };
        }

        // Get escrow details
        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            invite.escrowId
        );

        // Update escrow with user ID
        const updates = {
            updatedAt: new Date().toISOString()
        };

        if (invite.inviteType === 'seller') {
            if (escrow.sellerId) {
                return { success: false, error: "This escrow already has a seller" };
            }
            updates.sellerId = user.id;
        } else if (invite.inviteType === 'buyer') {
            if (escrow.buyerId) {
                return { success: false, error: "This escrow already has a buyer" };
            }
            updates.buyerId = user.id;
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            invite.escrowId,
            updates
        );

        // Update invite status
        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            invite.$id,
            {
                status: 'accepted',
                acceptedBy: user.id,
                acceptedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // TODO: Send notification to the person who sent the invite

        return {
            success: true,
            escrowId: invite.escrowId,
            message: "Invite accepted successfully! You can now participate in the escrow."
        };

    } catch (error) {
        console.error("Accept invite error:", error);
        return { success: false, error: error.message || "Failed to accept invite" };
    }
}

/**
 * Get invite details by code
 * @param {string} inviteCode - Invite code
 * @returns {Object} Invite details
 */
export async function getInviteByCode(inviteCode) {
    try {
        const invites = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            [
                { method: 'equal', attribute: 'inviteCode', values: [inviteCode] }
            ]
        );

        const invite = invites.documents[0];
        if (!invite) {
            return { success: false, error: "Invalid invite code" };
        }

        // Check if invite has expired
        const isExpired = new Date() > new Date(invite.expiresAt);

        // Get escrow details
        const escrow = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.ESCROWS,
            invite.escrowId
        );

        // Get inviter details
        const inviter = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.USERS,
            invite.invitedBy
        );

        return {
            success: true,
            invite: {
                ...invite,
                isExpired: isExpired,
                escrow: {
                    id: escrow.escrowId,
                    amount: escrow.amount,
                    description: escrow.description,
                    currency: escrow.currency
                },
                inviter: {
                    name: inviter.name,
                    email: inviter.email
                }
            }
        };

    } catch (error) {
        console.error("Get invite by code error:", error);
        return { success: false, error: error.message || "Failed to get invite" };
    }
}

/**
 * Get user's sent invites
 * @param {string} status - Filter by status (optional)
 * @param {number} limit - Maximum results
 * @param {number} offset - Offset for pagination
 * @returns {Object} List of invites
 */
export async function getUserInvites(status = null, limit = 50, offset = 0) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const queries = [
            { method: 'equal', attribute: 'invitedBy', values: [user.id] },
            { method: 'orderDesc', attribute: 'createdAt' }
        ];

        if (status) {
            queries.push({ method: 'equal', attribute: 'status', values: [status] });
        }

        const result = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            queries,
            limit,
            offset
        );

        // Enrich with escrow data
        const enrichedInvites = await Promise.all(
            result.documents.map(async (invite) => {
                try {
                    const escrow = await databases.getDocument(
                        DATABASE_IDS.MAIN,
                        COLLECTION_IDS.ESCROWS,
                        invite.escrowId
                    );

                    return {
                        ...invite,
                        escrow: {
                            id: escrow.escrowId,
                            amount: escrow.amount,
                            description: escrow.description,
                            status: escrow.status
                        }
                    };
                } catch (error) {
                    console.warn("Failed to enrich invite:", error);
                    return invite;
                }
            })
        );

        return {
            success: true,
            invites: enrichedInvites,
            total: result.total
        };

    } catch (error) {
        console.error("Get user invites error:", error);
        return { success: false, error: error.message || "Failed to get invites" };
    }
}

/**
 * Cancel invite
 * @param {string} inviteId - Invite ID
 * @returns {Object} Result
 */
export async function cancelInvite(inviteId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const invite = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            inviteId
        );

        // Validate user created the invite
        if (invite.invitedBy !== user.id) {
            return { success: false, error: "You can only cancel your own invites" };
        }

        // Validate invite status
        if (invite.status !== 'pending') {
            return { success: false, error: "Cannot cancel invite that is not pending" };
        }

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            inviteId,
            {
                status: 'cancelled',
                updatedAt: new Date().toISOString()
            }
        );

        return {
            success: true,
            message: "Invite cancelled successfully"
        };

    } catch (error) {
        console.error("Cancel invite error:", error);
        return { success: false, error: error.message || "Failed to cancel invite" };
    }
}

/**
 * Resend invite
 * @param {string} inviteId - Invite ID
 * @returns {Object} Result
 */
export async function resendInvite(inviteId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Not authenticated" };
        }

        const invite = await databases.getDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            inviteId
        );

        // Validate user created the invite
        if (invite.invitedBy !== user.id) {
            return { success: false, error: "You can only resend your own invites" };
        }

        // Validate invite status
        if (invite.status !== 'pending') {
            return { success: false, error: "Can only resend pending invites" };
        }

        // Update expiry time
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        await databases.updateDocument(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            inviteId,
            {
                expiresAt: newExpiresAt.toISOString(),
                updatedAt: new Date().toISOString()
            }
        );

        // TODO: Resend email/SMS

        const inviteUrl = `${window.location.origin}/invite/${invite.inviteCode}`;

        return {
            success: true,
            message: "Invite resent successfully",
            inviteUrl: inviteUrl
        };

    } catch (error) {
        console.error("Resend invite error:", error);
        return { success: false, error: error.message || "Failed to resend invite" };
    }
}

/**
 * Clean up expired invites (admin function)
 * @returns {Object} Result
 */
export async function cleanupExpiredInvites() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Admin access required" };
        }

        const now = new Date().toISOString();

        // Get expired pending invites
        const expiredInvites = await databases.listDocuments(
            DATABASE_IDS.MAIN,
            COLLECTION_IDS.INVITES,
            [
                { method: 'equal', attribute: 'status', values: ['pending'] },
                { method: 'lessThan', attribute: 'expiresAt', values: [now] },
                { method: 'limit', value: 100 }
            ]
        );

        let updatedCount = 0;

        for (const invite of expiredInvites.documents) {
            try {
                await databases.updateDocument(
                    DATABASE_IDS.MAIN,
                    COLLECTION_IDS.INVITES,
                    invite.$id,
                    {
                        status: 'expired',
                        updatedAt: new Date().toISOString()
                    }
                );
                updatedCount++;
            } catch (error) {
                console.error("Failed to update expired invite:", error);
            }
        }

        return {
            success: true,
            message: `Cleaned up ${updatedCount} expired invites`
        };

    } catch (error) {
        console.error("Cleanup expired invites error:", error);
        return { success: false, error: error.message || "Failed to cleanup expired invites" };
    }
}

export default {
    createInvite,
    acceptInvite,
    getInviteByCode,
    getUserInvites,
    cancelInvite,
    resendInvite,
    cleanupExpiredInvites
};
