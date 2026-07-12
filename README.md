# CRM

Internal CRM for WhatsApp-first customer intake, Claude extraction, review, quoting, and project operations.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## WhatsApp Cloud API

The CRM supports two connection paths:

- **Embedded Signup / Coexistence** connects an existing WhatsApp Business App number, keeps the mobile app active, imports eligible one-to-one chat history, and mirrors new mobile-app replies.
- **Manual Cloud API credentials** use a permanent system-user token, WABA ID, and phone number ID from Meta Business Manager.

The customer opt-in feature that Meta calls **In-App Signup** does not connect a business phone number to this CRM. Business-number onboarding uses [WhatsApp Embedded Signup](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/).

### Meta app setup

1. Create or select a Meta Business app and add WhatsApp and Facebook Login for Business.
2. Create a Facebook Login for Business configuration using the WhatsApp Embedded Signup variation.
3. Request Advanced Access for `whatsapp_business_management` and `whatsapp_business_messaging`, put the app in Live mode, and complete Meta business/Tech Provider requirements.
4. Add the production CRM domain to the app domains, valid OAuth redirect URIs, and JavaScript SDK allowed domains. Meta requires HTTPS outside localhost.
5. In WhatsApp > Configuration, set the callback URL to `https://YOUR_DOMAIN/api/webhooks/whatsapp` and use the same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
6. Subscribe to `messages`. For an existing WhatsApp Business App number, also subscribe to `history`, `smb_app_state_sync`, and `smb_message_echoes`.

### Environment

```bash
WHATSAPP_GRAPH_API_BASE_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v25.0
NEXT_PUBLIC_WHATSAPP_API_VERSION=v25.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=use-a-long-random-value

NEXT_PUBLIC_META_APP_ID=your-meta-app-id
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID=your-login-for-business-configuration-id
WHATSAPP_TOKEN_ENCRYPTION_KEY=32-byte-base64-value
```

Generate the token-encryption key once and keep it stable:

```bash
openssl rand -base64 32
```

`META_APP_SECRET` is also used to validate `X-Hub-Signature-256`. `WHATSAPP_WEBHOOK_SIGNATURE_SECRET` remains available as an explicit override.

For a direct/manual connection, add:

```bash
WHATSAPP_ACCESS_TOKEN=permanent-system-user-token
WHATSAPP_PHONE_NUMBER_ID=meta-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=meta-waba-id
```

Do not use the temporary API Setup token in production. A system-user token needs the WhatsApp management and messaging permissions and access to the WABA asset.

### Connect a number

Open Settings > WhatsApp as an owner or admin.

- Choose **Existing Business App** to start Embedded Signup v3 with Coexistence. The CRM subscribes the WABA and immediately requests contacts and eligible history; Meta only permits the initial sync request within 24 hours of onboarding.
- Choose **Cloud API number** for a new or migrated API number. Enter a six-digit two-step verification PIN; the CRM registers the number after Embedded Signup.

Embedded Signup tokens are AES-256-GCM encrypted before storage in the server-only `whatsapp_connections` table. OAuth codes and two-step verification PINs are never stored.

## Verification

```bash
npm run lint
npm run build
```
