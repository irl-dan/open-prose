# Terraform state backend configuration
#
# IMPORTANT: Before running terraform init, you must create the S3 bucket manually:
#
#   aws s3api create-bucket \
#     --bucket prose-md-terraform-state \
#     --region us-east-1 \
#     --profile open-prose
#
#   aws s3api put-bucket-versioning \
#     --bucket prose-md-terraform-state \
#     --versioning-configuration Status=Enabled \
#     --profile open-prose

terraform {
  backend "s3" {
    bucket  = "prose-md-terraform-state"
    key     = "landing/terraform.tfstate"
    region  = "us-east-1"
    profile = "open-prose"
    encrypt = true
  }
}
