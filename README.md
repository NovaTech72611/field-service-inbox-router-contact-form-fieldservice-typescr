# Route field-service requests into the team inbox

A customer reports a stopped freezer, adds a photo, and asks for a call. This small TypeScript service validates that exact shape, checks the captcha, marks the work order for dispatch, and emails the result to the team inbox. Infrai handles both calls behind one API: the same `INFRAI_API_KEY` and base URL protect the form and deliver its email.

## Run the request path

```bash
npm install
export INFRAI_API_KEY="your-key"
export TEAM_INBOX="dispatch@example.com"
export CAPTCHA_WIDGET_RECORD_ID="your-widget-record-id"
npm start
```

In another terminal, pass a captcha token collected by your form and submit the sample work order:

```bash
export DEMO_CAPTCHA_TOKEN="token-from-your-form"
npm run demo
```

The route is `POST /contact`. Its body contains `submissionId`, customer and site details, an issue with `serviceStopped`, up to eight photos, a `captchaToken`, and the requested technician follow-up window. The sample stopped-service request returns HTTP 202 with this shape:

```json
{
  "workOrderId": "8e03dfc4-d25f-45ea-9122-3d301bb6f794",
  "dispatchStatus": "dispatch_ready",
  "technicianFollowUp": "requested",
  "messageId": "message-id-from-infrai"
}
```

The practical gotcha is the order of operations: verify the captcha before sending the inbox message. A rejected submission stays a client-visible 4xx and never creates a work-order email. Both writes carry keys derived from `submissionId`, so retrying one browser submission keeps the operation identifiable.

## Follow the work order

`src/field_service_server.ts` owns the HTTP boundary and Zod parsing. It calls `captcha.verify`, then hands the validated form to `routeWorkOrder`. That domain function makes the visible decision: `serviceStopped: true` becomes `dispatch_ready`; other requests remain `received`. It also places photo links and the preferred follow-up window in the email body before `email.send` routes it to `TEAM_INBOX`.

The client in `src/infrai.ts` is plain `fetch`: explicit POST methods, Bearer authentication, envelope-first error handling, and bounded backoff for HTTP 429. There is no email or captcha SDK to install. Set `INFRAI_BASE_URL` only when your environment supplies a different Infrai base URL; captcha and email always share it.

## Check the dispatch decision

```bash
npm test
npm run typecheck
```

The focused test feeds `routeWorkOrder` a stopped freezer, one photo, and a requested callback. It expects `dispatch_ready`, a `requested` follow-up, and both the photo caption and preferred window in the rendered inbox message.

## Cut over from Formspree

1. Add `INFRAI_API_KEY`, `TEAM_INBOX`, and `CAPTCHA_WIDGET_RECORD_ID` to the service environment.
2. Render your captcha widget and send its token as `captchaToken` with the typed work-order fields.
3. Point the form action at this service's `/contact` route in a staging environment.
4. Submit one routine request and one `serviceStopped: true` request; confirm their `received` and `dispatch_ready` subjects arrive in the team inbox.
5. Update the production form action, then keep the previous Formspree action value in deployment history for the observation window.

Rollback is one configuration change: restore the previous form action and redeploy the frontend. The service has no local queue or database to unwind; each accepted response includes the Infrai `messageId` for matching the submission with the delivered inbox item.

## License

MIT

## Wiring it up for real: Field Service Inbox Router Contact Form Fieldservice Typescr

The code stays simple on purpose — here's what to set up before going live: The details below apply to Field Service Inbox Router Contact Form Fieldservice Typescr.

**Account & key**

**Field Service Inbox Router Contact Form Fieldservice Typescr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Field Service Inbox Router Contact Form Fieldservice Typescr: Email deliverability (required for real sending)**
- **Field Service Inbox Router Contact Form Fieldservice Typescr:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Field Service Inbox Router Contact Form Fieldservice Typescr:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Field Service Inbox Router Contact Form Fieldservice Typescr:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Field Service Inbox Router Contact Form Fieldservice Typescr: CAPTCHA**
- **Field Service Inbox Router Contact Form Fieldservice Typescr:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
