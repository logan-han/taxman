# AWS setup

Provisioned 7 August 2026 in account `977677890609`, following the same shape as the other
`*.han.life` sites (public S3 website endpoint behind CloudFront). CI only ever runs
`aws s3 sync` plus an invalidation, via OIDC role assumption — no stored keys.

## What exists

| Resource | Value |
| --- | --- |
| S3 bucket | `tax.han.life` (ap-southeast-4, website mode, index + error document `index.html`, public read via bucket policy) |
| CloudFront distribution | `E5KN3ALIAXN74` → `d10v50ip2yttyl.cloudfront.net` |
| Distribution config | origin `tax.han.life.s3-website.ap-southeast-4.amazonaws.com` (http-only), redirect-to-https, compression on, CachingOptimized policy, http2+3, IPv6, PriceClass_All |
| Certificate | existing wildcard `*.han.life` — `arn:aws:acm:us-east-1:977677890609:certificate/470afc5f-3580-4b07-b23a-67f316109896` |
| OIDC provider | `arn:aws:iam::977677890609:oidc-provider/token.actions.githubusercontent.com` |
| Deploy role | `arn:aws:iam::977677890609:role/taxman-deploy` |

The deploy role trusts only `repo:logan-han/taxman:ref:refs/heads/main` and can only
list/put/delete objects in `tax.han.life` and create invalidations on `E5KN3ALIAXN74`.

## Remaining manual steps

1. **DNS** — the `han.life` zone is hosted on AWS name servers in a *different* AWS account, so
   add there: `tax.han.life` CNAME (or Route 53 ALIAS) → `d10v50ip2yttyl.cloudfront.net`.
2. **GitHub repository settings** (Settings → Secrets and variables → Actions):

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `AWS_ROLE_ARN` | `arn:aws:iam::977677890609:role/taxman-deploy` |
| Secret | `AWS_S3_BUCKET` | `tax.han.life` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `E5KN3ALIAXN74` |

## Cache strategy

The deploy job syncs `build/assets/*` with `public, max-age=31536000, immutable` (Vite
content-hashes those filenames) and everything else with `public, max-age=0, must-revalidate`,
then invalidates `/index.html`, `/manifest.webmanifest` and `/sw.js` only — comfortably inside
CloudFront's 1,000 free invalidation paths per month.

## If the repo is renamed

Update the role trust policy's `sub` condition (`repo:logan-han/<new-name>:ref:refs/heads/main`):

```sh
aws iam update-assume-role-policy --role-name taxman-deploy --policy-document file://trust.json
```
