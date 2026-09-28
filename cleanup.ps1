$ErrorActionPreference = "SilentlyContinue"

aws iam detach-role-policy --role-name pianoflow-ec2-worker --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
aws iam delete-role-policy --role-name pianoflow-ec2-worker --policy-name pianoflow-ec2-worker-app
aws iam remove-role-from-instance-profile --instance-profile-name pianoflow-ec2-worker --role-name pianoflow-ec2-worker
aws iam delete-instance-profile --instance-profile-name pianoflow-ec2-worker
aws iam delete-role --role-name pianoflow-ec2-worker

aws iam detach-role-policy --role-name pianoflow-lambda-api --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role-policy --role-name pianoflow-lambda-api --policy-name pianoflow-lambda-api-app
aws iam delete-role --role-name pianoflow-lambda-api

aws s3 rb s3://pianoflow-sources --force
aws s3 rb s3://pianoflow-analysis --force
aws s3 rb s3://pianoflow-outputs --force
