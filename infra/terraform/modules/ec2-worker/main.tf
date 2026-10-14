variable "prefix" {
  type = string
}

variable "ecr_repo_url" {
  type = string
}

variable "worker_image_tag" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "key_name" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "sqs_queue_default_url" {
  type = string
}

variable "sqs_queue_audio_url" {
  type = string
}

variable "sqs_queue_default_arn" {
  type = string
}

variable "sqs_queue_audio_arn" {
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

variable "ecr_registry" {
  type = string
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-kernel-6.1-x86_64"]
  }
}

data "aws_iam_policy_document" "assume_ec2" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "worker" {
  name               = "${var.prefix}-ec2-worker"
  assume_role_policy = data.aws_iam_policy_document.assume_ec2.json
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

data "aws_iam_policy_document" "worker_app" {
  statement {
    effect = "Allow"
    actions = [
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:ReceiveMessage",
      "sqs:SendMessage",
    ]
    resources = [var.sqs_queue_default_arn, var.sqs_queue_audio_arn]
  }

  statement {
    effect = "Allow"
    actions = [
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

resource "aws_iam_role_policy" "worker_app" {
  name   = "${var.prefix}-ec2-worker-app"
  role   = aws_iam_role.worker.id
  policy = data.aws_iam_policy_document.worker_app.json
}

resource "aws_iam_instance_profile" "worker" {
  name = "${var.prefix}-ec2-worker"
  role = aws_iam_role.worker.name
}

resource "aws_security_group" "worker" {
  name        = "${var.prefix}-ec2-worker"
  description = "PianoFlow free-tier worker egress only"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

locals {
  worker_image = "${var.ecr_repo_url}:${var.worker_image_tag}"
}


resource "aws_instance" "worker" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  iam_instance_profile        = aws_iam_instance_profile.worker.name
  vpc_security_group_ids      = [aws_security_group.worker.id]
  associate_public_ip_address = true
  key_name                    = var.key_name == "" ? null : var.key_name

  instance_initiated_shutdown_behavior = "stop"

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    iops                  = 3000
    throughput            = 125
    delete_on_termination = true
    encrypted             = true
  }

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    aws_region            = var.aws_region
    ecr_registry          = var.ecr_registry
    worker_image          = local.worker_image
    database_url          = var.database_url
    sqs_queue_default_url = var.sqs_queue_default_url
    sqs_queue_audio_url   = var.sqs_queue_audio_url
    s3_sources_bucket     = var.s3_sources_bucket
    s3_analysis_bucket    = var.s3_analysis_bucket
    s3_outputs_bucket     = var.s3_outputs_bucket
  })

  tags = {
    Name = "${var.prefix}-ec2-worker"
  }
}

resource "aws_cloudwatch_metric_alarm" "worker_idle_stop" {
  alarm_name          = "${var.prefix}-worker-idle-stop"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_actions       = ["arn:aws:automate:${var.aws_region}:ec2:stop"]

  dimensions = {
    InstanceId = aws_instance.worker.id
  }
}

output "public_ip" {
  value = aws_instance.worker.public_ip
}
