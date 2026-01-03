# OpenProse Landing Page

Landing page for [prose.md](https://www.prose.md).

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Deployment

The landing page is deployed as a static site to AWS S3 + CloudFront.

### Prerequisites

- AWS CLI configured with the `open-prose` profile
- Node.js and npm installed

### Deploy

```bash
# 1. Build the static export
npm run build

# 2. Sync to S3
AWS_PROFILE=open-prose aws s3 sync out s3://prose-md-static-site --delete

# 3. Invalidate CloudFront cache
AWS_PROFILE=open-prose aws cloudfront create-invalidation \
  --distribution-id E2P0B26RDP964R \
  --paths "/*"
```

### Infrastructure

The infrastructure is managed via Terraform in `/infra`:

- **S3 Bucket**: `prose-md-static-site`
- **CloudFront Distribution**: `E2P0B26RDP964R`
- **Domain**: `www.prose.md` (apex `prose.md` redirects to www)

To view all infrastructure outputs:

```bash
cd ../infra
AWS_PROFILE=open-prose terraform output
```
