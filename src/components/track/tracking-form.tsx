"use client";

/**
 * Tracking Form Component
 *
 * Client component for ticket tracking with two options:
 * - Option A: Ticket Number + Email
 * - Option B: Tracking Token (direct link from email)
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrackingResult, type TrackedTicket } from "./tracking-result";
import { Search, Ticket, Link2, AlertCircle, Loader2 } from "lucide-react";

/** Validation schema for ticket number + email */
const emailTrackingSchema = z.object({
  ticketNumber: z
    .string()
    .min(1, "Ticket number is required")
    .regex(/^SERVSYS-\d{5}$/, "Invalid format. Example: SERVSYS-12345"),
  email: z.string().email("Please enter a valid email address"),
});

/** Validation schema for tracking token */
const tokenTrackingSchema = z.object({
  token: z.string().min(1, "Tracking token is required"),
});

type EmailTrackingData = z.infer<typeof emailTrackingSchema>;
type TokenTrackingData = z.infer<typeof tokenTrackingSchema>;

interface TrackingFormProps {
  /** Initial tracking token from URL (if present) */
  initialToken?: string;
  /** Optional initial ticket number to prefill */
  initialTicketNumber?: string;
  /** Optional initial email to prefill */
  initialEmail?: string;
}

interface TrackingApiResponse {
  ticket?: TrackedTicket;
  error?: string;
}

export function TrackingForm({
  initialToken,
  initialTicketNumber,
  initialEmail,
}: TrackingFormProps) {
  const [result, setResult] = useState<TrackedTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialToken ? "token" : "email");

  // Form for email tracking
  const emailForm = useForm<EmailTrackingData>({
    resolver: zodResolver(emailTrackingSchema),
    defaultValues: {
      ticketNumber: initialTicketNumber || "",
      email: initialEmail || "",
    },
  });

  // Form for token tracking
  const tokenForm = useForm<TokenTrackingData>({
    resolver: zodResolver(tokenTrackingSchema),
    defaultValues: {
      token: initialToken || "",
    },
  });

  /** Tracks ticket using API */
  async function trackTicket(params: URLSearchParams) {
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/tickets/track?${params.toString()}`);
      const data: TrackingApiResponse = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to find ticket");
        return;
      }

      if (data.ticket) {
        setResult(data.ticket);
      }
    } catch (err) {
      console.error("Tracking error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /** Handle email tracking form submit */
  async function onEmailSubmit(data: EmailTrackingData) {
    const params = new URLSearchParams({
      ticketNumber: data.ticketNumber,
      email: data.email,
    });
    await trackTicket(params);
  }

  /** Handle token tracking form submit */
  async function onTokenSubmit(data: TokenTrackingData) {
    const params = new URLSearchParams({
      token: data.token,
    });
    await trackTicket(params);
  }

  /** Reset to search again */
  function handleNewSearch() {
    setResult(null);
    setError(null);
    emailForm.reset({ ticketNumber: "", email: "" });
    tokenForm.reset();
  }

  // Show result if we have one
  if (result) {
    return (
      <div className="space-y-6">
        <TrackingResult ticket={result} />
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleNewSearch}>
            <Search className="mr-2 h-4 w-4" />
            Track Another Ticket
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <Ticket className="h-5 w-5" />
          Track Your Ticket
        </CardTitle>
        <CardDescription>
          Enter your ticket details to check the current status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Error display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">By Ticket Number</span>
              <span className="sm:hidden">Number</span>
            </TabsTrigger>
            <TabsTrigger value="token" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">By Tracking Link</span>
              <span className="sm:hidden">Link</span>
            </TabsTrigger>
          </TabsList>

          {/* Email + Ticket Number Tab */}
          <TabsContent value="email" className="space-y-4 pt-4">
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticketNumber">Ticket Number</Label>
                <Input
                  id="ticketNumber"
                  placeholder="SERVSYS-12345"
                  disabled={isLoading}
                  {...emailForm.register("ticketNumber")}
                />
                {emailForm.formState.errors.ticketNumber && (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.ticketNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  disabled={isLoading}
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use the email address you used when creating the ticket
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Track Ticket
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Token Tab */}
          <TabsContent value="token" className="space-y-4 pt-4">
            <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Tracking Token</Label>
                <Input
                  id="token"
                  placeholder="Paste your tracking token here"
                  disabled={isLoading}
                  {...tokenForm.register("token")}
                />
                {tokenForm.formState.errors.token && (
                  <p className="text-sm text-destructive">
                    {tokenForm.formState.errors.token.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Find this in the tracking link from your confirmation email
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Track Ticket
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
