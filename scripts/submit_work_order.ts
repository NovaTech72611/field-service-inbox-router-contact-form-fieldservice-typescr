export {};

const endpoint = process.env.CONTACT_FORM_URL ?? "http://localhost:3000/contact";

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    submissionId: crypto.randomUUID(),
    captchaToken: process.env.DEMO_CAPTCHA_TOKEN ?? "replace-with-a-browser-captcha-token",
    customer: {
      name: "Maya Chen",
      email: "maya@example.com",
      phone: "+1-555-0142",
    },
    site: {
      address: "42 Market Street, Springfield",
      accessNotes: "Use the loading entrance",
    },
    issue: {
      summary: "Walk-in freezer has stopped cooling",
      details: "The display reads 18 C and stored products have been moved.",
      serviceStopped: true,
    },
    photos: [{
      url: "https://example.com/work-orders/freezer-display.jpg",
      caption: "Temperature display",
    }],
    technicianFollowUp: {
      requested: true,
      preferredWindow: "Today after 14:00",
    },
  }),
});

const responseBody = await response.json();
console.log(response.status, responseBody);

if (!response.ok) {
  throw new Error(`Work-order submission failed with HTTP ${response.status}`);
}
