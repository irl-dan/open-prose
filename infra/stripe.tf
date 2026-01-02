# ============================================
# STRIPE PAYMENT LINK CONFIGURATION
# ============================================
#
# This creates a Stripe Payment Link for supporting OpenProse.
#
# Prerequisites:
#   1. Get your Stripe Secret Key from https://dashboard.stripe.com/apikeys
#   2. Set it as an environment variable:
#      export TF_VAR_stripe_api_key="sk_live_..."
#
# Note: Payment Links created via API require Stripe API version 2022-08-01+
# ============================================

variable "stripe_api_key" {
  description = "Stripe Secret API Key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "enable_stripe" {
  description = "Whether to create Stripe resources (requires stripe_api_key)"
  type        = bool
  default     = false
}

# ============================================
# STRIPE PROVIDER
# ============================================

provider "stripe" {
  api_key = var.stripe_api_key
}

# ============================================
# PRODUCT: Support OpenProse
# ============================================

resource "stripe_product" "support_openprose" {
  count = var.enable_stripe ? 1 : 0

  name        = "Support OpenProse"
  description = "Support the development of OpenProse - an open standard for AI orchestration"

  metadata = {
    project = "openprose"
    type    = "donation"
  }
}

# ============================================
# PRICES: Preset donation amounts
# ============================================

resource "stripe_price" "support_5" {
  count = var.enable_stripe ? 1 : 0

  product     = stripe_product.support_openprose[0].id
  currency    = "usd"
  unit_amount = 500  # $5.00

  metadata = {
    tier = "coffee"
  }
}

resource "stripe_price" "support_20" {
  count = var.enable_stripe ? 1 : 0

  product     = stripe_product.support_openprose[0].id
  currency    = "usd"
  unit_amount = 2000  # $20.00

  metadata = {
    tier = "supporter"
  }
}

resource "stripe_price" "support_50" {
  count = var.enable_stripe ? 1 : 0

  product     = stripe_product.support_openprose[0].id
  currency    = "usd"
  unit_amount = 5000  # $50.00

  metadata = {
    tier = "sponsor"
  }
}

# $100 tier
resource "stripe_price" "support_100" {
  count = var.enable_stripe ? 1 : 0

  product     = stripe_product.support_openprose[0].id
  currency    = "usd"
  unit_amount = 10000  # $100.00

  metadata = {
    tier = "champion"
  }
}

# ============================================
# OUTPUTS
# ============================================

output "stripe_product_id" {
  description = "Stripe Product ID for Support OpenProse"
  value       = var.enable_stripe ? stripe_product.support_openprose[0].id : "not_created"
}

output "stripe_price_20_id" {
  description = "Stripe Price ID for $20 tier"
  value       = var.enable_stripe ? stripe_price.support_20[0].id : "not_created"
}

# ============================================
# MANUAL STEP REQUIRED
# ============================================
#
# Unfortunately, the Stripe Terraform provider doesn't support Payment Links.
# After running terraform apply, you'll need to:
#
# 1. Go to https://dashboard.stripe.com/payment-links
# 2. Click "Create payment link"
# 3. Select the "Support OpenProse" product
# 4. Choose the custom price (or preset amounts)
# 5. Configure:
#    - After payment: Don't show confirmation page (or redirect to prose.md)
#    - Collect: Name only (or nothing)
# 6. Copy the payment link URL (e.g., https://buy.stripe.com/xxxx)
#
# Then update landing/src/app/page.tsx:
#   Replace: href="https://buy.stripe.com/PLACEHOLDER"
#   With:    href="https://buy.stripe.com/your_actual_link"
#
# Alternatively, create the payment link via Stripe CLI:
#   stripe payment_links create \
#     --line-items[0][price]=price_xxx \
#     --line-items[0][quantity]=1
# ============================================
