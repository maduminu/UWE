import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import uweLogoAsset from '../../assets/images/uwe_shield_isolated.png';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    id: string;
    studentName: string;
    courseSlug: string;
    courseTitle: string;
    certificateNo: string;
    issuedDate: string;
    gradeScore?: string;
    signatureBy?: string;
  } | null;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ isOpen, onClose, certificate }) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      await api.downloadCertificatePDF(certificate.id, certificate.certificateNo);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback to print
      handlePrint();
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/certificates/verify/${certificate.id}`
    : `https://uwe-pearl.vercel.app/api/certificates/verify/${certificate.id}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    verificationUrl
  )}&color=d4a017&bgcolor=0a0e18`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const formattedDate = new Date(certificate.issuedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="relative w-full max-w-4xl bg-[#080C14] border border-secondary/50 rounded-2xl shadow-[0_0_60px_rgba(255,184,0,0.25)] p-6 md:p-8 my-8 text-on-surface"
      >
        {/* Top Control Bar */}
        <div className="flex flex-wrap justify-between items-center gap-3 pb-4 mb-4 border-b border-outline-variant/30 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">verified</span>
            <div>
              <h3 className="font-display text-sm md:text-base font-black text-secondary uppercase tracking-wider">
                Official Digital Credential
              </h3>
              <p className="font-mono-data text-[10px] text-on-surface-variant">
                Certificate ID: {certificate.certificateNo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface font-mono-data text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-sm text-secondary">
                {copied ? 'check' : 'link'}
              </span>
              <span>{copied ? 'LINK COPIED!' : 'COPY VERIFY LINK'}</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-2 rounded-xl bg-secondary text-black font-mono-data text-xs font-bold hover:bg-secondary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.4)] disabled:opacity-75"
            >
              <span className="material-symbols-outlined text-base">
                {downloading ? 'sync' : 'download'}
              </span>
              <span>{downloading ? 'GENERATING PDF...' : 'DOWNLOAD OFFICIAL PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              title="Print Certificate"
              className="p-2 rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* ── High-Tech Sci-Fi Certificate Paper Canvas ── */}
        <div
          ref={certRef}
          className="relative bg-gradient-to-b from-[#0E1322] via-[#0A0D18] to-[#060810] border-2 border-secondary/60 rounded-xl p-8 md:p-12 shadow-2xl overflow-hidden text-center"
        >
          {/* Cyber Geometric Accents */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-secondary/80 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-secondary/80 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-secondary/80 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-secondary/80 rounded-br-xl pointer-events-none" />

          {/* Subtle Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <img src={uweLogoAsset} alt="" className="w-96 h-96 object-contain filter grayscale" />
          </div>

          {/* Certificate Header */}
          <div className="flex flex-col items-center gap-3 mb-6 relative z-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary via-[#FFD700] to-secondary-container p-[3px] shadow-[0_0_25px_rgba(255,184,0,0.5)]">
              <div className="w-full h-full rounded-full bg-[#0a0e18] flex items-center justify-center overflow-hidden">
                <img src={uweLogoAsset} alt="UWE Emblem" className="w-[85%] h-[85%] object-contain" />
              </div>
            </div>

            <p className="font-mono-data text-xs md:text-sm text-secondary font-bold tracking-[0.25em] uppercase">
              UNITY WARRIORS EMPIRE • SOVEREIGN EDUCATION
            </p>
            <h1 className="font-display text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF] via-secondary to-[#FFD700] tracking-wider uppercase">
              Certificate of Completion
            </h1>
            <p className="font-mono-data text-xs text-on-surface-variant">
              This officially certifies that the named operative has successfully satisfied all academic directives &amp; tactical masterclasses.
            </p>
          </div>

          {/* Recipient Name */}
          <div className="my-6 relative z-10">
            <p className="font-mono-data text-xs uppercase text-secondary/80 tracking-widest mb-1">PROUDLY CONFERRED UPON</p>
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#FFF] tracking-wider underline decoration-secondary/60 decoration-2 underline-offset-8">
              {certificate.studentName}
            </h2>
          </div>

          {/* Course Details */}
          <div className="my-6 relative z-10 max-w-xl mx-auto">
            <p className="font-mono-data text-xs text-on-surface-variant uppercase tracking-wider mb-1">
              FOR MASTERING THE CURRICULUM OF
            </p>
            <p className="font-display text-xl md:text-2xl font-bold text-secondary tracking-wide uppercase">
              {certificate.courseTitle}
            </p>
            <div className="inline-block mt-3 px-4 py-1.5 rounded-full bg-secondary/15 border border-secondary/40 font-mono-data text-xs text-secondary font-bold">
              ⭐ {certificate.gradeScore || 'HONORS (DISTINCTION)'}
            </div>
          </div>

          {/* Certificate Footer Signatures, Scannable QR & Seal */}
          <div className="mt-10 pt-6 border-t border-outline-variant/40 grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
            {/* Left: Date Conferred */}
            <div className="text-center md:text-left">
              <p className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-wider">DATE CONFERRED</p>
              <p className="font-mono-data text-xs font-bold text-on-surface">{formattedDate}</p>
              <p className="font-mono-data text-[10px] text-secondary">Verified Academic Record</p>
            </div>

            {/* Center: Scannable QR Code Verification */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-xl bg-[#0a0e18] border-2 border-secondary/70 p-1 shadow-[0_0_20px_rgba(255,184,0,0.3)]">
                <img
                  src={qrCodeUrl}
                  alt="Scannable QR Verification Code"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <p className="font-mono-data text-[9px] text-secondary font-bold uppercase tracking-widest mt-1.5">
                SCAN TO VERIFY RECORD
              </p>
            </div>

            {/* Right: Command Authority */}
            <div className="text-center md:text-right">
              <p className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-wider">COMMAND AUTHORITY</p>
              <p className="font-display text-sm font-bold text-secondary italic tracking-wider">
                {certificate.signatureBy || 'UWE Command Council'}
              </p>
              <p className="font-mono-data text-[9px] text-on-surface-variant">Sovereign Directives Directorate</p>
            </div>
          </div>

          {/* Verification Footnote */}
          <div className="mt-6 pt-3 text-center border-t border-outline-variant/20">
            <p className="font-mono-data text-[9px] text-on-surface-variant">
              Online Verification Hash: <span className="text-secondary font-bold">{certificate.id}</span> • Authenticated via UWE Cloud Gateway
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
