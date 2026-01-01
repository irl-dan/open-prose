# prose.md Landing Page Infrastructure

Terraform configuration for deploying the prose.md landing page to AWS.

## Architecture

```
prose.md (apex)
  -> Route 53 A record
  -> CloudFront Distribution (redirect)
  -> S3 Redirect Bucket
  -> Redirects to https://www.prose.md

www.prose.md
  -> Route 53 A record
  -> CloudFront Distribution (with ACM certificate)
  -> S3 Bucket (static content via OAC)
```

## Infrastructure Components

| Component | Resource | Purpose |
|-----------|----------|---------|
| S3 Bucket | `prose-md-static-site` | Hosts Next.js static export |
| S3 Bucket | `prose-md-redirect` | Redirects apex to www |
| CloudFront | Website distribution | CDN for www.prose.md |
| CloudFront | Redirect distribution | HTTPS termination for apex redirect |
| Route 53 | A/AAAA records | DNS for both domains |
| ACM | Certificate | SSL/TLS for CloudFront |

## Prerequisites

1. **AWS CLI** configured with the `open-prose` profile:
   ```bash
   aws configure --profile open-prose
   ```

2. **Terraform** >= 1.0 installed

3. **S3 bucket for Terraform state** (one-time setup):
   ```bash
   aws s3api create-bucket \
     --bucket prose-md-terraform-state \
     --region us-east-1 \
     --profile open-prose

   aws s3api put-bucket-versioning \
     --bucket prose-md-terraform-state \
     --versioning-configuration Status=Enabled \
     --profile open-prose
   ```

## Current Status

### What's Working

- [x] Terraform configuration complete
- [x] Route 53 hosted zone exists (`Z055661431HNG95R7YC60`)
- [x] ACM certificate created in us-east-1

### Pending Domain Registration

The following items require the domain `prose.md` to be registered and nameservers pointed to Route 53:

- [ ] **ACM Certificate Validation** - Certificate DNS validation requires the domain's nameservers to point to Route 53
- [ ] **DNS Resolution** - `www.prose.md` and `prose.md` won't resolve until domain is live
- [ ] **CloudFront Custom Domain** - CloudFront will reject custom domain alias until certificate is validated

### Before Domain is Live

You can still:
1. Apply the Terraform configuration (infrastructure will be created)
2. Upload content to S3
3. Access the site via CloudFront URL (e.g., `https://d1234567890.cloudfront.net`)

## Deployment

### Initial Setup

```bash
cd infra

# Initialize Terraform (after creating state bucket)
terraform init

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply
```

### Deploy Site Updates

After making changes to the Next.js site:

```bash
# 1. Build the Next.js static export
cd ../landing
npm run build

# 2. Sync to S3
aws s3 sync out/ s3://prose-md-static-site \
  --delete \
  --profile open-prose

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=../infra output -raw cloudfront_distribution_id) \
  --paths "/*" \
  --profile open-prose
```

Or use this one-liner from the `landing` directory:

```bash
npm run build && \
aws s3 sync out/ s3://prose-md-static-site --delete --profile open-prose && \
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=../infra output -raw cloudfront_distribution_id) \
  --paths "/*" \
  --profile open-prose
```

## Outputs

After applying, Terraform will output:

| Output | Description |
|--------|-------------|
| `website_url` | Primary URL (https://www.prose.md) |
| `apex_url` | Apex URL (https://prose.md) |
| `cloudfront_url` | Direct CloudFront URL (works before DNS) |
| `cloudfront_distribution_id` | For cache invalidation |
| `s3_bucket_name` | Bucket name for uploads |

View outputs:
```bash
terraform output
```

## When Domain Becomes Active

Once the domain is registered and nameservers are updated:

1. **Verify ACM Certificate Validation**
   ```bash
   aws acm describe-certificate \
     --certificate-arn arn:aws:acm:us-east-1:014703791453:certificate/d6922d48-adad-464f-a933-10c1a3c11515 \
     --profile open-prose \
     --query 'Certificate.Status'
   ```
   Should return `"ISSUED"` when validated.

2. **Test DNS Resolution**
   ```bash
   dig www.prose.md
   dig prose.md
   ```

3. **Verify Site**
   - Visit https://www.prose.md
   - Visit https://prose.md (should redirect to www)

## Troubleshooting

### Certificate Not Validating

The ACM certificate requires DNS validation. Ensure:
1. Domain nameservers point to Route 53
2. CNAME validation records exist in Route 53 (check ACM console)

### CloudFront Returns 403

1. Check S3 bucket policy allows CloudFront OAC
2. Verify OAC is attached to CloudFront origin
3. Ensure files exist in S3 bucket

### Changes Not Appearing

Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*" \
  --profile open-prose
```

## Files

```
infra/
├── README.md           # This file
├── main.tf             # Project metadata and locals
├── providers.tf        # AWS provider configuration
├── backend.tf          # S3 backend for state
├── variables.tf        # Input variables
├── outputs.tf          # Output values
├── s3.tf               # S3 bucket for static site
├── cloudfront.tf       # CloudFront distribution for www
├── redirect.tf         # Apex redirect (S3 + CloudFront)
└── route53.tf          # DNS records
```

## Cost Estimate

Approximate monthly costs (us-east-1):
- S3: ~$0.50-2 (depending on storage/requests)
- CloudFront: ~$1-5 (depending on traffic)
- Route 53: ~$0.50 (hosted zone)
- ACM: Free

Total: ~$2-8/month for a low-traffic landing page
