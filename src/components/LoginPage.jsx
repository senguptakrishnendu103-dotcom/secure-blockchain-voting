import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogIn, Shield, User, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../App';

export default function LoginPage({ onLogin, onBack, onGoRegister }) {
  const { t } = useTranslation();
  const [loginType, setLoginType] = useState('voter');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetVoterId, setResetVoterId] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (captchaInput !== captcha) {
      setError('Invalid CAPTCHA code.');
      generateCaptcha();
      setCaptchaInput('');
      return;
    }

    setLoading(true);

    try {
      if (loginType === 'admin' && userId === 'admin' && password === 'admin123') {
        onLogin({ name: 'Election Officer', voterId: 'admin', walletIndex: 0 }, 'admin');
        setLoading(false);
        return;
      }

      const email = loginType === 'admin' && userId === 'admin' 
        ? 'admin@securevote.com' 
        : `${userId.toLowerCase()}@securevote.com`;

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (loginType === 'admin' && userId !== 'admin') {
        setLoading(false);
        return setError('Invalid admin username.');
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: user.uid };
        if (loginType === 'admin' && userData.role !== 'admin') {
          return setError('Access denied. Not an admin.');
        }
        onLogin(userData, userData.role);
      } else {
        if (userId === 'admin') {
          onLogin({ name: 'Election Officer', voterId: 'admin', walletIndex: 0 }, 'admin');
        } else {
          setError('Voter profile not found in cloud database.');
        }
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-email') {
        setError('Invalid credentials. Check Voter ID and Password.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Login failed. Ensure Firebase Auth is enabled.');
      } else {
        setError('Authentication error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!resetVoterId.trim()) {
      setResetMessage('Please enter your Voter ID.');
      return;
    }
    setResetLoading(true);
    setResetMessage('');
    try {
      const q = query(collection(db, "users"), where("voterId", "==", resetVoterId.trim()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setResetMessage('Voter ID not found in database.');
        setResetLoading(false);
        return;
      }
      
      const userData = querySnapshot.docs[0].data();
      
      const res = await fetch(`${API_URL}/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name,
          epicId: userData.voterId,
          aadhaar: userData.aadhaar
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setResetMessage('Request sent successfully to the Election Officer!');
      } else {
        setResetMessage('Failed to send request.');
      }
    } catch (e) {
      console.error(e);
      setResetMessage('Error processing request.');
    }
    setResetLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('backToHome')}
        </button>

        <div className="glass-panel p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">{t('nationalVotingPortal')}</h2>

          <div className="flex bg-black/30 rounded-lg p-1 mb-6">
            <button onClick={() => { setLoginType('voter'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${loginType === 'voter' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <User className="w-4 h-4" /> {t('voter')}
            </button>
            <button onClick={() => { setLoginType('admin'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${loginType === 'admin' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <Shield className="w-4 h-4" /> {t('officer')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                {loginType === 'admin' ? t('officerId') : t('voterId')}
              </label>
              <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={loginType === 'admin' ? 'admin' : t('voterIdPlaceholder', 'e.g. ABC1234567')} className="glass-input w-full" required />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('password')}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('password')} className="glass-input w-full pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" onClick={() => setShowForgotModal(true)} className="text-xs text-blue-400 hover:underline">{t('forgotPassword')}</button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t('securityCaptcha')}</label>
              <div className="flex gap-4 items-center mb-2">
                <div className="bg-white p-4 rounded-lg font-mono text-2xl tracking-[0.3em] font-extrabold text-slate-800 flex-1 text-center select-none border border-slate-300" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)' }}>
                  {captcha}
                </div>
                <button type="button" onClick={generateCaptcha} className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700/50">
                  <RefreshCw className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <input type="text" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder={t('typeCode')} className="glass-input w-full" required />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>
            )}

            <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${loginType === 'admin' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'glass-button'}`}>
              {loading ? t('authenticating') : <LogIn className="w-5 h-5" />}
              {loading ? '' : (loginType === 'admin' ? t('loginAsOfficer') : t('loginAsVoter'))}
            </button>
          </form>

          {loginType === 'voter' && (
            <p className="text-sm text-slate-500 text-center mt-4">
              {t('notRegistered')} {' '}
              <button onClick={onGoRegister} className="text-blue-400 hover:underline">{t('registerVoterId')}</button>
            </p>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-slate-900 border border-slate-700/50 p-6 rounded-xl max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4 text-white">Password Recovery</h3>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 mb-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                  For security reasons in this Decentralized system, self-service password reset is disabled to prevent unauthorized access.
                </p>
                <p className="text-slate-300 text-sm mt-3 leading-relaxed">
                  Please contact the Election Officer at:
                  <br />
                  <span className="text-indigo-400 font-bold font-mono text-xs">velvethorizon619432@gmail.com</span>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Enter your Voter ID (EPIC)</label>
                  <input 
                    type="text" 
                    value={resetVoterId} 
                    onChange={(e) => setResetVoterId(e.target.value)} 
                    placeholder="e.g. ABC1234567" 
                    className="glass-input w-full text-sm" 
                  />
                </div>

                {resetMessage && (
                  <p className={`text-xs p-2 rounded ${resetMessage.includes('successfully') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {resetMessage}
                  </p>
                )}

                <button 
                  onClick={handleRequestReset} 
                  disabled={resetLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {resetLoading ? 'Sending...' : 'Send Automated Request'}
                </button>
              </div>

              <div className="flex justify-end mt-4 border-top border-slate-700/50 pt-3">
                <button onClick={() => { setShowForgotModal(false); setResetMessage(''); setResetVoterId(''); }} className="text-xs text-slate-400 hover:text-white">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
