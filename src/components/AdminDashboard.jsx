import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { LogOut, Plus, Play, Square, RotateCcw, ShieldAlert, Fingerprint, RefreshCw } from 'lucide-react';
import { CONTRACT_ADDRESS, LOCAL_RPC, ADMIN_KEY, VotingArtifact } from '../App';
import { ResultsDoughnut, ResultsBarChart } from './ResultsChart';
import TransactionModal from './TransactionModal';
import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

export default function AdminDashboard({ onLogout }) {
  const [candidates, setCandidates] = useState([]);
  const [electionStarted, setElectionStarted] = useState(false);
  const [electionEnded, setElectionEnded] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Transaction Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [txData, setTxData] = useState(null);

  const getProvider = () => {
    if (window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return new ethers.JsonRpcProvider(LOCAL_RPC);
  };
  const getReadContract = () => {
    return new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, getProvider());
  };
  const getAdminContract = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, signer);
    }
    const provider = new ethers.JsonRpcProvider(LOCAL_RPC);
    const wallet = new ethers.Wallet(ADMIN_KEY, provider);
    return new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, wallet);
  };

  useEffect(() => {
    fetchData();
    const contract = getReadContract();
    contract.on("VotedEvent", () => fetchData());
    contract.on("CandidateAddedEvent", () => fetchData());
    contract.on("ElectionStartedEvent", () => fetchData());
    contract.on("ElectionEndedEvent", () => fetchData());
    contract.on("ElectionResetEvent", () => fetchData());
    return () => { contract.removeAllListeners(); };
  }, []);

  const fetchData = async () => {
    try {
      const contract = getReadContract();
      const arr = await contract.getCandidates();
      setCandidates(arr.map(c => ({ id: c.id.toString(), name: c.name, voteCount: Number(c.voteCount) })));
      setElectionStarted(await contract.electionStarted());
      setElectionEnded(await contract.electionEnded());
      setError(''); // Clear any previous errors
    } catch (e) {
      console.error("AdminDashboard Fetch Error:", e);
      setError(`Blockchain Connection Error: Failed to fetch candidates from ${CONTRACT_ADDRESS}. Please ensure your local Hardhat node is running, or verify your RPC URL and contract address in the .env file.`);
    }
  };

  const execTx = async (label, fn) => {
    setTxPending(true); setError(''); setSuccess('');
    setTxData({ status: 'pending', hash: null }); setModalOpen(true);
    try {
      const tx = await fn();
      setTxData({ status: 'pending', hash: tx.hash });
      const receipt = await tx.wait();
      setTxData({ status: 'success', hash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() });
      setSuccess(label);
      fetchData();
    } catch (err) {
      setTxData({ status: 'failed', error: err.reason || err.message || 'Transaction failed.' });
      setError(err.reason || err.message || 'Failed.');
    }
    setTxPending(false);
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newCandidateName) return;
    const name = newCandidateName;
    setNewCandidateName('');
    try {
      const contract = await getAdminContract();
      execTx(`"${name}" added!`, () => contract.addCandidate(name));
    } catch (err) {
      setError(err.message || 'Failed to connect admin wallet.');
    }
  };

  const handleStartElection = async () => {
    try {
      const contract = await getAdminContract();
      execTx('Election Started!', () => contract.startElection());
    } catch (err) {
      setError(err.message || 'Failed to connect admin wallet.');
    }
  };

  const handleEndElection = async () => {
    try {
      const contract = await getAdminContract();
      execTx('Election Ended!', () => contract.endElection());
    } catch (err) {
      setError(err.message || 'Failed to connect admin wallet.');
    }
  };

  const handleResetElection = async () => {
    try {
      setError('');
      setSuccess('');
      const contract = await getAdminContract();

      // Proactively reset Firebase voter lock statuses
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const batch = writeBatch(db);
        querySnapshot.forEach((userDoc) => {
          if (userDoc.data().hasVoted) {
            batch.update(doc(db, "users", userDoc.id), { hasVoted: false });
          }
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to clear voter statuses in Firestore:", e);
      }

      execTx('Election Reset!', () => contract.resetElection());
    } catch (err) {
      setError(err.message || 'Failed to connect admin wallet.');
    }
  };

  const totalVotes = candidates.reduce((a, c) => a + c.voteCount, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <TransactionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} txData={txData} />

      {/* Top Bar */}
      <div className="bg-amber-900/30 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-bold text-sm">ADMIN DASHBOARD</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Election Officer</span>
          <button onClick={onLogout} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-3 bg-amber-500/10 rounded-full border border-amber-500/20">
            <Fingerprint className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">SecureVote Admin</h1>
          <div className="flex items-center justify-center gap-2 text-sm uppercase tracking-widest font-bold mt-3">
            {!electionStarted && !electionEnded && <span className="text-amber-400 bg-amber-400/10 px-3 py-1 rounded">Pre-Election</span>}
            {electionStarted && !electionEnded && <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Voting Live</span>}
            {electionEnded && <span className="text-red-400 bg-red-400/10 px-3 py-1 rounded">Election Closed</span>}
          </div>
        </div>

        {/* Messages */}
        {error && <div className="glass-panel border-red-500/30 bg-red-500/10 p-3 mb-4 text-red-200 text-sm">{error}</div>}
        {success && <div className="glass-panel border-emerald-500/30 bg-emerald-500/10 p-3 mb-4 text-emerald-200 text-sm">✅ {success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-4 space-y-6">
            {/* Add Candidate */}
            <div className="glass-panel p-6 border-amber-500/20">
              <h3 className="font-bold mb-4">Add Candidate</h3>
              <form onSubmit={handleAddCandidate} className="flex gap-2">
                <input type="text" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} placeholder="e.g. David (Green Party)" className="glass-input flex-1" disabled={electionEnded || txPending} />
                <button type="submit" disabled={!newCandidateName || electionEnded || txPending} className="glass-button bg-amber-600/80 hover:bg-amber-500/80 border-amber-400/20">
                  <Plus className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Election Controls */}
            <div className="glass-panel p-6 border-amber-500/20">
              <h3 className="font-bold mb-4">Election Controls</h3>
              <div className="space-y-3">
                {!electionStarted && !electionEnded && (
                  <button onClick={handleStartElection} disabled={txPending} className="w-full glass-button bg-emerald-600/80 hover:bg-emerald-500/80 border-emerald-400/20 flex items-center justify-center gap-2 py-3">
                    <Play className="w-4 h-4" /> Start Election
                  </button>
                )}
                {electionStarted && !electionEnded && (
                  <button onClick={handleEndElection} disabled={txPending} className="w-full glass-button bg-red-600/80 hover:bg-red-500/80 border-red-400/20 flex items-center justify-center gap-2 py-3">
                    <Square className="w-4 h-4" /> End Election
                  </button>
                )}
                {electionEnded && (
                  <button onClick={handleResetElection} disabled={txPending} className="w-full glass-button bg-purple-600/80 hover:bg-purple-500/80 border-purple-400/20 flex items-center justify-center gap-2 py-3">
                    <RotateCcw className="w-4 h-4" /> Reset Election
                  </button>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="glass-panel p-6">
              <h3 className="font-bold mb-4">Vote Distribution</h3>
              <ResultsDoughnut candidates={candidates} />
            </div>
          </div>

          {/* Candidates Table */}
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-bold mb-4">Candidates ({candidates.length})</h2>
            <div className="space-y-3 mb-6">
              {candidates.map((c, i) => {
                const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
                return (
                  <motion.div key={c.id} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="glass-panel p-4 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 bg-blue-500/10 transition-all duration-1000" style={{ width: `${pct}%` }} />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="bg-slate-800 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm border border-slate-700">#{c.id}</div>
                      <div>
                        <span className="font-bold">{c.name.split(' (')[0]}</span>
                        <span className="text-slate-400 text-sm ml-2">{c.name.includes('(') ? c.name.split('(')[1].replace(')', '') : ''}</span>
                      </div>
                    </div>
                    <div className="text-right relative z-10">
                      <span className="text-xl font-bold text-blue-400">{c.voteCount}</span>
                      <span className="text-slate-500 text-xs ml-1">{pct > 0 ? `(${pct}%)` : ''}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="glass-panel p-6">
              <h3 className="font-bold mb-2">Vote Breakdown</h3>
              <ResultsBarChart candidates={candidates} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
