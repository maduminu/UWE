import React from 'react';
import { Helmet } from 'react-helmet-async';

interface PageSEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

const SITE_NAME = 'Unity Warriors Empire';
const DEFAULT_OG_IMAGE = '/og-default.jpg';
const BASE_URL = 'https://uwe-pearl.vercel.app';

/**
 * Drop-in per-page SEO component.
 * Injects <title>, meta description, Open Graph, Twitter Card,
 * and canonical link tags via react-helmet-async.
 */
export const PageSEO: React.FC<PageSEOProps> = ({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
}) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={`${BASE_URL}${ogImage}`} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${BASE_URL}${ogImage}`} />
    </Helmet>
  );
};
