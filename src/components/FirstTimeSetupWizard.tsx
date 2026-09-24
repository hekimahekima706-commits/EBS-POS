import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessMode, ActiveModules } from '../types';
import { BUSINESS_TYPES_CATALOG, TANZANIA_REGIONS } from '../utils/formatters';
import { validatePasswordStrength, validateTanzanianPhone } from '../utils/security';
import {
  Sparkles,
  Building2,
  UserCheck,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Store,
  Phone,
  MapPin,
  FileText,
  Lock,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  Layers,
  ShoppingBag,
  Beer,
  UtensilsCrossed,
  Video
} from 'lucide-react';

interface FirstTimeSetupWizardProps {
  onComplete?: () => void;
}

export const FirstTimeSetupWizard: React.FC<FirstTimeSetupWizardProps> = ({ onComplete }) => {
  const { completeSetupWizard } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Business Types
  const [primaryType, setPrimaryType] = useState<BusinessMode>('bar');
  const [secondaryTypes, setSecondaryTypes] = useState<string[]>(['Grocery / Duka']);

  // Step 2: Business Info
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mkoa, setMkoa] = useState('Dar es Salaam');
  const [wilaya, setWilaya] = useState('');
  const [address, setAddress] = useState('');
  const [tin, setTin] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Step 3: Owner Account (Akaunti ya Boss wa Biashara)
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Errors & Loading
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSecondaryType = (name: string) => {
    setSecondaryTypes((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setLogoPreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep1 = () => {
    setErrorMsg('');
    setStep(2);
  };

  const handleNextStep2 = () => {
    setErrorMsg('');
    if (!businessName.trim()) {
      setErrorMsg('Tafadhali weka jina la biashara yako.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Tafadhali weka jina la mmiliki.');
      return;
    }
    const phoneVal = validateTanzanianPhone(phone);
    if (!phoneVal.isValid) {
      setErrorMsg(phoneVal.error || 'Namba ya simu ya biashara si sahihi.');
      return;
    }
    setStep(3);
  };

  const handleNextStep3 = () => {
    setErrorMsg('');
    if (!ownerUsername.trim()) {
      setErrorMsg('Weka jina la mtumiaji (Username) kwa mmiliki.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Neno la siri na uthibitisho havifanani.');
      return;
    }
    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      setErrorMsg(strength.errors.join(' '));
      return;
    }
    setStep(4);
  };

  const handleFinishSetup = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Calculate active modules based on selected business modes
      const isBar = primaryType === 'bar' || secondaryTypes.includes('Bar / Pub');
      const isRestaurant = primaryType === 'restaurant' || secondaryTypes.includes('Restaurant');

      const activatedModules: ActiveModules = {
        pos: true,
        inventory: true,
        barMode: isBar,
        restaurantMode: isRestaurant,
        customers: true,
        suppliers: true,
        expenses: true,
        reports: true,
        employees: true,
        cctv: true,
        calendar: true,
        aiAssistant: true,
      };

      const selectedCatalog = BUSINESS_TYPES_CATALOG.find((b) => b.id === primaryType);

      await completeSetupWizard(
        {
          name: businessName,
          ownerName,
          phone,
          email,
          mkoa,
          wilaya,
          address,
          tin,
          licenseNumber,
          tagline,
          logoUrl: logoPreview,
          mode: primaryType,
          primaryBusinessType: selectedCatalog?.name || 'General Business',
          secondaryBusinessTypes: secondaryTypes,
          currency: 'TZS',
          timezone: 'Africa/Dar_es_Salaam',
          enableBarFeatures: isBar,
          enableRestaurantFeatures: isRestaurant,
          enableCameraIntegration: true,
          activatedModules,
        },
        {
          name: ownerName,
          username: ownerUsername,
          phone: ownerPhone || phone,
          password,
        }
      );

      if (onComplete) onComplete();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Hitilafu imetokea wakati wa kuhifadhi mipangilio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = validatePasswordStrength(password);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-3xl bg-slate-950/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Wizard Header */}
        <div className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-teal-900/40 p-6 sm:p-8 border-b border-slate-800 relative">
          <div className="flex items-center space-x-3 mb-2">
            <img
              src="/ebs-logo-chaguo2-icon.png"
              onError={(e) => {
                e.currentTarget.src = '/ebs-app-icon-pure.png';
              }}
              alt="EBS Enterprise POS"
              className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-emerald-500/20 border border-emerald-500/30 shrink-0"
            />
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                Enterprise Business System • Tanzania V1.3.1
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Karibu kwenye EBS</h1>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            Tuanze kwa kuweka taarifa za biashara yako ili mfumo ujirekebishe kulingana na mahitaji yako.
          </p>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            {[
              { num: 1, label: 'Aina ya Biashara' },
              { num: 2, label: 'Taarifa za Biashara' },
              { num: 3, label: 'Akaunti ya Mmiliki' },
              { num: 4, label: 'Kukamilisha' },
            ].map((s) => (
              <div key={s.num} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s.num ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-800'
                  }`}
                />
                <div className="text-[11px] font-bold text-slate-400 hidden sm:block truncate">
                  {s.num}. {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="m-6 p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Business Type Selection */}
        {step === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                <span>Biashara yako ni ya aina gani?</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Chagua aina kuu (Primary) ya biashara yako. Hii itaamua vipengele vitakavyofunguliwa kwanza.
              </p>
            </div>

            {/* Primary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {BUSINESS_TYPES_CATALOG.map((item) => {
                const isSelected = primaryType === item.id;
                return (
                  <div
                    key={item.id}
                    id={`setup-mode-${item.id}`}
                    onClick={() => setPrimaryType(item.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 flex items-start space-x-3.5 ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md shadow-emerald-950'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-3xl p-1 bg-slate-950/60 rounded-xl">{item.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black">{item.name}</div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Secondary Types Selection */}
            <div className="pt-3 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 block mb-2">
                Aina za Nyongeza (Secondary Types - Hiari):
              </label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES_CATALOG.filter((b) => b.id !== primaryType).map((item) => {
                  const isChecked = secondaryTypes.includes(item.name);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSecondaryType(item.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                        isChecked
                          ? 'bg-teal-950 border-teal-500 text-teal-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{item.emoji}</span>
                      <span>{item.name}</span>
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                id="btn-wizard-step1-next"
                type="button"
                onClick={handleNextStep1}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <span>Endelea na Taarifa za Biashara</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Business Info */}
        {step === 2 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>Taarifa za Biashara</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Taarifa hizi zitaonekana juu ya risiti za mauzo (POS Receipts) na ankara.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Jina Rasmi la Biashara *</label>
                <input
                  type="text"
                  required
                  id="wizard-biz-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mfano: Samaki Samaki Bar & Grill"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Jina la Mmiliki *</label>
                <input
                  type="text"
                  required
                  id="wizard-owner-name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Mfano: Selemani Rashid"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Namba ya Simu ya Biashara *</label>
                <input
                  type="text"
                  required
                  id="wizard-biz-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0754 123 456"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Barua Pepe (Email - Hiari)</label>
                <input
                  type="email"
                  id="wizard-biz-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@biasharayangu.co.tz"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Mkoa</label>
                <select
                  id="wizard-biz-region"
                  value={mkoa}
                  onChange={(e) => setMkoa(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                >
                  {TANZANIA_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Wilaya / Eneo</label>
                <input
                  type="text"
                  id="wizard-biz-district"
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                  placeholder="Mfano: Ubungo / Kinondoni / Ilala"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-300 mb-1">Mtaa & Eneo Halisi la Biashara (Physical Address)</label>
                <input
                  type="text"
                  id="wizard-biz-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Mlimani City, Sam Nujoma Road, Dar es Salaam"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Namba ya TIN ya TRA (Hiari)</label>
                <input
                  type="text"
                  id="wizard-biz-tin"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  placeholder="134-589-201"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Leseni ya Biashara (Business License - Hiari)</label>
                <input
                  type="text"
                  id="wizard-biz-license"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="BL-DAR-2026-9811"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Currency & Timezone Note */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Sarafu: <strong className="text-emerald-400">TZS (Tanzanian Shillings)</strong></span>
              <span className="font-semibold">Muda: <strong className="text-slate-200">Africa/Dar_es_Salaam (EAT)</strong></span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Rudi Nyuma</span>
              </button>

              <button
                id="btn-wizard-step2-next"
                type="button"
                onClick={handleNextStep2}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <span>Endelea na Akaunti ya Mmiliki</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Create Owner Account */}
        {step === 3 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Unda Akaunti ya Mmiliki (Owner Account)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mmiliki ndiye msimamizi mkuu mwenye haki zote za kuona faida, ripoti, CCTV na kuongeza wafanyakazi wengine.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jina Kamili la Mmiliki</label>
                  <input
                    type="text"
                    disabled
                    value={ownerName}
                    className="w-full p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Jina la Kuingilia (Username) *</label>
                  <input
                    type="text"
                    required
                    id="wizard-owner-username"
                    value={ownerUsername}
                    onChange={(e) => setOwnerUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="elly au mkurugenzi"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none lowercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Namba ya Simu ya Mmiliki (Kwa Ajili ya Uokozi)</label>
                <input
                  type="text"
                  id="wizard-owner-phone"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="0754 111 222"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Neno la Siri (Password) *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      id="wizard-owner-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Angalau herufi 8 na namba"
                      className="w-full p-3 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Thibitisha Neno la Siri *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="wizard-owner-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Rudia neno la siri"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password Strength Indicator */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Ubora wa Neno la Siri:</span>
                  <span
                    className={`font-black ${
                      passwordStrength.score >= 3
                        ? 'text-emerald-400'
                        : passwordStrength.score >= 2
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {passwordStrength.feedback}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`rounded-full ${
                        passwordStrength.score >= bar
                          ? passwordStrength.score >= 3
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <ul className="text-[11px] text-slate-400 space-y-0.5 mt-1">
                  <li className={password.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ Angalau herufi 8
                  </li>
                  <li className={/\d/.test(password) ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ Ina namba (0-9)
                  </li>
                  <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ Herufi kubwa na ndogo
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Rudi Nyuma</span>
              </button>

              <button
                id="btn-wizard-step3-next"
                type="button"
                onClick={handleNextStep3}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <span>Angalia Muhtasari</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Launch */}
        {step === 4 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Muhtasari & Kuanza Kutumia EBS</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Hakiki taarifa zako kabla ya kuwasha mfumo rasmi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Business Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">
                  Biashara Yako
                </div>
                <div className="text-base font-black text-white">{businessName}</div>
                <div className="text-slate-400">Mmiliki: <strong className="text-slate-200">{ownerName}</strong></div>
                <div className="text-slate-400">Aina Kuu: <strong className="text-emerald-300">{primaryType.toUpperCase()}</strong></div>
                {secondaryTypes.length > 0 && (
                  <div className="text-slate-400">
                    Aina za Nyongeza: <span className="text-slate-300">{secondaryTypes.join(', ')}</span>
                  </div>
                )}
                <div className="text-slate-400">Simu: {phone}</div>
                <div className="text-slate-400">Eneo: {mkoa}, {wilaya}</div>
              </div>

              {/* Owner Account Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-[11px] uppercase font-bold tracking-wider text-amber-400">
                  Akaunti ya Kuingilia (Admin)
                </div>
                <div className="text-base font-black text-white">{ownerUsername}</div>
                <div className="text-slate-400">Jukumu: <strong className="text-amber-300">Owner (Mamlaka Yote)</strong></div>
                <div className="text-slate-400">Simu ya Usalama: {ownerPhone || phone}</div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Neno la siri limehifadhiwa kwa usalama (SHA-256 Encrypted).</span>
                </div>
              </div>
            </div>

            {/* Activated Modules Preview */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Vipengele Vitakavyofanya Kazi:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                  ✓ Mauzo (POS)
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                  ✓ Bidhaa & Stoo
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                  ✓ Wateja & Madeni
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                  ✓ Wasambazaji
                </div>
                {primaryType === 'bar' && (
                  <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center gap-1.5 text-emerald-300 font-bold">
                    🍺 Bar Mode (Shots)
                  </div>
                )}
                {primaryType === 'restaurant' && (
                  <div className="p-2 rounded-xl bg-teal-950 border border-teal-800 flex items-center gap-1.5 text-teal-300 font-bold">
                    🍽️ Restaurant Tables
                  </div>
                )}
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                  ✓ Camera CCTV
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                  ✓ Ripoti & Faida
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Rudi Nyuma</span>
              </button>

              <button
                id="btn-wizard-finish"
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishSetup}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Inahifadhi...' : 'Kamilisha & Fungua EBS'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
