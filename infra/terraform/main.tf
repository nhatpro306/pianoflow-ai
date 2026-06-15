terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — uncomment after first apply with local state.
  # backend "s3" {
  #   bucket         = "pianoflow-tfstate"
  #   key            = "free-tier/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "pianoflow-tflock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

module "ecr" {
  source = "./modules/ecr"
  prefix = var.prefix
}

module "s3" {
  source               = "./modules/s3"
  prefix               = var.prefix
  output_expiry_days   = var.output_expiry_days
  tmp_expiry_days      = 1
  cors_allowed_origins = var.cors_allowed_origins
}

module "sqs" {
  source = "./modules/sqs"
  prefix = var.prefix
}

module "lambda_api" {
  source                    = "./modules/lambda-api"
  prefix                    = var.prefix
  ecr_repo_url              = module.ecr.api_repo_url
  api_image_tag             = var.api_image_tag
  database_url              = var.database_url
  supabase_jwt_secret       = var.supabase_jwt_secret
  supabase_url              = var.supabase_url
  supabase_service_role_key = var.supabase_service_role_key
  cors_allowed_origins      = var.cors_allowed_origins
  sqs_queue_default_arn     = module.sqs.queue_default_arn
  sqs_queue_audio_arn       = module.sqs.queue_audio_arn
  sqs_queue_default_url     = module.sqs.queue_default_url
  sqs_queue_audio_url       = module.sqs.queue_audio_url
  s3_sources_arn            = module.s3.sources_bucket_arn
  s3_analysis_arn           = module.s3.analysis_bucket_arn
  s3_outputs_arn            = module.s3.outputs_bucket_arn
  s3_sources_bucket         = module.s3.sources_bucket_name
  s3_analysis_bucket        = module.s3.analysis_bucket_name
  s3_outputs_bucket         = module.s3.outputs_bucket_name
  aws_region                = var.aws_region
}

module "ec2_worker" {
  source                = "./modules/ec2-worker"
  prefix                = var.prefix
  ecr_repo_url          = module.ecr.worker_repo_url
  worker_image_tag      = var.worker_image_tag
  instance_type         = var.worker_instance_type
  key_name              = var.ec2_key_name
  database_url          = var.database_url
  sqs_queue_default_url = module.sqs.queue_default_url
  sqs_queue_audio_url   = module.sqs.queue_audio_url
  sqs_queue_default_arn = module.sqs.queue_default_arn
  sqs_queue_audio_arn   = module.sqs.queue_audio_arn
  s3_sources_arn        = module.s3.sources_bucket_arn
  s3_analysis_arn       = module.s3.analysis_bucket_arn
  s3_outputs_arn        = module.s3.outputs_bucket_arn
  s3_sources_bucket     = module.s3.sources_bucket_name
  s3_analysis_bucket    = module.s3.analysis_bucket_name
  s3_outputs_bucket     = module.s3.outputs_bucket_name
  aws_region            = var.aws_region
  ecr_registry          = module.ecr.registry_url
}

module "cloudwatch" {
  source                 = "./modules/cloudwatch"
  prefix                 = var.prefix
  lambda_function_name   = module.lambda_api.function_name
  sqs_queue_default_name = module.sqs.queue_default_name
  sqs_queue_audio_name   = module.sqs.queue_audio_name
  aws_region             = var.aws_region
}
