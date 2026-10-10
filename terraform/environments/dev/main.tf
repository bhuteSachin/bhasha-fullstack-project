# ==============================
# bhasha — Dev Environment
# ==============================

terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket = "bhasha-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "us-east-1"
    # dynamodb_table = "bhasha-terraform-locks"
    encrypt = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "bhasha"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# ==============================
# Local Variables
# ==============================
locals {
  project_name = "bhasha"
  environment  = "dev"
  cluster_name = "bhasha-cluster-dev"

  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "terraform"
  }
}

# ==============================
# VPC Module
# ==============================
module "vpc" {
  source = "../../modules/vpc"

  project_name         = local.project_name
  environment          = local.environment
  cluster_name         = local.cluster_name
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
  tags                 = local.common_tags
}


# ==============================
# EKS Module
# ==============================
module "eks" {
  source = "../../modules/eks"

  project_name       = local.project_name
  environment        = local.environment
  cluster_name       = local.cluster_name
  kubernetes_version = var.kubernetes_version
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids

  # Dev: smaller, fewer nodes
  node_instance_types = ["t3.small"]
  capacity_type       = "SPOT" # Use spot for dev to save costs
  node_desired_size   = 2
  node_min_size       = 1
  node_max_size       = 3

  tags = local.common_tags
}

# ==============================
# Security Module
# ==============================
module "security" {
  source = "../../modules/security"

  project_name = local.project_name
  environment  = local.environment

  github_repo = "bhuteSachin/bhasha-fullstack-project"

  eks_oidc_provider_arn = module.eks.oidc_provider_arn
  eks_oidc_provider_url = module.eks.oidc_provider_url

  mongodb_uri         = var.mongodb_uri
  jwt_secret          = var.jwt_secret
  gemini_api_key      = var.gemini_api_key
  brevo_api_key       = var.brevo_api_key
  mail_password       = var.mail_password
  razorpay_key_id     = var.razorpay_key_id
  razorpay_key_secret = var.razorpay_key_secret

  tags = local.common_tags
}
