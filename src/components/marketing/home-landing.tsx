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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center z-50">
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
          <a href="#" className="hover:text-blue-600 transition-colors">
            Knowledge Base
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            Submit Ticket
          </a>
          <a
            href="/api/health"
            className="hover:text-blue-600 transition-colors"
          >
            System Status
          </a>
        </div>

        {/* Staff Login Button */}
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
            href="#"
            className="block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Knowledge Base
          </a>
          <a
            href="#"
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
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-12 px-6 flex-shrink-0">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            How can we help you today?
          </h1>
          <p className="text-blue-100 text-base md:text-lg mb-6 max-w-2xl mx-auto">
            Access the Knowledge Base, track existing requests, or submit a new
            inquiry.
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
      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-8 flex flex-col justify-center">
        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 -mt-12 mb-8">
          {/* Submit Ticket Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-blue-600 text-2xl mb-3">
              <Ticket className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold mb-2">Submit a Ticket</h3>
            <p className="text-gray-500 mb-4 text-sm leading-relaxed">
              Open a new request and our support team will get back to you
              shortly via email.
            </p>
            <a
              href="mailto:support@servdesk.co?subject=Support%20Request"
              className="block w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors text-center"
            >
              Open Request
            </a>
          </div>

          {/* Track Status Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-emerald-500 text-2xl mb-3">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold mb-2">Track Status</h3>
            <p className="text-gray-500 mb-4 text-sm leading-relaxed">
              Check real-time progress using your Ticket ID and email
              verification.
            </p>
            <a
              href="/track"
              className="block w-full border border-emerald-500 text-emerald-600 py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-50 transition-colors text-center"
            >
              View Progress
            </a>
          </div>

          {/* Knowledge Base Card */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-purple-600 text-2xl mb-3">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold mb-2">Knowledge Base</h3>
            <p className="text-gray-500 mb-4 text-sm leading-relaxed">
              Access step-by-step guides, FAQs, and self-service manuals.
            </p>
            <a
              href="/kb"
              className="block w-full border border-purple-500 text-purple-600 py-2.5 rounded-lg font-semibold text-sm hover:bg-purple-50 transition-colors text-center"
            >
              Browse Docs
            </a>
          </div>
        </div>

        {/* Updates Banner */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-800 bg-blue-100 px-2 py-1 rounded w-fit">
              Updates
            </span>
            <div className="flex flex-col md:flex-row gap-2 md:gap-6">
              <div className="flex items-center space-x-2 text-xs text-gray-700">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                <span>MFA Mobile Configuration Guide updated.</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-700">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                <span>VPN Handshake issue resolved globally.</span>
              </div>
            </div>
          </div>
          <a
            href="#"
            className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap"
          >
            View all announcements &rarr;
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-6 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-4">
          <p>&copy; {new Date().getFullYear()} SERVDESK. All rights reserved.</p>
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
