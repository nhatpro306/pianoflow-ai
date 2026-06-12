output "api_url" {
  value = module.lambda_api.api_url
}

output "ecr_api_repo" {
  value = module.ecr.api_repo_url
}

output "ecr_worker_repo" {
  value = module.ecr.worker_repo_url
}

output "worker_public_ip" {
  value = module.ec2_worker.public_ip
}

output "sqs_queue_default_url" {
  value = module.sqs.queue_default_url
}

output "sqs_queue_audio_url" {
  value = module.sqs.queue_audio_url
}
