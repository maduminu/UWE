import React from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
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

export const AboutPage: React.FC = () => {
  const commanders = [
    {
      name: 'Commander Alpha',
      role: 'Founder & Chief Strategist',
      spec: 'Cognitive Warfare & Corporate Restructuring',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDjpg0AGia43-rbNPvi2fSeq6I-hta6KbCuKZfR3sRGPtzietHKgs-HWInjvD7KJGCrkYM2BvvsNHNWnLnqTtpd6c3GiH22Zzz7KN3GrCGOd9Mrc_VN3S3znSr4EuWfoaFervE3_AZQwCtIhKgVEeP2dopXegHYEsHxOu3EARROoP4hBylfIotKLQPAYzjP-3FKfFjDPp8JMk0ebdm6EjK50NgYPUPgIQSD24FRv8hIPKpGFPyTb49',
    },
    {
      name: 'Commander Beta',
      role: 'Director of Mind Optimization',
      spec: 'Neuro-Linguistic & Subconscious Rewiring',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOut3whLRgoUFSIyFGniJRuuyT_HCo5qw-OsMbWWTOxP7PnDd_gOhbZTvq2aDx4EEGJMCVNi43ARkSyG7a-5MFr6D5UnPOeQUBPbZjyzVXo4Y0isCptzDUY0aNBlqWx1qNDqWEWshH_gFC0wv-rlhbEA20EwKDYqb9GRRpa4l_3UO8knTgABHpIqM09KvF9Id-CHJvEf4fyLtSu0EvLFwmgWpUMmNdgj-_EqlNNtzKVeimFBsjvDZt',
    },
    {
      name: 'Commander Gamma',
      role: 'Head of Leadership Academy',
      spec: 'High-Stakes Crisis & Team Dynamics',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDjpg0AGia43-rbNPvi2fSeq6I-hta6KbCuKZfR3sRGPtzietHKgs-HWInjvD7KJGCrkYM2BvvsNHNWnLnqTtpd6c3GiH22Zzz7KN3GrCGOd9Mrc_VN3S3znSr4EuWfoaFervE3_AZQwCtIhKgVEeP2dopXegHYEsHxOu3EARROoP4hBylfIotKLQPAYzjP-3FKfFjDPp8JMk0ebdm6EjK50NgYPUPgIQSD24FRv8hIPKpGFPyTb49',
    },
    {
      name: 'Commander Delta',
      role: 'Incubator Lead',
      spec: 'Venture Capital & Ecosystem Building',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOut3whLRgoUFSIyFGniJRuuyT_HCo5qw-OsMbWWTOxP7PnDd_gOhbZTvq2aDx4EEGJMCVNi43ARkSyG7a-5MFr6D5UnPOeQUBPbZjyzVXo4Y0isCptzDUY0aNBlqWx1qNDqWEWshH_gFC0wv-rlhbEA20EwKDYqb9GRRpa4l_3UO8knTgABHpIqM09KvF9Id-CHJvEf4fyLtSu0EvLFwmgWpUMmNdgj-_EqlNNtzKVeimFBsjvDZt',
    },
  ];

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative">
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg md:py-xl text-center md:text-left relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/5 via-transparent to-transparent pointer-events-none -z-10" />
        <motion.h1
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-secondary mb-md tracking-tighter drop-shadow-[0_0_15px_rgba(255,219,157,0.3)] font-black"
        >
          Forging Leaders,<br /> Rewiring Minds,<br /> Building Empires
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-body-lg text-sm sm:text-base md:text-body-lg text-on-surface-variant max-w-3xl md:mx-0 mx-auto leading-relaxed"
        >
          The story and driving force behind Sri Lanka's leading personal growth and corporate development institution.
        </motion.p>
      </section>

      {/* Brand Story & Origin */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg md:py-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-lg items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-secondary mb-md font-bold">
              THE ORIGIN
            </h2>
            <div className="space-y-sm text-on-surface-variant font-body-lg text-sm sm:text-base leading-relaxed">
              <p>
                Unity Warriors Empire (UWE) was forged in the fires of necessity. Recognizing a critical void in elite leadership and profound mental resilience training, UWE was established to construct individuals capable of dominating their professional and personal battlefields.
              </p>
              <p>
                Our foundation rests on the unbreakable triad: <strong>Mind Optimization (BMB)</strong>, the <strong>Leadership Academy</strong>, and <strong>UWE IGNIT</strong>. BMB rewires the subconscious, destroying limiting paradigms. The Leadership Academy instills tactical, uncompromising command skills. Finally, UWE IGNIT serves as the crucible where these hardened minds launch entrepreneurial ventures, turning vision into empire.
              </p>
              <p className="font-semibold text-on-surface">
                We do not just teach; we forge.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-xl overflow-hidden glass-card aspect-square md:aspect-auto md:h-full min-h-[300px] sm:min-h-[400px] flex items-center justify-center glow-accent border border-outline-variant/40 shadow-2xl group"
          >
            <img 
              className="w-full h-full object-cover absolute inset-0 opacity-85 group-hover:scale-105 transition-transform duration-700"
              alt="UWE Tactical Command"
              src="https://lh3.googleusercontent.com/aida/AP1WRLsd2Hk0LpcwD4K1lWq2I3pZUnFUznF0wtN79xQ5VUeaGZPxdH5zFLw-3zr5WUGFNJQ3vqtRLZwAaiRdgwq2363NQyK25OJpN3a0Ug7_wSTHgGzG6vOnbASqvaanwJsQUwkebU03NpRaRpDswlfmCy7cM3AUJqmRAdU2n_zPsRyE_x5MtgVGWuHzAcFC9ocPfYOHqBvG_Aah41g0wykfbCa-aykfpZBop-GY_J4GUwesm5xG5qT8IKMTNw" 
            />
          </motion.div>
        </div>
      </section>

      {/* Core Doctrine Grid */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg md:py-xl">
        <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-secondary mb-lg text-center tracking-tight font-bold">
          CORE DOCTRINE
        </h2>
        <motion.div
          variants={containerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-md"
        >
          {/* Card 1 */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="glass-card rounded-lg p-6 flex flex-col items-start transition-colors duration-300 group border-t-2 border-t-primary-container"
          >
            <span className="material-symbols-outlined text-primary-container text-4xl mb-sm group-hover:scale-110 group-hover:rotate-12 transition-transform">
              psychology
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">Mind Resilience</h3>
            <p className="font-body-md text-sm text-on-surface-variant flex-grow">
              Overcoming subconscious limits and rewiring the brain for sustained high performance under extreme pressure.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="glass-card rounded-lg p-6 flex flex-col items-start transition-colors duration-300 group border-t-2 border-t-[#ff000a]"
          >
            <span className="material-symbols-outlined text-[#ff000a] text-4xl mb-sm group-hover:scale-110 group-hover:rotate-12 transition-transform">
              military_tech
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">Uncompromising Leadership</h3>
            <p className="font-body-md text-sm text-on-surface-variant flex-grow">
              Leading with unshakeable integrity and authority, commanding respect and driving units to absolute victory.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="glass-card rounded-lg p-6 flex flex-col items-start transition-colors duration-300 group border-t-2 border-t-secondary"
          >
            <span className="material-symbols-outlined text-secondary text-4xl mb-sm group-hover:scale-110 group-hover:rotate-12 transition-transform">
              local_fire_department
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">Entrepreneurial Grit</h3>
            <p className="font-body-md text-sm text-on-surface-variant flex-grow">
              Turning relentless innovation into highly profitable, scalable enterprises. The stamina to outlast the competition.
            </p>
          </motion.div>

          {/* Card 4 */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="glass-card rounded-lg p-6 flex flex-col items-start transition-colors duration-300 group border-t-2 border-t-on-surface-variant"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-sm group-hover:scale-110 group-hover:rotate-12 transition-transform">
              groups
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">Unity &amp; Strength</h3>
            <p className="font-body-md text-sm text-on-surface-variant flex-grow">
              Empowering the collective through synchronized growth. A legion is only as strong as its cohesive foundation.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Leadership Section with Staggered Commander Cards */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg md:py-xl">
        <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-secondary mb-lg text-center tracking-tight font-bold">
          THE COMMANDERS
        </h2>
        <motion.div
          variants={containerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-md"
        >
          {commanders.map((mentor, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              className="glass-card rounded-lg overflow-hidden group hover:border-secondary/50 transition-all duration-300 shadow-xl"
            >
              <div className="h-64 bg-surface-container-high relative overflow-hidden">
                <img 
                  className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                  alt={mentor.name}
                  src={mentor.img}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent opacity-80" />
              </div>
              <div className="p-4 sm:p-sm">
                <h4 className="font-headline-md text-headline-md text-on-surface mb-1 font-bold">{mentor.name}</h4>
                <p className="font-label-caps text-xs text-secondary mb-sm">{mentor.role}</p>
                <p className="font-mono-data text-xs text-on-surface-variant mb-md min-h-[3rem]">{mentor.spec}</p>
                <div className="text-on-surface-variant group-hover:text-secondary transition-colors flex items-center gap-2 cursor-pointer active-press">
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">link</span>
                  <span className="font-mono-data text-xs">CONNECT</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
};
