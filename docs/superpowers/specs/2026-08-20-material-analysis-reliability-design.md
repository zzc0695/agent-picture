# Material Analysis Reliability Design

## Problem

Material image uploads succeed in production, but all recent `/api/ai/analyze-materials` requests return HTTP 500. The API currently passes public Vercel Blob URLs directly to DashScope and does not catch or log provider failures, leaving the browser with only a generic request error.

## Decision

For Vercel Blob inputs, the server will fetch the image and send a validated Base64 data URL to DashScope. Local uploads already follow this pattern. Arbitrary remote URLs will remain URLs so the server does not become a general-purpose URL fetcher.

Accepted model inputs are JPEG, PNG, and WebP, with a maximum raw size of 7 MiB per image. This stays below the provider's Base64 input ceiling after encoding overhead.

The analysis API will catch failures, write a structured server log without image URLs or credentials, and return a safe Chinese error message. Input problems return 400; provider or malformed-response failures return 502. The existing retry action can then rerun analysis without requiring another upload.

## Alternatives

- Retrying public Blob URLs was rejected because provider-side URL fetching remains an external point of failure.
- Uploading assets into provider-managed file storage was rejected because it adds lifecycle and cleanup complexity for three short-lived inputs.
- Fetching every remote URL was rejected because it would introduce SSRF risk.

## Verification

Unit tests cover Blob-to-Base64 conversion, type and size rejection, non-Blob URL behavior, and API error mapping/logging. The complete test, lint, type-check, and production-build suites must pass before deployment.
