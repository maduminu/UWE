import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../services/api';

interface ActiveBanner {
  id: string;
  message: string;
  badgeText?: string;
  bannerType?: 'URGENT' | 'PROMO' | 'INFO';
  linkUrl?: string;
  isActive?: boolean;
}

const bannerStyles: Record<string, string> = {
  URGENT: 'border-red-500/50 bg-red-500/10 text-red-100',
  PROMO: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-100',
  INFO: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-100',
};

export const ActiveBannerBar: React.FC = () => {
  const [banner, setBanner] = useState<ActiveBanner | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBanner = async () => {
      try {
        const res = await fetch(`${API_BASE}/banners/active`);
        if (!res.ok) return;

        const json = await res.json();
        const activeBanner = Array.isArray(json?.data) ? json.data[0] : json?.data;

        if (isMounted && activeBanner?.isActive) {
          setBanner(activeBanner);
        } else if (isMounted) {
          setBanner(null);
        }
      } catch {
        if (isMounted) {
          setBanner(null);
        }
      }
    };

    loadBanner();
    const intervalId = window.setInterval(loadBanner, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (!banner) return null;

  const styleClass = bannerStyles[banner.bannerType || 'INFO'];

  return (
    <div className={`border-b ${styleClass}`}>
      <div className="max-w-container-max mx-auto px-4 sm:px-lg py-2.5 flex items-center justify-center gap-3 text-center">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-current/30 bg-black/10 text-[10px] font-mono-data uppercase tracking-[0.2em] whitespace-nowrap">
          {banner.badgeText || banner.bannerType || 'ANNOUNCEMENT'}
        </span>

        <p className="text-xs sm:text-sm font-body-md leading-relaxed truncate">
          {banner.message}
        </p>

        {banner.linkUrl && (
          <a
            href={banner.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] sm:text-xs font-mono-data uppercase tracking-[0.18em] underline underline-offset-2 whitespace-nowrap"
          >
            VIEW
          </a>
        )}
      </div>
    </div>
  );
};
