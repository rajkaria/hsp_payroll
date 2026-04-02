"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Building2 } from "lucide-react";
import { getBusinessProfile, saveBusinessProfile, type BusinessProfile } from "@/lib/business-profile";
import { toast } from "sonner";

export function BusinessProfileForm() {
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    const profile = getBusinessProfile();
    if (profile) {
      setCompanyName(profile.companyName);
      setRegistrationNumber(profile.registrationNumber);
      setAddress(profile.address);
      setCountry(profile.country);
      setContactEmail(profile.contactEmail);
      setExisting(profile);
    }
  }, []);

  const handleSave = () => {
    if (!companyName || !registrationNumber || !contactEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    const profile = saveBusinessProfile({ companyName, registrationNumber, address, country, contactEmail });
    setExisting(profile);
    setSaved(true);
    toast.success("Business profile saved");
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass =
    "w-full px-4 py-3 bg-[#0F1629] border border-[#1A2340] rounded-xl text-white placeholder-[#525E75] focus:border-[#1E5EFF] focus:ring-1 focus:ring-[#1E5EFF]/20 focus:outline-none transition-colors text-sm";

  return (
    <div className="space-y-8">
      {existing && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{existing.companyName}</div>
              <div className="text-xs text-[#8B95A9] mt-0.5">{existing.registrationNumber}</div>
              <div className="text-xs text-[#525E75] mt-1">{existing.address}{existing.country ? `, ${existing.country}` : ""}</div>
              <div className="text-xs text-[#525E75]">{existing.contactEmail}</div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-[#8B95A9] mb-2">Company Name *</label>
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., HashPay Labs Ltd" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm text-[#8B95A9] mb-2">Registration Number *</label>
          <input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="e.g., HK-2876543" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm text-[#8B95A9] mb-2">Company Address</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full company address" rows={2} className={`${inputClass} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#8B95A9] mb-2">Country</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., Hong Kong" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-[#8B95A9] mb-2">Contact Email *</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="payroll@company.com" className={inputClass} />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full px-4 py-3 bg-gradient-to-r from-[#1E5EFF] to-[#4B7FFF] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(30,94,255,0.25)] transition-all duration-300 flex items-center justify-center gap-2"
      >
        {saved ? (
          <><Check className="w-4 h-4" /> Saved</>
        ) : (
          <>{existing ? "Update" : "Save"} Profile</>
        )}
      </button>
    </div>
  );
}
