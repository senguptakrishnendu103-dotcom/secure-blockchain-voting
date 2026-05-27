import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, getDocs, collection, query, where } from 'firebase/firestore';

export default function RegisterPage({ onRegister, onBack }) {
  const [formData, setFormData] = useState({
    name: '', voterId: '', aadhaar: '', email: '', password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const formatAadhaar = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    return digits;
  };

  const maskAadhaar = (aadhaar) => {
    if (aadhaar.length <= 4) return aadhaar;
    const last4 = aadhaar.slice(-4);
    const masked = aadhaar.slice(0, -4).replace(/./g, '*');
    const full = masked + last4;
    return full.replace(/(.{4})/g, '$1-').slice(0, -1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (formData.aadhaar.length !== 12) {
      return setError('Aadhaar number must be 12 digits.');
    }

    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("voterId", "==", formData.voterId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setLoading(false);
        return setError('Voter ID already registered.');
      }

      const email = `${formData.voterId.toLowerCase()}@securevote.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      const user = userCredential.user;

      const allUsers = await getDocs(collection(db, "users"));
      const nextIndex = allUsers.size + 1;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        voterId: formData.voterId,
        email: formData.email,
        aadhaar: maskAadhaar(formData.aadhaar),
        walletIndex: nextIndex,
        role: 'voter'
      });

      setSuccess(true);
      setTimeout(() => {
        onRegister();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel p-10 text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">Registration Successful!</h2>
          <p className="text-slate-400">Your Voter ID <span className="text-white font-mono">{formData.voterId}</span> has been stored in the Cloud Database.</p>
          <p className="text-slate-500 text-sm mt-2">Redirecting to login...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="glass-panel p-8">
          <h2 className="text-2xl font-bold mb-2 text-center">Voter Registration</h2>
          <p className="text-slate-400 text-sm text-center mb-6">Register your credentials for the General Election</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Full Name *</label>
              <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Enter your full name" className="glass-input w-full" required />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Personal Email Address (for 2FA OTP) *</label>
              <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Enter your real email" className="glass-input w-full" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Voter ID (EPIC Number) *</label>
                <input type="text" value={formData.voterId} onChange={(e) => handleChange('voterId', e.target.value.toUpperCase())} placeholder="e.g. ABC1234567" className="glass-input w-full" required />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Aadhaar Number *</label>
                <input type="text" value={formData.aadhaar} onChange={(e) => handleChange('aadhaar', formatAadhaar(e.target.value))} placeholder="12-digit number" className="glass-input w-full font-mono" maxLength={12} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Create Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="Min 6 characters" className="glass-input w-full pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Confirm Password *</label>
                <input type="password" value={formData.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} placeholder="Re-enter password" className="glass-input w-full" required />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
            
            <button type="submit" disabled={loading} className="w-full glass-button bg-blue-600/80 hover:bg-blue-500/80 border-blue-400/20 py-3.5 text-lg flex items-center justify-center gap-2 mt-2">
              {loading ? 'Processing...' : <UserPlus className="w-5 h-5" />}
              {loading ? '' : 'Register Voter'}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
