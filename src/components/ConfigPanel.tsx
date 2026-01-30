'use client';

import { useState } from 'react';

interface ConfigPanelProps {
  onInitialize: (config: {
    baseUrl: string;
    integratorKey: string;
    campaignId: string;
    tenantApiKey: string;
  }) => void;
  isConnected: boolean;
}

export default function ConfigPanel({ onInitialize, isConnected }: ConfigPanelProps) {
  const baseUrl = 'https://api.proofchain.co.za';
  const [integratorKey, setIntegratorKey] = useState('ik_live_Xto1e3ZIuolnr65M8D3sq5a_Qufq51XQehmHKphj0sI');
  const [campaignId, setCampaignId] = useState('b601323a-245d-45df-9008-3ad828038f3e');
  const [tenantApiKey, setTenantApiKey] = useState('att_watt_yyqHNUS6jRAhkqmEExSol_uPHTBDNTzB_GiOFaQTLAU');

  const handleInitialize = () => {
    onInitialize({ baseUrl, integratorKey, campaignId, tenantApiKey });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        SDK Configuration
        {isConnected && (
          <span className="ml-auto flex items-center gap-1 text-sm text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Connected
          </span>
        )}
      </h2>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
          <input 
            type="password" 
            value={baseUrl}
            disabled
            className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tenant API Key
            <span className="text-xs text-purple-500 ml-1">(ak_live_xxx)</span>
          </label>
          <input 
            type="password" 
            value={tenantApiKey}
            onChange={(e) => setTenantApiKey(e.target.value)}
            placeholder="ak_live_xxx"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Integrator API Key
            <span className="text-xs text-blue-500 ml-1">(ik_live_xxx)</span>
          </label>
          <input 
            type="password" 
            value={integratorKey}
            onChange={(e) => setIntegratorKey(e.target.value)}
            placeholder="ik_live_xxx"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign ID</label>
          <input 
            type="text" 
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
      </div>
      
      <div className="mt-4">
        <button 
          onClick={handleInitialize}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Initialize SDKs
        </button>
      </div>
    </div>
  );
}
