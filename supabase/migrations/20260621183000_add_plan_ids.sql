-- Add stripe_price_id and paypal_plan_id columns to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT;
