-- Migration to add Gumroad payment fields
-- Replace Stripe-specific fields with Gumroad equivalents

-- Update payments table for Gumroad
ALTER TABLE public.payments 
  DROP COLUMN IF EXISTS stripe_session_id,
  ADD COLUMN IF NOT EXISTS gumroad_sale_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS gumroad_product_id TEXT,
  ADD COLUMN IF NOT EXISTS gumroad_product_permalink TEXT,
  ADD COLUMN IF NOT EXISTS gumroad_order_number BIGINT,
  ADD COLUMN IF NOT EXISTS buyer_email TEXT;

-- Update payment status constraint to include Gumroad statuses
ALTER TABLE public.payments 
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments 
  ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_gumroad_sale_id 
  ON public.payments(gumroad_sale_id);

-- Add comment for documentation
COMMENT ON COLUMN public.payments.gumroad_sale_id IS 'Unique sale ID from Gumroad webhook';
COMMENT ON COLUMN public.payments.gumroad_product_permalink IS 'Product permalink used to determine credits';
COMMENT ON COLUMN public.payments.buyer_email IS 'Email of the buyer from Gumroad'; 