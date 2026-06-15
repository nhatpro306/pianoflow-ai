# GitHub OIDC IAM artifacts

Two JSON files used to create the least-privilege IAM role for GitHub Actions
CI/CD (no long-lived AWS keys). The create-role commands are in
[docs/DEPLOYMENT_AWS.md §4](../../../docs/DEPLOYMENT_AWS.md).

## Files

| File | Purpose |
|---|---|
| `trust-policy.json` | IAM trust policy — allows GitHub Actions OIDC tokens to assume the role |
| `permissions-policy.json` | Inline permissions policy — actions Terraform needs to manage the stack |

## Placeholders to replace before use

Both files contain placeholder strings that **must** be edited before running
`aws iam create-role`:

- **`ACCOUNT_ID`** in `trust-policy.json` — your 12-digit AWS account ID
  (e.g. `123456789012`).
- **`OWNER/REPO`** in `trust-policy.json` — your GitHub org/username and
  repository name (e.g. `nhatpro306/pianoflow`).

The `permissions-policy.json` uses `Resource: "*"` throughout. This is
intentionally broad for a free-tier single-project deploy role. For a shared
account or tighter security posture, scope resources to the specific ARN
prefixes for your `prefix` variable (default `pianoflow`).
