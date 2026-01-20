/**
 * HTML Utilities for Email Processing
 *
 * Functions to detect, parse, and extract text from HTML email content.
 */

/**
 * Checks if a string contains HTML content.
 */
export function isHtmlContent(content: string): boolean {
  if (!content) return false;

  // Check for common HTML indicators
  const htmlPatterns = [
    /^<!DOCTYPE\s+html/i,
    /^<html[\s>]/i,
    /<(div|p|span|table|tr|td|br|img|a|body|head|style)\b[^>]*>/i,
  ];

  return htmlPatterns.some((pattern) => pattern.test(content.trim()));
}

/**
 * Strips HTML tags and extracts readable text content.
 * Handles common email patterns including signatures.
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  let text = html;

  // Remove style and script tags with their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Remove signature blocks (common patterns)
  // WiseStamp and similar signature services
  text = text.replace(/<div\s+id="Signature"[^>]*>[\s\S]*$/gi, "");
  text = text.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, " ");

  // Convert common block elements to newlines
  text = text.replace(/<\/?(div|p|br|hr|li|tr)[^>]*>/gi, "\n");
  text = text.replace(/<\/?(h[1-6])[^>]*>/gi, "\n\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return text;
}

/**
 * Decodes common HTML entities to their character equivalents.
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&mdash;": "—",
    "&ndash;": "–",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&hellip;": "…",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&ldquo;": "\u201C",
    "&rdquo;": "\u201D",
    "&bull;": "•",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return result;
}

/**
 * Extracts the main email body, removing signatures and quoted replies.
 */
export function extractEmailBody(content: string): string {
  if (!content) return "";

  // If it's HTML, strip it first
  let text = isHtmlContent(content) ? stripHtml(content) : content;

  // Remove common reply markers and everything after
  const replyMarkers = [
    /^-+\s*Original Message\s*-+$/im,
    /^On .+ wrote:$/im,
    /^From:.*\nSent:.*\nTo:.*\nSubject:/im,
    /^_{10,}$/m,
    /^-{10,}$/m,
  ];

  for (const marker of replyMarkers) {
    const match = text.match(marker);
    if (match && match.index !== undefined) {
      text = text.substring(0, match.index).trim();
    }
  }

  // Remove common email signature indicators
  const signatureMarkers = [
    /^--\s*$/m,
    /^Best regards,?$/im,
    /^Kind regards,?$/im,
    /^Thanks,?$/im,
    /^Thank you,?$/im,
    /^Regards,?$/im,
    /^Cheers,?$/im,
  ];

  // Only remove if marker is near the end (last 30% of content)
  const cutoffPoint = Math.floor(text.length * 0.7);
  for (const marker of signatureMarkers) {
    const match = text.match(marker);
    if (match && match.index !== undefined && match.index > cutoffPoint) {
      // Keep the salutation line, remove what follows
      const afterMarker = text.indexOf("\n", match.index + match[0].length);
      if (afterMarker !== -1) {
        const remaining = text.substring(afterMarker).trim();
        // If what follows looks like a signature (short lines), remove it
        const lines = remaining.split("\n").filter((l) => l.trim());
        if (lines.length <= 5 || remaining.length < 200) {
          text = text.substring(0, afterMarker).trim();
        }
      }
    }
  }

  return text.trim();
}

/**
 * Processes email content for display - detects HTML and extracts clean text.
 */
export function processEmailContent(content: string): string {
  if (!content) return "";

  if (isHtmlContent(content)) {
    return extractEmailBody(content);
  }

  return content;
}
