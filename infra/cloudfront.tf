# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "prose-md-oac"
  description                       = "OAC for prose.md static website"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function to rewrite URLs for pretty paths (Next.js static export)
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "prose-md-url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite URLs to append index.html for directory paths"
  publish = true
  code    = <<-EOT
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Check if URI is missing a file extension
    if (!uri.includes('.')) {
        // Append /index.html if URI doesn't end with /
        if (uri.endsWith('/')) {
            request.uri = uri + 'index.html';
        } else {
            request.uri = uri + '/index.html';
        }
    }

    return request;
}
EOT
}

# Main CloudFront Distribution for www.prose.md
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = ["www.${var.domain_name}"]
  comment             = "prose.md landing page"

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.website.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.website.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Custom error response for SPA routing - return index.html for 404s
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
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
    Name        = "prose.md website distribution"
    Environment = var.environment
  }
}
