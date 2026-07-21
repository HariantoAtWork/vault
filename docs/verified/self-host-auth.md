# Self-host auth status

**Verified:** 2026-07-22

## Working

- Sign in against a **self-hosted** Bitwarden/Vaultwarden server
- **Email two-factor** (and other 2FA methods exposed by the server) during login
- **Lock** the vault from the sidebar
- **Unlock** again with the master password (same tab session)
- **Sync + decrypt** personal vault items on `/vault` (cipher count and list)

## Notes

- After a refresh, the vault stays unlocked for the tab (`sessionStorage` holds the session and encryption keys).
- Closing the tab clears that session; sign in again as usual.
- Explicit **Lock** clears keys until the master password is entered on the unlock screen.
- **Sign out** clears the full session and returns to `/login`.
- If you were already signed in before the decrypt fix, **Lock → Unlock** (or sign out and in) once so the 64-byte user key is re-derived.
