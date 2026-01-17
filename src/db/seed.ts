/**
 * Database Seed Script for ServDesk MVP
 *
 * This script creates initial data for the database, including:
 * - Default SUPER_ADMIN user profile
 *
 * Usage:
 *   Run via wrangler for local D1:
 *   npx wrangler d1 execute servdesk-db --local --file=./src/db/seed.sql
 *
 *   Or programmatically in a setup script/API route.
 *
 * Note: This seed assumes Better Auth has already created a user.
 * The userProfile extends that user with ServDesk-specific fields.
 */

import { eq } from "drizzle-orm";
import type { Database } from "./index";
import { userProfiles, generateId } from "./schema";

/**
 * Seed data for the default super admin user profile.
 * Update the userId to match the Better Auth user ID after user creation.
 */
export const DEFAULT_SUPER_ADMIN_USER_ID = "seed-super-admin-001";

/**
 * Seeds the database with initial data.
 *
 * @param db - The Drizzle database instance
 * @param options - Seed options
 * @returns Seed results
 */
export async function seedDatabase(
  db: Database,
  options: {
    /** Better Auth user ID for the super admin */
    superAdminUserId?: string;
    /** Skip if data already exists */
    skipIfExists?: boolean;
  } = {}
) {
  const {
    superAdminUserId = DEFAULT_SUPER_ADMIN_USER_ID,
    skipIfExists = true,
  } = options;

  const results = {
    userProfiles: { created: 0, skipped: 0 },
  };

  // Seed super admin user profile
  if (skipIfExists) {
    const existing = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, superAdminUserId))
      .limit(1);

    if (existing.length > 0) {
      results.userProfiles.skipped = 1;
      console.log(`[Seed] Super admin profile already exists, skipping.`);
    } else {
      await createSuperAdminProfile(db, superAdminUserId);
      results.userProfiles.created = 1;
    }
  } else {
    await createSuperAdminProfile(db, superAdminUserId);
    results.userProfiles.created = 1;
  }

  return results;
}

/**
 * Creates the super admin user profile.
 */
async function createSuperAdminProfile(db: Database, userId: string) {
  await db.insert(userProfiles).values({
    userId,
    role: "SUPER_ADMIN",
    isActive: true,
    failedLoginAttempts: 0,
  });

  console.log(`[Seed] Created super admin profile for user: ${userId}`);
}

/**
 * Creates a sample customer for testing.
 */
export async function seedSampleCustomer(db: Database) {
  const { customers } = await import("./schema");

  const customerId = generateId();

  await db.insert(customers).values({
    id: customerId,
    email: "customer@example.com",
    name: "Sample Customer",
    organization: "Example Corp",
    ticketCount: 0,
  });

  console.log(`[Seed] Created sample customer: customer@example.com`);

  return customerId;
}

/**
 * Creates a sample ticket for testing.
 */
export async function seedSampleTicket(
  db: Database,
  customerId: string,
  assignedToId?: string
) {
  const { tickets, messages, generateTicketNumber, generateTrackingToken } =
    await import("./schema");

  const ticketId = generateId();

  await db.insert(tickets).values({
    id: ticketId,
    ticketNumber: generateTicketNumber(),
    subject: "Sample Support Request",
    status: "NEW",
    priority: "NORMAL",
    trackingToken: generateTrackingToken(),
    customerId,
    assignedToId,
  });

  // Add initial inbound message
  await db.insert(messages).values({
    ticketId,
    type: "INBOUND",
    content:
      "Hello, I need help with my account. Can someone please assist me?",
    fromEmail: "customer@example.com",
    fromName: "Sample Customer",
  });

  console.log(`[Seed] Created sample ticket with ID: ${ticketId}`);

  return ticketId;
}

/**
 * Full seed for development environment.
 * Creates super admin, sample customer, and sample ticket.
 */
export async function seedDevelopment(
  db: Database,
  superAdminUserId: string
): Promise<{
  superAdminUserId: string;
  customerId: string;
  ticketId: string;
}> {
  // Seed super admin
  await seedDatabase(db, { superAdminUserId, skipIfExists: true });

  // Seed sample customer
  const customerId = await seedSampleCustomer(db);

  // Seed sample ticket
  const ticketId = await seedSampleTicket(db, customerId, superAdminUserId);

  console.log(`[Seed] Development seed complete!`);

  return {
    superAdminUserId,
    customerId,
    ticketId,
  };
}
