# Testing

## Test accounts

Throwaway accounts on the dev Neon branch (`DATABASE_URL` in `.env.local`). Sign in at `/auth/sign-in`. Sign-up is disabled, so use these accounts instead of creating new ones.

Password for all three accounts: `SpotiTest!2026`

| Email                           | Name              | Orgs (role)                                   |
| ------------------------------- | ----------------- | --------------------------------------------- |
| `alice@demo.vectorforge.test`   | Alice Demo        | Acme Studio (owner), test-org-2 (owner)       |
| `bob@demo.vectorforge.test`     | Bob Demo          | Northwind Maps (owner)                        |
| `test-org-2.member@example.com` | Test Org 2 Member | test-org-2 (admin)                            |

Useful combinations:

- **Org isolation / RLS:** Alice and Bob share no org, so neither should see the other's projects or files.
- **Shared org, different roles:** Alice (owner) and Test Org 2 Member (admin) are both in `test-org-2`.
- **Org switching:** Alice belongs to two orgs.

These are test credentials only. Never reuse this password, or these accounts, on a production branch.

### Resetting a password

Forgot-password emails can't reach the `.test` domain. Passwords live in `neon_auth.account.password` (`providerId = 'credential'`) as Better Auth scrypt hashes: `<16-byte salt as hex>:<64-byte key as hex>`, where the key is `scrypt(password.normalize("NFKC"), saltHexString, N=16384, r=16, p=1, dkLen=64)`. To set a new password, generate a hash in that format with Node's `crypto.scryptSync` and update the row.
