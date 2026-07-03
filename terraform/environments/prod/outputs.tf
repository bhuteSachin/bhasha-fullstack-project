output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "server_ecr_url" {
  description = "Server ECR repository URL"
  value       = module.ecr.server_repository_url
}

output "client_ecr_url" {
  description = "Client ECR repository URL"
  value       = module.ecr.client_repository_url
}

output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN"
  value       = module.security.github_actions_role_arn
}
