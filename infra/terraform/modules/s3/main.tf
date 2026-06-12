variable "prefix" {
  type = string
}

variable "output_expiry_days" {
  type    = number
  default = 7
}

variable "tmp_expiry_days" {
  type    = number
  default = 1
}

resource "aws_s3_bucket" "sources" {
  bucket        = "${var.prefix}-sources"
  force_destroy = true
}

resource "aws_s3_bucket" "analysis" {
  bucket        = "${var.prefix}-analysis"
  force_destroy = true
}

resource "aws_s3_bucket" "outputs" {
  bucket        = "${var.prefix}-outputs"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "sources" {
  bucket                  = aws_s3_bucket.sources.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "analysis" {
  bucket                  = aws_s3_bucket.analysis.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "outputs" {
  bucket                  = aws_s3_bucket.outputs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "outputs" {
  bucket = aws_s3_bucket.outputs.id

  rule {
    id     = "expire-outputs"
    status = "Enabled"
    filter {}
    expiration {
      days = var.output_expiry_days
    }
  }

  rule {
    id     = "expire-tmp"
    status = "Enabled"
    filter {
      prefix = "tmp/"
    }
    expiration {
      days = var.tmp_expiry_days
    }
  }
}

output "sources_bucket_name" {
  value = aws_s3_bucket.sources.bucket
}

output "sources_bucket_arn" {
  value = aws_s3_bucket.sources.arn
}

output "analysis_bucket_name" {
  value = aws_s3_bucket.analysis.bucket
}

output "analysis_bucket_arn" {
  value = aws_s3_bucket.analysis.arn
}

output "outputs_bucket_name" {
  value = aws_s3_bucket.outputs.bucket
}

output "outputs_bucket_arn" {
  value = aws_s3_bucket.outputs.arn
}
