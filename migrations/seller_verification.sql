-- Seller Verification System
-- Run this to create the verification tables

-- Create verification requests table
CREATE TABLE IF NOT EXISTS seller_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    id_document_url TEXT,
    business_name TEXT,
    business_address TEXT,
    reason TEXT,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add is_admin column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_verification_status ON seller_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_user ON seller_verification_requests(user_id);
