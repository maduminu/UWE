import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { AuthModal } from '../ui/AuthModal';
import { api } from '../../services/api';

export type PageId = 'home' | 'about' | 'vision' | 'product' | 'contact';

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export const ContactPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('uwe_user_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'email' | 'whatsapp' | null>(null);

  const [formData, setFormData] = useState({
    fullName: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '077 123 4567',
    topic: 'bmb',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || currentUser.name || '',
        email: prev.email || currentUser.email || '',
        phone: prev.phone || currentUser.phone || '077 123 4567',
      }));
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('uwe_user_account', JSON.stringify(user));
    setFormData((prev) => ({
      ...prev,
      fullName: user.name || prev.fullName,
      email: user.email || prev.email,
      phone: user.phone || prev.phone,
    }));

    if (pendingAction === 'email') {
      executeEmailSubmit();
    } else if (pendingAction === 'whatsapp') {
      executeWhatsAppClick();
    }
    setPendingAction(null);
  };

  const executeEmailSubmit = async () => {
    try {
      await api.createLead({
        name: formData.fullName || currentUser?.name || 'Operative',
        phone: formData.phone || '077 123 4567',
        email: formData.email || currentUser?.email,
        courseSlug: formData.topic === 'bmb' ? 'bmb' : formData.topic === 'leadership' ? 'leadership' : formData.topic === 'ignit' ? 'ignit' : null,
        inquiryType: formData.topic.toUpperCase(),
        message: formData.message,
      });
    } catch {
      // Continue even if local API is unreachable
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        fullName: currentUser?.name || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '077 123 4567',
        topic: 'bmb',
        message: '',
      });
    }, 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setPendingAction('email');
      setAuthModalOpen(true);
      return;
    }
    executeEmailSubmit();
  };

  const executeWhatsAppClick = async () => {
    const nameStr = formData.fullName.trim() || currentUser?.name || 'Operative';
    let messageText = '';

    switch (formData.topic) {
      case 'bmb':
        messageText = `Hello UWE Command HQ! My name is ${nameStr}. I would like to register for the Blind Mind Breaker (BMB) program (RS. 12,000). Please transmit the enrollment procedure.`;
        break;
      case 'leadership':
        messageText = `Hello UWE Command HQ! My name is ${nameStr}. I am interested in joining the UWE Leadership Academy (RS. 100,000). Please provide course schedule details.`;
        break;
      case 'ignit':
        messageText = `Hello UWE Command HQ! My name is ${nameStr}. I am reaching out regarding the UWE IGNIT Accelerator. Please connect me with an incubator officer.`;
        break;
      case 'corporate':
        messageText = `Hello UWE Command HQ! My name is ${nameStr}. I am reaching out for a Corporate Partnership. Please connect me with senior command.`;
        break;
      default:
        const userMsg = formData.message.trim() ? ` Inquiry: "${formData.message.trim()}"` : '';
        messageText = `Hello UWE Command HQ! My name is ${nameStr}.${userMsg} Please provide more information.`;
        break;
    }

    // Save lead record in database
    try {
      await api.createLead({
        name: nameStr,
        phone: formData.phone || '071 709 6386',
        email: formData.email || currentUser?.email,
        courseSlug: formData.topic === 'bmb' ? 'bmb' : formData.topic === 'leadership' ? 'leadership' : formData.topic === 'ignit' ? 'ignit' : null,
        inquiryType: formData.topic.toUpperCase(),
        message: messageText,
      });
    } catch {
      // Ignore API offline errors for direct WhatsApp launch
    }

    const encodedMsg = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/94717096386?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleWhatsAppButtonClick = () => {
    if (!currentUser) {
      setPendingAction('whatsapp');
      setAuthModalOpen(true);
      return;
    }
    executeWhatsAppClick();
  };

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative">
      <div className="ambient-glow-top-left" />
      <div className="ambient-glow-bottom-right" />

      {/* Hero Header */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-on-surface mb-xs font-black"
        >
          Command <span className="text-secondary text-glow-gold">Communications</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="font-body-lg text-sm sm:text-base md:text-body-lg text-on-surface-variant max-w-xl mx-auto"
        >
          Transmit your inquiry directly to UWE Command Headquarters via Email or Instant WhatsApp Dispatch.
        </motion.p>
      </section>

      {/* User Login Session Banner */}
      <div className="max-w-container-max mx-auto px-4 md:px-lg mb-4">
        {currentUser ? (
          <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/40 text-xs font-mono-data text-secondary flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">verified_user</span>
              <span>AUTHENTICATED OPERATIVE: <strong>{currentUser.name}</strong> ({currentUser.email})</span>
            </div>
            <button onClick={() => {
              localStorage.removeItem('uwe_user_account');
              setCurrentUser(null);
            }} className="underline hover:text-on-surface cursor-pointer">LOGOUT SESSION</button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#0E131F] border border-outline-variant/40 text-xs font-mono-data text-on-surface-variant flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-secondary">lock</span>
              <span>Operative authentication is required to send emails & WhatsApp dispatches.</span>
            </div>
            <button onClick={() => setAuthModalOpen(true)} className="px-3 py-1 rounded bg-secondary text-black font-bold uppercase cursor-pointer hover:scale-105 transition-transform">
              LOGIN / REGISTER
            </button>
          </div>
        )}
      </div>

      {/* Main 2-Column Contact Layout */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-md relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-xl items-start">
          
          {/* Left Column: Info Cards & Social Links */}
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-md"
          >
            <motion.h2 variants={itemVariants} className="font-headline-lg text-2xl sm:text-headline-md text-on-surface mb-xs font-bold">
              ESTABLISH CONNECTION
            </motion.h2>
            <motion.p variants={itemVariants} className="font-body-md text-sm sm:text-body-md text-on-surface-variant mb-md">
              Whether seeking enrollment, corporate partnership, or direct strategic consultation, our command team is prepared to receive your payload.
            </motion.p>

            {/* HQ Card */}
            <motion.div variants={itemVariants} whileHover={{ x: 6 }} className="glass-panel rounded-lg p-4 sm:p-md flex items-start gap-4 border border-outline-variant/30 hover:border-secondary/40 transition-colors">
              <div className="p-3 rounded bg-surface-variant text-secondary">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <div>
                <h3 className="font-headline-md text-body-lg text-on-surface font-bold">Command HQ</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Colombo 03, Western Province, Sri Lanka</p>
              </div>
            </motion.div>

            {/* WhatsApp Direct Line Card */}
            <motion.div 
              variants={itemVariants} 
              whileHover={{ x: 6 }} 
              onClick={handleWhatsAppButtonClick}
              className="glass-panel rounded-lg p-4 sm:p-md flex items-start gap-4 border border-[#25D366]/40 hover:border-[#25D366] transition-all cursor-pointer bg-[#25D366]/5 group shadow-[0_0_15px_rgba(37,211,102,0.1)]"
            >
              <div className="p-3 rounded bg-[#25D366]/20 text-[#25D366] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">chat</span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <h3 className="font-headline-md text-body-lg text-on-surface font-bold">WhatsApp Hotline</h3>
                  <span className="font-mono-data text-xs text-[#25D366] font-bold">INSTANT DISPATCH</span>
                </div>
                <p className="font-body-md text-sm text-on-surface-variant">071 709 6386 / +94 71 709 6386</p>
                <p className="font-body-md text-xs text-[#25D366] mt-1 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Click to open pre-filled WhatsApp message</span>
                  <span className="material-symbols-outlined text-xs">east</span>
                </p>
              </div>
            </motion.div>

            {/* Direct Email Card */}
            <motion.div variants={itemVariants} whileHover={{ x: 6 }} className="glass-panel rounded-lg p-4 sm:p-md flex items-start gap-4 border border-outline-variant/30 hover:border-tertiary/40 transition-colors">
              <div className="p-3 rounded bg-surface-variant text-tertiary">
                <span className="material-symbols-outlined text-2xl">mail</span>
              </div>
              <div>
                <h3 className="font-headline-md text-body-lg text-on-surface font-bold">Direct Transmission</h3>
                <p className="font-body-md text-sm text-on-surface-variant">command@unitywarriorsempire.lk</p>
              </div>
            </motion.div>

            {/* Operations Hours */}
            <motion.div variants={itemVariants} whileHover={{ x: 6 }} className="glass-panel rounded-lg p-4 sm:p-md flex items-start gap-4 border border-outline-variant/30 hover:border-secondary-container/40 transition-colors">
              <div className="p-3 rounded bg-surface-variant text-secondary-container">
                <span className="material-symbols-outlined text-2xl">schedule</span>
              </div>
              <div>
                <h3 className="font-headline-md text-body-lg text-on-surface font-bold">Operational Hours</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Monday – Saturday: 08:00 – 18:00 IST</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Tactical Inquiry Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-xl p-6 sm:p-lg md:p-xl border border-outline-variant/40 glow-accent shadow-2xl"
          >
            <h2 className="font-headline-md text-xl sm:text-headline-md text-on-surface mb-xs font-bold">
              TACTICAL INQUIRY PAYLOAD
            </h2>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-lg">
              Fill out your details below to dispatch via Email or instant WhatsApp message.
            </p>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="p-md rounded bg-secondary-container/20 border border-secondary-container text-secondary text-center py-xl"
                >
                  <span className="material-symbols-outlined text-5xl mb-xs animate-bounce">check_circle</span>
                  <h3 className="font-headline-md text-headline-md mb-xs font-bold">TRANSMISSION RECEIVED</h3>
                  <p className="font-body-md text-sm">Our command officers will respond within 24 operational hours.</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="font-label-caps text-xs text-on-surface uppercase tracking-wider block mb-1">
                      FULL NAME / OPERATIVE DESIGNATION *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter your name"
                      className="input-field w-full p-3 rounded text-base sm:text-sm font-body-md"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-label-caps text-xs text-on-surface uppercase tracking-wider block mb-1">
                        TRANSMISSION EMAIL *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="name@domain.com"
                        className="input-field w-full p-3 rounded text-base sm:text-sm font-body-md"
                      />
                    </div>
                    <div>
                      <label className="font-label-caps text-xs text-on-surface uppercase tracking-wider block mb-1">
                        PHONE / WHATSAPP NUMBER *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="077 123 4567"
                        className="input-field w-full p-3 rounded text-base sm:text-sm font-body-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-label-caps text-xs text-on-surface uppercase tracking-wider block mb-1">
                      DIVISION INQUIRY TOPIC
                    </label>
                    <select
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="input-field w-full p-3 rounded text-base sm:text-sm font-body-md"
                    >
                      <option value="bmb">Blind Mind Breaker (BMB - RS. 12,000)</option>
                      <option value="leadership">UWE Leadership Academy (RS. 100,000)</option>
                      <option value="ignit">UWE IGNIT Accelerator</option>
                      <option value="corporate">Corporate Partnership</option>
                      <option value="other">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-label-caps text-xs text-on-surface uppercase tracking-wider block mb-1">
                      PAYLOAD MESSAGE / INQUIRY DETAILS *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="State your objectives or inquiries..."
                      className="input-field w-full p-3 rounded text-base sm:text-sm font-body-md resize-none"
                    />
                  </div>

                  {/* Dual Action Buttons: Standard Submit + WhatsApp Direct Launch */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-xs">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      type="submit"
                      className="btn-elite min-h-[46px] flex-1 py-3 rounded font-label-caps text-xs sm:text-label-caps uppercase tracking-widest cursor-pointer font-bold flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">send</span>
                      <span>EMAIL PAYLOAD</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={handleWhatsAppButtonClick}
                      className="min-h-[46px] flex-1 py-3 rounded font-label-caps text-xs sm:text-label-caps uppercase tracking-widest cursor-pointer font-bold bg-[#25D366] text-black hover:bg-[#20bd5a] transition-all shadow-[0_0_20px_rgba(37,211,102,0.4)] flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">chat</span>
                      <span>WHATSAPP DIRECT</span>
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Auth Modal Popup */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingAction(null);
        }}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};
