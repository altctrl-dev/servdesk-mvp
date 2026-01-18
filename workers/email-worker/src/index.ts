/**
 * Cloudflare Email Worker
 *
 * Receives inbound emails via Cloudflare Email Routing and forwards them
 * to the ServDesk API for ticket creation/updates.
 */

export interface Env {
  INBOUND_API_URL: string;
  INBOUND_API_SECRET: string;
}

interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  readonly raw: ReadableStream;
  readonly rawSize: number;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
}

export default {
  async email(message: EmailMessage, env: Env): Promise<void> {
    try {
      // Read the raw email
      const rawEmail = await new Response(message.raw).text();

      // Parse email headers
      const subject = message.headers.get("subject") || "No Subject";
      const messageId = message.headers.get("message-id") || crypto.randomUUID();
      const date = message.headers.get("date") || new Date().toISOString();

      // Parse from address - extract name and email
      const fromHeader = message.from;
      const fromMatch = fromHeader.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
      const fromName = fromMatch?.[1]?.trim() || "";
      const fromEmail = fromMatch?.[2]?.trim() || fromHeader;

      // Parse the email body (simple parser for plain text)
      const bodyMatch = rawEmail.match(/\r?\n\r?\n([\s\S]*)/);
      let textBody = bodyMatch?.[1] || "";

      // Handle multipart emails - extract plain text part
      const contentType = message.headers.get("content-type") || "";
      if (contentType.includes("multipart")) {
        const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
        if (boundaryMatch) {
          const boundary = boundaryMatch[1];
          const parts = rawEmail.split(`--${boundary}`);
          for (const part of parts) {
            if (part.includes("text/plain")) {
              const textMatch = part.match(/\r?\n\r?\n([\s\S]*)/);
              if (textMatch) {
                textBody = textMatch[1].replace(/--$/, "").trim();
                break;
              }
            }
          }
        }
      }

      // Clean up quoted-printable encoding if present
      if (textBody.includes("=\r\n") || textBody.includes("=\n")) {
        textBody = textBody
          .replace(/=\r?\n/g, "")
          .replace(/=([0-9A-F]{2})/gi, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16))
          );
      }

      // Prepare payload for the API
      const payload = {
        messageId,
        from: {
          email: fromEmail,
          name: fromName,
        },
        to: message.to,
        subject,
        textBody: textBody.trim(),
        date,
        rawSize: message.rawSize,
      };

      // Send to the ServDesk API
      const response = await fetch(env.INBOUND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Inbound-Secret": env.INBOUND_API_SECRET,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`API error: ${response.status} - ${error}`);
        // Don't reject the email - it's been received, just log the error
      } else {
        const result = await response.json();
        console.log(`Email processed: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.error("Error processing email:", error);
      // Don't reject - we want to accept all emails even if processing fails
      // The error is logged for debugging
    }
  },
};
