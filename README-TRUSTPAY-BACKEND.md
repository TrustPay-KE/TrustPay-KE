# TrustPay KE - Production-Ready Backend Architecture

## 🏗️ Overview

TrustPay is a production-ready escrow platform built on Appwrite with comprehensive security, KYC verification, M-PESA integration, and dispute resolution capabilities.

## 📋 Core Features

### 🔐 Authentication System
- Email/password authentication with Appwrite
- Session-based management
- Password reset functionality
- User profile management
- Multi-device session management

### 🪪 KYC System
- Triggered only when users participate in escrow
- Document upload and verification
- Admin approval/rejection workflow
- Status tracking: not_started → pending → verified/rejected

### 💼 Escrow Management
- Complete escrow lifecycle: pending → funded → in_progress → delivered → accepted → released
- Terms acceptance by both parties
- Status validation and transitions
- Automatic fund release on acceptance

### 💳 M-PESA Integration
- STK Push for instant payments
- Manual payment verification
- Transaction tracking and callbacks
- Receipt validation

### ⚖️ Dispute Resolution
- Dispute creation with evidence upload
- Admin review and resolution
- Automatic fund handling based on resolution
- Status tracking throughout process

### 👥 Admin Dashboard
- User management and KYC approval
- Platform statistics and analytics
- Transaction monitoring
- Dispute management
- Platform settings configuration

### 🔔 Notification System
- In-app notifications
- Email notifications (template-based)
- SMS notifications for critical events
- User preference management

### 📧 Invite System
- Generate invite links for new participants
- Email/SMS invite delivery
- Invite tracking and management
- Automatic escrow linking on acceptance

## 🗂️ Project Structure

```
trustpay-ke/
├── js/                          # Frontend JavaScript modules
│   ├── appwrite.js             # Appwrite configuration and constants
│   ├── auth.js                 # Authentication system
│   ├── kyc.js                  # KYC verification system
│   ├── escrow.js               # Escrow management
│   ├── mpesa.js                # M-PESA payment integration
│   ├── disputes.js             # Dispute resolution
│   ├── admin.js                # Admin dashboard functionality
│   ├── invites.js              # Invite system
│   ├── security.js             # Security rules and permissions
│   └── database-setup.js       # Database schema definitions
├── functions/                   # Appwrite Functions (backend)
│   ├── mpesa-stkpush/         # M-PESA STK Push handler
│   ├── mpesa-callback/        # M-PESA callback processor
│   └── notifications/         # Notification system
└── README-TRUSTPAY-BACKEND.md # This documentation
```

## 🚀 Setup Instructions

### 1. Appwrite Project Setup

1. Create a new Appwrite project at [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. Note your Project ID and Endpoint
3. Update the configuration in `js/appwrite.js`

### 2. Database Setup

Run the database setup:

```javascript
import { setupDatabase } from './js/database-setup.js';

await setupDatabase();
```

This creates:
- **trustpay_main** database
- **users** collection - User profiles and settings
- **escrows** collection - Escrow transactions
- **transactions** collection - Payment records
- **disputes** collection - Dispute cases
- **kyc** collection - KYC verification data
- **notifications** collection - User notifications
- **invites** collection - User invitations

### 3. Storage Buckets

Create the following storage buckets:
- **kyc_documents** - KYC verification files
- **proof_files** - Dispute evidence and payment proofs
- **profile_images** - User profile pictures

### 4. Appwrite Functions

Deploy the following functions:

#### M-PESA STK Push Function
```bash
# Environment variables required:
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox  # or production
MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback
```

#### M-PESA Callback Function
- Handles payment confirmations from Safaricom
- Updates transaction status automatically
- Triggers escrow funding

#### Notification Function
- Sends email and SMS notifications
- Template-based messaging
- User preference handling

### 5. Security Configuration

The security system includes:
- Role-based access control (user/admin)
- Resource-level permissions
- Input validation and sanitization
- Rate limiting
- File upload security

## 📊 Database Schema

### Users Collection
```javascript
{
  userId: string (unique),
  name: string,
  email: string (unique),
  phone: string (unique),
  kycStatus: "not_started" | "pending" | "verified" | "rejected",
  role: "user" | "admin",
  profileImageId: string,
  isVerified: boolean,
  isActive: boolean,
  lastLoginAt: datetime,
  notificationPreferences: object,
  createdAt: datetime,
  updatedAt: datetime
}
```

### Escrows Collection
```javascript
{
  escrowId: string (unique),
  buyerId: string,
  sellerId: string,
  amount: decimal,
  currency: string (default: "KES"),
  description: string,
  status: "pending" | "funded" | "in_progress" | "delivered" | "accepted" | "released" | "disputed" | "cancelled" | "refunded",
  termsAccepted: boolean,
  buyerTermsAccepted: boolean,
  sellerTermsAccepted: boolean,
  platformFee: decimal,
  platformFeePercentage: decimal,
  proofFileIds: array,
  notes: string,
  createdAt: datetime,
  updatedAt: datetime
}
```

### Transactions Collection
```javascript
{
  transactionId: string (unique),
  escrowId: string,
  userId: string,
  type: "payment" | "release" | "refund",
  amount: decimal,
  currency: string,
  status: "pending" | "completed" | "failed",
  paymentMethod: "mpesa" | "bank" | "internal",
  paymentDetails: object,
  mpesaReceipt: string,
  phoneNumber: string,
  transactionDate: datetime,
  processedAt: datetime,
  failureReason: string,
  webhookData: object,
  createdAt: datetime,
  updatedAt: datetime
}
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/reset-password` - Password reset request
- `POST /auth/update-password` - Password update

### KYC Management
- `POST /kyc/submit` - Submit KYC application
- `GET /kyc/status` - Get KYC status
- `POST /kyc/approve` - Admin: Approve KYC
- `POST /kyc/reject` - Admin: Reject KYC

### Escrow Operations
- `POST /escrow/create` - Create new escrow
- `GET /escrow/:id` - Get escrow details
- `POST /escrow/:id/accept-terms` - Accept escrow terms
- `POST /escrow/:id/mark-delivered` - Mark as delivered
- `POST /escrow/:id/accept-delivery` - Accept delivery
- `POST /escrow/:id/cancel` - Cancel escrow
- `GET /escrow/my` - Get user's escrows

### Payment Processing
- `POST /payment/mpesa/initiate` - Initiate M-PESA STK Push
- `POST /payment/mpesa/verify` - Verify manual payment
- `GET /payment/status/:checkoutId` - Check payment status
- `GET /payment/history` - Get payment history

### Dispute Management
- `POST /dispute/raise` - Raise dispute
- `GET /dispute/:id` - Get dispute details
- `POST /dispute/:id/resolve` - Admin: Resolve dispute
- `GET /dispute/my` - Get user's disputes

### Admin Functions
- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/users` - Get all users
- `POST /admin/users/:id/status` - Update user status
- `GET /admin/transactions` - Get all transactions
- `POST /admin/force-release` - Force release funds
- `POST /admin/force-refund` - Force refund

## 🔒 Security Features

### Authentication & Authorization
- JWT-based session management
- Role-based access control
- Resource-level permissions
- Multi-factor authentication support

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- File upload security

### Rate Limiting
- Client-side rate limiting
- API endpoint throttling
- DDoS protection measures

### Audit Trail
- Complete action logging
- Transaction tracking
- User activity monitoring

## 📱 M-PESA Integration

### STK Push Flow
1. User initiates payment for escrow
2. System creates transaction record
3. STK Push request sent to Safaricom
4. User enters PIN on phone
5. Callback received with payment status
6. Escrow automatically funded on success

### Manual Payment
1. User pays via Paybill: 542542
2. Account: ESCROW-{escrowId}
3. User submits M-PESA receipt
4. System verifies receipt with Safaricom
5. Escrow funded on verification

## 🧪 Testing

### Unit Tests
```javascript
// Test authentication
import { signupUser, loginUser } from './js/auth.js';

const user = await signupUser('test@example.com', 'Password123', 'Test User', '254712345678');
const login = await loginUser('test@example.com', 'Password123');
```

### Integration Tests
```javascript
// Test escrow flow
import { createEscrow, acceptEscrowTerms } from './js/escrow.js';
import { initiateMpesaPayment } from './js/mpesa.js';

const escrow = await createEscrow({
  sellerId: 'seller123',
  amount: 1000,
  description: 'Test escrow'
});

await acceptEscrowTerms(escrow.escrowId, true);
await initiateMpesaPayment(escrow.escrowId, 1000, '254712345678');
```

## 🚀 Deployment

### Environment Variables
```bash
# Appwrite Configuration
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1

# M-PESA Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=production

# Email Configuration (optional)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# SMS Configuration (optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

### Production Checklist
- [ ] Configure production M-PESA credentials
- [ ] Set up email/SMS services
- [ ] Configure SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Test all payment flows
- [ ] Verify security configurations
- [ ] Set up error monitoring

## 📈 Monitoring & Analytics

### Key Metrics
- User registration and KYC completion rates
- Escrow creation and completion rates
- Payment success/failure rates
- Dispute resolution times
- Platform revenue tracking

### Logging
- All user actions logged
- Payment transactions tracked
- Error events captured
- Security violations monitored

## 🤝 Support

For technical support:
- Review the documentation
- Check Appwrite function logs
- Monitor M-PESA callback responses
- Verify database configurations

## 📄 License

This project is proprietary to TrustPay KE. All rights reserved.

---

**Built with ❤️ using Appwrite**
