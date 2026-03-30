# TrustPay KE - Quick Setup Guide

## 🚀 Immediate Setup Steps

### 1. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup
1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Run the contents of `supabase-database-setup.sql`
4. Run the contents of `supabase-storage-policies.sql`

### 3. Create Storage Buckets
In Supabase Dashboard → Storage:
- `kyc_documents` (Private)
- `proof_files` (Private)  
- `profile_images` (Public)

### 4. Create Admin User
1. Go to Authentication → Users
2. Create admin user account
3. Update their role to 'admin' in the users table

## 🔧 Fixed Issues

- ✅ Removed Appwrite dependencies
- ✅ Updated package.json for Supabase
- ✅ Fixed operations.html to use Supabase
- ✅ Added environment variable support
- ✅ Enhanced error handling
- ✅ Added storage policies
- ✅ Fixed authentication flow

## 🧪 Test the System

```bash
# Start development server
npm run dev

# Test connection in browser console
await trustPayAPI.testConnection()
```

## 📋 Next Steps

1. Configure M-PESA integration
2. Set up email notifications
3. Implement KYC verification
4. Add admin dashboard features

## 🐛 Troubleshooting

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase credentials
3. Ensure all SQL was executed
4. Check storage bucket policies
