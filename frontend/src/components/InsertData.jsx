import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, AlertCircle, CheckCircle, Smile } from "lucide-react";

// 🔧 Change this if your backend port is different
const API_BASE_URL = "http://localhost:5050/api/analyze";

const InsertData = () => {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Holographic Effect
  useEffect(() => {
    const holo = document.getElementById("holo-light");
    if (holo) {
        const move = (e) => holo.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        window.addEventListener("mousemove", move);
        return () => window.removeEventListener("mousemove", move);
    }
  }, []);

  const handleAnalyse = async () => {
    setResult(null); 
    if (mode === "url" && !url.trim()) return alert("Please enter a valid URL");
    if (mode === "pdf" && !pdf) return alert("Please upload a PDF file");

    setLoading(true);

    try {
      let response;
      const endpoint = mode === "url" ? `${API_BASE_URL}/url` : `${API_BASE_URL}/pdf`;

      if (mode === "url") {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", pdf);
        response = await fetch(endpoint, { method: "POST", body: formData });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");

      setResult(data.data ? data.data : data);

    } catch (error) {
      console.error("Analysis Error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const labelRaw = result.label ? result.label.toString().toUpperCase().trim() : "";
    
    // Logic for Types
    const isSatire = labelRaw === "SATIRE";
    const isReal = ["REAL", "LABEL_1", "TRUE", "VERIFIED"].includes(labelRaw);
    
    // Logic for Colors/Icons
    let theme = "bg-red-500/10 border-red-500/20 text-red-700";
    let Icon = AlertCircle;
    let title = "Potential Fake News";

    if (isReal) {
        theme = "bg-green-500/10 border-green-500/20 text-green-700";
        Icon = CheckCircle;
        title = "Verified Real News";
    } else if (isSatire) {
        theme = "bg-yellow-500/10 border-yellow-500/20 text-yellow-700";
        Icon = Smile;
        title = "Satire / Comedy Source";
    }

    // Logic for Score
    let rawString = result.confidence ? String(result.confidence).replace('%', '') : "0";
    let scoreNum = Number(rawString);
    if (isNaN(scoreNum)) scoreNum = 0;
    if (scoreNum <= 1 && scoreNum > 0) scoreNum = scoreNum * 100;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-6 p-4 rounded-xl border flex items-start gap-4 ${theme}`}
      >
        <div className={`mt-1 p-1 rounded-full bg-white/20`}>
          <Icon className="size-6" />
        </div>
        
        <div>
          <h3 className="font-bold text-lg leading-tight">{title}</h3>
          <p className="text-sm opacity-80 mt-1">
            Confidence Score: <span className="font-mono font-bold">{scoreNum.toFixed(1)}%</span>
          </p>
          {result.snippet && (
            <p className="text-xs opacity-60 mt-2 line-clamp-2 italic">"{result.snippet}"</p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div id="holo-light" className="holo-light fixed pointer-events-none z-0 top-0 left-0 w-4 h-4 rounded-full bg-white blur-[100px] opacity-20"></div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center size-20 rounded-3xl shadow-2xl bg-[#030213] border border-white/10">
            <Shield className="size-10 text-white" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight mt-4 text-foreground">Fake News Detector</h1>
          <p className="text-muted-foreground mt-2">Enter a URL or upload a document for AI verification.</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border backdrop-blur-md">
          <div className="flex bg-muted p-1 rounded-lg mb-6">
            <button className={`flex-1 py-2 rounded-md text-sm font-medium ${mode === "url" ? "bg-background shadow" : "text-muted-foreground"}`} onClick={() => setMode("url")}>URL Link</button>
            <button className={`flex-1 py-2 rounded-md text-sm font-medium ${mode === "pdf" ? "bg-background shadow" : "text-muted-foreground"}`} onClick={() => setMode("pdf")}>PDF Document</button>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {mode === "url" ? (
              <input type="text" placeholder="https://example.com/article" className="bg-background border border-input rounded-lg px-4 py-3 outline-none" value={url} onChange={(e) => setUrl(e.target.value)} />
            ) : (
              <input type="file" accept=".pdf" className="bg-background border border-input rounded-lg px-4 py-3 outline-none" onChange={(e) => setPdf(e.target.files[0])} />
            )}
          </div>

          <button onClick={handleAnalyse} disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50">
            {loading ? "Analyzing..." : "Analyze Content"}
          </button>

          {renderResult()}
        </div>
      </motion.div>
    </div>
  );
};

export default InsertData;