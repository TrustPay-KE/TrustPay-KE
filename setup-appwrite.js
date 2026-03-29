/**
 * TrustPay KE - Appwrite Setup Script
 * Run this to initialize database and collections
 */

const { setupDatabase } = require('./js/database-setup.js');

async function setup() {
    console.log('🚀 Setting up TrustPay backend...');
    console.log('📋 This will create all necessary collections and indexes');
    
    try {
        await setupDatabase();
        console.log('✅ Database setup completed successfully!');
        console.log('');
        console.log('🎯 Next steps:');
        console.log('1. Deploy Appwrite Functions from /functions/ directory');
        console.log('2. Configure M-PESA credentials in environment variables');
        console.log('3. Set up email/SMS services for notifications');
        console.log('4. Test the authentication and escrow flows');
        console.log('');
        console.log('📚 Documentation: README-TRUSTPAY-BACKEND.md');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Ensure Appwrite project is created');
        console.log('2. Check your Appwrite project ID and endpoint');
        console.log('3. Verify you have admin permissions');
        console.log('4. Check internet connection');
    }
}

setup();
