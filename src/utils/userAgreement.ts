import { Platform } from "react-native";
import { AGREEMENT_VERSION } from "../components/UserAgreement";
import { storage, STORAGE_KEYS } from "./storage";

export interface AgreementSignature {
  version: string;
  timestamp: number;
  deviceInfo: string;
  hash: string;
}

// Simple hash function for signature generation
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function generateAgreementSignature(): AgreementSignature {
  const timestamp = Date.now();
  const deviceInfo = `${Platform.OS}-${Platform.Version}`;
  const signatureData = `${AGREEMENT_VERSION}-${timestamp}-${deviceInfo}`;
  const hash = simpleHash(signatureData);

  return {
    version: AGREEMENT_VERSION,
    timestamp,
    deviceInfo,
    hash,
  };
}

export async function saveAgreementSignature(): Promise<boolean> {
  const signature = generateAgreementSignature();
  return await storage.saveToStorage(STORAGE_KEYS.USER_AGREEMENT, signature);
}

export async function getAgreementSignature(): Promise<AgreementSignature | null> {
  return await storage.loadFromStorage(STORAGE_KEYS.USER_AGREEMENT, null);
}

export async function hasValidAgreement(): Promise<boolean> {
  const signature = await getAgreementSignature();
  if (!signature) return false;

  // Check if the agreement version matches current version
  return signature.version === AGREEMENT_VERSION;
}

export async function clearAgreement(): Promise<boolean> {
  return await storage.removeFromStorage(STORAGE_KEYS.USER_AGREEMENT);
}
