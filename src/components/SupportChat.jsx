import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SupportChat() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  
  // Initialize with translated greeting when language changes or opens
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'bot', content: t('supportChatGreeting') }]);
    }
  }, [t, messages.length]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Multi-lingual hardcoded responses mapped by simple intent keywords
  const getBotResponse = (userQuery) => {
    const query = userQuery.toLowerCase();
    const isEn = i18n.language === 'en';
    
    // How to vote intent
    if (query.includes('how to vote') || query.includes('guide') || query.includes('process') || query.includes('वोट कैसे') || query.includes('ভোট')) {
      return isEn 
        ? "To cast a vote: \n1. Register with your Voter ID.\n2. Login to the Voter Portal.\n3. Click 'Cast Vote' on your preferred candidate.\n4. Enter the 6-digit OTP sent to your email.\n5. Confirm the transaction in your MetaMask wallet!"
        : "मतदान करने के लिए: 1. रजिस्टर करें। 2. लॉगिन करें। 3. 'Cast Vote' पर क्लिक करें। 4. OTP दर्ज करें। 5. मेटामास्क में लेन-देन की पुष्टि करें।";
    }
    
    // MetaMask intent
    if (query.includes('metamask') || query.includes('wallet') || query.includes('failed') || query.includes('मेटामास्क') || query.includes('वॉलेट')) {
      return isEn
        ? "If MetaMask is failing: \n1. Ensure you have the MetaMask extension installed.\n2. Connect to Local Hardhat Network (http://127.0.0.1:8545).\n3. Import a test private key."
        : "यदि मेटामास्क विफल हो रहा है: 1. सुनिश्चित करें कि एक्सटेंशन स्थापित है। 2. स्थानीय नेटवर्क से कनेक्ट करें। 3. परीक्षण कुंजी आयात करें।";
    }
    
    // OTP intent
    if (query.includes('otp') || query.includes('code') || query.includes('email') || query.includes('ओटीपी') || query.includes('ईमेल')) {
      return isEn
        ? "If you are not receiving the OTP:\n1. Check your Spam folder.\n2. Ensure you entered a valid email.\n3. In 'Demo Mode', the code is printed in the server terminal logs!"
        : "यदि आपको OTP नहीं मिल रहा है: 1. स्पैम फ़ोल्डर जांचें। 2. डेमो मोड में, कोड टर्मिनल लॉग में छपा होता है!";
    }
    
    // Register intent
    if (query.includes('register') || query.includes('sign up') || query.includes('पंजीकरण') || query.includes('रजिस्टर')) {
      return isEn
        ? "To register, click 'Register' on the home screen. You need your Name, Voter ID (EPIC), Aadhaar, and a valid Gmail address."
        : "पंजीकरण करने के लिए, होम स्क्रीन पर 'Register' पर क्लिक करें। आपको नाम, वोटर आईडी, आधार और जीमेल की आवश्यकता होगी।";
    }

    // Default fallback
    return isEn
      ? "I am sorry, I didn't quite understand that. Please try rephrasing or use the quick action buttons below!"
      : "क्षमा करें, मुझे समझ नहीं आया। कृपया नीचे दिए गए त्वरित बटनों का उपयोग करें!";
  };

  const quickActions = [
    { id: 'vote', label: i18n.language === 'en' ? 'How to vote?' : 'वोट कैसे दें?', query: 'how to vote' },
    { id: 'otp', label: i18n.language === 'en' ? 'OTP Issue' : 'ओटीपी समस्या', query: 'otp' },
    { id: 'wallet', label: i18n.language === 'en' ? 'MetaMask Error' : 'मेटामास्क त्रुटि', query: 'metamask' },
  ];

  const handleQuickAction = (actionQuery) => {
    setInput(actionQuery);
    setTimeout(() => {
      document.getElementById('chat-submit-btn').click();
    }, 100);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    
    // Simulate AI typing
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const botReply = getBotResponse(userMessage);
      setMessages(prev => [...prev, { role: 'bot', content: botReply }]);
    }, 1500); // 1.5 second delay for realism
  };

  return (
    <>
      {/* Floating Bubble */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-2xl z-50 cursor-pointer border border-blue-400/30"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[350px] h-[500px] bg-slate-900/95 border border-slate-700/50 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center gap-3 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-inner">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm tracking-wide">{t('supportChatHeader')}</h3>
                <p className="text-blue-100 text-xs flex items-center gap-1.5 opacity-90">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> Online
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-500' : 'bg-slate-700'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[80%] flex-row">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-800 text-slate-200 p-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              {/* Quick Actions */}
              {messages.length < 5 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-700/30">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.query)}
                      className="text-[11px] bg-slate-800/80 hover:bg-blue-600/30 border border-slate-600/50 text-blue-300 py-1.5 px-3 rounded-full transition-all flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-700/50 bg-slate-800/80 backdrop-blur-md">
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('supportChatPlaceholder')}
                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-4 text-sm text-white shadow-inner focus:outline-none transition-colors"
                  disabled={isTyping}
                />
                <button
                  id="chat-submit-btn"
                  type="submit"
                  disabled={isTyping || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shadow-lg flex items-center justify-center w-11 h-11"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
