-- Storage Policies for Supabase Buckets
-- Run these commands in Supabase SQL Editor after creating buckets

-- KYC Documents Bucket Policies
CREATE POLICY "Users can upload own KYC documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'kyc_documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own KYC documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'kyc_documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can view all KYC documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'kyc_documents' AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Proof Files Bucket Policies
CREATE POLICY "Users can upload proof files for their escrows" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'proof_files' AND 
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM escrows 
                WHERE id::text = (storage.foldername(name))[1] 
                AND (buyer_id = auth.uid() OR seller_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can view proof files for their escrows" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'proof_files' AND 
        EXISTS (
            SELECT 1 FROM escrows 
            WHERE id::text = (storage.foldername(name))[1] 
            AND (buyer_id = auth.uid() OR seller_id = auth.uid())
        )
    );

CREATE POLICY "Admins can view all proof files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'proof_files' AND 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Profile Images Bucket Policies
CREATE POLICY "Users can upload own profile images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile_images' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view all profile images" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'profile_images'
    );

CREATE POLICY "Users can update own profile images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile_images' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow public access to profile images
CREATE POLICY "Public profile images are publicly accessible" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'profile_images'
    );
