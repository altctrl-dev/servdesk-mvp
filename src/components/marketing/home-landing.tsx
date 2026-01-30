"use client";

import { useState } from "react";
import {
  Search,
  FileText,
  History,
  BookOpen,
  Menu,
  X,
  Layers,
  Clock,
  Target,
  TrendingDown,
  Award,
  Lightbulb,
} from "lucide-react";
import { signInWithMicrosoft } from "@/lib/auth-client";

export function HomeLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMicrosoftSignIn = () => {
    signInWithMicrosoft("/dashboard", "/login?error=unauthorized");
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-50 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-800">
            SERVDESK
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-10 text-sm font-medium text-gray-600">
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
            className="flex items-center space-x-2 bg-white border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
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
            <span className="text-gray-700">Staff Login</span>
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
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4 space-y-4 flex-shrink-0">
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
            className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
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
            <span className="text-gray-700">Staff Login</span>
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-500 to-blue-600 text-white py-16 px-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            How can we help you today?
          </h1>
          <p className="text-blue-100 text-base md:text-lg mb-10 max-w-2xl mx-auto">
            Access the Knowledge Base, track existing requests, or submit a new
            inquiry to our support team.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <label htmlFor="hero-search" className="sr-only">
              Search for articles, solutions, or FAQs
            </label>
            <input
              id="hero-search"
              type="text"
              placeholder="Search for articles, solutions, or FAQs..."
              className="w-full px-6 py-4 pr-16 rounded-full text-gray-700 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-base"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 p-3 rounded-full hover:bg-blue-600 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto px-6 w-full">
        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8 -mt-10">
          {/* Submit Ticket Card */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-blue-500 mb-5">
              <FileText className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">
              Submit a Ticket
            </h3>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Cannot find a solution? Open a new request and we&apos;ll get back
              to you shortly.
            </p>
            <a
              href="mailto:support@servdesk.co?subject=Support%20Request"
              className="block w-full bg-blue-500 text-white py-3 rounded-xl font-semibold text-center hover:bg-blue-600 transition-colors"
            >
              Open Request
            </a>
          </div>

          {/* Track Status Card */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-emerald-500 mb-5">
              <History className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">
              Track Status
            </h3>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Check the real-time progress of your request using your ticket ID
              and email.
            </p>
            <a
              href="/track"
              className="block w-full border-2 border-emerald-500 text-emerald-600 py-3 rounded-xl font-semibold text-center hover:bg-emerald-50 transition-colors"
            >
              View Progress
            </a>
          </div>

          {/* Knowledge Base Card */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-purple-500 mb-5">
              <BookOpen className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">
              Knowledge Base
            </h3>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Access step-by-step guides, FAQs, and self-service troubleshooting
              manuals.
            </p>
            <a
              href="/kb"
              className="block w-full border-2 border-purple-500 text-purple-600 py-3 rounded-xl font-semibold text-center hover:bg-purple-50 transition-colors"
            >
              Browse Docs
            </a>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="mt-12 space-y-4">
          {/* Row 1: 3 badges */}
          <div className="flex flex-wrap justify-center gap-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-full">
              <Target className="h-4 w-4" />
              98% SLA Met
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 text-sm font-medium rounded-full">
              <Clock className="h-4 w-4" />
              &lt; 2hr Avg Response
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-full">
              <Lightbulb className="h-4 w-4" />
              85% Self-Resolved
            </span>
          </div>

          {/* Row 2: 2 centered badges */}
          <div className="flex flex-wrap justify-center gap-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 text-sm font-medium rounded-full">
              <Award className="h-4 w-4" />
              10,000+ Tickets Resolved
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-full">
              <TrendingDown className="h-4 w-4" />
              &lt; 5% Escalation Rate
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-6 flex-shrink-0">
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
