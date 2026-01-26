/**
 * Email Templates for ServDesk
 *
 * Provides HTML email templates for customer notifications.
 * All templates use inline styles for maximum email client compatibility.
 */

import type { TicketStatus, UserRole } from "@/db/schema";

// =============================================================================
// TYPES
// =============================================================================

/** Minimal ticket data required for email templates */
export interface TicketEmailData {
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  trackingToken: string;
}

/** Invitation data for email templates */
export interface InvitationEmailData {
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
}

/** Password reset data for email templates */
export interface PasswordResetEmailData {
  email: string;
  name: string | null;
  token: string;
  expiresAt: Date;
}

/** Minimal customer data required for email templates */
export interface CustomerEmailData {
  email: string;
  name: string | null;
}

/** Message data for reply emails */
export interface MessageEmailData {
  content: string;
  contentHtml?: string | null;
  fromName?: string | null;
}

/** Assignee data for assignment emails */
export interface AssigneeEmailData {
  email: string;
  name: string;
}

// =============================================================================
// COMMON STYLES
// =============================================================================

const baseStyles = {
  container: `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
  `,
  header: `
    border-bottom: 2px solid #000000;
    padding-bottom: 16px;
    margin-bottom: 24px;
  `,
  logo: `
    font-size: 24px;
    font-weight: bold;
    color: #000000;
    text-decoration: none;
  `,
  body: `
    color: #333333;
    line-height: 1.6;
    font-size: 16px;
  `,
  ticketBox: `
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  `,
  ticketNumber: `
    font-family: monospace;
    font-size: 18px;
    font-weight: bold;
    color: #000000;
  `,
  ticketSubject: `
    font-size: 14px;
    color: #666666;
    margin-top: 8px;
  `,
  statusBadge: `
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    margin-top: 8px;
  `,
  messageContent: `
    background-color: #f9f9f9;
    border-left: 4px solid #000000;
    padding: 16px;
    margin: 16px 0;
    white-space: pre-wrap;
  `,
  button: `
    display: inline-block;
    background-color: #000000;
    color: #ffffff;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin: 16px 0;
  `,
  footer: `
    border-top: 1px solid #e0e0e0;
    margin-top: 32px;
    padding-top: 16px;
    font-size: 12px;
    color: #888888;
  `,
  muted: `
    color: #888888;
    font-size: 14px;
  `,
};

// =============================================================================
// STATUS COLORS
// =============================================================================

const statusColors: Record<TicketStatus, { bg: string; text: string }> = {
  NEW: { bg: "#e3f2fd", text: "#1565c0" },
  OPEN: { bg: "#fff3e0", text: "#ef6c00" },
  PENDING_CUSTOMER: { bg: "#fce4ec", text: "#c2185b" },
  ON_HOLD: { bg: "#fff8e1", text: "#ff8f00" },
  RESOLVED: { bg: "#e8f5e9", text: "#2e7d32" },
  CLOSED: { bg: "#f5f5f5", text: "#616161" },
};

const statusLabels: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  PENDING_CUSTOMER: "Awaiting Your Response",
  ON_HOLD: "On Hold",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Escapes HTML entities to prevent XSS in email content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Gets the customer's display name or falls back to email.
 */
function getDisplayName(customer: CustomerEmailData): string {
  return customer.name || customer.email.split("@")[0];
}

/**
 * Builds the status badge HTML.
 */
function buildStatusBadge(status: TicketStatus): string {
  const colors = statusColors[status];
  const label = statusLabels[status];
  return `<span style="${baseStyles.statusBadge} background-color: ${colors.bg}; color: ${colors.text};">${label}</span>`;
}

/**
 * Wraps content in the base email layout.
 */
function wrapInLayout(content: string, footerNote?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ServDesk</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0f0; padding: 20px 0;">
    <tr>
      <td align="center">
        <div style="${baseStyles.container}">
          <div style="${baseStyles.header}">
            <span style="${baseStyles.logo}">ServDesk</span>
          </div>
          <div style="${baseStyles.body}">
            ${content}
          </div>
          <div style="${baseStyles.footer}">
            ${footerNote ? `<p>${footerNote}</p>` : ""}
            <p>This is an automated message from ServDesk. Please do not reply directly to this email unless instructed.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Template for ticket creation confirmation sent to customers.
 */
export function ticketCreatedTemplate(params: {
  ticket: TicketEmailData;
  customer: CustomerEmailData;
  trackingUrl: string;
}): string {
  const { ticket, customer, trackingUrl } = params;
  const displayName = getDisplayName(customer);

  const content = `
    <p>Hi ${escapeHtml(displayName)},</p>

    <p>Thank you for contacting ServDesk Support. We've received your request and created a support ticket for you.</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">${escapeHtml(ticket.ticketNumber)}</div>
      <div style="${baseStyles.ticketSubject}">${escapeHtml(ticket.subject)}</div>
      ${buildStatusBadge(ticket.status)}
    </div>

    <p>Our team will review your request and respond as soon as possible. You can track the status of your ticket using the button below:</p>

    <p style="text-align: center;">
      <a href="${escapeHtml(trackingUrl)}" style="${baseStyles.button}">View Ticket Status</a>
    </p>

    <p style="${baseStyles.muted}">If you have any additional information to add, simply reply to this email.</p>
  `;

  return wrapInLayout(
    content,
    `Ticket reference: ${ticket.ticketNumber}`
  );
}

/**
 * Template for reply notifications sent to customers.
 */
export function ticketReplyTemplate(params: {
  ticket: TicketEmailData;
  message: MessageEmailData;
  trackingUrl: string;
}): string {
  const { ticket, message, trackingUrl } = params;
  const senderName = message.fromName || "Support Team";
  const messageContent = message.contentHtml || escapeHtml(message.content);

  const content = `
    <p>A new reply has been added to your support ticket:</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">${escapeHtml(ticket.ticketNumber)}</div>
      <div style="${baseStyles.ticketSubject}">${escapeHtml(ticket.subject)}</div>
      ${buildStatusBadge(ticket.status)}
    </div>

    <p><strong>Message from ${escapeHtml(senderName)}:</strong></p>

    <div style="${baseStyles.messageContent}">
      ${messageContent}
    </div>

    <p style="text-align: center;">
      <a href="${escapeHtml(trackingUrl)}" style="${baseStyles.button}">View Full Conversation</a>
    </p>

    <p style="${baseStyles.muted}">To reply, simply respond to this email.</p>
  `;

  return wrapInLayout(
    content,
    `Ticket reference: ${ticket.ticketNumber}`
  );
}

/**
 * Template for status change notifications sent to customers.
 */
export function statusChangeTemplate(params: {
  ticket: TicketEmailData;
  newStatus: TicketStatus;
  trackingUrl: string;
}): string {
  const { ticket, newStatus, trackingUrl } = params;
  const statusLabel = statusLabels[newStatus];

  let statusMessage = "";
  switch (newStatus) {
    case "OPEN":
      statusMessage = "Our team is actively working on your request.";
      break;
    case "PENDING_CUSTOMER":
      statusMessage = "We need additional information from you to proceed. Please reply to this email or visit your ticket to respond.";
      break;
    case "RESOLVED":
      statusMessage = "We believe your request has been resolved. If you're still experiencing issues, please let us know by replying to this email.";
      break;
    case "CLOSED":
      statusMessage = "This ticket has been closed. If you need further assistance, you can open a new ticket by emailing us.";
      break;
    default:
      statusMessage = "The status of your ticket has been updated.";
  }

  const content = `
    <p>The status of your support ticket has been updated:</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">${escapeHtml(ticket.ticketNumber)}</div>
      <div style="${baseStyles.ticketSubject}">${escapeHtml(ticket.subject)}</div>
      ${buildStatusBadge(newStatus)}
    </div>

    <p><strong>Status: ${statusLabel}</strong></p>

    <p>${statusMessage}</p>

    <p style="text-align: center;">
      <a href="${escapeHtml(trackingUrl)}" style="${baseStyles.button}">View Ticket Details</a>
    </p>
  `;

  return wrapInLayout(
    content,
    `Ticket reference: ${ticket.ticketNumber}`
  );
}

/**
 * Template for new ticket alerts sent to admin users.
 */
export function adminNotificationTemplate(params: {
  ticket: TicketEmailData;
  customer: CustomerEmailData;
  initialMessage?: string;
}): string {
  const { ticket, customer, initialMessage } = params;

  const content = `
    <p><strong>New Support Ticket</strong></p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">${escapeHtml(ticket.ticketNumber)}</div>
      <div style="${baseStyles.ticketSubject}">${escapeHtml(ticket.subject)}</div>
      ${buildStatusBadge(ticket.status)}
    </div>

    <p><strong>Customer Details:</strong></p>
    <ul>
      <li><strong>Email:</strong> ${escapeHtml(customer.email)}</li>
      ${customer.name ? `<li><strong>Name:</strong> ${escapeHtml(customer.name)}</li>` : ""}
    </ul>

    ${initialMessage ? `
    <p><strong>Initial Message:</strong></p>
    <div style="${baseStyles.messageContent}">
      ${escapeHtml(initialMessage)}
    </div>
    ` : ""}

    <p>Log in to the ServDesk dashboard to view and respond to this ticket.</p>
  `;

  return wrapInLayout(
    content,
    "This is an internal notification for ServDesk administrators."
  );
}

/**
 * Template for assignment notifications sent to agents.
 */
export function assignmentTemplate(params: {
  ticket: TicketEmailData;
  customer: CustomerEmailData;
  assignee: AssigneeEmailData;
}): string {
  const { ticket, customer, assignee } = params;
  const assigneeName = assignee.name || assignee.email.split("@")[0];

  const content = `
    <p>Hi ${escapeHtml(assigneeName)},</p>

    <p>A support ticket has been assigned to you:</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">${escapeHtml(ticket.ticketNumber)}</div>
      <div style="${baseStyles.ticketSubject}">${escapeHtml(ticket.subject)}</div>
      ${buildStatusBadge(ticket.status)}
    </div>

    <p><strong>Customer:</strong> ${escapeHtml(customer.name || customer.email)}</p>

    <p>Please log in to the ServDesk dashboard to view the full ticket details and respond to the customer.</p>
  `;

  return wrapInLayout(
    content,
    `Ticket reference: ${ticket.ticketNumber}`
  );
}

// =============================================================================
// INVITATION EMAIL TEMPLATES
// =============================================================================

/** Role display names for invitation emails */
const roleDisplayNames: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  SUPERVISOR: "Supervisor",
  AGENT: "Agent",
  VIEW_ONLY: "Agent",
};

/**
 * Template for user invitation emails.
 * Sent when a SUPER_ADMIN invites a new user to the system.
 */
export function invitationTemplate(params: {
  invitation: InvitationEmailData;
  inviterName: string;
  acceptUrl: string;
}): string {
  const { invitation, inviterName, acceptUrl } = params;
  const roleDisplay = roleDisplayNames[invitation.role] || invitation.role;
  const expiryDate = invitation.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const content = `
    <p>Hello,</p>

    <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join ServDesk as a <strong>${escapeHtml(roleDisplay)}</strong>.</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">You're Invited!</div>
      <div style="${baseStyles.ticketSubject}">
        Email: ${escapeHtml(invitation.email)}<br>
        Role: ${escapeHtml(roleDisplay)}
      </div>
    </div>

    <p>Click the button below to sign in with your Microsoft account:</p>

    <p style="text-align: center;">
      <a href="${escapeHtml(acceptUrl)}" style="${baseStyles.button}">Sign in with Microsoft</a>
    </p>

    <p style="${baseStyles.muted}">This invitation will expire on ${expiryDate}.</p>

    <p style="${baseStyles.muted}">If you did not expect this invitation, you can safely ignore this email.</p>
  `;

  return wrapInLayout(
    content,
    "This is an automated invitation from ServDesk."
  );
}

/**
 * Template for password reset emails.
 * Sent when a SUPER_ADMIN triggers a password reset for a user.
 */
export function passwordResetTemplate(params: {
  user: PasswordResetEmailData;
  resetUrl: string;
}): string {
  const { user, resetUrl } = params;
  const displayName = user.name || user.email.split("@")[0];
  const expiryTime = "1 hour";

  const content = `
    <p>Hi ${escapeHtml(displayName)},</p>

    <p>A password reset has been requested for your ServDesk account.</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">Password Reset</div>
      <div style="${baseStyles.ticketSubject}">
        Account: ${escapeHtml(user.email)}
      </div>
    </div>

    <p>Click the button below to set a new password:</p>

    <p style="text-align: center;">
      <a href="${escapeHtml(resetUrl)}" style="${baseStyles.button}">Reset Password</a>
    </p>

    <p style="${baseStyles.muted}">This link will expire in ${expiryTime}.</p>

    <p style="${baseStyles.muted}">If you did not request this password reset, please contact your administrator immediately.</p>
  `;

  return wrapInLayout(
    content,
    "This is a security notification from ServDesk."
  );
}

// =============================================================================
// VERIFICATION CODE EMAIL TEMPLATE
// =============================================================================

/** Verification code data for email templates */
export interface VerificationCodeEmailData {
  email: string;
  code: string;
}

/**
 * Template for email verification code during invitation acceptance.
 * Sent when user requests to verify their email address.
 */
export function verificationCodeTemplate(params: {
  email: string;
  code: string;
}): string {
  const { email, code } = params;

  const content = `
    <p>Hello,</p>

    <p>You are setting up your ServDesk account for <strong>${escapeHtml(email)}</strong>.</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">Verification Code</div>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 0; font-family: monospace;">
        ${escapeHtml(code)}
      </div>
    </div>

    <p>Enter this code in the account setup form to verify your email address.</p>

    <p style="${baseStyles.muted}">This code will expire in <strong>10 minutes</strong>.</p>

    <p style="${baseStyles.muted}">If you did not request this code, you can safely ignore this email.</p>
  `;

  return wrapInLayout(
    content,
    "This is a security notification from ServDesk."
  );
}

// =============================================================================
// SELF-SERVICE PASSWORD RESET EMAIL TEMPLATE
// =============================================================================

/** Password reset code data for email templates */
export interface PasswordResetCodeEmailData {
  email: string;
  code: string;
}

/**
 * Template for self-service password reset code.
 * Sent when user requests to reset their password via the forgot password flow.
 */
export function passwordResetCodeTemplate(params: {
  email: string;
  code: string;
}): string {
  const { email, code } = params;

  const content = `
    <p>Hello,</p>

    <p>We received a request to reset the password for your ServDesk account (<strong>${escapeHtml(email)}</strong>).</p>

    <div style="${baseStyles.ticketBox}">
      <div style="${baseStyles.ticketNumber}">Password Reset Code</div>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 0; font-family: monospace;">
        ${escapeHtml(code)}
      </div>
    </div>

    <p>Enter this code on the password reset page to set a new password.</p>

    <p style="${baseStyles.muted}">This code will expire in <strong>10 minutes</strong>.</p>

    <p style="${baseStyles.muted}">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `;

  return wrapInLayout(
    content,
    "This is a security notification from ServDesk."
  );
}
