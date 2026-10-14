variable "prefix" {
  type = string
}

resource "aws_sqs_queue" "default_dlq" {
  name                      = "${var.prefix}-q-default-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "default" {
  name                       = "${var.prefix}-q-default"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400 # 1 day
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.default_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "audio_dlq" {
  name                      = "${var.prefix}-q-audio-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "audio" {
  name                       = "${var.prefix}-q-audio"
  visibility_timeout_seconds = 600
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.audio_dlq.arn
    maxReceiveCount     = 3
  })
}

output "queue_default_url" {
  value = aws_sqs_queue.default.url
}

output "queue_default_arn" {
  value = aws_sqs_queue.default.arn
}

output "queue_default_name" {
  value = aws_sqs_queue.default.name
}

output "queue_audio_url" {
  value = aws_sqs_queue.audio.url
}

output "queue_audio_arn" {
  value = aws_sqs_queue.audio.arn
}

output "queue_audio_name" {
  value = aws_sqs_queue.audio.name
}
