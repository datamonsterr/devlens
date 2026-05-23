# Clerk auth

## Type

New Devlens feature replacing 9router auth.

## Purpose

Authenticate Managers and Developers through Clerk sessions and Clerk Organizations.

## Requirements

- Clerk Organization maps 1:1 to Team.
- Clerk user maps to one Devlens user.
- Manager sign-up creates Team.
- Developer joins existing Team by Manager invitation.
- Dashboard and management APIs require Clerk session.
- `/v1/*` uses API Key auth, not Clerk session.
- Vercel production uses Clerk environment variables from the Vercel integrated Clerk setup.
- Local development uses Clerk environment variables from local `.env` or `.env.local` files.
- Sign-in, sign-up, and signed-in user controls must be visible from onboarding or navigation.

## 9router change

Remove JWT/password login, `auth_token` cookie flow, and password settings.
