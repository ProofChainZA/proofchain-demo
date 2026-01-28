'use client';

import { ProofChainPartner } from '@proofchain/partner-sdk';
import { ProofChain } from '@proofchain/sdk';

// SDK instances - initialized on client side
let partnerSDK: ProofChainPartner | null = null;
let tenantSDK: ProofChain | null = null;

export interface SDKConfig {
  baseUrl: string;
  integratorKey?: string;
  campaignId?: string;
  tenantApiKey?: string;
}

export function initializePartnerSDK(config: SDKConfig): ProofChainPartner | null {
  if (!config.integratorKey || !config.campaignId) {
    console.warn('Partner SDK requires integratorKey and campaignId');
    return null;
  }
  
  partnerSDK = new ProofChainPartner({
    apiKey: config.integratorKey,
    campaignId: config.campaignId,
    baseUrl: config.baseUrl,
    debug: true,
  });
  
  return partnerSDK;
}

export function initializeTenantSDK(config: SDKConfig): ProofChain | null {
  if (!config.tenantApiKey) {
    console.warn('Tenant SDK requires tenantApiKey');
    return null;
  }
  
  tenantSDK = new ProofChain({
    apiKey: config.tenantApiKey,
    baseUrl: config.baseUrl,
  });
  
  return tenantSDK;
}

export function getPartnerSDK(): ProofChainPartner | null {
  return partnerSDK;
}

export function getTenantSDK(): ProofChain | null {
  return tenantSDK;
}

export function clearSDKs(): void {
  partnerSDK = null;
  tenantSDK = null;
}
