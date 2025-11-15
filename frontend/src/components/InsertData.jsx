import React, { useState } from "react";

const InsertData = () => {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyse = async () => {
    if (mode === "url" && !url.trim()) {
      alert("Please enter a URL");
      return;
    }
    if (mode === "pdf" && !pdf) {
      alert("Please upload a PDF");
      return;
    }

    setLoading(true);

    try {
      if (mode === "url") {
        console.log("Submitting URL:", url);
      } else {
        console.log("Submitting PDF:", pdf);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center mt-10 px-4">

      {/* Title */}
      <h1 className="text-3xl font-medium">Fake News Detector</h1>
      <p className="text-muted-foreground mt-1">
        Enter a URL or upload a PDF document for analysis.
      </p>

      {/* Card */}
      <div className="bg-card shadow-lg rounded-xl p-6 mt-6 w-full max-w-md border">

        {/* Toggle */}
        <div className="flex bg-muted p-1 rounded-lg mb-4">
          <button
            className={`flex-1 py-2 rounded-md transition ${
              mode === "url"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
            onClick={() => {
              setMode("url");
              setPdf(null);
            }}
          >
            URL
          </button>

          <button
            className={`flex-1 py-2 rounded-md transition ${
              mode === "pdf"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
            onClick={() => {
              setMode("pdf");
              setUrl("");
            }}
          >
            PDF
          </button>
        </div>

        {/* Input Area */}
        <div className="flex flex-col gap-2 mb-4">
          {mode === "url" ? (
            <>
              <label>Article URL</label>
              <input
                type="text"
                placeholder="https://example.com/article"
                className="bg-input-background border border-border rounded-lg px-3 py-2"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </>
          ) : (
            <>
              <label>Upload PDF</label>
              <input
                type="file"
                accept=".pdf"
                className="bg-input-background border border-border rounded-lg px-3 py-2"
                onChange={(e) => setPdf(e.target.files[0])}
              />
            </>
          )}
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyse}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </div>
  );
};

export default InsertData;
