import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Hash, Fuel, Clock, ExternalLink, X } from 'lucide-react';

export default function TransactionModal({ isOpen, onClose, txData }) {
  if (!isOpen) return null;

  const isPending = txData?.status === 'pending';
  const isSuccess = txData?.status === 'success';
  const isFailed = txData?.status === 'failed';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={isSuccess || isFailed ? onClose : undefined}>
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} className="glass-panel p-8 max-w-md w-full border-blue-500/30 relative" onClick={e => e.stopPropagation()}>
            
            {(isSuccess || isFailed) && (
              <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Pending State */}
            {isPending && (
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                  <div className="absolute inset-3 rounded-full border-4 border-t-emerald-500 border-emerald-500/20 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <h3 className="text-xl font-bold mb-2">Confirming on Blockchain</h3>
                <p className="text-slate-400 text-sm mb-4">Your transaction is being mined into a new block...</p>
                
                {txData?.hash && (
                  <div className="bg-black/30 rounded-lg p-3 text-left">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Transaction Hash</p>
                    <p className="font-mono text-xs text-blue-400 break-all">{txData.hash}</p>
                  </div>
                )}
              </div>
            )}

            {/* Success State */}
            {isSuccess && (
              <div className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Transaction Confirmed!</h3>
                <p className="text-slate-400 text-sm mb-6">Your vote has been permanently recorded on the blockchain.</p>
                
                <div className="space-y-3 text-left">
                  <div className="bg-black/30 rounded-lg p-3 flex items-start gap-3">
                    <Hash className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Tx Hash</p>
                      <p className="font-mono text-xs text-blue-400 break-all">{txData?.hash || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/30 rounded-lg p-3 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Block</p>
                        <p className="font-mono text-sm text-white">#{txData?.blockNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 flex items-start gap-3">
                      <Fuel className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Gas Used</p>
                        <p className="font-mono text-sm text-white">{txData?.gasUsed || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={onClose} className="glass-button w-full mt-6 py-3">
                  Close
                </button>
              </div>
            )}

            {/* Failed State */}
            {isFailed && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Transaction Failed</h3>
                <p className="text-slate-400 text-sm mb-4">{txData?.error || 'Something went wrong.'}</p>
                <button onClick={onClose} className="glass-button w-full py-3">Close</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
