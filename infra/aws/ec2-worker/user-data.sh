#!/bin/bash
set -euo pipefail

yum update -y
yum install -y docker awscli
systemctl enable docker
systemctl start docker

if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Terraform renders production user-data from:
# infra/terraform/modules/ec2-worker/user-data.sh.tftpl
