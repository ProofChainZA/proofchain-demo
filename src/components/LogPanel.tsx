'use client';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'request';
  message: string;
  data?: unknown;
}

interface LogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export default function LogPanel({ logs, onClear }: LogPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          SDK Logs
        </h3>
        <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">
          Clear
        </button>
      </div>
      <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto bg-gray-900">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No logs yet. Initialize SDKs to begin.</p>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className={`text-sm font-mono p-2 rounded ${
                log.type === 'error' ? 'bg-red-900/30 text-red-300 border-l-2 border-red-500' :
                log.type === 'success' ? 'bg-green-900/30 text-green-300 border-l-2 border-green-500' :
                log.type === 'request' ? 'bg-blue-900/30 text-blue-300 border-l-2 border-blue-500' :
                'bg-gray-800 text-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{log.message}</span>
                <span className="text-xs text-gray-500">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
              {log.data !== undefined && (
                <pre className="mt-1 text-xs overflow-x-auto max-h-32 overflow-y-auto">
                  {String(typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2))}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
