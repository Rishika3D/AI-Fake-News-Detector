import React from "react";
import InsertData from './components/InsertData.jsx'
import "./App.css";
import HistoryList from "./components/History.jsx";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <InsertData />
      < HistoryList/>
    </div>
  );
}

export default App;
