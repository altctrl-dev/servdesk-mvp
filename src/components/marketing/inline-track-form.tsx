"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InlineTrackForm() {
  const router = useRouter();
  const [ticketNumber, setTicketNumber] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = ticketNumber.trim().toUpperCase();
    if (!normalized) {
      router.push("/track");
      return;
    }

    const params = new URLSearchParams({ ticketNumber: normalized });
    router.push(`/track?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        value={ticketNumber}
        onChange={(event) => setTicketNumber(event.target.value)}
        placeholder="SERVSYS-12345"
        className="h-11 border-slate-200 bg-white text-base"
        aria-label="Ticket ID"
      />
      <Button type="submit" className="h-11 px-6 text-sm font-semibold">
        Track
      </Button>
    </form>
  );
}

