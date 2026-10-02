import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { createInfraiClient, InfraiError } from "./infrai.js";
import { contactFormSchema, routeWorkOrder } from "./work_order_router.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const teamInbox = requireEnv("TEAM_INBOX");
const captchaWidgetRecordId = requireEnv("CAPTCHA_WIDGET_RECORD_ID");

const infrai = createInfraiClient();

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new RangeError("Request body is too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function handleContact(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const form = contactFormSchema.parse(await readJson(request));
    const ip = request.socket.remoteAddress;
    await infrai.captcha.verify({
      widget_record_id: captchaWidgetRecordId,
      token: form.captchaToken,
      action: "field_service_contact",
      score_threshold: 0.7,
      ...(ip ? { ip } : {}),
    }, form.submissionId);

    const workOrder = routeWorkOrder(form);
    const sent = await infrai.email.send({
      to: teamInbox,
      subject: workOrder.subject,
      html: workOrder.html,
    }, form.submissionId);

    json(response, 202, {
      workOrderId: workOrder.workOrderId,
      dispatchStatus: workOrder.dispatchStatus,
      technicianFollowUp: workOrder.technicianFollowUp,
      messageId: sent.message_id,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      json(response, 400, { error: "invalid_form", issues: error.issues });
      return;
    }
    if (error instanceof SyntaxError || error instanceof RangeError) {
      json(response, 400, { error: "invalid_request", message: error.message });
      return;
    }
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      json(response, error.status, { error: "submission_rejected", message: error.message });
      return;
    }
    console.error(error);
    json(response, 502, { error: "delivery_unavailable" });
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/contact") {
    await handleContact(request, response);
    return;
  }
  json(response, 404, { error: "not_found" });
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Field-service contact route listening on http://localhost:${port}/contact`));
