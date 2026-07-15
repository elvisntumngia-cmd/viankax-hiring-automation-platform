# Vapi Webhook Deploy Note

The Vapi webhook must be callable by Vapi without a Supabase user session.

`supabase/config.toml` sets:

```toml
[functions.vapi-voice-webhook]
verify_jwt = false
```

Deploy from the repo root:

```powershell
cd "C:\Users\elsii\OneDrive\Documents\VX"
supabase functions deploy process-automation-jobs --project-ref ayoqzgsimmlblwuqdccs
supabase functions deploy vapi-voice-webhook --project-ref ayoqzgsimmlblwuqdccs --no-verify-jwt
```

After deployment, the webhook URL is:

```text
https://ayoqzgsimmlblwuqdccs.supabase.co/functions/v1/vapi-voice-webhook
```

The function still checks `VAPI_WEBHOOK_SECRET` internally when that secret is configured. Accepted secret headers:

- `Authorization: Bearer <secret>`
- `x-vapi-secret: <secret>`
- `x-vapi-server-secret: <secret>`
- `x-server-url-secret: <secret>`

If Vapi calls are created but applicant voice status stays `Sent`, check the Supabase Edge Function logs for `vapi-voice-webhook`.
