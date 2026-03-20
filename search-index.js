const searchIndex = [
    {
        title: "TrustPay KE - Safe Escrow Services Kenya",
        url: "index.html",
        type: "page",
        content: `Kenya's peer-to-peer escrow platform. Trade safely with escrow protection. M-PESA secured transactions. Secure your online transactions with escrow. Buyer and seller protection. We hold funds until delivery is confirmed. How escrow works. Agree terms, deposit funds, hold in escrow, seller delivers, release payment. Service fees: FREE below KES 200, KES 30 for KES 201-1000, 2% for KES 1001-5000, 1.8% for KES 5001-10000, 1.5% for KES 10001-50000, 1% for KES 50001-100000. 273+ users trust us. Secure escrow. M-PESA protected. Start an order today.`
    },
    {
        title: "Start Order - TrustPay KE",
        url: "start-order.html",
        type: "page",
        content: `Start your escrow order. Buyer initiates order. Enter transaction details. Product description, agreed price, quantity, any special terms. Select service fee based on amount. Review summary. Confirm order. Share order link with seller. Seller accepts. Buyer deposits to M-PESA. Admin receives and confirms. Seller delivers goods or service. Buyer confirms delivery. Admin releases payment minus fee. Dispute resolution. Mediation available. 24/7 support.`
    },
    {
        title: "Login - TrustPay KE",
        url: "login.html",
        type: "page",
        content: `Login to your TrustPay account. Email address. Password. Remember me. Forgot password. Sign up. Don't have an account. Secure login. Protected by M-PESA.`
    },
    {
        title: "Sign Up - TrustPay KE",
        url: "signup.html",
        type: "page",
        content: `Create your TrustPay account. Full name. Email address. Phone number (M-PESA). Password. Confirm password. Terms and conditions. Privacy policy. Create account. Already have an account. Login.`
    },
    {
        title: "Dashboard - TrustPay KE",
        url: "dashboard.html",
        type: "page",
        content: `Your TrustPay dashboard. Active orders. Completed transactions. Pending payments. Dispute history. Profile settings. Account balance. M-PESA integration. Withdraw funds. Transaction history. View all orders. Order status. In escrow. Released. Disputed. Cancelled.`
    },
    {
        title: "About Us - TrustPay KE",
        url: "about.html",
        type: "page",
        content: `About TrustPay Kenya. We are Kenya's trusted peer-to-peer escrow platform. Our mission is to make online transactions safe and secure. We protect buyers and sellers from fraud. Founded in 2025. Team of experienced professionals. 24/7 customer support. Commitment to transparency.`
    },
    {
        title: "Contact Us - TrustPay KE",
        url: "contact.html",
        type: "page",
        content: `Contact TrustPay KE. Get in touch with us. Name. Email. Phone. Message. Send message. WhatsApp support. Phone: 0797347508. Email support. Response time: within 24 hours.`
    },
    {
        title: "Blog - TrustPay KE",
        url: "blog.html",
        type: "page",
        content: `TrustPay KE Blog. Expert guides on escrow, online safety, and secure transactions in Kenya. Categories: Escrow Education, Online Safety, Scam Awareness, Payment Security, Freelance Tips, Marketplace. Stay informed, trade safely.`
    },
    {
        title: "What is Escrow and Why It's Important in Kenya",
        url: "blog/blog-what-is-escrow-kenya.html",
        type: "article",
        content: `What is escrow and why it's important in Kenya. Escrow is a financial arrangement where a third party holds funds until a transaction is complete. In Kenya, online fraud is rising. Escrow protects both buyers and sellers. Buyer deposits money to trusted intermediary. Seller ships goods or provides service. Buyer confirms receipt. Funds released to seller. If dispute arises, mediator intervenes. Benefits: Protection against scams. Builds trust between strangers. Secure M-PESA transactions. Peace of mind. TrustPay KE offers escrow services for all Kenya.`
    },
    {
        title: "Top 5 Online Scams in Kenya and How to Avoid Them",
        url: "blog/blog-top-5-online-scams-kenya.html",
        type: "article",
        content: `Top 5 online scams in Kenya and how to avoid them. 1. Item not delivered scam. Seller takes money and never ships. 2. Counterfeit goods. Fake products sold as authentic. 3. Overpayment scam. Fake buyer sends excess money. 4. Phishing. Fake emails stealing passwords. 5. Rental deposit scam. Fake landlords taking deposits. Prevention tips: Always use escrow. Verify seller identity. Check reviews. Never send money upfront. Use secure payment methods. TrustPay KE protects against all these scams.`
    },
    {
        title: "Safe M-Pesa Payments: Tips Every Kenyan Should Know",
        url: "blog/blog-safe-mpesa-payments-tips.html",
        type: "article",
        content: `Safe M-Pesa payments tips every Kenyan should know. M-Pesa is Kenya's mobile money service. Security features: PIN protection. Two-factor authentication. Transaction limits. Daily limits. Tips: Never share your PIN. Check transaction confirmations. Verify recipient details. Avoid public WiFi for transactions. Use official M-Pesa app. Report suspicious activity immediately. TrustPay KE uses M-Pesa for secure escrow transactions.`
    },
    {
        title: "Freelancer Payment Protection: Never Work for Free Again",
        url: "blog/blog-freelancer-payment-protection.html",
        type: "article",
        content: `Freelancer payment protection. Never work for free again. Kenyan freelancers face payment issues. Clients refusing to pay. Work completed but no payment. Escrow solution. Client deposits payment upfront. Freelancer delivers work. Client approves. Payment released. Benefits: Guaranteed payment. No disputes. Professional transactions. TrustPay KE freelancer protection. Milestone-based payments. Contract templates.`
    },
    {
        title: "Facebook Marketplace Safety: Buy and Sell Safely in Kenya",
        url: "blog/blog-facebook-marketplace-safety.html",
        type: "article",
        content: `Facebook Marketplace safety in Kenya. Buy and sell safely. Common scams: Fake listings. Non-existent items. Bait and switch. Prepayment fraud. Safety tips: Verify seller. Use escrow. Meet in public places. Inspect before paying. Check profile age. Read reviews. Report suspicious listings. TrustPay KE protects Facebook Marketplace transactions.`
    },
    {
        title: "Jiji Kenya Safety Guide: Buy and Sell with Confidence",
        url: "blog/blog-jiji-kenya-safety-guide.html",
        type: "article",
        content: `Jiji Kenya safety guide. Buy and sell with confidence. Jiji.co.ke is popular marketplace. Scam tactics: Fake phone numbers. Non-delivery fraud. Counterfeit products. How to stay safe: Verify listings. Use escrow. Check seller history. Request photos. Video call verification. Never wire money. TrustPay KE integration with Jiji Kenya.`
    },
    {
        title: "M-Pesa Fraud Prevention: Complete 2026 Guide",
        url: "blog/blog-mpesa-fraud-prevention.html",
        type: "article",
        content: `M-Pesa fraud prevention complete 2026 guide. Latest fraud tactics: SIM swap fraud. Social engineering. Fake M-Pesa messages. Number manipulation. Phishing calls. How to protect: Secure your SIM. Don't share PIN. Verify messages. Check sender number. Report fraud to Safaricom. TrustPay KE secure M-Pesa transactions. Two-factor authentication.`
    },
    {
        title: "Safe Online Car Purchases in Kenya: Escrow Guide",
        url: "blog/blog-online-car-purchases-kenya.html",
        type: "article",
        content: `Safe online car purchases in Kenya. Escrow guide. Car buying scams: Fake vehicle listings. Stolen cars. Document fraud. Price manipulation. Escrow protection: Deposit funds safely. Vehicle inspection. Document verification. Title transfer. Release payment on delivery. TrustPay KE car purchase protection. KES amounts protected.`
    },
    {
        title: "Instagram Shop Safety in Kenya: Complete 2026 Guide",
        url: "blog/blog-instagram-shop-safety.html",
        type: "article",
        content: `Instagram Shop safety in Kenya. Complete 2026 guide. Fake Instagram shops: Cloned accounts. Fake reviews. Too good prices. Non-existent products. Safety checklist: Check account age. Verify business details. Research business name. Use escrow. Read comments. Contact directly. TrustPay KE Instagram shop protection.`
    },
    {
        title: "Escrow vs Cash on Delivery: Which is Safer?",
        url: "blog/blog-escrow-vs-cod.html",
        type: "article",
        content: `Escrow vs Cash on Delivery. Which is safer? COD advantages: Pay on receipt. See item first. COD disadvantages: Limited protection. disputes hard to resolve. Seller may refuse. Escrow advantages: Both parties protected. Third party holds funds. Guaranteed delivery. Professional mediation. Escrow disadvantages: Small fee. TrustPay KE recommends escrow for high value.`
    },
    {
        title: "Land Purchase Scam Prevention: Complete Kenya Guide",
        url: "blog/blog-land-purchase-scam-prevention.html",
        type: "article",
        content: `Land purchase scam prevention complete Kenya guide. Land scams in Kenya: Fake title deeds. Double selling. Forged documents. Unverified owners. Prevention steps: Verify title at Lands Office. Check registry. Physical inspection. Professional survey. Use escrow for payments. TrustPay KE land transaction protection. Large amounts protected.`
    },
    {
        title: "TikTok Shop Kenya: Safety Tips for Buyers and Sellers",
        url: "blog/blog-tiktok-shop-kenya.html",
        type: "article",
        content: `TikTok Shop Kenya safety tips. For buyers and sellers. TikTok Shop scams: Live shopping fraud. Fake urgency. Non-delivery. Counterfeit products. Buyer tips: Research seller. Use escrow. Compare prices. Check reviews. Seller tips: Verify buyers. Use secure payment. Document deliveries. TrustPay KE TikTok Shop protection.`
    },
    {
        title: "Freelancer Contracts in Kenya: Essential Legal Guide",
        url: "blog/blog-freelancer-contracts-kenya.html",
        type: "article",
        content: `Freelancer contracts in Kenya essential legal guide. Creating binding freelance contracts. Contract essentials: Scope of work. Payment terms. Deadlines. Revision limits. Intellectual property. Dispute resolution. Kenya contract law. Electronic contracts valid. TrustPay KE contract templates. Milestone payments. Escrow for freelancer protection.`
    },
    {
        title: "How to Start Escrow Transaction Kenya - Complete Guide",
        url: "blog/blog-how-to-start-escrow-kenya.html",
        type: "article",
        content: `How to start escrow transaction Kenya complete guide. Step by step escrow process. Step 1: Create account on TrustPay KE. Step 2: Initiate new order. Step 3: Enter transaction details. Product, price, terms. Step 4: Share order link with seller. Step 5: Seller accepts terms. Step 6: Buyer deposits to M-PESA. Step 7: Admin confirms receipt. Step 8: Seller delivers. Step 9: Buyer confirms. Step 10: Payment released minus fee.`
    },
    {
        title: "WhatsApp Scams Kenya 2026 - How to Protect Yourself",
        url: "blog/blog-whatsapp-scams-kenya.html",
        type: "article",
        content: `WhatsApp scams Kenya 2026. How to protect yourself. Common WhatsApp scams: Impersonation. Fake giveaways. Investment scams. Romance scams. Job scams. Lottery scams. How to spot: Unknown contacts. Urgent requests. Too good offers. Money requests. Protection tips: Don't click unknown links. Verify identity. Never send money. Report suspicious messages. Block and report. TrustPay KE protection.`
    },
    {
        title: "Online Electronics Scams Kenya - Phone & Laptop Fraud",
        url: "blog/blog-electronics-scams-kenya.html",
        type: "article",
        content: `Online electronics scams Kenya. Phone and laptop fraud. Common electronics scams: Fake iPhones. Counterfeit Samsung. Refurbished as new. Specs mismatch. Price too low. How to verify: Check serial number. Verify IMEI. Inspect packaging. Test device. Buy from trusted. Use escrow for electronics. TrustPay KE electronics protection. High value transactions.`
    },
    {
        title: "Rent Deposit Scams Kenya - How to Avoid Rental Fraud",
        url: "blog/blog-rent-deposits-scams-kenya.html",
        type: "article",
        content: `Rent deposit scams Kenya. How to avoid rental fraud. Rental scam tactics: Fake property photos. Non-existent listings. Advance deposit requests. Phantom landlords. Prevention: Verify property exists. Check ownership documents. Never pay before viewing. Use escrow for deposits. Tenant rights Kenya. TrustPay KE rental protection.`
    },
    {
        title: "How to Verify Sellers Online Kenya - Spot Fake Profiles",
        url: "blog/blog-verify-sellers-kenya.html",
        type: "article",
        content: `How to verify sellers online Kenya. Spot fake profiles. Verification steps: Check profile creation date. Review all photos. Cross-reference information. Search phone number online. Google the name with scam. Check for complaints. Reverse image search photos. Request video call. Professional sellers have history. Use escrow as verification. TrustPay KE verified sellers.`
    },
    {
        title: "Courier & Delivery Scams Kenya - Package Fraud Prevention",
        url: "blog/blog-courier-delivery-scams-kenya.html",
        type: "article",
        content: `Courier and delivery scams Kenya. Package fraud prevention. Delivery scams: Fake delivery notices. Unclaimed package scams. Wrong address fraud. Redirect scams. Prevention: Track shipments. Use official courier apps. Verify delivery person. Don't pay customs for personal items. Use escrow for delivery. TrustPay KE delivery protection.`
    },
    {
        title: "M-PESA Security Tips 2026 - Complete Guide",
        url: "blog/blog-mpesa-security-tips-2026.html",
        type: "article",
        content: `M-PESA security tips 2026 complete guide. Protect your money from fraud. Security features: PIN protection. Transaction limits. Biometric authentication. Balance alerts. New 2026 features: Enhanced fraud detection. AI-powered monitoring. Instant blocking. Security tips: Use strong PIN. Change regularly. Enable alerts. Check statements daily. Avoid third party apps. TrustPay KE M-Pesa integration.`
    },
    {
        title: "Online Dating Scams Kenya - Romance Fraud Prevention",
        url: "blog/blog-online-dating-scams-kenya.html",
        type: "article",
        content: `Online dating scams Kenya. Romance fraud prevention. Dating scam signs: Quick declarations of love. Never meet in person. Emergency money requests. International sob stories. Requests for M-Pesa. Profile red flags: Professional photos. Vague details. Inconsistencies. Money mentions early. How to protect: Never send money. Verify identity. Reverse image search. Video chat verification. Report suspicious profiles. TrustPay KE dating scam protection.`
    },
    {
        title: "Terms of Service - TrustPay KE",
        url: "terms.html",
        type: "legal",
        content: `Terms of Service TrustPay KE. User agreement. Escrow services terms. Buyer responsibilities. Seller responsibilities. Transaction fees. Dispute resolution. Limitation of liability. Account termination. Privacy policy. M-PESA payment terms.`
    },
    {
        title: "Privacy Policy - TrustPay KE",
        url: "privacy.html",
        type: "legal",
        content: `Privacy Policy TrustPay KE. Data collection. Personal information. M-PESA transaction data. Account information. Cookie policy. Data protection. Information sharing. Third party services. Security measures. Your rights. Contact privacy team.`
    },
    {
        title: "Dispute Policy - TrustPay KE",
        url: "dispute-policy.html",
        type: "legal",
        content: `Dispute Policy TrustPay KE. How disputes are handled. Dispute submission process. Evidence requirements. Mediation process. Resolution timeline. Refund policy. Chargeback policy. Appeal process. Arbitration. Contact support. 24/7 assistance available.`
    }
];

function performSearch(query) {
    if (!query || query.length < 2) return [];
    
    query = query.toLowerCase().trim();
    const words = query.split(/\s+/);
    const results = [];
    
    searchIndex.forEach(item => {
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();
        const urlLower = item.url.toLowerCase();
        
        let score = 0;
        let matchedWords = 0;
        
        words.forEach(word => {
            if (word.length < 2) return;
            
            if (titleLower.includes(word)) {
                score += 10;
                matchedWords++;
            }
            if (contentLower.includes(word)) {
                score += 1;
                matchedWords++;
            }
            if (urlLower.includes(word)) {
                score += 5;
            }
            
            for (let i = 0; i < word.length; i++) {
                if (contentLower.includes(word[i]) || titleLower.includes(word[i])) {
                    score += 0.1;
                }
            }
        });
        
        if (matchedWords > 0) {
            const context = getSearchContext(contentLower, words[0], 150);
            results.push({
                title: item.title,
                url: item.url,
                type: item.type,
                score: score,
                context: context
            });
        }
    });
    
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 10);
}

function getSearchContext(content, word, length) {
    const lowerContent = content.toLowerCase();
    const lowerWord = word.toLowerCase();
    const index = lowerContent.indexOf(lowerWord);
    
    if (index === -1) {
        return content.substring(0, length) + (content.length > length ? '...' : '');
    }
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + length - 50);
    let context = content.substring(start, end);
    
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';
    
    return context;
}

function highlightMatch(text, query) {
    if (!query) return text;
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    let result = text;
    words.forEach(word => {
        const regex = new RegExp(`(${word})`, 'gi');
        result = result.replace(regex, '<mark>$1</mark>');
    });
    return result;
}

function getTypeIcon(type) {
    switch(type) {
        case 'article': return '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/></svg>';
        case 'page': return '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>';
        case 'legal': return '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/></svg>';
        default: return '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>';
    }
}

function getTypeLabel(type) {
    switch(type) {
        case 'article': return 'Blog';
        case 'page': return 'Page';
        case 'legal': return 'Legal';
        default: return 'Result';
    }
}
