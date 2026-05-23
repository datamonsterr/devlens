# Testing

## Required verification

- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm test`

## Scope

Tests must cover:

- Clerk Team context resolution.
- Manager vs Developer route authorization.
- API Key create/rotate/revoke and one-time plaintext.
- `/v1/*` Team-scoped routing.
- Combo and Provider Connection isolation by Team.
- Usage attribution by Team and Developer.
- RTK Pool atomic consumption.
- Pricing Override cost calculation.
- Secret masking in logs.

## Notes

Current `lint` script returns success even on lint errors because it ends with `|| true`; treat output as meaningful.
