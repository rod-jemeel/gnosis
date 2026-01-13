# Supabase Email Templates for Gnosis

Minimal email templates matching the Gnosis design system. Copy into **Supabase Dashboard → Authentication → Email Templates**.

---

## 1. Confirm Signup

**Subject:** `Confirm your signup to Gnosis`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px;">

          <!-- Card -->
          <tr>
            <td style="background: #ffffff; padding: 40px 32px;">

              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b;">
                Confirm your email
              </h1>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                Click the button below to verify your email and activate your account.
              </p>

              <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500;">
                Verify Email
              </a>

              <p style="margin: 28px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Or copy this link:<br>
                <span style="color: #7c3aed; word-break: break-all;">{{ .ConfirmationURL }}</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                Didn't sign up? Ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password

**Subject:** `Reset your password`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px;">

          <!-- Card -->
          <tr>
            <td style="background: #ffffff; padding: 40px 32px;">

              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b;">
                Reset your password
              </h1>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                Click the button below to set a new password.
              </p>

              <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500;">
                Reset Password
              </a>

              <p style="margin: 28px 0 0 0; padding: 12px; background: #fef9c3; font-size: 13px; color: #854d0e;">
                This link expires in 24 hours.
              </p>

              <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Or copy this link:<br>
                <span style="color: #7c3aed; word-break: break-all;">{{ .ConfirmationURL }}</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                Didn't request this? Ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Magic Link

**Subject:** `Your sign-in link`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px;">

          <!-- Card -->
          <tr>
            <td style="background: #ffffff; padding: 40px 32px;">

              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b;">
                Sign in to Gnosis
              </h1>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                Click the button below to sign in. No password needed.
              </p>

              <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500;">
                Sign In
              </a>

              <p style="margin: 28px 0 0 0; font-size: 13px; color: #71717a;">
                This link expires in 10 minutes.
              </p>

              <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Or copy this link:<br>
                <span style="color: #7c3aed; word-break: break-all;">{{ .ConfirmationURL }}</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                Didn't request this? Ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Invite User

**Subject:** `You've been invited to Gnosis`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px;">

          <!-- Card -->
          <tr>
            <td style="background: #ffffff; padding: 40px 32px;">

              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b;">
                You've been invited
              </h1>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                Click the button below to create your account and get started.
              </p>

              <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500;">
                Accept Invitation
              </a>

              <p style="margin: 28px 0 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Or copy this link:<br>
                <span style="color: #7c3aed; word-break: break-all;">{{ .ConfirmationURL }}</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                Don't want to join? Ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 5. Email Change

**Subject:** `Confirm your new email`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 420px;">

          <!-- Card -->
          <tr>
            <td style="background: #ffffff; padding: 40px 32px;">

              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b;">
                Confirm email change
              </h1>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                Click the button below to confirm your new email address.
              </p>

              <p style="margin: 0 0 28px 0; padding: 12px 16px; background: #f4f4f5; font-size: 14px; color: #18181b;">
                <span style="color: #71717a; font-size: 12px; display: block; margin-bottom: 4px;">New email</span>
                {{ .Email }}
              </p>

              <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500;">
                Confirm Change
              </a>

              <p style="margin: 28px 0 0 0; padding: 12px; background: #fef9c3; font-size: 13px; color: #854d0e;">
                Didn't request this? Secure your account immediately.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Variables Reference

| Variable | Use |
|----------|-----|
| `{{ .ConfirmationURL }}` | Action link |
| `{{ .Email }}` | User's email |
| `{{ .SiteURL }}` | Your site URL |
