# TrustPay KE - Complete System Documentation

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Storage Configuration](#storage-configuration)
5. [API Endpoints](#api-endpoints)
6. [Appwrite Functions](#appwrite-functions)
7. [Security Configuration](#security-configuration)
8. [Setup Instructions](#setup-instructions)
9. [Testing Guide](#testing-guide)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

TrustPay KE is a production-ready escrow platform built on Appwrite with comprehensive security, KYC verification, M-PESA integration, and dispute resolution capabilities.

### **Core Features**
- 🔐 User authentication and authorization
- 🪪 KYC verification system
- 💼 Complete escrow lifecycle management
- 💳 M-PESA STK Push payment integration
- ⚖️ Dispute resolution system
- 👥 Admin dashboard functionality
- 🔔 Notification system (email, SMS, in-app)
- 📧 User invite system
- 🛡️ Security framework and permissions

### **Technology Stack**
- **Backend**: Appwrite (BaaS)
- **Frontend**: HTML5, JavaScript ES6+
- **Payments**: M-PESA Daraja API
- **Storage**: Appwrite Storage
- **Functions**: Appwrite Functions (Node.js)
- **Real-time**: Appwrite Realtime

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 GitHub Pages (Frontend)        │
│                     │                       │
│              ┌────▼────┐              │
│              │  Appwrite  │              │
│              │   API     │              │
│              │ (Backend)  │              │
│              └────▲────┘              │
│                     │                       │
│  ┌─────────────────────────────┐   │
│  │    Appwrite Functions      │   │
│  │  (Server-side Logic)     │   │
│  └─────────────────────────────┘   │
│                     │                       │
│  ┌─────────────────────────────┐   │
│  │    Appwrite Storage        │   │
│  │     (File Storage)        │   │
│  └─────────────────────────────┘   │
│                     │                       │
│  ┌─────────────────────────────┐   │
│  │    Appwrite Database       │   │
│  │      (Data Storage)       │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### **Data Flow**
1. **User Registration** → Appwrite Auth → Users Collection
2. **KYC Submission** → Appwrite Storage → KYC Collection → Admin Review
3. **Escrow Creation** → Validation → Escrows Collection
4. **Payment Processing** → M-PESA API → Appwrite Function → Transactions Collection
5. **Dispute Resolution** → Evidence Upload → Admin Review → Resolution
6. **Notifications** → Appwrite Functions → Email/SMS → Users

---

## 🗄️ Database Schema

### **Database**: `trustpay_main`

#### **Collections Overview**

| Collection | ID | Purpose | Key Fields |
|------------|-----|---------|------------|
| Users | `users` | User profiles and authentication |
| Escrows | `escrows` | Escrow transactions and lifecycle |
| Transactions | `transactions` | Payment records and history |
| Disputes | `disputes` | Dispute cases and resolution |
| KYC | `kyc` | Verification applications and documents |
| Notifications | `notifications` | User notifications and alerts |
| Invites | `invites` | User invitation system |

#### **Detailed Schema**

##### **Users Collection**
```javascript
{
  userId: string (unique) // Primary identifier
  name: string // Full name
  email: string (unique) // Login email
  phone: string (unique) // Kenya format: 254XXXXXXXXX
  password: string // Hashed password
  role: string // "user" | "admin"
  kycStatus: string // "not_started" | "pending" | "verified" | "rejected"
  profileImageId: string // Reference to profile image
  isVerified: boolean // Email verification status
  isActive: boolean // Account status
  notificationPreferences: {
    email: boolean,
    sms: boolean,
    push: boolean
  },
  lastLoginAt: datetime,
  createdAt: datetime,
  updatedAt: datetime
}
```

##### **Escrows Collection**
```javascript
{
  escrowId: string (unique) // Primary identifier
  buyerId: string // Reference to users.userId
  sellerId: string // Reference to users.userId (optional)
  amount: decimal // Escrow amount
  currency: string // "KES"
  description: string // Escrow description
  status: string // "pending" | "funded" | "in_progress" | "delivered" | "accepted" | "released" | "disputed" | "cancelled" | "refunded"
  termsAccepted: boolean // Both parties must accept
  buyerTermsAccepted: boolean,
  sellerTermsAccepted: boolean,
  platformFee: decimal // TrustPay fee
  platformFeePercentage: decimal // Fee percentage
  proofFileIds: array // Reference to storage files
  notes: string // Additional notes
  createdAt: datetime,
  updatedAt: datetime
}
```

##### **Transactions Collection**
```javascript
{
  transactionId: string (unique) // Primary identifier
  escrowId: string // Reference to escrows.escrowId
  userId: string // Reference to users.userId
  type: string // "payment" | "release" | "refund"
  amount: decimal // Transaction amount
  currency: string // "KES"
  status: string // "pending" | "completed" | "failed"
  paymentMethod: string // "mpesa" | "bank" | "internal"
  paymentDetails: {
    checkoutRequestId?: string, // M-PESA STK Push ID
    mpesaReceipt?: string, // M-PESA receipt number
    phoneNumber?: string, // Payer phone number
    resultCode?: string,
    resultDesc?: string
  },
  mpesaReceipt: string, // M-PESA confirmation
  phoneNumber: string, // Payer phone
  transactionDate: datetime, // Payment timestamp
  processedAt: datetime, // Processing timestamp
  failureReason: string, // Failure reason
  webhookData: object, // M-PESA callback data
  createdAt: datetime,
  updatedAt: datetime
}
```

##### **Disputes Collection**
```javascript
{
  disputeId: string (unique) // Primary identifier
  escrowId: string // Reference to escrows.escrowId
  raisedBy: string // Reference to users.userId
  disputeType: string // "quality" | "non_delivery" | "fraud" | "other"
  description: string // Detailed dispute description
  status: string // "pending" | "reviewing" | "resolved"
  evidenceFileIds: array // Reference to storage files
  adminDecision: string // Admin resolution decision
  resolutionAction: string // "release_to_seller" | "refund_to_buyer"
  adminNotes: string // Admin notes
  resolvedBy: string // Admin who resolved
  resolvedAt: datetime,
  createdAt: datetime,
  updatedAt: datetime
}
```

##### **KYC Collection**
```javascript
{
  kycId: string (unique) // Primary identifier
  userId: string // Reference to users.userId
  status: string // "not_started" | "pending" | "verified" | "rejected"
  submittedAt: datetime, // Submission timestamp
  reviewedAt: datetime, // Admin review timestamp
  rejectionReason: string, // Rejection reason
  documentIds: array // Reference to storage files
  adminNotes: string, // Admin review notes
  createdAt: datetime,
  updatedAt: datetime
}
```

##### **Notifications Collection**
```javascript
{
  notificationId: string (unique) // Primary identifier
  userId: string // Reference to users.userId
  type: string // "escrow_created" | "payment_received" | "funds_released" | "dispute_opened" | "kyc_approved" | "kyc_rejected" | "invite_received"
  title: string // Notification title
  message: string // Notification message
  relatedId: string // Related entity ID
  relatedType: string // Related entity type
  isRead: boolean // Read status
  emailSent: boolean // Email delivery status
  smsSent: boolean // SMS delivery status
  createdAt: datetime,
  updatedAt: datetime
}
```

##### **Invites Collection**
```javascript
{
  inviteId: string (unique) // Primary identifier
  escrowId: string // Reference to escrows.escrowId
  invitedBy: string // Reference to users.userId
  inviteCode: string // Unique invite code
  inviteType: string // "buyer" | "seller"
  email: string // Invitee email
  phone: string // Invitee phone
  status: string // "pending" | "accepted" | "cancelled" | "expired"
  customMessage: string // Personal message
  acceptedBy: string // Reference to users.userId
  acceptedAt: datetime, // Acceptance timestamp
  expiresAt: datetime, // Expiration timestamp
  createdAt: datetime,
  updatedAt: datetime
}
```

---

## 📦 Storage Configuration

### **Storage Buckets**

| Bucket ID | Name | Purpose | File Types | Permissions |
|------------|-------|---------|------------|-------------|
| `kyc_documents` | KYC Documents | ID cards, passports, photos | Read/Write/Delete (Any) |
| `proof_files` | Proof Files | Screenshots, documents, receipts | Read/Write/Delete (Any) |
| `profile_images` | Profile Images | User avatars, profile pictures | Read/Write/Delete (Any) |

### **File Organization**
```
kyc_documents/
├── {userId}/
│   ├── id_front.jpg
│   ├── id_back.jpg
│   ├── passport.jpg
│   └── selfie.jpg
└── ...

proof_files/
├── {escrowId}/
│   ├── delivery_proof.jpg
│   ├── quality_issue.jpg
│   └── correspondence.pdf
└── ...

profile_images/
├── {userId}/
│   ├── avatar.jpg
│   └── profile_banner.jpg
└── ...
```

---

## 🔌 API Endpoints

### **Authentication Endpoints**
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/current-user
POST /api/auth/update-profile
POST /api/auth/update-password
POST /api/auth/update-email
```

### **KYC Endpoints**
```
POST /api/kyc/submit
GET  /api/kyc/status
POST /api/kyc/approve (Admin)
POST /api/kyc/reject (Admin)
DELETE /api/kyc/documents/{documentId}
```

### **Escrow Endpoints**
```
POST /api/escrow/create
GET  /api/escrow/{escrowId}
POST /api/escrow/{escrowId}/accept-terms
POST /api/escrow/{escrowId}/update-status
POST /api/escrow/{escrowId}/mark-delivered
POST /api/escrow/{escrowId}/accept-delivery
POST /api/escrow/{escrowId}/release-funds
POST /api/escrow/{escrowId}/cancel
GET  /api/escrow/user/{userId}
GET  /api/escrow/all (Admin)
```

### **Payment Endpoints**
```
POST /api/payment/mpesa/initiate
GET  /api/payment/status/{checkoutRequestId}
POST /api/payment/mpesa/verify
POST /api/payment/process-callback
GET  /api/payment/history/{userId}
```

### **Dispute Endpoints**
```
POST /api/dispute/raise
GET  /api/dispute/{disputeId}
POST /api/dispute/{disputeId}/resolve (Admin)
GET  /api/dispute/user/{userId}
GET  /api/dispute/all (Admin)
```

### **Admin Endpoints**
```
GET /api/admin/dashboard
GET /api/admin/users
POST /api/admin/users/{userId}/status
POST /api/admin/users/{userId}/role
GET /api/admin/transactions
POST /api/admin/force-release
POST /api/admin/force-refund
GET /api/admin/platform-settings
POST /api/admin/platform-settings
```

### **Notification Endpoints**
```
POST /api/notifications/send
GET /api/notifications/user/{userId}
POST /api/notifications/{notificationId}/read
```

### **Invite Endpoints**
```
POST /api/invite/create
GET /api/invite/by-code/{inviteCode}
POST /api/invite/accept
GET /api/invite/user/{userId}
POST /api/invite/{inviteId}/cancel
POST /api/invite/{inviteId}/resend
```

---

## ⚙️ Appwrite Functions

### **Function: mpesa-stkpush**
- **Trigger**: HTTP POST
- **Purpose**: Initiate M-PESA STK Push payments
- **Environment Variables**:
  ```
  MPESA_CONSUMER_KEY: Safaricom API Consumer Key
  MPESA_CONSUMER_SECRET: Safaricom API Consumer Secret
  MPESA_PASSKEY: Safaricom STK Push Passkey
  MPESA_ENVIRONMENT: "sandbox" | "production"
  MPESA_CALLBACK_URL: Payment callback URL
  ```
- **Input**: Escrow details, amount, phone number
- **Output**: STK Push response with CheckoutRequestID

### **Function: mpesa-callback**
- **Trigger**: HTTP POST (from Safaricom)
- **Purpose**: Process M-PESA payment confirmations
- **Process**:
  1. Validate callback authenticity
  2. Update transaction status
  3. Update escrow status to "funded"
  4. Trigger notifications
- **Response**: Success/failure acknowledgment

### **Function: notifications**
- **Trigger**: HTTP POST
- **Purpose**: Send email and SMS notifications
- **Environment Variables**:
  ```
  SMTP_HOST: Email server host
  SMTP_PORT: Email server port
  SMTP_USER: Email username
  SMTP_PASS: Email password
  TWILIO_ACCOUNT_SID: Twilio SID (for SMS)
  TWILIO_AUTH_TOKEN: Twilio auth token
  TWILIO_PHONE_NUMBER: Twilio phone number
  ```
- **Templates**: Predefined email/SMS templates
- **Process**:
  1. Determine notification type
  2. Select appropriate template
  3. Send via email/SMS
  4. Update notification status

---

## 🛡️ Security Configuration

### **Authentication & Authorization**
- **JWT-based sessions** via Appwrite
- **Role-based access control**: user, admin
- **API rate limiting**: Prevent abuse
- **Input validation**: All endpoints validate input
- **CORS configuration**: Proper headers set
- **HTTPS enforcement**: All production endpoints use HTTPS

### **Data Protection**
- **Password hashing**: bcrypt with salt rounds
- **PII encryption**: Sensitive data encrypted at rest
- **Audit logging**: All actions logged
- **Session management**: Secure token handling
- **File upload security**: Type validation, size limits, virus scanning

### **Access Control Matrix**

| Role | Users | Escrows | Transactions | Disputes | KYC | Admin |
|-------|--------|---------|-------------|----------|------|-------|
| user | Read Own | Read Own | Read Own | Read Own | Read Own | No |
| admin | Read All | Read All | Read All | Read All | Read All | Yes |

### **Security Headers**
```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
}
```

---

## 📋 Setup Instructions

### **Prerequisites**
- Node.js 16+ installed locally
- Appwrite account created
- Domain configured for production
- M-PESA Daraja API access
- Email/SMS service accounts (optional)

### **Step-by-Step Setup**

#### **1. Appwrite Project Setup**
1. Create new project at https://cloud.appwrite.io
2. Note Project ID: `69c165c7003cae4214fe`
3. Set Endpoint: `https://fra.cloud.appwrite.io/v1`
4. Enable Authentication, Database, Storage, Functions

#### **2. Database Creation**
```bash
# Using the provided setup script
npm run setup
# Or manually create via Appwrite Console
```

#### **3. Collection Creation**
- Use `database-setup.js` script
- Creates all 7 collections with proper indexes
- Sets up relationships and constraints

#### **4. Storage Bucket Creation**
- Create 3 buckets with proper permissions
- Configure CORS policies
- Set up file size limits

#### **5. Function Deployment**
```bash
# Deploy functions to Appwrite
appwrite functions create
appwrite functions deploy
```

#### **6. Environment Variables**
```bash
# Appwrite Functions
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=sandbox

# Notification Function
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 🧪 Testing Guide

### **Unit Testing**
```javascript
// Test authentication
import { signupUser, loginUser } from './js/auth.js';

const testUser = await signupUser('test@example.com', 'Password123', 'Test User', '254712345678');
const loginResult = await loginUser('test@example.com', 'Password123');

// Test escrow creation
import { createEscrow } from './js/escrow.js';

const escrow = await createEscrow({
    sellerId: 'seller123',
    amount: 1000,
    description: 'Test escrow'
});
```

### **Integration Testing**
```javascript
// Test M-PESA integration
import { initiateMpesaPayment } from './js/mpesa.js';

const payment = await initiateMpesaPayment('escrow123', 1000, '254712345678');
console.log('Payment initiated:', payment);
```

### **End-to-End Testing**
1. **User Registration Flow**
2. **KYC Submission Flow**
3. **Escrow Creation Flow**
4. **Payment Processing Flow**
5. **Dispute Resolution Flow**

### **Performance Testing**
- Load testing with multiple concurrent users
- Database query optimization
- API response time monitoring
- File upload speed testing

---

## 🚀 Deployment Guide

### **Development Environment**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access application
http://localhost:3000
```

### **Production Deployment**

#### **GitHub Pages (Frontend)**
```bash
# Deploy to GitHub Pages
git add .
git commit -m "Deploy to production"
git push origin main

# Access at
https://trustpay-ke.github.io/TrustPay-KE/
```

#### **Appwrite (Backend)**
```bash
# Deploy functions
appwrite functions create mpesa-stkpush
appwrite functions create mpesa-callback
appwrite functions create notifications

# Set environment variables
appwrite functions updateVariable mpesa-stkpush MPESA_CONSUMER_KEY "your_key"
appwrite functions updateVariable mpesa-stkpush MPESA_CONSUMER_SECRET "your_secret"
```

#### **Custom Domain**
```bash
# Configure custom domain
# 1. DNS settings
# 2. SSL certificates
# 3. Appwrite custom domain
# 4. GitHub Pages custom domain
```

### **Environment Configuration**
```javascript
// Production
const config = {
    appwrite: {
        endpoint: 'https://fra.cloud.appwrite.io/v1',
        projectId: '69c165c7003cae4214fe'
    },
    mpesa: {
        environment: 'production',
        paybill: '542542',
        callbackUrl: 'https://your-domain.com/api/mpesa/callback'
    }
};

// Development
const devConfig = {
    ...config,
    mpesa: {
        ...config.mpesa,
        environment: 'sandbox'
    }
};
```

---

## 🔧 Troubleshooting

### **Common Issues & Solutions**

#### **Appwrite Connection Issues**
- **Problem**: "Appwrite is not a constructor"
- **Solution**: Use `window.appwrite.Client()` instead of `new Appwrite()`
- **Code**: Check SDK version compatibility

#### **Database Issues**
- **Problem**: Collection not found
- **Solution**: Run database setup script
- **Code**: Check collection IDs match exactly

#### **M-PESA Issues**
- **Problem**: STK Push timeout
- **Solution**: Check phone number format and network
- **Code**: Verify callback URL accessibility

#### **Storage Issues**
- **Problem**: File upload failed
- **Solution**: Check bucket permissions
- **Code**: Verify file size and type limits

#### **Performance Issues**
- **Problem**: Slow API responses
- **Solution**: Add database indexes
- **Code**: Implement pagination and caching

### **Debug Mode**
```javascript
// Enable debug logging
const DEBUG = true;

if (DEBUG) {
    console.log('Debug: API call initiated');
    // Add detailed logging
}
```

### **Health Checks**
```javascript
// API health check
async function healthCheck() {
    try {
        const response = await fetch('/api/health');
        return response.ok;
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
}
```

### **Error Handling**
```javascript
// Standardized error responses
class TrustPayError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}

// Error response format
{
    success: false,
    error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: { field: 'email', reason: 'Invalid format' }
    }
}
```

---

## 📞 Support & Maintenance

### **Monitoring**
- Application performance monitoring
- Error tracking and alerting
- User activity analytics
- System health checks

### **Backup Strategy**
- Daily database backups
- File storage redundancy
- Configuration version control

### **Scaling Considerations**
- Database connection pooling
- CDN for static assets
- Load balancing for API functions
- Caching strategies

### **Security Updates**
- Regular dependency updates
- Security patch management
- Vulnerability scanning
- Access log monitoring

---

## 📚 File Structure Reference

```
trustpay-ke/
├── js/                          # Frontend JavaScript modules
│   ├── appwrite.js             # Appwrite configuration
│   ├── auth.js                 # Authentication system
│   ├── kyc.js                  # KYC verification
│   ├── escrow.js               # Escrow management
│   ├── mpesa.js                # M-PESA payments
│   ├── disputes.js              # Dispute resolution
│   ├── admin.js                 # Admin dashboard
│   ├── invites.js               # Invite system
│   ├── security.js              # Security framework
│   ├── database-setup.js        # Database schemas
│   └── trustpay-api.js         # Main API interface
├── functions/                    # Appwrite Functions
│   ├── mpesa-stkpush/         # M-PESA STK Push
│   ├── mpesa-callback/          # Payment callbacks
│   └── notifications/           # Notification system
├── docs/                       # Documentation
│   ├── api.md                  # API documentation
│   ├── deployment.md             # Deployment guide
│   └── troubleshooting.md       # Issue resolution
├── tests/                       # Test suites
│   ├── unit/                   # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                    # End-to-end tests
└── deployment/                  # Deployment configurations
    ├── development/              # Dev environment
    ├── staging/                 # Staging environment
    └── production/              # Production environment
```

---

## 🔄 Version History

### **Current Version**: 1.0.0
### **Last Updated**: 2026-03-29
### **Compatibility**: Appwrite SDK v10.0.0+

---

## 📧 Development Guidelines

### **Code Standards**
- Use ES6+ features appropriately
- Implement proper error handling
- Follow consistent naming conventions
- Add comprehensive comments
- Maintain type safety where possible

### **Testing Requirements**
- Unit tests for all functions
- Integration tests for API endpoints
- Manual testing for payment flows
- Performance testing under load

### **Security Considerations**
- Validate all user inputs
- Implement rate limiting
- Use HTTPS in production
- Sanitize all data inputs
- Implement proper authentication

---

*This documentation serves as the complete reference for the TrustPay KE system architecture, setup, and maintenance.*
