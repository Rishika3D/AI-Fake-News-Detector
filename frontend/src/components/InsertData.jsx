import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, AlertCircle, CheckCircle, Smile, Loader2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5050/api/analyze";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // 60 × 2 s = 2 min max wait

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollJob(jobId, setStatus) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!res.ok) throw new Error("Failed to check job status.");
    const data = await res.json();
    if (data.status === "done") {
      setStatus?.("Step 3/3 — Running AI model…");
      await sleep(400); // brief pause so user sees the step
      return data.data;
    }
    if (data.status === "error") throw new Error(data.error || "Analysis failed.");
    // Show which step we're on based on elapsed polls
    if (i < 5)  setStatus?.("Step 2/3 — Scraping article…");
    else        setStatus?.("Step 3/3 — Running AI model…");
  }
  throw new Error("Analysis timed out. Please try again.");
}

const InsertData = () => {
  const [mode, setMode]       = useState("url");
  const [url, setUrl]         = useState("");
  const [pdf, setPdf]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState("");
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  // Holographic cursor effect
  useEffect(() => {
    const holo = document.getElementById("holo-light");
    if (!holo) return;
    const move = (e) => {
      holo.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const handleAnalyse = async () => {
    setResult(null);
    setError(null);

    if (mode === "url" && !url.trim()) {
      setError("Please enter a URL.");
      return;
    }
    if (mode === "pdf" && !pdf) {
      setError("Please upload a PDF file.");
      return;
    }

    setLoading(true);
    setStatus("Step 1/3 — Queuing job…");

    try {
      // 1. Queue the job — server responds immediately with 202 + jobId
      let response;
      if (mode === "url") {
        response = await fetch(`${API_BASE_URL}/url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", pdf);
        response = await fetch(`${API_BASE_URL}/pdf`, {
          method: "POST",
          body: formData,
        });
      }

      const submitData = await response.json();
      if (!response.ok) throw new Error(submitData.error || "Failed to queue analysis.");

      // 2. Poll until the worker finishes
      setStatus("Step 2/3 — Scraping article…");
      const analysisResult = await pollJob(submitData.jobId, setStatus);
      setResult(analysisResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const labelRaw = (result.label || "").toString().toUpperCase().trim();

    const isTrusted = ["TRUSTED", "REAL", "TRUE", "VERIFIED"].includes(labelRaw);
    const isSatire  = labelRaw === "SATIRE";
    const isConfirmedFake = labelRaw === "FAKE";

    let theme = "bg-red-500/10 border-red-500/20 text-red-700";
    let Icon  = AlertCircle;
    let title = "Potential Fake News";

    if (isTrusted) {
      theme = "bg-green-500/10 border-green-500/20 text-green-700";
      Icon  = CheckCircle;
      title = "Likely Credible News";
    } else if (isSatire) {
      theme = "bg-yellow-500/10 border-yellow-500/20 text-yellow-700";
      Icon  = Smile;
      title = "Satire / Comedy Source";
    } else if (isConfirmedFake) {
      theme = "bg-red-700/15 border-red-700/30 text-red-800";
      Icon  = AlertCircle;
      title = "⚠️ Known Misinformation Source";
    }

    let rawScore = String(result.confidence || "0").replace("%", "");
    let scoreNum = Number(rawScore);
    if (isNaN(scoreNum)) scoreNum = 0;
    if (scoreNum > 0 && scoreNum <= 1) scoreNum *= 100;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-6 p-4 rounded-xl border flex items-start gap-4 ${theme}`}
      >
        <div className="mt-1 p-1 rounded-full bg-white/20">
          <Icon className="size-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">{title}</h3>
          <p className="text-sm opacity-80 mt-1">
            Confidence: <span className="font-mono font-bold">{scoreNum.toFixed(1)}%</span>
          </p>
          {result.snippet && (
            <p className="text-xs opacity-60 mt-2 line-clamp-2 italic">
              "{result.snippet}"
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div
        id="holo-light"
        className="holo-light fixed pointer-events-none z-0 top-0 left-0 w-4 h-4 rounded-full bg-white blur-[100px] opacity-20"
      />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center size-20 rounded-3xl shadow-2xl bg-[#030213] border border-white/10">
            <Shield className="size-10 text-white" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight mt-4 text-foreground">
            Fake News Detector
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter a URL or upload a document for AI verification.
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border backdrop-blur-md">
          {/* Mode toggle */}
          <div className="flex bg-muted p-1 rounded-lg mb-6">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === "url" ? "bg-background shadow" : "text-muted-foreground"}`}
              onClick={() => { setMode("url"); setError(null); setResult(null); }}
            >
              URL Link
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === "pdf" ? "bg-background shadow" : "text-muted-foreground"}`}
              onClick={() => { setMode("pdf"); setError(null); setResult(null); }}
            >
              PDF Document
            </button>
          </div>

          {/* Input */}
          <div className="flex flex-col gap-3 mb-6">
            {mode === "url" ? (
              <input
                type="url"
                placeholder="https://example.com/article"
                className="bg-background border border-input rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
              />
            ) : (
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="bg-background border border-input rounded-lg px-4 py-3 outline-none"
                onChange={(e) => { setPdf(e.target.files[0]); setError(null); }}
              />
            )}
          </div>

          {/* Inline error banner — no more browser alert() */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {status || "Analyzing…"}
              </>
            ) : (
              "Analyze Content"
            )}
          </button>

          {renderResult()}
        </div>
      </motion.div>
    </div>
  );
};

export default InsertData;
