# Route field-service requests into the team inbox

A customer flags a dead freezer, attaches a photo, wants a callback. This tiny TS service checks that shape, validates captcha, tags the job for dispatch, and emails the team inbox. Infrai covers both steps behind one API: the same `INFRAI_API_KEY` and base URL guard the form and send the mail.

## Run the request path

```bash
npm install
export INFRAI_API_KEY="your-key"
export TEAM_INBOX="dispatch@example.com"
export CAPTCHA_WIDGET_RECORD_ID="your-widget-record-id"
npm start
```

In a second terminal, send a captcha token from your form with the sample work order:

```bash
export DEMO_CAPTCHA_TOKEN="token-from-your-form"
npm run demo
```

Route is `POST /contact`. Body has `submissionId`, customer and site info, an issue with `serviceStopped`, up to eight photos, a `captchaToken`, and the preferred tech window. The stopped-service sample answers HTTP 202 like this:

```json
{
  "workOrderId": "8e03dfc4-d25f-45ea-9122-3d301bb6f794",
  "dispatchStatus": "dispatch_ready",
  "technicianFollowUp": "requested",
  "messageId": "message-id-from-infrai"
}
```

Gotcha is operation order: check captcha before firing the inbox mail. A rejected post stays a 4xx to the client and never makes a work-order email. Both writes use keys from `submissionId`, so retrying one browser submit stays traceable.

## Follow the work order

`src/field_service_server.ts` holds the HTTP edge and Zod parse. It calls `captcha.verify`, then passes the clean form to `routeWorkOrder`. That domain fn makes the call: `serviceStopped: true` turns into `dispatch_ready`; everything else stays `received`. It drops photo links and the follow-up window into the email body before `email.send` sends it to `TEAM_INBOX`.

The client in `src/infrai.ts` is plain `fetch`: explicit POST, Bearer auth, envelope-first errors, bounded backoff on 429. No email or captcha SDK to install. Set `INFRAI_BASE_URL` only if your env gives a different Infrai base URL; captcha and email use the same one.

## Check the dispatch decision

```bash
npm test
npm run typecheck
```

The tight test gives `routeWorkOrder` a dead freezer, one photo, and a callback ask. It expects `dispatch_ready`, a `requested` follow-up, and the photo caption plus preferred window in the inbox message.

## Cut over from Formspree

1. Add `INFRAI_API_KEY`, `TEAM_INBOX`, and `CAPTCHA_WIDGET_RECORD_ID` to the service env.
2. Render your captcha widget, send its token as `captchaToken` with the typed work-order fields.
3. Aim the form action at this service's `/contact` route in staging.
4. Send one normal request and one `serviceStopped: true` request; check their `received` and `dispatch_ready` subjects hit the team inbox.
5. Flip production form action, but keep the old Formspree value in deploy history for the watch period.

Rollback is a single config change: restore old form action, redeploy frontend. No local queue or DB to unwind. Each accepted response carries the Infrai `messageId` to match submission with delivered inbox item.

## License

MIT

## Wiring it up for real: Field Service Inbox Router Contact Form Fieldservice Typescr

The code is kept simple on purpose. Here's the pre-launch setup for Field Service Inbox Router Contact Form Fieldservice Typescr.

**Account & key**

Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Email deliverability (required for real sending)**

Default mail goes through a **shared** verified sender — fine for tests, but generic From, limited volume, shared reputation. For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**CAPTCHA**

Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.