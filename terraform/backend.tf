# ==============================
# Terraform Backend Bootstrap
# ==============================
# Run this ONCE manually before using the S3 backend:
#   aws s3api create-bucket --bucket Bhasha-terraform-state --region us-east-1 --create-bucket-configuration LocationConstraint=us-east-1
#   aws dynamodb create-table --table-name Bhasha-terraform-locks --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST --region us-east-1
# ==============================

# This file documents the S3 backend config.
# The actual backend blocks are in each environment's main.tf.
# The S3 bucket and DynamoDB table must be created before running terraform init.
