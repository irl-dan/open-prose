variable "domain_name" {
  description = "The apex domain name"
  type        = string
  default     = "prose.md"
}

variable "hosted_zone_id" {
  description = "Route 53 Hosted Zone ID for the domain"
  type        = string
  default     = "Z055661431HNG95R7YC60"
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate (must be in us-east-1 for CloudFront)"
  type        = string
  default     = "arn:aws:acm:us-east-1:014703791453:certificate/d6922d48-adad-464f-a933-10c1a3c11515"
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}
