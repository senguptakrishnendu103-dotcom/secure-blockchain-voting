import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Fingerprint, CheckCircle2, AlertCircle, Vote, Wallet } from 'lucide-react';
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

  // Use Browser Provider (MetaMask/Phantom)
  const getBrowserProvider = () => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  };

  const getReadContract = () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      return new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, provider);
    }
    const provider = new ethers.JsonRpcProvider(LOCAL_RPC);
    return new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, provider);
  };

  const checkFirebaseVoteStatus = async () => {
    if (!user || !user.uid) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const firebaseHasVoted = userDoc.exists() && userDoc.data().hasVoted;

      // Only clear Firebase flag if the election has been genuinely reset (pre-election state)
      if (firebaseHasVoted) {
        const contract = getReadContract();
        const started = await contract.electionStarted();
        const ended = await contract.electionEnded();
        // Pre-election state (after reset) = not started AND not ended
        if (!started && !ended) {
          try {
            await updateDoc(doc(db, "users", user.uid), { hasVoted: false });
          } catch (e) { console.error("Failed to clear Firebase hasVoted:", e); }
          setHasVoted(false);
          setVotedFor(null);
          return;
        }
        // Election is active or ended — Firebase lock stands
        setHasVoted(true);
        if (onVoteComplete) onVoteComplete();
        setVotedFor("a candidate (verified via database)");
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
    checkFirebaseVoteStatus();
    connectWallet(); // Try to connect wallet on load
    
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

    // Handle MetaMask account switches dynamically
    let handleAccountsChanged;
    if (window.ethereum) {
      handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          const newAddress = accounts[0];
          setWalletAddress(newAddress);
          
          try {
            // Firebase is the identity-level lock — check it first
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const firebaseHasVoted = userDoc.exists() && userDoc.data().hasVoted;
            
            if (firebaseHasVoted) {
              // Only clear if election was genuinely reset
              const started = await contract.electionStarted();
              const ended = await contract.electionEnded();
              if (!started && !ended) {
                try {
                  await updateDoc(doc(db, "users", user.uid), { hasVoted: false });
                } catch (e) { console.error("Failed to clear Firebase hasVoted:", e); }
                setHasVoted(false);
                setVotedFor(null);
              } else {
                // Identity already voted — block regardless of wallet
                setHasVoted(true);
                if (onVoteComplete) onVoteComplete();
                setVotedFor("a candidate (verified via database)");
              }
            } else {
              // Check on-chain for this specific wallet
              const votedOnChain = await contract.voters(newAddress);
              setHasVoted(votedOnChain);
              if (votedOnChain && onVoteComplete) onVoteComplete();
              setVotedFor(votedOnChain ? "a candidate (verified via blockchain)" : null);
            }
          } catch (e) {
            console.error("Error updating details on account change:", e);
          }
        } else {
          setWalletAddress('');
          setHasVoted(false);
          setVotedFor(null);
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => { 
      contract.removeAllListeners(); 
      if (window.ethereum && handleAccountsChanged) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [user]);

  const connectWallet = async () => {
    if (!window.ethereum) return setError("Please install a blockchain wallet like MetaMask.");
    try {
      const provider = getBrowserProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const activeAddress = accounts[0];
      setWalletAddress(activeAddress);
      
      const contract = getReadContract();
      
      // Firebase is the identity-level lock — one person, one vote
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const firebaseHasVoted = userDoc.exists() && userDoc.data().hasVoted;
      
      if (firebaseHasVoted) {
        // Only clear if election was genuinely reset (pre-election state)
        const started = await contract.electionStarted();
        const ended = await contract.electionEnded();
        if (!started && !ended) {
          try {
            await updateDoc(doc(db, "users", user.uid), { hasVoted: false });
          } catch (e) { console.error("Failed to clear stale Firebase hasVoted:", e); }
          setHasVoted(false);
          setVotedFor(null);
        } else {
          // Identity already voted — block regardless of which wallet is connected
          setHasVoted(true);
          if (onVoteComplete) onVoteComplete();
          setVotedFor("a candidate (verified via database)");
        }
      } else {
        // Check on-chain for this specific wallet address
        const votedOnChain = await contract.voters(activeAddress);
        setHasVoted(votedOnChain);
        if (votedOnChain && onVoteComplete) onVoteComplete();
        setVotedFor(votedOnChain ? "a candidate (verified via blockchain)" : null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect wallet.");
    }
  };

  const fetchData = async () => {
    try {
      const contract = getReadContract();
      const arr = await contract.getCandidates();
      setCandidates(arr.map(c => ({ id: c.id.toString(), name: c.name, voteCount: Number(c.voteCount) })));
      setElectionStarted(await contract.electionStarted());
      setElectionEnded(await contract.electionEnded());
    } catch (e) { console.error(e); }
  };

  const handleVoteClick = async (candidateId, candidateName) => {
    if (!walletAddress) await connectWallet();
    
    // Hard Firebase identity check — blocks voting even if React state is stale
    if (user && user.uid) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().hasVoted) {
          setHasVoted(true);
          setVotedFor("a candidate (verified via database)");
          return setError("Your identity has already cast a vote. Switching wallets is not allowed.");
        }
      } catch (e) { console.error("Firebase check failed:", e); }
    }
    
    if (hasVoted) return setError("You have already cast a vote.");
    if (!electionStarted) return setError("Election polling hasn't started yet.");
    if (electionEnded) return setError("Election polling has concluded.");
    
    if (!user.email) {
      return setError("No email registered for this account. Cannot perform 2FA.");
    }

    setSendingOtp(true);
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCandidate({ id: candidateId, name: candidateName });
        setShowOtpModal(true);
      } else {
        setError(data.error || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Server error while sending OTP.');
    }
    setSendingOtp(false);
  };

  const verifyOtpAndVote = async () => {
    setVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp: otpInput })
      });
      const data = await res.json();
      if (data.success) {
        setShowOtpModal(false);
        setOtpInput('');
        // Proceed to metamask transaction
        await castVote(selectedCandidate.id, selectedCandidate.name);
      } else {
        setOtpError(data.error || 'Invalid OTP.');
      }
    } catch (err) {
      setOtpError('Server error while verifying OTP.');
    }
    setVerifyingOtp(false);
  };

  const castVote = async (candidateId, candidateName) => {
    if (!walletAddress) await connectWallet();
    
    // Hard Firebase identity check — final guard before blockchain transaction
    if (user && user.uid) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().hasVoted) {
          setHasVoted(true);
          setVotedFor("a candidate (verified via database)");
          return setError("Your identity has already cast a vote. Switching wallets is not allowed.");
        }
      } catch (e) { console.error("Firebase check failed:", e); }
    }
    
    if (hasVoted) return setError("You have already cast a vote.");
    if (!electionStarted) return setError("Election polling hasn't started yet.");
    if (electionEnded) return setError("Election polling has concluded.");

    setTxPending(true); setError('');
    setTxData({ status: 'pending', hash: null }); setModalOpen(true);

    try {
      const provider = getBrowserProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, signer);
      
      // THIS WILL TRIGGER THE WALLET POPUP
      const tx = await contract.vote(candidateId);
      
      setTxData({ status: 'pending', hash: tx.hash });
      const receipt = await tx.wait();
      
      setTxData({ status: 'success', hash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() });
      setHasVoted(true);
      if (onVoteComplete) onVoteComplete();
      setVotedFor(candidateName);
      
      // 1. Lock the user's Firebase Identity so they cannot vote again with a different wallet
      try {
        await updateDoc(doc(db, "users", user.uid), { hasVoted: true });
      } catch (e) {
        console.error("Failed to lock Firebase identity:", e);
      }

      // 2. Trigger the Confirmation Email Receipt
      try {
        await fetch(`${API_URL}/send-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            epicId: user.voterId,
            aadhaar: user.aadhaar,
            txHash: tx.hash
          })
        });
      } catch (e) {
        console.error("Failed to send confirmation email:", e);
      }

      fetchData();
    } catch (err) {
      console.error(err);
      setTxData({ status: 'failed', error: err.reason || 'Transaction rejected or failed.' });
      setError(err.reason || 'Vote failed.');
    }
    setTxPending(false);
  };

  const totalVotes = candidates.reduce((a, c) => a + c.voteCount, 0);
  const winner = electionEnded && candidates.length > 0
    ? candidates.reduce((max, c) => c.voteCount > max.voteCount ? c : max, candidates[0])
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <TransactionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} txData={txData} />

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-blue-500/30 p-6 rounded-xl max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-2">2FA Verification</h3>
              <p className="text-slate-400 text-sm mb-4">A 6-digit secret code has been sent to <strong>{user.email}</strong>. Enter it below to cast your vote for {selectedCandidate?.name}.</p>
              
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
              {user.name[0]}
            </div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-slate-400">Voter ID: {user.voterId} • Aadhaar: {user.aadhaar}</p>
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
