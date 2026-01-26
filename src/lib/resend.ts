/**
 * Resend Email Service Integration
 *
 * Provides email sending, parsing, and webhook verification functions
 * for the ServDesk email integration with Resend.
 *
 * All functions are edge-compatible for Cloudflare Workers.
 */

import { Resend } from "resend";
import type { CloudflareEnv } from "@/env";
import type { TicketStatus } from "@/db/schema";
import {
  ticketCreatedTemplate,
  ticketReplyTemplate,
  statusChangeTemplate,
  adminNotificationTemplate,
  assignmentTemplate,
  invitationTemplate,
  passwordResetTemplate,
  verificationCodeTemplate,
  passwordResetCodeTemplate,
  type TicketEmailData,
  type CustomerEmailData,
  type MessageEmailData,
  type AssigneeEmailData,
  type InvitationEmailData,
  type PasswordResetEmailData,
} from "./email-templates";

// =============================================================================
// TYPES
// =============================================================================

/** Result of an email send operation */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Parsed inbound email from Resend webhook */
export interface ParsedInboundEmail {
  messageId: string;
  from: {
    email: string;
    name?: string;
  };
  to: string[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  headers: Record<string, string>;
  timestamp: Date;
}

/** Email threading headers */
export type ThreadingHeaders = Record<string, string>;

// =============================================================================
// RESEND CLIENT
// =============================================================================

/**
 * Gets the Resend API key from environment.
 * Checks both Cloudflare env bindings and process.env for compatibility.
 */
function getResendApiKey(env: CloudflareEnv): string | undefined {
  return env.RESEND_API_KEY || process.env.RESEND_API_KEY;
}

/**
 * Creates a Resend client instance.
 * Must be called per-request since env is only available at request time.
 */
function getResendClient(env: CloudflareEnv): Resend | null {
  const apiKey = getResendApiKey(env);
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// =============================================================================
// EMAIL THREADING
// =============================================================================

/**
 * Generates a consistent Message-ID for a ticket's email thread.
 * Used to establish email threading in mail clients.
 *
 * @param ticketNumber - The ticket number (e.g., "SERVSYS-ABC12")
 * @param replyToEmail - The support email domain
 * @returns A unique Message-ID string
 */
export function getMessageIdForTicket(
  ticketNumber: string,
  replyToEmail: string
): string {
  // Extract domain from reply-to email
  const domain = replyToEmail.split("@")[1] || "servdesk.local";
  return `<${ticketNumber.toLowerCase()}@${domain}>`;
}

/**
 * Generates threading headers for email replies.
 * Enables proper email threading in mail clients.
 *
 * @param ticket - Ticket data with ticketNumber
 * @param replyToEmail - The support email domain
 * @param isReply - Whether this is a reply to an existing thread
 * @returns Threading headers object
 */
export function getThreadingHeaders(
  ticket: { ticketNumber: string },
  replyToEmail: string,
  isReply: boolean = false
): ThreadingHeaders {
  const baseMessageId = getMessageIdForTicket(ticket.ticketNumber, replyToEmail);

  // For the initial email, we set the Message-ID
  // For replies, we set In-Reply-To and References to the original Message-ID
  if (!isReply) {
    return {
      "Message-ID": baseMessageId,
    };
  }

  return {
    "Message-ID": `<${ticket.ticketNumber.toLowerCase()}-${Date.now()}@${replyToEmail.split("@")[1] || "servdesk.local"}>`,
    "In-Reply-To": baseMessageId,
    References: baseMessageId,
  };
}

// =============================================================================
// EMAIL SENDING FUNCTIONS
// =============================================================================

/**
 * Sends a ticket creation confirmation email to the customer.
 */
export async function sendTicketCreatedEmail(
  env: CloudflareEnv,
  params: {
    ticket: TicketEmailData;
    customer: CustomerEmailData;
  }
): Promise<EmailSendResult> {
  const resend = getResendClient(env);
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }
  const baseUrl = env.BASE_URL || process.env.BASE_URL || "";
  const trackingUrl = `${baseUrl}/track?token=${params.ticket.trackingToken}`;

  const html = ticketCreatedTemplate({
    ticket: params.ticket,
    customer: params.customer,
    trackingUrl,
  });

  const threadingHeaders = getThreadingHeaders(
    params.ticket,
    env.SUPPORT_EMAIL_REPLY_TO,
    false
  );

  try {
    const { data, error } = await resend.emails.send({
      from: env.SUPPORT_EMAIL_FROM,
      to: params.customer.email,
      replyTo: env.SUPPORT_EMAIL_REPLY_TO,
      subject: `[${params.ticket.ticketNumber}] ${params.ticket.subject}`,
      html,
      headers: threadingHeaders,
    });

    if (error) {
      console.error("Failed to send ticket created email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending ticket created email:", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a reply notification email to the customer.
 */
export async function sendTicketReplyEmail(
  env: CloudflareEnv,
  params: {
    ticket: TicketEmailData;
    customer: CustomerEmailData;
    message: MessageEmailData;
  }
): Promise<EmailSendResult> {
  const resend = getResendClient(env);
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }
  const baseUrl = env.BASE_URL || process.env.BASE_URL || "";
  const trackingUrl = `${baseUrl}/track?token=${params.ticket.trackingToken}`;

  const html = ticketReplyTemplate({
    ticket: params.ticket,
    message: params.message,
    trackingUrl,
  });

  const threadingHeaders = getThreadingHeaders(
    params.ticket,
    env.SUPPORT_EMAIL_REPLY_TO,
    true
  );

  try {
    const { data, error } = await resend.emails.send({
      from: env.SUPPORT_EMAIL_FROM,
      to: params.customer.email,
      replyTo: env.SUPPORT_EMAIL_REPLY_TO,
      subject: `Re: [${params.ticket.ticketNumber}] ${params.ticket.subject}`,
      html,
      headers: threadingHeaders,
    });

    if (error) {
      console.error("Failed to send ticket reply email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending ticket reply email:", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a status change notification email to the customer.
 */
export async function sendStatusChangeEmail(
  env: CloudflareEnv,
  params: {
    ticket: TicketEmailData;
    customer: CustomerEmailData;
    newStatus: TicketStatus;
  }
): Promise<EmailSendResult> {
  const resend = getResendClient(env);
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }
  const baseUrl = env.BASE_URL || process.env.BASE_URL || "";
  const trackingUrl = `${baseUrl}/track?token=${params.ticket.trackingToken}`;

  const html = statusChangeTemplate({
    ticket: params.ticket,
    newStatus: params.newStatus,
    trackingUrl,
  });

  const threadingHeaders = getThreadingHeaders(
    params.ticket,
    env.SUPPORT_EMAIL_REPLY_TO,
    true
  );

  try {
    const { data, error } = await resend.emails.send({
      from: env.SUPPORT_EMAIL_FROM,
      to: params.customer.email,
      replyTo: env.SUPPORT_EMAIL_REPLY_TO,
      subject: `Re: [${params.ticket.ticketNumber}] ${params.ticket.subject} - Status Updated`,
      html,
      headers: threadingHeaders,
    });

    if (error) {
      console.error("Failed to send status change email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending status change email:", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a new ticket notification email to all admin users.
 */
export async function sendAdminNotificationEmail(
  env: CloudflareEnv,
  params: {
    ticket: TicketEmailData;
    customer: CustomerEmailData;
    admins: Array<{ email: string; name?: string }>;
    initialMessage?: string;
  }
): Promise<EmailSendResult[]> {
  const resend = getResendClient(env);
  if (!resend) {
    return [{ success: false, error: "Email service not configured" }];
  }

  const html = adminNotificationTemplate({
    ticket: params.ticket,
    customer: params.customer,
    initialMessage: params.initialMessage,
  });

  const results: EmailSendResult[] = [];

  // Send to each admin individually to avoid exposing email addresses
  for (const admin of params.admins) {
    try {
      const { data, error } = await resend.emails.send({
        from: env.SUPPORT_EMAIL_FROM,
        to: admin.email,
        subject: `[New Ticket] ${params.ticket.ticketNumber}: ${params.ticket.subject}`,
        html,
      });

      if (error) {
        console.error(`Failed to send admin notification to ${admin.email}:`, error);
        results.push({ success: false, error: error.message });
      } else {
        results.push({ success: true, messageId: data?.id });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error sending admin notification to ${admin.email}:`, message);
      results.push({ success: false, error: message });
    }
  }

  return results;
}

/**
 * Sends an assignment notification email to the assigned agent.
 */
export async function sendAssignmentEmail(
  env: CloudflareEnv,
  params: {
    ticket: TicketEmailData;
    customer: CustomerEmailData;
    assignee: AssigneeEmailData;
  }
): Promise<EmailSendResult> {
  const resend = getResendClient(env);
  if (!resend) {
    return { success: false, error: "Email service not configured" };
  }

  const html = assignmentTemplate({
    ticket: params.ticket,
    customer: params.customer,
    assignee: params.assignee,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: env.SUPPORT_EMAIL_FROM,
      to: params.assignee.email,
      subject: `[Assigned] ${params.ticket.ticketNumber}: ${params.ticket.subject}`,
      html,
    });

    if (error) {
      console.error("Failed to send assignment email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending assignment email:", message);
    return { success: false, error: message };
  }
}

// =============================================================================
// INBOUND EMAIL PARSING
// =============================================================================

/**
 * Resend inbound email webhook payload structure.
 * Based on Resend's inbound email webhook format.
 */
interface ResendInboundPayload {
  type: "email.received";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    headers?: Array<{ name: string; value: string }>;
  };
}

/**
 * Parses a Resend inbound email webhook payload.
 *
 * @param rawPayload - The raw webhook payload (already parsed JSON)
 * @returns Parsed email data
 */
export function parseInboundEmail(rawPayload: unknown): ParsedInboundEmail | null {
  try {
    const payload = rawPayload as ResendInboundPayload;

    if (payload.type !== "email.received" || !payload.data) {
      console.error("Invalid inbound email payload type:", payload.type);
      return null;
    }

    const { data } = payload;

    // Parse the from field (may be "Name <email@domain.com>" or just "email@domain.com")
    const fromMatch = data.from.match(/^(?:"?([^"]*)"?\s)?<?([^<>]+@[^<>]+)>?$/);
    const fromEmail = fromMatch?.[2] || data.from;
    const fromName = fromMatch?.[1]?.trim() || undefined;

    // Convert headers array to object
    const headers: Record<string, string> = {};
    if (data.headers) {
      for (const header of data.headers) {
        headers[header.name.toLowerCase()] = header.value;
      }
    }

    return {
      messageId: data.email_id,
      from: {
        email: fromEmail.toLowerCase().trim(),
        name: fromName,
      },
      to: data.to.map((t) => t.toLowerCase().trim()),
      subject: data.subject || "(No Subject)",
      textBody: data.text || "",
      htmlBody: data.html,
      headers,
      timestamp: new Date(payload.created_at),
    };
  } catch (err) {
    console.error("Failed to parse inbound email:", err);
    return null;
  }
}

/**
 * Extracts the ticket number from an email subject line.
 * Looks for patterns like [SERVSYS-ABC12] or SERVSYS-ABC12.
 *
 * @param subject - The email subject line
 * @returns The ticket number if found, null otherwise
 */
export function extractTicketNumber(subject: string): string | null {
  // Match SERVSYS-XXXXX pattern (5 alphanumeric characters)
  const match = subject.match(/\[?(SERVSYS-[A-Z0-9]{5})\]?/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Extracts the reply content from an email body, stripping quoted text.
 * Handles common email reply patterns from various email clients.
 *
 * @param body - The email body text
 * @returns The extracted reply content
 */
export function extractReplyContent(body: string): string {
  if (!body) return "";

  // Split by common reply separators
  const separators = [
    /^On .+ wrote:$/m, // Gmail, Apple Mail
    /^-+ ?Original Message ?-+$/m, // Outlook
    /^From: .+$/m, // Various clients
    /^Sent from my/m, // Mobile signatures
    /^_{3,}$/m, // Underscore separators
    /^>{2,}/m, // Quoted text markers
  ];

  let content = body;

  // Find the first separator and take content before it
  for (const separator of separators) {
    const match = content.match(separator);
    if (match && match.index !== undefined && match.index > 0) {
      content = content.substring(0, match.index);
      break;
    }
  }

  // Remove lines that start with > (quoted text)
  const lines = content.split("\n");
  const filteredLines = lines.filter((line) => !line.trim().startsWith(">"));
  content = filteredLines.join("\n");

  // Clean up whitespace
  content = content.trim();

  // If we stripped everything, return original (trimmed)
  if (!content) {
    return body.trim();
  }

  return content;
}

// =============================================================================
// WEBHOOK SECURITY
// =============================================================================

/**
 * Verifies the Resend webhook signature using HMAC-SHA256.
 * This ensures the webhook came from Resend and wasn't tampered with.
 *
 * @param payload - The raw request body as a string
 * @param signature - The signature from the Resend-Signature header
 * @param secret - The webhook secret from RESEND_WEBHOOK_SECRET
 * @returns True if the signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Resend signature format: t=timestamp,v1=signature
    const parts = signature.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !signaturePart) {
      console.error("Invalid signature format");
      return false;
    }

    const timestamp = timestampPart.substring(2);
    const expectedSignature = signaturePart.substring(3);

    // Check timestamp to prevent replay attacks (5 minute window)
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestampMs) > fiveMinutes) {
      console.error("Webhook timestamp outside valid window");
      return false;
    }

    // Create the signed payload (timestamp.payload)
    const signedPayload = `${timestamp}.${payload}`;

    // Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );

    // Convert to hex string
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    if (computedSignature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch (err) {
    console.error("Error verifying webhook signature:", err);
    return false;
  }
}

// =============================================================================
// USER INVITATION & PASSWORD RESET EMAILS
// =============================================================================

/**
 * Sends an invitation email to a new user.
 * Only sends if RESEND_API_KEY is configured.
 */
export async function sendInvitationEmail(
  env: CloudflareEnv,
  params: {
    invitation: InvitationEmailData;
    inviterName: string;
  }
): Promise<EmailSendResult> {
  // Check if Resend is configured (check both env and process.env)
  const resend = getResendClient(env);
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping invitation email");
    return { success: false, error: "Email service not configured" };
  }

  const baseUrl = env.BASE_URL || process.env.BASE_URL || "";
  const fromEmail = env.SUPPORT_EMAIL_FROM || process.env.SUPPORT_EMAIL_FROM || "";
  const acceptUrl = `${baseUrl}/login`;

  if (!fromEmail) {
    console.error("SUPPORT_EMAIL_FROM not configured");
    return { success: false, error: "From email not configured" };
  }

  const html = invitationTemplate({
    invitation: params.invitation,
    inviterName: params.inviterName,
    acceptUrl,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.invitation.email,
      subject: "You've been invited to ServDesk",
      html,
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending invitation email:", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a password reset email to a user.
 * Only sends if RESEND_API_KEY is configured.
 */
export async function sendPasswordResetEmail(
  env: CloudflareEnv,
  params: {
    user: PasswordResetEmailData;
  }
): Promise<EmailSendResult> {
  const resend = getResendClient(env);
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping password reset email");
    return { success: false, error: "Email service not configured" };
  }

  const baseUrl = env.BASE_URL || process.env.BASE_URL || "";
  const resetUrl = `${baseUrl}/reset-password?token=${params.user.token}`;

  const html = passwordResetTemplate({
    user: params.user,
    resetUrl,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: env.SUPPORT_EMAIL_FROM,
      to: params.user.email,
      subject: "Reset your ServDesk password",
      html,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending password reset email:", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a verification code email to verify email ownership during invitation acceptance.
 * Only sends if RESEND_API_KEY is configured.
 */
export async function sendVerificationCodeEmail(
  env: CloudflareEnv,
  params: {
    email: string;
    code: string;
  }
): Promise<EmailSendResult> {
  const resend = getResendClient(env);
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping verification code email");
    return { success: false, error: "Email service not configured" };
  }

  const fromEmail = env.SUPPORT_EMAIL_FROM || process.env.SUPPORT_EMAIL_FROM || "";
  const html = verificationCodeTemplate({
    email: params.email,
    code: params.code,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: "Your ServDesk verification code",
      html,
    });

    if (error) {
      console.error("Failed to send verification code email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending verification code email:", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a password reset verification code for self-service password reset.
 * Only sends if RESEND_API_KEY is configured.
 */
export async function sendPasswordResetCodeEmail(
  env: CloudflareEnv,
  params: {
    email: string;
    code: string;
  }
): Promise<EmailSendResult> {
  const resend = getResendClient(env);
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping password reset code email");
    return { success: false, error: "Email service not configured" };
  }

  const fromEmail = env.SUPPORT_EMAIL_FROM || process.env.SUPPORT_EMAIL_FROM || "";
  const html = passwordResetCodeTemplate({
    email: params.email,
    code: params.code,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: "Reset your ServDesk password",
      html,
    });

    if (error) {
      console.error("Failed to send password reset code email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error sending password reset code email:", message);
    return { success: false, error: message };
  }
}
