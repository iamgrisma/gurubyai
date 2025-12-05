// components/shared/SEO.tsx

import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article';
    noindex?: boolean;
}

const DEFAULT_SEO = {
    title: 'Guruba - Nepal\'s Premier Platform for Vedic & Spiritual Services',
    description: 'Connect with experienced Gurubas for Pujas, Havans, Bratabandha, and more. Book verified Pandits and Lamas for authentic Vedic rituals across Nepal.',
    keywords: 'guruba, pandit, puja, nepal, vedic rituals, bratabandha, havan, spiritual services, hindu priest, lama, buddhist rituals',
    image: 'https://images.unsplash.com/photo-1609797636017-29c0d309294a?q=80&w=1200&auto=format&fit=crop',
    url: 'https://guruba.com',
    type: 'website' as const,
};

export const SEO: React.FC<SEOProps> = ({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    noindex = false,
}) => {
    const seo = {
        title: title ? `${title} | Guruba` : DEFAULT_SEO.title,
        description: description || DEFAULT_SEO.description,
        keywords: keywords || DEFAULT_SEO.keywords,
        image: image || DEFAULT_SEO.image,
        url: url || DEFAULT_SEO.url,
        type,
    };

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{seo.title}</title>
            <meta name="description" content={seo.description} />
            <meta name="keywords" content={seo.keywords} />

            {/* Robots */}
            {noindex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={seo.type} />
            <meta property="og:url" content={seo.url} />
            <meta property="og:title" content={seo.title} />
            <meta property="og:description" content={seo.description} />
            <meta property="og:image" content={seo.image} />
            <meta property="og:site_name" content="Guruba" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={seo.url} />
            <meta name="twitter:title" content={seo.title} />
            <meta name="twitter:description" content={seo.description} />
            <meta name="twitter:image" content={seo.image} />

            {/* Additional SEO */}
            <link rel="canonical" href={seo.url} />
            <meta name="author" content="Guruba" />
            <meta name="language" content="English" />
            <meta name="geo.region" content="NP" />
            <meta name="geo.placename" content="Nepal" />
        </Helmet>
    );
};
