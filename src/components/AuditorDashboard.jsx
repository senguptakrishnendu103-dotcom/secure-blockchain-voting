import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Globe, CheckCircle2 } from 'lucide-react';
import { CONTRACT_ADDRESS, LOCAL_RPC, VotingArtifact } from '../App';
import { ResultsDoughnut, ResultsBarChart } from './ResultsChart';

export default function AuditorDashboard({ onBack }) {
  const [candidates, setCandidates] = useState([]);
  const [electionStarted, setElectionStarted] = useState(false);
  const [electionEnded, setElectionEnded] = useState(false);
  const [events, setEvents] = useState([]);

  const getReadContract = () => {
    const provider = new ethers.JsonRpcProvider(LOCAL_RPC);
    return new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, provider);
  };

  useEffect(() => {
    fetchData();
    const contract = getReadContract();

    // Listen for new votes to add to the live feed
    contract.on("VotedEvent", (candidateId, event) => {
      fetchData();
      const newEvent = {
        id: event.log.transactionHash,
        type: 'VOTE_CAST',
        candidateId: candidateId.toString(),
        blockNumber: event.log.blockNumber,
        txHash: event.log.transactionHash,
        timestamp: new Date().toLocaleTimeString()
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
    });

    contract.on("CandidateAddedEvent", () => fetchData());
    contract.on("ElectionStartedEvent", () => fetchData());
    contract.on("ElectionEndedEvent", () => fetchData());
    contract.on("ElectionResetEvent", () => {
      fetchData();
      setEvents([]); // Clear feed on reset
    });

    return () => { contract.removeAllListeners(); };
  }, []);

  const fetchData = async () => {
    try {
      const contract = getReadContract();
      const arr = await contract.getCandidates();
      setCandidates(arr.map(c => ({ id: c.id.toString(), name: c.name, voteCount: Number(c.voteCount) })));
      setElectionStarted(await contract.electionStarted());
      setElectionEnded(await contract.electionEnded());
    } catch (e) { console.error("Failed to fetch blockchain data:", e); }
  };

  const totalVotes = candidates.reduce((a, c) => a + c.voteCount, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      {/* Top Bar */}
      <div className="bg-slate-900/50 border-b border-slate-700/50 px-6 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-indigo-400" />
          <span className="text-indigo-400 font-bold text-sm tracking-widest uppercase">Public Auditor Portal</span>
        </div>
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
            Live Election Ledger
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            This dashboard provides a 100% transparent, cryptographically verifiable, real-time feed of the blockchain state. No login required.
          </p>
          <div className="mt-6 flex justify-center gap-4">
             <div className="glass-panel px-4 py-2 border-indigo-500/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-300">Connected to local node</span>
             </div>
             <div className="glass-panel px-4 py-2 border-indigo-500/20">
                <span className="text-xs text-slate-400">Contract: <span className="font-mono text-indigo-300">{CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</span></span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Charts */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-6">
                 <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Vote Distribution</h3>
                 <ResultsDoughnut candidates={candidates} />
              </div>
              <div className="glass-panel p-6">
                 <h3 className="font-bold mb-4">Live Standings</h3>
                 <div className="space-y-4 mt-8">
                   {candidates.map((c, i) => {
                      const pct = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
                      return (
                        <div key={c.id} className="relative">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-200">{c.name.split(' (')[0]}</span>
                            <span className="text-indigo-300 font-bold">{c.voteCount} votes ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${pct}%` }} 
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="bg-indigo-500 h-2 rounded-full"
                            />
                          </div>
                        </div>
                      )
                   })}
                 </div>
              </div>
            </div>
            
            <div className="glass-panel p-6">
              <h3 className="font-bold mb-2">Detailed Breakdown</h3>
              <ResultsBarChart candidates={candidates} />
            </div>
          </div>

          {/* Right Column: Live Block Explorer Feed */}
          <div className="lg:col-span-4">
            <div className="glass-panel p-0 h-[800px] flex flex-col overflow-hidden border-indigo-500/20">
              <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" /> Block Explorer
                </h3>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Live Feed</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {events.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                    <Activity className="w-12 h-12 mb-3" />
                    <p className="text-sm text-center">Waiting for new blockchain transactions...</p>
                  </div>
                ) : (
                  events.map((ev, i) => (
                    <motion.div 
                      key={ev.id} 
                      initial={{ x: 20, opacity: 0 }} 
                      animate={{ x: 0, opacity: 1 }}
                      className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg text-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs"><CheckCircle2 className="w-3 h-3" /> VOTE VERIFIED</span>
                        <span className="text-[10px] text-slate-500">{ev.timestamp}</span>
                      </div>
                      <p className="text-slate-300 text-xs mb-1">Block Number: <span className="text-white font-mono">{ev.blockNumber}</span></p>
                      <p className="text-slate-400 text-[10px] font-mono break-all bg-black/20 p-1.5 rounded mt-2">
                        Tx: {ev.txHash}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
