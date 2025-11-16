import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const InsertData = () => {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ------------------------------ */
  /*   HOLOGRAPHIC CURSOR GLOW     */
  /* ------------------------------ */
  useEffect(() => {
    const holo = document.getElementById("holo-light");
    if (!holo) return;

    const move = (e) => {
      holo.style.left = `${e.clientX}px`;
      holo.style.top = `${e.clientY}px`;
      holo.style.transform = `translate(-50%, -50%)`;
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  /* ------------------------------ */
  /*   ANALYZE HANDLER (MOCK)       */
  /* ------------------------------ */
  const handleAnalyse = async () => {
    if (mode === "url" && !url.trim()) return alert("Enter a valid URL");
    if (mode === "pdf" && !pdf) return alert("Upload a PDF");

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">

      {/* 🔮 HOLOGRAM LAYER */}
      <div id="holo-light" className="holo-light"></div>

      {/* 🌟 MAIN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl relative z-[10]"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center size-20 rounded-3xl shadow-xl bg-[#030213]"
          >
            <Shield className="size-10 text-white" />
          </motion.div>

          <h1 className="text-4xl font-medium tracking-tight mt-4">
            Fake News Detector
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter a URL or upload a document for AI verification.
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl shadow-xl p-8 border border-border backdrop-blur-md"
        >
          {/* Toggle */}
          <div className="flex bg-muted p-1 rounded-lg mb-6">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "url" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => {
                setMode("url");
                setPdf(null);
              }}
            >
              URL
            </button>

            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "pdf" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => {
                setMode("pdf");
                setUrl("");
              }}
            >
              PDF
            </button>
          </div>

          {/* Input */}
          <div className="flex flex-col gap-3 mb-6">
            {mode === "url" ? (
              <>
                <label className="font-medium">Article URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/article"
                  className="bg-input-background border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="font-medium">Upload PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  className="bg-input-background border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none file:cursor-pointer"
                  onChange={(e) => setPdf(e.target.files[0])}
                />
              </>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyse}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-base font-medium hover:opacity-90 transition"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default InsertData;
