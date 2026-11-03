# Part D: IaC + CI/CD (60 minutes)

**Allowed:** registry.terraform.io provider docs, developer.hashicorp.com/terraform, docs.github.com. **No AI, no copying from your old repos.**
**Graded by the coach** with the rubric in `answer-key.md`. Ask: **"grade part D"**.
**No AWS account needed.** You only run `validate`, never `apply`.

---

## T1. Terraform: a reusable S3 bucket module (D9, 6 pts, ~35 min)

In `submissions/terraform/`, write a small root module that creates a private S3 bucket for application artifacts:

1. `versions.tf`: pins Terraform `>= 1.6` and the AWS provider to a 5.x or 6.x range.
2. `variables.tf`: `bucket_name` (string, with a `validation` block that enforces lowercase letters, digits, and hyphens), `environment` (string), `tags` (map of strings, default `{}`).
3. `main.tf`:
   - the bucket
   - **versioning** enabled
   - **server-side encryption** (SSE-S3 or KMS)
   - **all four public access block** settings on
   - default tags that merge `var.tags` with `Environment = var.environment` and `ManagedBy = "terraform"`
4. `outputs.tf`: the bucket's ARN and name.
5. A `backend "s3"` block, **commented out**, showing how you'd store state remotely with locking.

Then run:
```bash
cd submissions/terraform
terraform fmt -check
terraform init -backend=false
terraform validate
```
Paste the output into `submissions/terraform/VALIDATE.txt`.

## G1. GitHub Actions: build and publish `diag-app` (D10, 6 pts, ~25 min)

In `submissions/ci/build.yml`, write a workflow (you won't run it this week) that:

1. Runs on pull requests **and** on pushes to `main`, but only when files under `k8s-devops-program/labs/week-01/app/` change.
2. Has a job that lints the Dockerfile (any linter, for example hadolint) and builds the image on **every** trigger.
3. **Pushes** to GHCR (`ghcr.io/<owner>/diag-app`) **only** on pushes to `main`, tagged with the short commit SHA **and** `latest`.
4. Uses the built-in `GITHUB_TOKEN` with the **minimum `permissions:`** needed, not a personal access token.
5. Pins action versions (at least a major tag, ideally a full SHA).

Below the YAML, add a 3-5 line comment answering: *"If we moved to GitOps with Argo CD, what would this pipeline stop doing, and what would it start doing instead?"*
