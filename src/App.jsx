import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Shield, UserPlus, LogIn, Award, CheckCircle, BarChart3, HelpCircle, Globe, ExternalLink } from 'lucide-react';
import VotingArtifact from './artifacts/contracts/Voting.sol/Voting.json';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminDashboard from './components/AdminDashboard';
import VoterDashboard from './components/VoterDashboard';
import AuditorDashboard from './components/AuditorDashboard';
import SupportChat from './components/SupportChat';
import LanguageGateway from './components/LanguageGateway';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { auth } from './firebase';
import './App.css';

// Dynamic configuration for deployment (falls back to localhost)
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const LOCAL_RPC = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
let apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (apiBase && !apiBase.endsWith('/api') && !apiBase.endsWith('/api/')) {
  apiBase = apiBase.replace(/\/$/, '') + '/api';
}
const API_URL = apiBase;

const VOTER_KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6dabb12',
  '0xf214f2b2cd398c806f84e317254e0f0b801aa5abc5ada788901e3e2c2f6c31a7',
  '0x0706074083d657943d6363db241031fabb6497127e2a9d80d467978d30e84b81',
  '0xf89930f6f59266c2fd202e8d3d92209d78906596827c2cf2779a5b3a39e0839e',
  '0xa267530f36f86237894a4ef6e88514e8a49c9f280a312d8a599661f2212f45ec',
  '0x47c99abed1264426543b5936ca47a06f39383b194f4544d651a56113b2591605',
  '0x30f1469e34a621769611d0442340333be281a6c4297893a2e7c413348123bc6c',
  '0x576d1e43b177263b6528d22dfb47071e617d98305018659600a9f5d37bc111b7',
  '0x37cf3b2a3f0190820bc0d0992383f9829f279f045c47f9f30e051c5b80a5661d',
  '0x8154674a9b5f5431665a31a98075344c803855a8286950298e8749830026e104',
  '0x069c97b8df479b4783f9f4a6217488825121b6559d873d63c467a3edba48ca32',
];

const ADMIN_KEY = VOTER_KEYS[0];

export { CONTRACT_ADDRESS, LOCAL_RPC, VOTER_KEYS, ADMIN_KEY, VotingArtifact, API_URL };

function App() {
  const { t } = useTranslation();
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(3 * 60);
  const [hasVotedGlobal, setHasVotedGlobal] = useState(false);

  // Session Timeout logic
  const timeoutRef = useRef(null);

  const startStrictTimer = () => {
    if (timeoutRef.current) clearInterval(timeoutRef.current);
    if (currentUser && currentUser.role === 'voter') {
      setSessionTimeLeft(3 * 60);
      timeoutRef.current = setInterval(() => {
        setSessionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timeoutRef.current);
            handleLogout();
            alert("Your voting time has expired. You have been logged out.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    // Only track time if a voter is logged in AND they haven't voted yet
    if (!currentUser || currentUser.role !== 'voter' || hasVotedGlobal) {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      return;
    }

    // Start the strict countdown timer
    startStrictTimer();

    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [currentUser, hasVotedGlobal]);

  const handleLogin = (user, role) => {
    setCurrentUser({ ...user, role });
    setHasVotedGlobal(false); // Reset global vote state on new login
    setCurrentPage(role === 'admin' ? 'admin' : 'voter');
  };

  const handleLogout = () => {
    auth.signOut().catch(console.error);
    setCurrentUser(null);
    setCurrentPage('landing');
  };

  if (!hasSelectedLanguage) {
    return <LanguageGateway onProceed={() => setHasSelectedLanguage(true)} />;
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-between">
      {/* Background visual flourishes */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-blue-500/10 via-transparent to-transparent pointer-events-none -z-10" />

      {currentUser && currentUser.role === 'voter' && !hasVotedGlobal && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900/90 backdrop-blur-md border border-amber-500/30 text-amber-400 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold transition-all">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          Session Expires: {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentPage === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col"
          >
            {/* Language Switcher Float */}
            <LanguageSwitcher />

            {/* Premium Header */}
            <div className="border-b border-white/5 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center border border-blue-500/30">
                    <Fingerprint className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                      ECI - SecureVote
                    </h2>
                    <p className="text-[10px] text-slate-400">Decentralized Ballot System</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span>Blockchain Network Live</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12 md:py-20 flex-grow flex flex-col items-center justify-center">
              <div className="max-w-4xl text-center">
                {/* Emblem / Badge */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="mb-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold tracking-wider text-blue-400 uppercase"
                >
                  <Shield className="w-3.5 h-3.5" />
                  India's Cryptographic General Elections
                </motion.div>

                {/* Main Heading */}
                <motion.h1
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight"
                >
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-white to-green-400">
                    {t('title')}
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed"
                >
                  {t('subtitle')}
                </motion.p>

                {/* CTA Grid */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-lg mx-auto mb-16"
                >
                  <button
                    onClick={() => setCurrentPage('login')}
                    className="w-full sm:flex-1 py-4 text-base font-bold flex items-center justify-center gap-2.5 rounded-xl border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/40 text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)]"
                  >
                    <LogIn className="w-5 h-5 text-blue-400" />
                    {t('login')}
                  </button>
                  <button
                    onClick={() => setCurrentPage('register')}
                    className="w-full sm:flex-1 py-4 text-base font-bold flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    <UserPlus className="w-5 h-5" />
                    {t('register')}
                  </button>
                </motion.div>

                {/* Bottom Card Gateways / Features */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mx-auto text-left"
                >
                  {/* Public Ledger Explorer */}
                  <div
                    onClick={() => setCurrentPage('auditor')}
                    className="glass-panel p-6 border-white/5 hover:border-blue-500/30 bg-white/5 hover:bg-white/10 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-white font-bold text-base mb-2 flex items-center gap-1.5">
                      {t('viewAuditor')}
                      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Verify node parameters, logs, candidate blocks, and transaction history in real-time.
                    </p>
                  </div>

                  {/* Cryptographic Trust */}
                  <div className="glass-panel p-6 border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-white font-bold text-base mb-2">
                      Zero-Knowledge Guard
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      End-to-end cryptographic proof verification that protects voter identity while validating vote hashes.
                    </p>
                  </div>

                  {/* Anti-Tamper System */}
                  <div className="glass-panel p-6 border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <Award className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-white font-bold text-base mb-2">
                      State-Level Auditing
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Powered by decentralization to ensure no single entity or authority can alter the ballot state.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 bg-slate-950/40 py-8 text-center mt-12">
              <div className="container mx-auto px-4 max-w-2xl">
                <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wider">
                  {t('footerText1')}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t('footerText2')}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'login' && (
          <LoginPage
            key="login"
            onLogin={handleLogin}
            onBack={() => setCurrentPage('landing')}
            onGoRegister={() => setCurrentPage('register')}
          />
        )}

        {currentPage === 'register' && (
          <RegisterPage
            key="register"
            onRegister={() => setCurrentPage('login')}
            onBack={() => setCurrentPage('landing')}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboard key="admin" onLogout={handleLogout} />
        )}

        {currentPage === 'voter' && (
          <VoterDashboard key="voter" user={currentUser} onLogout={handleLogout} onVoteComplete={() => setHasVotedGlobal(true)} />
        )}

        {currentPage === 'auditor' && (
          <AuditorDashboard key="auditor" onBack={() => setCurrentPage('landing')} />
        )}
      </AnimatePresence>
      <SupportChat />
    </div>
  );
}

export default App;
