output "secrets_arn" {
  description = "Secrets Manager secret ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN"
  value       = aws_iam_role.github_actions.arn
}

output "external_secrets_role_arn" {
  description = "IAM role ARN used by External Secrets Operator"
  value       = aws_iam_role.external_secrets.arn
}
