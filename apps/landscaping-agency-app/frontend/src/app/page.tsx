"use client";

import { useState } from "react";

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: "Bush & Root Removal",
    details: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/v1/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-key": "CLIENT_LANDSCAPING_PRO_01",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setFormData({ name: "", phone: "", email: "", service: "Bush & Root Removal", details: "" });
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to send request.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Unable to connect to server.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-emerald-800">ProScapes Ottawa</span>
          <a href="#quote" className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-2 rounded-lg transition">
            Get Free Estimate
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-900 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-emerald-400 font-semibold text-sm uppercase">Full Yard Overhauls & Clearing</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Bush Removal & Complete Lawn Replacement</h1>
          <p className="text-slate-300 text-lg">Deep root excavation, soil re-grading, and fresh sod installation.</p>
        </div>
      </section>

      {/* Quote Form */}
      <section id="quote" className="max-w-2xl mx-auto py-16 px-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold mb-2">Request Your Estimate</h2>
          <p className="text-slate-600 text-sm mb-6">Fill out the details below and our team will get back to you within 24 hours.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Primary Service Needed</label>
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              >
                <option>Bush & Root Removal</option>
                <option>Full Front Yard Replacement</option>
                <option>Sod & Turf Laying</option>
                <option>Hedge Trimming & Clearing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Details</label>
              <textarea
                rows={3}
                placeholder="Number of bushes, yard dimensions..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting..." : "Submit Request"}
            </button>

            {status === "success" && (
              <p className="text-emerald-700 text-center font-medium text-sm mt-2">
                ✓ Request received! We will contact you shortly.
              </p>
            )}
            {status === "error" && (
              <p className="text-red-600 text-center font-medium text-sm mt-2">{errorMessage}</p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
