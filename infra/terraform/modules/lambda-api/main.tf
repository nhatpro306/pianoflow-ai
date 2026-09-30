variable "prefix" {
  type = string
}

variable "ecr_repo_url" {
  type = string
}

variable "api_image_tag" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "supabase_jwt_secret" {
  type      = string
  sensitive = true
}

variable "supabase_url" {
  type = string
}

variable "supabase_service_role_key" {
  type      = string
  sensitive = true
}

variable "cors_allowed_origins" {
  type = string
}

variable "sqs_queue_default_arn" {
  type = string
}

variable "sqs_queue_audio_arn" {
  type = string
}

variable "sqs_queue_default_url" {
  type = string
}

variable "sqs_queue_audio_url" {
  type = string
}

variable "s3_sources_arn" {
  type = string
}

variable "s3_analysis_arn" {
  type = string
}

variable "s3_outputs_arn" {
  type = string
}

variable "s3_sources_bucket" {
  type = string
}

variable "s3_analysis_bucket" {
  type = string
}

variable "s3_outputs_bucket" {
  type = string
}

variable "aws_region" {
  type = string
}

data "aws_iam_policy_document" "assume_lambda" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.prefix}-lambda-api"
  assume_role_policy = data.aws_iam_policy_document.assume_lambda.json
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "app" {
  statement {
    effect = "Allow"
    actions = [
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:SendMessage",
    ]
    resources = [var.sqs_queue_default_arn, var.sqs_queue_audio_arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:PutObject",
    ]
    resources = [
      var.s3_sources_arn,
      "${var.s3_sources_arn}/*",
      var.s3_analysis_arn,
      "${var.s3_analysis_arn}/*",
      var.s3_outputs_arn,
      "${var.s3_outputs_arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "${var.prefix}-lambda-api-app"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.app.json
}

resource "aws_lambda_function" "api" {
  function_name = "${var.prefix}-api"
  package_type  = "Image"
  image_uri     = "${var.ecr_repo_url}:${var.api_image_tag}"
  role          = aws_iam_role.lambda.arn
  timeout       = 30
  memory_size   = 1024

  environment {
    variables = {
      ENV                       = "prod"
      HOME                      = "/tmp"
      UV_CACHE_DIR              = "/tmp/uv-cache"
      AUTH_MODE                 = "supabase"
      QUEUE_BACKEND             = "sqs"
      STORAGE_BACKEND           = "s3"
      DATABASE_URL              = var.database_url
      SUPABASE_JWT_SECRET       = var.supabase_jwt_secret
      SUPABASE_URL              = var.supabase_url
      SUPABASE_SERVICE_ROLE_KEY = var.supabase_service_role_key
      CORS_ALLOWED_ORIGINS      = var.cors_allowed_origins
      SQS_QUEUE_DEFAULT_URL     = var.sqs_queue_default_url
      SQS_QUEUE_AUDIO_URL       = var.sqs_queue_audio_url
      S3_BUCKET_SOURCES         = var.s3_sources_bucket
      S3_BUCKET_ANALYSIS        = var.s3_analysis_bucket
      S3_BUCKET_OUTPUTS         = var.s3_outputs_bucket
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

output "api_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "function_name" {
  value = aws_lambda_function.api.function_name
}
