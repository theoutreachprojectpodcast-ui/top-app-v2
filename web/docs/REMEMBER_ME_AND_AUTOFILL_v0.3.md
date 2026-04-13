# Remember Me, email memory, and autofill (tORP v0.3)

## Stay signed in (“Remember Me”)

- **What it does:** The sign-in modal and satellite WorkOS links pass `remember=1` or `remember=0` to `/api/auth/workos/signin` and `/api/auth/workos/signup`.
- **When `remember=0`:** The API asks AuthKit for `prompt: "login"` so the IdP can show a fresh credential prompt where supported. This favors shorter-lived or more explicit sessions without storing passwords.
- **When `remember=1`:** No `prompt: "login"` is set; normal WorkOS / IdP session behavior applies.
- **Limits:** Session **duration and idle timeout** are controlled in the **WorkOS dashboard** (and IdP), not per checkbox in this app. The checkbox therefore steers **prompt behavior**, not a custom TTL.

## Email memory

- **Storage:** Only the email string is stored in `localStorage` under `torp_last_used_email` (see `web/src/lib/auth/lastUsedEmail.js`).
- **Passwords:** Never stored in the database, `localStorage`, or `sessionStorage` for this feature.
- **Clearing:** Unchecking “Remember email on this device” before a WorkOS redirect clears the saved email; the modal also offers “Clear saved email”.

## Autofill and password managers

- Auth and onboarding inputs use standard **`name`**, **`id` / `htmlFor`**, **`autoComplete`** (e.g. `email`, `current-password`, `new-password`, `given-name`, `family-name`, `username`), and **`inputMode="email"`** where appropriate so browsers and managers can fill fields reliably.

## Security notes

- **No IP-based** identification for “remember” behavior.
- **No plaintext passwords** in Supabase or app storage; credentials stay with the user agent / password manager and WorkOS.
