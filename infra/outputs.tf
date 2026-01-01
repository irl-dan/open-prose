output "website_url" {
  description = "Primary website URL"
  value       = "https://www.${var.domain_name}"
}

output "apex_url" {
  description = "Apex domain URL (redirects to www)"
  value       = "https://${var.domain_name}"
}

output "cloudfront_url" {
  description = "CloudFront distribution URL (use this before DNS is configured)"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "redirect_cloudfront_url" {
  description = "Redirect CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.redirect.domain_name}"
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for static site"
  value       = aws_s3_bucket.website.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for static site"
  value       = aws_s3_bucket.website.arn
}

output "redirect_bucket_name" {
  description = "Name of the S3 bucket for apex redirect"
  value       = aws_s3_bucket.redirect.id
}

output "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = var.acm_certificate_arn
}
