import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom"; // Import Routing tools
import "./App.css";

// Components
import InsertData from './components/InsertData.jsx';
import HistoryList from "./components/History.jsx";
import AuthPage from "./components/AuthPage.jsx";

// --- DASHBOARD COMPONENT ---
// We create this small wrapper to hold InsertData + HistoryList together
// and manage the data sharing between them.
const Dashboard = () => {
  const [history, setHistory] = useState([]);

  // 1. Fetch History when Dashboard loads
  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:5050/api/history", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        const responseData = await res.json();
        
        // Safety check to prevent .length error
        if (responseData.success && Array.isArray(responseData.data)) {
            // Map Backend fields to Frontend fields
            const formattedHistory = responseData.data.map(item => ({
                id: item.id,
                type: item.url ? "url" : "pdf", 
                content: item.url || "Uploaded PDF",
                result: item.label, 
                confidence: (Number(item.confidence) * 100).toFixed(1),
                date: new Date(item.created_at).toLocaleString()
            }));
            setHistory(formattedHistory);
        } else {
            setHistory([]);
        }
      } catch (err) {
        console.error("Failed to load history", err);
        setHistory([]);
      }
    };

    fetchHistory();
  }, []);

  // 2. Function to update list instantly after analysis
  const addHistoryItem = (newItem) => {
    setHistory([newItem, ...history]);
  };

  return (
    <div className="container mx-auto px-4 pb-20">
      {/* Pass the function to InsertData */}
      <InsertData onAnalysisComplete={addHistoryItem} />
      
      {/* Pass the data to HistoryList */}
      <HistoryList historyData={history} />
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Routes define which component shows based on the URL */}
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;