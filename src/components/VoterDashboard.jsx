import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Fingerprint, CheckCircle2, AlertCircle, Vote, Wallet, Camera, Loader2 } from 'lucide-react';
import { CONTRACT_ADDRESS, VotingArtifact, API_URL, LOCAL_RPC } from '../App';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ResultsDoughnut } from './ResultsChart';
import TransactionModal from './TransactionModal';

export default function VoterDashboard({ user, onLogout, onVoteComplete }) {
  const [candidates, setCandidates] = useState([]);
  const [electionStarted, setElectionStarted] = useState(false);
  const [electionEnded, setElectionEnded] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState(null);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [txData, setTxData] = useState(null);

  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Biometric/Face Scan States
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLog, setScanLog] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const logEndRef = useRef(null);

  // Scroll biometric log to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLog]);

  // Derive secure voter address deterministically from their unique Voter ID
  const getDeterministicVoterAddress = (voterId) => {
    if (!voterId) return '';
    const entropy = ethers.keccak256(ethers.toUtf8Bytes(voterId.toLowerCase() + "secure_voting_salt_2026"));
    const wallet = new ethers.Wallet(entropy);
    return wallet.address;
  };

  const getReadContract = () => {
    // Read contract state from standard Sepolia public node (or fallback to local RPC)
    const provider = new ethers.JsonRpcProvider(LOCAL_RPC || 'https://ethereum-sepolia-rpc.publicnode.com');
    return new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, provider);
  };

  const checkFirebaseVoteStatus = async () => {
    if (!user || !user.uid) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const firebaseHasVoted = userDoc.exists() && userDoc.data().hasVoted;

      const voterAddress = getDeterministicVoterAddress(user.voterId);
      const contract = getReadContract();
      const votedOnChain = await contract.voters(voterAddress);

      if (firebaseHasVoted || votedOnChain) {
        if (!votedOnChain && firebaseHasVoted) {
          // Self-healing: Blockchain says voter has not voted, but Firebase says they have.
          // This happens when the election is reset or redeployed. Sync Firebase back to false.
          await updateDoc(doc(db, "users", user.uid), { hasVoted: false });
          setHasVoted(false);
          setVotedFor(null);
        } else {
          setHasVoted(true);
          if (onVoteComplete) onVoteComplete();
          setVotedFor(votedOnChain ? "a candidate (verified via blockchain)" : "a candidate (verified via database)");
        }
      } else {
        setHasVoted(false);
        setVotedFor(null);
      }
    } catch (e) {
      console.error("Failed to check Firebase vote status:", e);
    }
  };

  useEffect(() => {
    fetchData();
    
    if (user && user.voterId) {
      const addr = getDeterministicVoterAddress(user.voterId);
      setWalletAddress(addr);
      checkFirebaseVoteStatus();
    }

    const contract = getReadContract();
    contract.on("VotedEvent", () => fetchData());
    contract.on("ElectionStartedEvent", () => fetchData());
    contract.on("ElectionEndedEvent", () => fetchData());
    contract.on("ElectionResetEvent", async () => {
      setHasVoted(false);
      setVotedFor(null);
      // Clear the stale Firebase hasVoted flag on election reset
      if (user && user.uid) {
        try {
          await updateDoc(doc(db, "users", user.uid), { hasVoted: false });
        } catch (e) { console.error("Failed to clear Firebase hasVoted on reset:", e); }
      }
      fetchData();
    });

    return () => { 
      contract.removeAllListeners(); 
    };
  }, [user]);

  const connectWallet = async () => {
    if (user && user.voterId) {
      const addr = getDeterministicVoterAddress(user.voterId);
      setWalletAddress(addr);
    }
  };



  const fetchData = async () => {
    try {
      const contract = getReadContract();
      const arr = await contract.getCandidates();
      setCandidates(arr.map(c => ({ id: c.id.toString(), name: c.name, voteCount: Number(c.voteCount) })));
      setElectionStarted(await contract.electionStarted());
      setElectionEnded(await contract.electionEnded());
      setError(''); // Clear any previous loading errors
    } catch (e) {
      console.error("VoterDashboard Fetch Error:", e);
      setError(`Blockchain Connection Error: Failed to fetch candidates from ${CONTRACT_ADDRESS}. Please ensure your local Hardhat node is running, or verify your RPC URL and contract address in the .env file.`);
    }
  };

  const startCamera = async () => {
    try {
      setScanProgress(0);
      setScanLog(["[SYSTEM] Initializing camera device...", "[SYSTEM] Requesting video access..."]);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanLog(prev => [...prev, "[SYSTEM] Camera active. Face alignment initialized."]);
      
      setTimeout(() => {
        startRealBiometricVerification();
      }, 300);
    } catch (err) {
      console.error("Camera access failed:", err);
      setScanLog(prev => [...prev, "[ERROR] Camera access denied or not found."]);
      setError("Webcam / Camera access is required for biometric verification.");
      setShowFaceModal(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRealBiometricVerification = async () => {
    try {
      setScanProgress(20);

      // Check if face-api library is available
      if (!window.faceapi) {
        throw new Error("Biometric engine is still loading. Please check your network connection.");
      }

      // Load models from CDN
      setScanLog(prev => [...prev, "[SYSTEM] Loading mobile-optimized neural network models..."]);
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

      // Load Tiny Face Detector instead of SSD MobileNet for 10x faster performance on mobile
      await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setScanProgress(45);
      setScanLog(prev => [...prev, "[SYSTEM] Tiny Face Detector model loaded successfully."]);

      await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setScanProgress(70);
      setScanLog(prev => [...prev, "[SYSTEM] Face Landmark 68 model loaded successfully."]);

      await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setScanProgress(85);
      setScanLog(prev => [...prev, "[SYSTEM] Face Recognition model loaded successfully."]);

      setScanLog(prev => [...prev, "[BIOMETRIC] Fetching registered profile descriptor..."]);
      
      const registeredDescriptor = user?.faceDescriptor;
      if (!registeredDescriptor || !Array.isArray(registeredDescriptor) || registeredDescriptor.length !== 128) {
        setScanLog(prev => [
          ...prev, 
          "[ERROR] No registered biometric profile found for this Voter ID.",
          "[SYSTEM] Verification aborted. Face scan is REQUIRED during registration."
        ]);
        stopCamera();
        setError("Biometric Verification Failed: No registered face profile found. Votes cannot be casted.");
        setTimeout(() => {
          setShowFaceModal(false);
        }, 3000);
        return;
      }

      setScanLog(prev => [...prev, "[BIOMETRIC] Registered profile loaded successfully."]);
      setScanLog(prev => [...prev, "[BIOMETRIC] Aligning face and comparing live print..."]);
      setScanLog(prev => [...prev, "💡 Tip: Keep steady, align your face in the center under good lighting."]);

      let faceVerified = false;
      let attempts = 0;
      const maxAttempts = 80; // Allow ~20 seconds of scanning on mobile

      const detectInterval = setInterval(async () => {
        if (!streamRef.current || faceVerified) {
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
          setError("Biometric Verification Timeout: Face match could not be confirmed. Please position yourself in a well-lit area and try again.");
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
            const liveDescriptor = detection.descriptor;
            // Compare descriptors
            const distance = window.faceapi.euclideanDistance(liveDescriptor, registeredDescriptor);
            
            // Euclidean distance threshold: standard is 0.6. Let's allow slightly higher tolerance (e.g. 0.62) to accommodate removing glasses etc.
            const threshold = 0.62;
            const confidence = Math.max(0, (1 - (distance / threshold)) * 100);

            if (distance < threshold) {
              faceVerified = true;
              clearInterval(detectInterval);
              setScanProgress(100);
              setScanLog(prev => [
                ...prev,
                `[BIOMETRIC] Euclidean Distance: ${distance.toFixed(4)}`,
                `[SUCCESS] Biometric match confirmed! (Confidence: ${confidence.toFixed(1)}%)`,
                "[SYSTEM] Initiating 2FA authentication..."
              ]);

              setTimeout(async () => {
                try {
                  stopCamera();
                  setShowFaceModal(false);
                  await sendOtpAndOpenModal();
                } catch (err) {
                  console.error('Post-scan error:', err);
                  setError('An error occurred after biometric scan. Please try again.');
                }
              }, 1500);
            } else {
              if (attempts % 4 === 0) {
                setScanLog(prev => [
                  ...prev,
                  `[BIOMETRIC] Live face analyzed. Variance: ${distance.toFixed(3)} (Threshold: ${threshold})`,
                  `[BIOMETRIC] Searching for match... Adjust position/lighting.`
                ]);
              }
            }
          } else {
            if (attempts % 4 === 0) {
              setScanLog(prev => [...prev, "[BIOMETRIC] Aligning face... Face frame not detected."]);
            }
          }
        } catch (err) {
          console.error("Face detection loop error:", err);
        }
      }, 250);

    } catch (err) {
      console.error("Camera access or loading failed:", err);
      setScanLog(prev => [...prev, `[ERROR] Camera error: ${err.message}`]);
      stopCamera();
      setTimeout(() => {
        setShowFaceModal(false);
        setError("Webcam / Camera access is required for biometric verification.");
      }, 2000);
    }
  };

  const sendOtpAndOpenModal = async () => {
    setSendingOtp(true);
    const voterEmail = user?.email;
    if (!voterEmail) {
      setError('No email found for this account. Cannot send OTP.');
      setSendingOtp(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: voterEmail })
      });
      const data = await res.json();
      if (data.success) {
        setShowOtpModal(true);
      } else {
        setError(data.error || 'Failed to send OTP.');
      }
    } catch (err) {
      console.error('OTP send error:', err);
      setError('Server error while sending OTP.');
    }
    setSendingOtp(false);
  };

  const handleVoteClick = async (candidateId, candidateName) => {
    if (!walletAddress) await connectWallet();
    
    // Hard Firebase identity check — blocks voting even if React state is stale
    if (user && user.uid) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().hasVoted) {
          const voterAddress = getDeterministicVoterAddress(user.voterId);
          const contract = getReadContract();
          const votedOnChain = await contract.voters(voterAddress);
          if (votedOnChain) {
            setHasVoted(true);
            setVotedFor("a candidate (verified via blockchain)");
            return setError("Your identity has already cast a vote. Switching wallets is not allowed.");
          } else {
            // Self-healing: Blockchain says voter has not voted, but Firebase says they have.
            await updateDoc(doc(db, "users", user.uid), { hasVoted: false });
          }
        }
      } catch (e) { console.error("Firebase check failed:", e); }
    }
    
    if (hasVoted) return setError("You have already cast a vote.");
    if (!electionStarted) return setError("Election polling hasn't started yet.");
    if (electionEnded) return setError("Election polling has concluded.");
    
    if (!user.email) {
      return setError("No email registered for this account. Cannot perform 2FA.");
    }

    setSelectedCandidate({ id: candidateId, name: candidateName });
    setShowFaceModal(true);
    setError('');
    
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const handleCancelFace = () => {
    stopCamera();
    setShowFaceModal(false);
  };

  const verifyOtpAndVote = async () => {
    setVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          otp: otpInput,
          candidateId: selectedCandidate.id,
          voterId: user.voterId
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowOtpModal(false);
        setOtpInput('');
        
        // Show success modal using the transaction hash returned from the backend
        setTxPending(true);
        setTxData({ status: 'pending', hash: data.txHash });
        setModalOpen(true);
        
        setTimeout(async () => {
          setTxData({ 
            status: 'success', 
            hash: data.txHash, 
            blockNumber: data.blockNumber || 'Pending', 
            gasUsed: data.gasUsed || '0' 
          });
          setHasVoted(true);
          if (onVoteComplete) onVoteComplete();
          setVotedFor(selectedCandidate.name);
          
          // Lock the user's Firebase Identity so they cannot vote again
          try {
            await updateDoc(doc(db, "users", user.uid), { hasVoted: true });
          } catch (e) {
            console.error("Failed to lock Firebase identity:", e);
          }

          // Trigger the Confirmation Email Receipt
          try {
            await fetch(`${API_URL}/send-confirmation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                epicId: user.voterId,
                aadhaar: user.aadhaar,
                txHash: data.txHash
              })
            });
          } catch (e) {
            console.error("Failed to send confirmation email:", e);
          }

          setTxPending(false);
          fetchData();
        }, 1000);
      } else {
        setOtpError(data.error || 'Invalid OTP.');
      }
    } catch (err) {
      setOtpError('Server error while verifying OTP.');
    }
    setVerifyingOtp(false);
  };

  const totalVotes = candidates.reduce((a, c) => a + c.voteCount, 0);
  const winner = electionEnded && candidates.length > 0
    ? candidates.reduce((max, c) => c.voteCount > max.voteCount ? c : max, candidates[0])
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <TransactionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} txData={txData} />

      {/* Biometric Face Verification Modal */}
      <AnimatePresence>
        {showFaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-950 border border-blue-500/30 p-6 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(59,130,246,0.3)] relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500" />
              
              <h3 className="text-xl font-bold mb-1 mt-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">🧬 Biometric Verification</h3>
              <p className="text-slate-400 text-xs mb-6 text-center">Webcam scanning required for secure biometric verification.</p>
              
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
                  <span>FACIAL DISCRIMINATION:</span>
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
              <button onClick={handleCancelFace} className="w-full glass-button py-2.5 bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-900/20 hover:text-red-300">
                Cancel Verification
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-blue-500/30 p-6 rounded-xl max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-2">2FA Verification</h3>
              <p className="text-slate-400 text-sm mb-4">A 6-digit secret code has been sent to <strong>{user?.email || 'your email'}</strong>. Enter it below to cast your vote for {selectedCandidate?.name || 'your candidate'}.</p>
              
              <input type="text" maxLength={6} value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="000000" className="glass-input w-full text-center text-2xl tracking-[0.5em] font-mono mb-4" />
              
              {otpError && <p className="text-red-400 text-sm mb-4">{otpError}</p>}
              
              <div className="flex gap-3">
                <button onClick={() => setShowOtpModal(false)} className="flex-1 glass-button py-2">Cancel</button>
                <button onClick={verifyOtpAndVote} disabled={verifyingOtp || otpInput.length !== 6} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
                  {verifyingOtp ? 'Verifying...' : 'Verify & Vote'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-blue-900/30 border-b border-blue-500/20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-blue-400" />
          <span className="text-blue-400 font-bold text-sm tracking-widest">VOTER PORTAL</span>
        </div>
        <div className="flex items-center gap-4">
          {walletAddress ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          ) : (
            <button onClick={connectWallet} className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full transition-colors flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Connect Wallet
            </button>
          )}
          <button onClick={onLogout} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-3">SecureVote Portal</h1>
          <div className="flex items-center justify-center gap-2 text-sm uppercase tracking-widest font-bold">
            {electionStarted && !electionEnded ? (
              <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Polling Live
              </span>
            ) : electionEnded ? (
              <span className="text-red-400 bg-red-400/10 px-3 py-1 rounded">Polling Concluded</span>
            ) : (
              <span className="text-amber-400 bg-amber-400/10 px-3 py-1 rounded">Awaiting Start</span>
            )}
          </div>
        </div>

        <div className="glass-panel p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg uppercase">
              {(user?.name || 'V')[0]}
            </div>
            <div>
              <p className="font-medium">{user?.name || 'Voter'}</p>
              <p className="text-xs text-slate-400">Voter ID: {user?.voterId || 'N/A'} • Aadhaar: {user?.aadhaar || 'N/A'}</p>
            </div>
          </div>
          <div>
            {hasVoted ? (
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" /> VOTE RECORDED ON BLOCKCHAIN
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded text-sm">
                <AlertCircle className="w-4 h-4" /> Awaiting Ballot
              </div>
            )}
          </div>
        </div>

        {error && <div className="glass-panel border-red-500/30 bg-red-500/10 p-3 mb-4 text-red-200 text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="glass-panel p-6">
              <h3 className="font-bold mb-4">Live Statistics</h3>
              <ResultsDoughnut candidates={candidates} />
              <div className="mt-4 p-3 bg-blue-500/5 rounded border border-blue-500/10">
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center">Real-time Blockchain Feed</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Vote className="w-6 h-6 text-blue-400" /> Digital Ballot</h2>
            <div className="space-y-4">
              {candidates.map((c, i) => {
                const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
                
                return (
                  <motion.div key={c.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)" }} whileTap={{ scale: 0.98 }}
                    className="glass-panel p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/10 transition-all group relative overflow-hidden">
                    
                    <div className="absolute left-0 top-0 bottom-0 bg-blue-500/5 transition-all duration-1000 -z-10" style={{ width: `${pct}%` }} />

                    <div className="flex items-center gap-4">
                      <div className="bg-slate-800 w-10 h-10 flex items-center justify-center rounded-full font-bold border border-slate-700">#{c.id}</div>
                      <div>
                        <h3 className="text-xl font-bold">{c.name}</h3>
                        <p className="text-slate-400 text-sm">Certified Candidate</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{c.voteCount}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Votes</div>
                      </div>
                      {!hasVoted ? (
                        <button
                          onClick={() => handleVoteClick(c.id, c.name)}
                          disabled={txPending || !electionStarted || electionEnded || sendingOtp}
                          className="glass-button min-w-[140px] flex justify-center disabled:opacity-30 py-3 bg-blue-600/20 hover:bg-blue-600/40"
                        >
                          {sendingOtp && selectedCandidate?.id === c.id ? 'Sending OTP...' : txPending ? 'Sign in Wallet...' : 'Cast Vote'}
                        </button>
                      ) : (
                        <div className="text-emerald-400/50 text-sm font-bold flex items-center justify-center min-w-[140px] py-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                           🔒 Locked
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
