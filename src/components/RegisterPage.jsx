import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Biometric / Face Scan States
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLog, setScanLog] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const logEndRef = useRef(null);

  // Scroll logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLog]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCancelFace = () => {
    stopCamera();
    setShowFaceModal(false);
    setLoading(false);
    setError('Biometric scan cancelled. Registration incomplete.');
  };

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

      // Check if face-api library loaded
      if (!window.faceapi) {
        setLoading(false);
        return setError('Biometric engine is loading. Please wait a moment or check your internet connection.');
      }

      // Open face scanner modal
      setShowFaceModal(true);
      setScanProgress(0);
      setScanLog(["[SYSTEM] Initializing camera device...", "[SYSTEM] Requesting video access..."]);

      setTimeout(() => {
        startBiometricRegistration();
      }, 300);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed.');
      setLoading(false);
    }
  };

  const startBiometricRegistration = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanLog(prev => [...prev, "[SYSTEM] Camera active. Face alignment initialized."]);
      setScanProgress(20);

      // Load models from CDN
      setScanLog(prev => [...prev, "[SYSTEM] Fetching mobile-optimized neural network models..."]);
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

      // Load Tiny Face Detector instead of SSD MobileNet for 10x faster performance on mobile
      await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setScanProgress(45);
      setScanLog(prev => [...prev, "[SYSTEM] Tiny Face Detector model loaded successfully."]);

      await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setScanProgress(70);
      setScanLog(prev => [...prev, "[SYSTEM] Face Landmark 68 model loaded successfully."]);

      await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setScanProgress(90);
      setScanLog(prev => [...prev, "[SYSTEM] Face Recognition model loaded successfully."]);

      setScanLog(prev => [...prev, "[BIOMETRIC] Aligning face and extracting landmark descriptors..."]);
      setScanLog(prev => [...prev, "💡 Tip: Keep steady, align your face in the center under good lighting."]);

      let faceDetected = false;
      let attempts = 0;
      const maxAttempts = 80; // Allow ~20 seconds of scanning on mobile

      const detectInterval = setInterval(async () => {
        if (!streamRef.current || faceDetected) {
          clearInterval(detectInterval);
          return;
        }

        // Ensure video is playing and has loaded frames before running detection
        if (!videoRef.current || videoRef.current.readyState < 2) {
          return;
        }

        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(detectInterval);
          stopCamera();
          setShowFaceModal(false);
          setLoading(false);
          setError("Biometric Registration Timeout: No face detected. Please ensure your camera is clear, you are well-lit, and facing the camera directly.");
          return;
        }

        try {
          // Use TinyFaceDetector with inputSize 224 for real-time mobile performance
          const detection = await window.faceapi.detectSingleFace(
            videoRef.current,
            new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

          if (detection) {
            faceDetected = true;
            clearInterval(detectInterval);
            setScanProgress(100);
            setScanLog(prev => [
              ...prev,
              "[SUCCESS] Biometric signature successfully generated!",
              "[SYSTEM] Finalizing registration details in Cloud Database..."
            ]);

            // Save the descriptor and complete registration
            const descriptorArray = Array.from(detection.descriptor);
            setTimeout(() => {
              stopCamera();
              setShowFaceModal(false);
              completeRegistration(descriptorArray);
            }, 1200);
          } else {
            if (attempts % 4 === 0) {
              setScanLog(prev => [...prev, "[BIOMETRIC] Searching for face... Keep face centered and steady."]);
            }
          }
        } catch (err) {
          console.error("Face detection loop error:", err);
        }
      }, 250);

    } catch (err) {
      console.error("Biometric registration failed:", err);
      setScanLog(prev => [...prev, `[ERROR] Biometric setup failed: ${err.message}`]);
      stopCamera();
      setTimeout(() => {
        setShowFaceModal(false);
        setLoading(false);
        setError(`Biometric verification failed: ${err.message || 'Webcam access is required.'}`);
      }, 2000);
    }
  };

  const completeRegistration = async (faceDescriptor) => {
    try {
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
        role: 'voter',
        faceDescriptor: faceDescriptor // Save the 128-float array
      });

      setSuccess(true);
      setTimeout(() => {
        onRegister();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed.');
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
      {/* Biometric Face Registration Modal */}
      <AnimatePresence>
        {showFaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-950 border border-blue-500/30 p-6 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(59,130,246,0.3)] relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" />
              
              <h3 className="text-xl font-bold mb-1 mt-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">🧬 Biometric Registration</h3>
              <p className="text-slate-400 text-xs mb-6 text-center">Webcam scanning required to record your biometric face template.</p>
              
              {/* Circular Camera Frame */}
              <div className="w-52 h-52 rounded-full overflow-hidden relative border-4 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-slate-900 flex items-center justify-center mb-6">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                
                {/* Neon Scanning Laser Line */}
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-scan left-0" />
                
                {/* HUD Framing Circle */}
                <div className="absolute inset-2 border border-dashed border-blue-500/20 rounded-full animate-spin [animation-duration:20s]" />
              </div>

              {/* Progress and status */}
              <div className="w-full mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                  <span>BIOMETRIC SCAN PROGRESS:</span>
                  <span className="text-blue-400 font-bold">{scanProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                  <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>

              {/* Monospace Scanning Logs Terminal */}
              <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 h-28 overflow-y-auto font-mono text-[10px] text-emerald-400 mb-6 flex flex-col gap-1 select-none text-left">
                {scanLog.map((log, idx) => (
                  <div key={idx} className="leading-tight">
                    {log}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>

              {/* Action Button */}
              <button type="button" onClick={handleCancelFace} className="w-full glass-button py-2.5 bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-900/20 hover:text-red-300">
                Cancel Registration
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

