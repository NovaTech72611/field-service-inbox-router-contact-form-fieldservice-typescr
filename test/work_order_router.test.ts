import assert from "node:assert/strict";
import test from "node:test";
import { contactFormSchema, routeWorkOrder } from "../src/work_order_router.js";

test("a stopped service is marked dispatch-ready and keeps photo context", () => {
  const form = contactFormSchema.parse({
    submissionId: "8e03dfc4-d25f-45ea-9122-3d301bb6f794",
    captchaToken: "test-token",
    customer: { name: "Maya Chen", email: "maya@example.com", phone: "+1-555-0142" },
    site: { address: "42 Market Street, Springfield" },
    issue: {
      summary: "Walk-in freezer has stopped cooling",
      details: "The display reads 18 C and stored products have been moved.",
      serviceStopped: true,
    },
    photos: [{ url: "https://example.com/freezer.jpg", caption: "Temperature display" }],
    technicianFollowUp: { requested: true, preferredWindow: "Today after 14:00" },
  });

  const routed = routeWorkOrder(form);

  assert.equal(routed.dispatchStatus, "dispatch_ready");
  assert.equal(routed.technicianFollowUp, "requested");
  assert.match(routed.subject, /^\[dispatch_ready\]/);
  assert.match(routed.html, /Temperature display/);
  assert.match(routed.html, /Today after 14:00/);
});
