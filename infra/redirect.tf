# S3 bucket for apex domain redirect (prose.md -> www.prose.md)
resource "aws_s3_bucket" "redirect" {
  bucket = "prose-md-redirect"

  tags = {
    Name        = "prose.md apex redirect"
    Environment = var.environment
  }
}

# Configure S3 redirect - redirects all requests to www subdomain
resource "aws_s3_bucket_website_configuration" "redirect" {
  bucket = aws_s3_bucket.redirect.id

  redirect_all_requests_to {
    host_name = "www.${var.domain_name}"
    protocol  = "https"
  }
}

# Block public ACLs but allow public policy for redirect bucket
resource "aws_s3_bucket_public_access_block" "redirect" {
  bucket = aws_s3_bucket.redirect.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

# CloudFront Distribution for apex domain redirect
# This handles HTTPS termination and redirects to www.prose.md
resource "aws_cloudfront_distribution" "redirect" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_100"
  aliases         = [var.domain_name]
  comment         = "prose.md apex redirect to www"

  origin {
    domain_name = aws_s3_bucket_website_configuration.redirect.website_endpoint
    origin_id   = "S3-redirect"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-redirect"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "prose.md redirect distribution"
    Environment = var.environment
  }
}
