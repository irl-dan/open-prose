# Route 53 records for API subdomain
# Points to Fly.io hosted Express API
#
# After creating the Fly app, run:
#   fly certs add api.prose.md --app openprose-api

# A record for IPv4
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = ["66.241.124.142"]
}

# AAAA record for IPv6
resource "aws_route53_record" "api_ipv6" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "AAAA"
  ttl     = 300
  records = ["2a09:8280:1::c0:44ba:0"]
}
