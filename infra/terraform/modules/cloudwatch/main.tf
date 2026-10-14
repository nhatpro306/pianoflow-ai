variable "prefix" {
  type = string
}

variable "lambda_function_name" {
  type = string
}

variable "sqs_queue_default_name" {
  type = string
}

variable "sqs_queue_audio_name" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.prefix}-free-tier"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda API"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "SQS queue depth"
          view   = "timeSeries"
          region = var.aws_region
          metrics = [
            [
              "AWS/SQS",
              "ApproximateNumberOfMessagesVisible",
              "QueueName",
              var.sqs_queue_default_name,
            ],
            [".", ".", ".", var.sqs_queue_audio_name],
          ]
        }
      },
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

resource "aws_budgets_budget" "cost" {
  name              = "${var.prefix}-budget"
  budget_type       = "COST"
  limit_amount      = "5.00"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2024-01-01_00:00"
}

resource "aws_cloudwatch_metric_alarm" "billing_alarm" {
  alarm_name          = "${var.prefix}-billing-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = 5.0
  alarm_description   = "Billing alarm when charges exceed $5.00"

  dimensions = {
    Currency = "USD"
  }
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.main.dashboard_name
}
