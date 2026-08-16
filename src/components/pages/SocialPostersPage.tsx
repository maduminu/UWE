import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const SocialPostersPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCaption = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const posters = [
    {
      id: 'post-1',
      title: 'WE ARE HIRING! (Work From Home)',
      themeName: 'Classic Navy & Gold',
      bgGradient: 'from-[#0B172A] via-[#10243E] to-[#0B172A]',
      accentColor: '#FFB800',
      badgeBg: 'bg-[#FFB800] text-black',
      borderColor: 'border-[#FFB800]/50',
      header: 'WE ARE HIRING!',
      subheader: 'Join Our Growing Team at UWE PVT LTD',
      role: 'POSITION: SALES & MARKETING',
      type: 'FULL TIME | PART TIME',
      badges: [
        { icon: 'payments', text: 'ATTRACTIVE INCOME' },
        { icon: 'school', text: 'TRAINING PROVIDED' },
        { icon: 'home', text: 'WORK FROM HOME' },
        { icon: 'star', text: 'NO EXPERIENCE NEEDED' },
      ],
      whatsapp: '071 709 6386',
      caption: `🚀 WE ARE HIRING! JOIN OUR GROWING TEAM AT UWE PVT LTD

Looking for an opportunity to earn an attractive income with flexible working hours right from home? 🏠💻

UWE PVT LTD is expanding! We are offering Full-Time & Part-Time positions in Sales & Marketing for ambitious individuals across Sri Lanka.

✨ WHY JOIN US?
- 💰 Attractive Income Potential
- 🎓 Full Support & Professional Training Provided
- 🕒 Flexible Working Hours
- 🙌 No Prior Experience Needed (Training Available)

📲 HOW TO APPLY?
Send a message directly to our WhatsApp hotline:
👉 WhatsApp: 071 709 6386
🔗 Link: https://wa.me/94717096386?text=Hello%20UWE!%20I%20am%20interested%20in%20the%20Sales%20%26%20Marketing%20Work%20From%20Home%20position.`,
    },
    {
      id: 'post-2',
      title: 'High Income Sales Executive (Emerald & Gold)',
      themeName: 'Emerald Wealth Theme',
      bgGradient: 'from-[#062419] via-[#0D402C] to-[#062419]',
      accentColor: '#2ED573',
      badgeBg: 'bg-[#2ED573] text-black',
      borderColor: 'border-[#2ED573]/50',
      header: 'CAREER OPPORTUNITY!',
      subheader: 'High Income Sales & Marketing Executive',
      role: 'EARN WHAT YOU ARE TRULY WORTH',
      type: 'HIGH COMMISSION + BASE SUPPORT',
      badges: [
        { icon: 'trending_up', text: 'HIGH EARNING POTENTIAL' },
        { icon: 'military_tech', text: 'FAST TEAM LEAD PROMOTION' },
        { icon: 'laptop_mac', text: 'WORK FROM ANYWHERE' },
        { icon: 'support_agent', text: '1-ON-1 SALES MENTORSHIP' },
      ],
      whatsapp: '071 709 6386',
      caption: `💸 STOP WORKING FOR FIXED SALARIES! EARN WHAT YOU ARE TRULY WORTH!

Are you tired of working long hours for a capped monthly income? UWE PVT LTD is hiring Sales & Business Development Executives who want unlimited earning potential!

💚 THE UWE ADVANTAGE:
- 💰 High Income Potential (Base Support + High Commission structure)
- 📈 Rapid Career Advancement to Team Leader within 3 to 6 months
- 🏢 Work From Anywhere / Flexible Office Hybrid
- 🤝 Full Mentorship & Sales Masterclass Provided

📲 TAKE CONTROL OF YOUR FINANCIAL FUTURE:
Send your details directly to our recruitment line:
👉 WhatsApp: 071 709 6386
🔗 Link: https://wa.me/94717096386?text=Hello%20UWE!%20I%20am%20interested%20in%20the%20High%20Income%20Sales%20%26%20Marketing%20Executive%20role.`,
    },
    {
      id: 'post-3',
      title: 'Student & Undergraduate WFH (Purple & Gold)',
      themeName: 'Royal Purple & Sunset Gold',
      bgGradient: 'from-[#1A0B2E] via-[#2A1245] to-[#1A0B2E]',
      accentColor: '#E056FD',
      badgeBg: 'bg-[#E056FD] text-black',
      borderColor: 'border-[#E056FD]/50',
      header: 'EARN WHILE YOU LEARN!',
      subheader: 'Part-Time Work From Home for Students & Undergrads',
      role: 'EARN RS. 40,000 - 80,000+ / MONTH',
      type: 'FLEXIBLE 2-3 HOURS DAILY',
      badges: [
        { icon: 'schedule', text: 'FLEXIBLE HOURS' },
        { icon: 'smartphone', text: 'PHONE / LAPTOP WORK' },
        { icon: 'school', text: 'NO EXPERIENCE NEEDED' },
        { icon: 'badge', text: 'EXPERIENCE CERTIFICATE' },
      ],
      whatsapp: '071 709 6386',
      caption: `🎓 ATTENTION STUDENTS & UNDERGRADS! EARN RS. 40,000 - 80,000+ PER MONTH WHILE STUDYING!

Balancing university lectures with financial independence is tough. That’s why UWE PVT LTD created a dedicated Part-Time Work From Home Program tailored for students!

💜 PERFECT FOR YOU IF YOU WANT:
- 🕒 Flexible Hours: Work 2–3 hours daily after classes or on weekends
- 💻 100% Work From Home using your mobile phone or laptop
- 🏆 No Prior Experience Needed (We train you step-by-step)
- 📜 Official Experience Certificate provided upon performance

📲 START EARNING BEFORE YOU GRADUATE:
👉 WhatsApp: 071 709 6386
🔗 Link: https://wa.me/94717096386?text=Hello%20UWE!%20I%20am%20a%20student%20interested%20in%20the%20Part-Time%20Work%20From%20Home%20program.`,
    },
    {
      id: 'post-4',
      title: 'Team Leader & Manager (Obsidian & Chrome)',
      themeName: 'Executive Obsidian & Chrome',
      bgGradient: 'from-[#0D0F12] via-[#161A22] to-[#0D0F12]',
      accentColor: '#00D2FF',
      badgeBg: 'bg-[#00D2FF] text-black',
      borderColor: 'border-[#00D2FF]/50',
      header: 'LEADERSHIP VACANCY',
      subheader: 'Team Leaders & Sales Managers Wanted',
      role: 'BUILD & COMMAND YOUR OWN MARKETING UNIT',
      type: 'EXECUTIVE OVERRIDE + PROFIT SHARE',
      badges: [
        { icon: 'groups', text: 'LEAD 5-15 PROMOTERS' },
        { icon: 'insights', text: 'EXECUTIVE OVERRIDES' },
        { icon: 'military_tech', text: 'DIRECT STRATEGY ROLE' },
        { icon: 'verified', text: 'IMMEDIATE SELECTION' },
      ],
      whatsapp: '071 709 6386',
      caption: `🏛️ BUILD & COMMAND YOUR OWN MARKETING TEAM AT UWE PVT LTD

Do you have leadership experience, team management skills, or a passion for driving sales results? 

We are seeking Senior Team Leaders & Marketing Managers to build, lead, and expand dedicated promotional units under the UWE banner.

⚔️ POSITION OVERVIEW:
- 👑 Lead & mentor a team of 5–15 Sales Representatives
- 📊 Overriding team bonuses + executive profit share
- 🚀 Direct involvement in campaign strategy and expansion

📲 SCHEDULE A DIRECT LEADERSHIP INTERVIEW:
👉 WhatsApp: 071 709 6386
🔗 Link: https://wa.me/94717096386?text=Hello%20UWE!%20I%20have%20team%20lead/sales%20experience%20and%20want%20to%20apply%20for%20the%20Team%20Leader%20position.`,
    },
    {
      id: 'post-5',
      title: 'Urgent Recruitment - 10 Spots (Crimson & Yellow)',
      themeName: 'Crimson Red Urgency',
      bgGradient: 'from-[#2B090A] via-[#4A1012] to-[#2B090A]',
      accentColor: '#FF4757',
      badgeBg: 'bg-[#FF4757] text-white',
      borderColor: 'border-[#FF4757]/50',
      header: 'URGENT RECRUITMENT!',
      subheader: '10 Vacancies Closing in 48 Hours',
      role: 'START TODAY! EARN TOMORROW!',
      type: 'IMMEDIATE SELECTION BATCH',
      badges: [
        { icon: 'campaign', text: 'LIMITED 10 SPOTS' },
        { icon: 'bolt', text: 'INSTANT ONBOARDING' },
        { icon: 'attach_money', text: 'DAILY/WEEKLY PAYOUTS' },
        { icon: 'check_circle', text: 'AGE 18+ (M/F)' },
      ],
      whatsapp: '071 709 6386',
      caption: `🚨 URGENT RECRUITMENT: 10 VACANCIES LEFT FOR THIS MONTH'S BATCH!

Great opportunities don't wait — and neither should you! UWE PVT LTD is finalizing selections for our upcoming batch within 48 hours.

⚡ WE ARE LOOKING FOR:
- 👤 5 Sales & Marketing Officers (Full-Time)
- 👤 5 Work-From-Home Promoters (Part-Time)

🎯 QUALIFICATIONS:
- Good communication skills
- Positive attitude & eagerness to learn
- Age 18+ (Male / Female)

📲 IMMEDIATE ONBOARDING — CONTACT US NOW:
👉 WhatsApp: 071 709 6386
🔗 Link: https://wa.me/94717096386?text=Hello%20UWE!%20I%20am%20applying%20for%20the%20Urgent%20Recruitment%20batch%20position.%20Please%20reserve%20a%20spot.`,
    },
  ];

  return (
    <div className="pt-xl md:pt-[120px] pb-xl flex-grow bg-transparent relative">
      <section className="max-w-container-max mx-auto px-4 md:px-lg py-lg text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display-xl text-3xl sm:text-4xl md:text-display-xl text-on-surface mb-xs font-black"
        >
          Facebook <span className="text-secondary text-glow-gold">Recruitment Posts &amp; Flyers</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto"
        >
          5 Distinct high-converting job offer flyers &amp; Facebook captions featuring WhatsApp number <strong className="text-secondary">071 709 6386</strong>.
        </motion.p>
      </section>

      {/* Posters & Captions Gallery */}
      <section className="max-w-container-max mx-auto px-4 md:px-lg space-y-xl relative z-10">
        {posters.map((poster, index) => (
          <motion.div
            key={poster.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="glass-card rounded-2xl border border-outline-variant/40 overflow-hidden p-4 sm:p-lg grid grid-cols-1 lg:grid-cols-2 gap-6 items-center shadow-2xl"
          >
            {/* Rendered Visual Flyer Graphic Card */}
            <div className={`rounded-xl p-6 sm:p-8 bg-gradient-to-b ${poster.bgGradient} border ${poster.borderColor} shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between min-h-[420px]`}>
              {/* Top Company Header */}
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-secondary/20 border border-secondary flex items-center justify-center font-bold text-secondary text-xs">
                    UWE
                  </div>
                  <div>
                    <h4 className="font-headline-md text-sm font-black text-white tracking-wider">UWE PVT LTD</h4>
                    <span className="font-mono-data text-[10px] text-on-surface-variant uppercase block">Building Careers</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono-data px-2.5 py-1 rounded-full font-bold uppercase ${poster.badgeBg}`}>
                  {poster.themeName}
                </span>
              </div>

              {/* Central Bold Offer Typography */}
              <div className="my-6 z-10">
                <span className="font-mono-data text-xs text-secondary tracking-widest font-bold block mb-1">
                  GREAT OPPORTUNITY AWAITS YOU!
                </span>
                <h2 className="font-display-xl text-3xl sm:text-4xl text-white font-black leading-tight drop-shadow-md">
                  {poster.header}
                </h2>
                <p className="font-headline-md text-sm sm:text-base text-secondary font-bold mt-1">
                  {poster.subheader}
                </p>
                <div className="mt-3 inline-block px-3 py-1.5 rounded bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono-data text-white font-bold">
                  {poster.role}
                </div>
              </div>

              {/* 4 Feature Badges Grid */}
              <div className="grid grid-cols-2 gap-2 z-10 my-2">
                {poster.badges.map((b, i) => (
                  <div key={i} className="p-2 rounded bg-black/40 border border-white/10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-secondary">{b.icon}</span>
                    <span className="font-mono-data text-[10px] sm:text-xs text-white font-bold">{b.text}</span>
                  </div>
                ))}
              </div>

              {/* WhatsApp Call to Action Footer */}
              <div className="mt-4 pt-4 border-t border-white/15 flex flex-col sm:flex-row justify-between items-center gap-3 z-10 bg-[#25D366]/10 p-3 rounded-xl border border-[#25D366]/40">
                <div className="flex items-center gap-2 text-[#25D366]">
                  <span className="material-symbols-outlined text-2xl animate-bounce">chat</span>
                  <div>
                    <span className="font-label-caps text-[10px] text-white uppercase block">FOR MORE DETAILS</span>
                    <span className="font-mono-data text-base font-black tracking-wider text-[#25D366]">
                      WHATSAPP {poster.whatsapp}
                    </span>
                  </div>
                </div>
                <a
                  href={`https://wa.me/94717096386?text=${encodeURIComponent(poster.caption)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded bg-[#25D366] text-black font-label-caps text-xs font-bold uppercase hover:scale-105 transition-transform flex items-center gap-1"
                >
                  <span>APPLY ON WHATSAPP</span>
                  <span className="material-symbols-outlined text-xs">east</span>
                </a>
              </div>
            </div>

            {/* Right Column: Copywriting Caption & Quick Action */}
            <div className="flex flex-col justify-between h-full gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-headline-md text-lg font-bold text-on-surface">
                    {poster.title}
                  </h3>
                  <button
                    onClick={() => copyCaption(poster.id, poster.caption)}
                    className="px-3 py-1.5 rounded glass-panel text-xs font-mono-data text-secondary border border-secondary/40 hover:bg-secondary/20 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedId === poster.id ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedId === poster.id ? 'COPIED!' : 'COPY CAPTION'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-surface-container/80 border border-outline-variant/30 font-body-md text-xs sm:text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto">
                  {poster.caption}
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={`https://wa.me/94717096386?text=${encodeURIComponent(poster.caption)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-elite min-h-[44px] flex-1 py-2.5 rounded font-label-caps text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>SEND TEST MESSAGE</span>
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};
