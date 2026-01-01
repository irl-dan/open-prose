# prose.md Landing Page Infrastructure
#
# This Terraform configuration sets up:
# - S3 bucket for static site hosting (www.prose.md)
# - CloudFront distribution with OAC for secure S3 access
# - S3 redirect bucket for apex domain (prose.md -> www.prose.md)
# - CloudFront distribution for apex redirect
# - Route 53 DNS records
#
# See README.md for deployment instructions and current status.

# Local values for common tags and naming
locals {
  project_name = "prose-md"
  common_tags = {
    Project     = "prose.md"
    ManagedBy   = "terraform"
    Environment = var.environment
  }
}
