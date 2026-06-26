-- SQL Migration: Add Razorpay columns to payments and extend property status enum

-- 1. Extend property status enum type
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'pending_payment';

-- 2. Add Razorpay tracking columns to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_link TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
