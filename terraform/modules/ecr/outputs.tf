output "server_repository_url" {
  description = "Server ECR repository URL"
  value       = aws_ecr_repository.server.repository_url
}

output "client_repository_url" {
  description = "Client ECR repository URL"
  value       = aws_ecr_repository.client.repository_url
}

output "server_repository_arn" {
  description = "Server ECR repository ARN"
  value       = aws_ecr_repository.server.arn
}

output "client_repository_arn" {
  description = "Client ECR repository ARN"
  value       = aws_ecr_repository.client.arn
}
