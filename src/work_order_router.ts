import { z } from "zod";

export const contactFormSchema = z.object({
  submissionId: z.string().uuid(),
  captchaToken: z.string().min(1),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(7).max(30),
  }),
  site: z.object({
    address: z.string().min(5).max(300),
    accessNotes: z.string().max(500).optional(),
  }),
  issue: z.object({
    summary: z.string().min(10).max(200),
    details: z.string().min(10).max(3000),
    serviceStopped: z.boolean(),
  }),
  photos: z.array(z.object({
    url: z.string().url(),
    caption: z.string().max(160).optional(),
  })).max(8),
  technicianFollowUp: z.object({
    requested: z.boolean(),
    preferredWindow: z.string().max(100).optional(),
  }),
});

export type ContactForm = z.infer<typeof contactFormSchema>;
export type DispatchStatus = "received" | "dispatch_ready";

export type RoutedWorkOrder = {
  workOrderId: string;
  dispatchStatus: DispatchStatus;
  technicianFollowUp: "requested" | "not_requested";
  subject: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function routeWorkOrder(form: ContactForm): RoutedWorkOrder {
  const dispatchStatus: DispatchStatus = form.issue.serviceStopped ? "dispatch_ready" : "received";
  const technicianFollowUp = form.technicianFollowUp.requested ? "requested" : "not_requested";
  const photoItems = form.photos.length === 0
    ? "<li>No photos attached</li>"
    : form.photos.map((photo) =>
        `<li><a href="${escapeHtml(photo.url)}">${escapeHtml(photo.caption ?? "Work-order photo")}</a></li>`,
      ).join("");

  return {
    workOrderId: form.submissionId,
    dispatchStatus,
    technicianFollowUp,
    subject: `[${dispatchStatus}] ${form.issue.summary}`,
    html: [
      `<h1>${escapeHtml(form.issue.summary)}</h1>`,
      `<p><strong>Status:</strong> ${dispatchStatus}</p>`,
      `<p><strong>Customer:</strong> ${escapeHtml(form.customer.name)} · ${escapeHtml(form.customer.phone)} · ${escapeHtml(form.customer.email)}</p>`,
      `<p><strong>Site:</strong> ${escapeHtml(form.site.address)}</p>`,
      `<p>${escapeHtml(form.issue.details)}</p>`,
      `<p><strong>Technician follow-up:</strong> ${technicianFollowUp}${form.technicianFollowUp.preferredWindow ? ` (${escapeHtml(form.technicianFollowUp.preferredWindow)})` : ""}</p>`,
      `<h2>Photos</h2><ul>${photoItems}</ul>`,
    ].join(""),
  };
}
