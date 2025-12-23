import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertCircle, CheckCircle, Globe, FileText, Loader2 } from "lucide-react";

const InsertData = () => {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const holo = document.getElementById("holo-light");
    if (!holo) return;
    const move = (e) => {
      holo.style.left = `${e.clientX}px`;
      holo.style.top = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const handleAnalyse = async () => {
    setResult(null);
    if (mode === "url" && !url.trim()) return;
    if (mode === "pdf" && !pdf) return;

    setLoading(true);
    try {
      let response;
      if (mode === "url") {
        response = await fetch("http://localhost:5050/api/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } else {
        const formData = new FormData();
        formData.append("pdf", pdf);
        response = await fetch("http://localhost:5050/api/analyze-pdf", {
          method: "POST",
          body: formData,
        });
      }

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Analysis failed");

      // Extract data from the nested 'data' object your backend sends
      setResult(resData.data); 
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
      <div id="holo-light" className="holo-light"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="content-card"
      >
        <div className="header-section">
          <div className="icon-box">
            <Shield className="shield-icon" />
          </div>
          <h1>VeriNews AI</h1>
          <p>Advanced Neural Verification Engine</p>
        </div>

        <div className="toggle-container">
          <button 
            className={mode === "url" ? "active" : ""} 
            onClick={() => setMode("url")}
          >
            <Globe size={16} /> URL
          </button>
          <button 
            className={mode === "pdf" ? "active" : ""} 
            onClick={() => setMode("pdf")}
          >
            <FileText size={16} /> PDF
          </button>
        </div>

        <div className="input-group">
          {mode === "url" ? (
            <input
              type="text"
              placeholder="Paste article link here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="holo-input"
            />
          ) : (
            <div className="file-upload-wrapper">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdf(e.target.files[0])}
                className="file-input"
              />
              <div className="file-custom-ui">
                {pdf ? pdf.name : "Choose PDF Document"}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleAnalyse} 
          disabled={loading} 
          className="analyze-btn"
        >
          {loading ? <Loader2 className="spinner" /> : "Verify Authenticity"}
        </button>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`result-box ${result.label.toLowerCase()}`}
            >
              <div className="result-header">
                {result.label === "Real" ? <CheckCircle /> : <AlertCircle />}
                <h3>{result.label} Content Detected</h3>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${result.confidence}%` }}
                ></div>
              </div>
              <p>AI Confidence: <strong>{result.confidence}%</strong></p>
              {result.snippet && <p className="snippet">"{result.snippet}"</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default InsertData;