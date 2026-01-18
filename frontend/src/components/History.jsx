import React from "react";
import { Clock, FileText, Link as LinkIcon, AlertTriangle, CheckCircle } from "lucide-react";

const HistoryList = ({ historyData }) => {
  // --- FIX IS HERE: SAFETY CHECK ---
  // If historyData is undefined, null, or not an array, show nothing or a loading state
  if (!historyData || !Array.isArray(historyData)) {
    return <div className="text-center text-muted-foreground mt-10">Loading history...</div>;
  }

  // Now it is safe to check .length
  if (historyData.length === 0) {
    return (
      <div className="text-center mt-10 p-8 border border-dashed border-border rounded-xl">
        <Clock className="mx-auto size-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium">No Analysis History</h3>
        <p className="text-muted-foreground">Your recent scans will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-12 w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Clock className="size-5" /> Recent Scans
      </h2>

      <div className="grid gap-4">
        {historyData.map((item) => (
          <div
            key={item.id}
            className="bg-card border border-border p-4 rounded-xl flex items-center justify-between hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className={`p-2 rounded-lg ${item.type === 'url' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                {item.type === 'url' ? <LinkIcon className="size-5" /> : <FileText className="size-5" />}
              </div>
              
              <div className="flex flex-col overflow-hidden">
                <span className="font-medium truncate max-w-[300px] block" title={item.content}>
                  {item.content}
                </span>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
               item.result === 'REAL' || item.result === 'Real' || item.result === 'LABEL_1'
                ? 'bg-green-500/10 text-green-600' 
                : 'bg-red-500/10 text-red-600'
            }`}>
              {item.result === 'REAL' || item.result === 'Real' || item.result === 'LABEL_1' 
                ? <CheckCircle className="size-4" /> 
                : <AlertTriangle className="size-4" />}
              {item.result === 'LABEL_1' ? 'Real' : (item.result === 'LABEL_0' ? 'Fake' : item.result)}
              <span className="text-xs opacity-75 ml-1">({item.confidence}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;