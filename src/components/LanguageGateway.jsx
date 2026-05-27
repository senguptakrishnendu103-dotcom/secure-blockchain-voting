import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Shield, Fingerprint } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', native: 'اُردُو' },
];

export default function LanguageGateway({ onProceed }) {
  const { i18n } = useTranslation();

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    onProceed();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Saffron-White-Green Tricolor Bar */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Ashoka Chakra style emblem */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-2 border-white/20 shadow-lg shadow-blue-500/20">
              <Fingerprint className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">
                भारत निर्वाचन आयोग
              </h1>
              <p className="text-xs md:text-sm text-blue-300 tracking-wider">
                Election Commission of India — SecureVote Portal
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Blockchain Secured</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-3xl"
        >
          {/* Card */}
          <div className="glass-panel overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-b border-white/10 px-6 md:px-10 py-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/15 border border-blue-400/30 mb-4"
              >
                <Fingerprint className="w-9 h-9 text-blue-400" />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                Welcome to SecureVote
              </h2>
              <p className="text-slate-400 text-sm md:text-base">
                कृपया अपनी भाषा चुनें / Please select your language
              </p>
            </div>

            {/* Language Grid */}
            <div className="px-6 md:px-10 py-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {languages.map((lang, i) => (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    onClick={() => handleSelect(lang.code)}
                    className="group relative flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-blue-500/15 hover:border-blue-400/40 transition-all duration-200 cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                  >
                    <span className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                      {lang.native}
                    </span>
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors">
                      {lang.name}
                    </span>
                    {/* Hover indicator */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-2/3 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300" />
                  </motion.button>
                ))}
              </div>

              {/* Notice */}
              <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl text-center">
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  ⚠️ This portal is a demonstration of a Blockchain-based Decentralized Voting System. 
                  It uses a local Ethereum blockchain for secure, tamper-proof vote recording.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Credits */}
          <div className="text-center mt-6 space-y-1">
            <p className="text-[11px] text-slate-600">
              Powered by Ethereum Blockchain • Google Firebase Cloud • Zero Knowledge Proofs
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Tricolor */}
      <div className="flex h-1 w-full mt-auto">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
      </div>
    </div>
  );
}
