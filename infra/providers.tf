terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    stripe = {
      source  = "lukasaron/stripe"
      version = "~> 1.9"
    }
  }
}

provider "aws" {
  profile = "open-prose"
  region  = "us-east-1"
}
