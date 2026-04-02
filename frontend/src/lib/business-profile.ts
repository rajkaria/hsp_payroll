export interface BusinessProfile {
  companyName: string;
  registrationNumber: string;
  address: string;
  country: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

const PROFILE_KEY = "hashpay_business_profile";

export function getBusinessProfile(): BusinessProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveBusinessProfile(profile: Omit<BusinessProfile, "createdAt" | "updatedAt">): BusinessProfile {
  const existing = getBusinessProfile();
  const full: BusinessProfile = {
    ...profile,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(full));
  return full;
}

export function clearBusinessProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}
