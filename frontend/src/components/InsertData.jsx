import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, AlertCircle, CheckCircle } from "lucide-react";

const InsertData = () => {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ------------------------------ */
  /* HOLOGRAPHIC CURSOR GLOW      */
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
  /* ANALYZE HANDLER              */
  /* ------------------------------ */
  const handleAnalyse = async () => {
    setResult(null); 
    
    if (mode === "url" && !url.trim()) return alert("Please enter a valid URL");
    if (mode === "pdf" && !pdf) return alert("Please upload a PDF file");

    setLoading(true);

    try {
      let response;
      const apiBase = "http://localhost:5050/api/analyze"; 

      if (mode === "url") {
        response = await fetch(`${apiBase}/url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", pdf);
        response = await fetch(`${apiBase}/pdf`, {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();
      
      // 🚨 Debug Log
      console.log("📥 Raw API Response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      // ✅ FIX: Check if the data is wrapped inside a 'data' property
      const cleanResult = data.data ? data.data : data;

      setResult(cleanResult);

    } catch (error) {
      console.error("Analysis Error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div id="holo-light" className="holo-light fixed pointer-events-none z-0"></div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center size-20 rounded-3xl shadow-2xl bg-[#030213] border border-white/10"
          >
            <Shield className="size-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-medium tracking-tight mt-4 text-foreground">
            Fake News Detector
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter a URL or upload a document for AI verification.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl shadow-xl p-8 border border-border backdrop-blur-md"
        >
          {/* Toggle Buttons */}
          <div className="flex bg-muted p-1 rounded-lg mb-6">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "url" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => { setMode("url"); setPdf(null); setResult(null); }}
            >
              URL Link
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "pdf" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => { setMode("pdf"); setUrl(""); setResult(null); }}
            >
              PDF Document
            </button>
          </div>

          {/* Inputs */}
          <div className="flex flex-col gap-3 mb-6">
            {mode === "url" ? (
              <>
                <label className="font-medium text-sm ml-1">Article URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/article"
                  className="bg-background border border-input rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="font-medium text-sm ml-1">Upload PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  className="bg-background border border-input rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  onChange={(e) => setPdf(e.target.files[0])}
                />
              </>
            )}
          </div>

          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-base font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Analyzing...
              </span>
            ) : (
              "Analyze Content"
            )}
          </button>

          {/* -------------------------------------------------- */}
          {/* ✅ FIXED RESULT DISPLAY SECTION                    */}
          {/* -------------------------------------------------- */}
          {result && (
            (() => {
              // 1. NORMALIZE LABEL: Handle "Real", "REAL", "Real ", etc.
              const labelRaw = result.label ? result.label.toString().toUpperCase().trim() : "";
              const isReal = ["REAL", "LABEL_1", "TRUE", "1"].includes(labelRaw);

              // 2. FIX MATH: Handle 0.98 vs 98.0
              let scoreNum = Number(result.confidence || 0);
              // If backend already sent >1 (like 99.0), don't multiply. If <1 (like 0.99), multiply.
              if (scoreNum <= 1 && scoreNum > 0) {
                scoreNum = scoreNum * 100;
              }
              const displayScore = scoreNum.toFixed(1); 

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-4 rounded-xl border flex items-start gap-4 ${
                    isReal 
                      ? "bg-green-500/10 border-green-500/20 text-green-700" 
                      : "bg-red-500/10 border-red-500/20 text-red-700"
                  }`}
                >
                  <div className={`mt-1 p-1 rounded-full ${isReal ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    {isReal ? <CheckCircle className="size-6" /> : <AlertCircle className="size-6" />}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg leading-tight">
                      {isReal ? "Verified Real News" : "Potential Fake News"}
                    </h3>
                    <p className="text-sm opacity-80 mt-1">
                      Confidence Score: <span className="font-mono font-bold">{displayScore}%</span>
                    </p>
                    {result.snippet && (
                      <p className="text-xs opacity-60 mt-2 line-clamp-2 italic">
                        "{result.snippet}"
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })()
          )}

        </motion.div>
      </motion.div>
    </div>
  );
};

export default InsertData;