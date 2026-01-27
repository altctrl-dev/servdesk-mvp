import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck, Ticket, Briefcase, Clock, Headphones, Zap } from "lucide-react";

export function HomeLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900">
      <nav className="flex items-center justify-between px-8 py-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <img
            src="/Logos/ServDesk_V1.2.svg"
            alt="ServDesk Logo"
            className="h-9 w-9 object-contain"
          />
          <span className="text-xl font-bold tracking-tight">
            ServDesk <span className="text-blue-600"></span>
          </span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-blue-600 transition-colors">
            Knowledge Base
          </a>
          <a href="/api/health" className="hover:text-blue-600 transition-colors">
            Service Status
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            Contact Security
          </a>
        </div>
        <a href="mailto:support@servdesk.com?subject=Support%20Request">
          <Button className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-200">
            Submit a Request
          </Button>
        </a>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center w-full">
        <div>
          <h1 className="text-5xl font-extrabold leading-tight mb-6">
            How can we help you <span className="text-blue-600">today?</span>
          </h1>
          <p className="text-lg text-slate-600 mb-6">
            Search our documentation or track your existing support tickets.
            ServDesk is committed to resolving your technical queries with
            precision.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap gap-3 mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
              <Headphones className="h-3.5 w-3.5" />
              24/7 Support
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
              <Clock className="h-3.5 w-3.5" />
              Avg. response: 2hrs
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
              <Zap className="h-3.5 w-3.5" />
              99.9% Uptime
            </span>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-4 text-slate-400 h-5 w-5 transition-colors group-focus-within:text-blue-500" />
              <Input
                type="text"
                placeholder="Search for solutions... Try: password reset, VPN setup"
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 shadow-sm h-14 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10"
              />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-blue-600" />
                Track Your Ticket
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Enter your ticket ID and email to check real-time status.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="SERVSYS-00000"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-md focus:shadow-blue-500/10"
                  />
                </div>
                <Button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/25 active:scale-95 transition-all duration-200">
                  Track
                </Button>
              </div>
            </div>
          </div>

          {/* Illustration */}
          <div className="mt-8 flex items-center gap-4 text-slate-400">
            <svg className="w-24 h-24 opacity-50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
              <rect x="30" y="35" width="40" height="30" rx="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M30 42L50 55L70 42" stroke="currentColor" strokeWidth="2"/>
              <circle cx="75" cy="30" r="12" fill="#3B82F6" fillOpacity="0.2" stroke="#3B82F6" strokeWidth="2"/>
              <path d="M75 25V35M75 35L80 30M75 35L70 30" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm">Fast email-based support with real-time tracking</p>
          </div>
        </div>

        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-green-100 text-green-700 text-[10px] uppercase font-black px-2 py-1 rounded flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Secure Staff Portal
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Agent Login
            </h2>
            <p className="text-slate-500 text-sm">
              Internal access for ServDesk technical staff only.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-3 border-2 border-slate-100 py-3 rounded-xl hover:bg-slate-50 hover:border-slate-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all duration-200 group h-14"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 23 23"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span className="font-semibold text-slate-700">
                Sign in with Microsoft 365
              </span>
            </Button>

            <p className="text-[11px] text-center text-slate-400 mt-6">
              By logging in, you agree to the ServDesk Internal Security
              Policy. Your session is monitored and recorded for compliance.
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center opacity-70">
            <span className="text-xs font-medium">v0.1.0 Stable</span>
            <div className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-green-700">
                Systems Online
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-10 text-slate-400 text-xs mt-auto">
        &copy; {new Date().getFullYear()} ServDesk Solutions. All rights
        reserved. Built for high-performance support teams.
      </footer>
    </div>
  );
}
