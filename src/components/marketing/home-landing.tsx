"use client";

import { useState } from "react";
import {
  Search,
  Ticket,
  Clock,
  BookOpen,
  Menu,
  X,
  Layers,
} from "lucide-react";
import { signInWithMicrosoft } from "@/lib/auth-client";

export function HomeLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMicrosoftSignIn = () => {
    signInWithMicrosoft("/dashboard", "/login?error=unauthorized");
  };

  const scrollToTrackSection = () => {
    document.getElementById("track-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation - Sticky */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-800">
            SERVDESK
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-600">
          <a href="/kb" className="hover:text-blue-600 transition-colors">
            Knowledge Base
          </a>
          <a
            href="mailto:support@servdesk.co?subject=Support%20Request"
            className="hover:text-blue-600 transition-colors"
          >
            Submit Ticket
          </a>
          <a
            href="/api/health"
            className="hover:text-blue-600 transition-colors"
          >
            System Status
          </a>
        </div>

        {/* Staff Login Button - Desktop */}
        <div className="hidden md:block">
          <button
            onClick={handleMicrosoftSignIn}
            className="flex items-center space-x-2 bg-gray-50 border border-gray-300 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="10" height="10" fill="#F25022" />
              <rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
              <rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
              <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
            </svg>
            <span>Staff Login</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4 space-y-4">
          <a
            href="/kb"
            className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Knowledge Base
          </a>
          <a
            href="mailto:support@servdesk.co?subject=Support%20Request"
            className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Submit Ticket
          </a>
          <a
            href="/api/health"
            className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            System Status
          </a>
          <button
            onClick={handleMicrosoftSignIn}
            className="w-full flex items-center justify-center space-x-2 bg-gray-50 border border-gray-300 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="10" height="10" fill="#F25022" />
              <rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
              <rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
              <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
            </svg>
            <span>Staff Login</span>
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
            How can we help you today?
          </h1>
          <p className="text-blue-100 text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Access the Knowledge Base, track existing requests, or submit a new
            inquiry to our support team.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <label htmlFor="hero-search" className="sr-only">
              Search for articles, solutions, or FAQs
            </label>
            <input
              id="hero-search"
              type="text"
              placeholder="Search for articles, solutions, or FAQs..."
              className="w-full px-6 py-4 pr-20 rounded-full text-gray-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 p-2.5 px-5 rounded-full hover:bg-blue-700 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-12 px-6 w-full">
        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8 -mt-24">
          {/* Submit Ticket Card */}
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-blue-600 text-3xl mb-4">
              <Ticket className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Submit a Ticket</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Cannot find a solution? Open a new request and we&apos;ll get back
              to you shortly.
            </p>
            <a
              href="mailto:support@servdesk.co?subject=Support%20Request"
              className="block w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-center hover:bg-blue-700 transition-colors"
            >
              Open Request
            </a>
          </div>

          {/* Track Status Card */}
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-emerald-500 text-3xl mb-4">
              <Clock className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Track Status</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Check the real-time progress of your request using your ticket ID
              and email.
            </p>
            <button
              onClick={scrollToTrackSection}
              className="w-full border border-emerald-500 text-emerald-600 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
            >
              View Progress
            </button>
          </div>

          {/* Knowledge Base Card */}
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-purple-600 text-3xl mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Knowledge Base</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Access step-by-step guides, FAQs, and self-service troubleshooting
              manuals.
            </p>
            <a
              href="/kb"
              className="block w-full border border-purple-500 text-purple-600 py-2 rounded-lg font-semibold text-center hover:bg-purple-50 transition-colors"
            >
              Browse Docs
            </a>
          </div>
        </div>

        {/* Quick Tracking Section */}
        <section
          id="track-section"
          className="mt-24 grid md:grid-cols-2 gap-12 items-center"
        >
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Quick Tracking
            </h2>
            <p className="text-gray-600 mb-6">
              No login required. Enter your details below to receive a secure,
              one-time access link to your ticket details via email.
            </p>
            <form className="space-y-4">
              <div>
                <label htmlFor="ticket-number" className="sr-only">
                  Ticket Number
                </label>
                <input
                  id="ticket-number"
                  type="text"
                  placeholder="Ticket Number (e.g., SD-9921)"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="verification-email" className="sr-only">
                  Verification Email
                </label>
                <input
                  id="verification-email"
                  type="email"
                  placeholder="Verification Email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="bg-gray-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-900 transition-colors w-full"
              >
                Verify &amp; Access Ticket
              </button>
            </form>
          </div>

          {/* Recent Updates Sidebar */}
          <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-4 uppercase text-xs tracking-widest">
              Recent Updates
            </h4>
            <ul className="space-y-4">
              <li className="flex space-x-3">
                <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-bold self-start italic">
                  FAQ
                </span>
                <p className="text-sm text-gray-700">
                  How to configure multi-factor authentication on mobile
                  devices.
                </p>
              </li>
              <li className="flex space-x-3">
                <span className="bg-green-200 text-green-700 px-2 py-1 rounded text-xs font-bold self-start">
                  FIXED
                </span>
                <p className="text-sm text-gray-700">
                  Issue with external VPN handshake resolved for all regions.
                </p>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 gap-4">
          <p>
            &copy; {new Date().getFullYear()} SERVDESK. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="hover:text-blue-600 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Contact Admin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
