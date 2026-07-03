# ==============================
# LinguistAI — Prod Environment
# ==============================

terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "linguistai-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "linguistai-terraform-locks"
    encrypt        = true
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
      Project     = "linguistai"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

# ==============================
# Local Variables
# ==============================
locals {
  project_name = "linguistai"
  environment  = "prod"
  cluster_name = "linguistai-cluster-prod"

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
  vpc_cidr             = "10.1.0.0/16"
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnet_cidrs = ["10.1.10.0/24", "10.1.20.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
  tags                 = local.common_tags
}

# ==============================
# ECR Module
# ==============================
module "ecr" {
  source = "../../modules/ecr"

  project_name = local.project_name
  environment  = local.environment
  tags         = local.common_tags
}

# ==============================
# EKS Module
# ==============================
module "eks" {
  source = "../../modules/eks"

  project_name       = local.project_name
  environment        = local.environment
  cluster_name       = local.cluster_name
  kubernetes_version = "1.30"
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids

  # Prod: larger, more nodes, on-demand
  node_instance_types = ["t3.large"]
  capacity_type       = "ON_DEMAND"
  node_desired_size   = 3
  node_min_size       = 2
  node_max_size       = 6

  tags = local.common_tags
}

# ==============================
# Security Module
# ==============================
module "security" {
  source = "../../modules/security"

  project_name        = local.project_name
  environment         = local.environment
  github_repo         = "shubham-gayke/linguistai-devops"
  mongodb_uri         = var.mongodb_uri
  jwt_secret          = var.jwt_secret
  gemini_api_key      = var.gemini_api_key
  brevo_api_key       = var.brevo_api_key
  mail_password       = var.mail_password
  razorpay_key_id     = var.razorpay_key_id
  razorpay_key_secret = var.razorpay_key_secret
  tags                = local.common_tags
}
