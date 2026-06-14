import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  jsonLd?: Record<string, any>;
}

const SEOHead = ({ title, description, canonical, jsonLd }: SEOHeadProps) => {
  const location = useLocation();
  const baseUrl = 'https://hydrentals.lovable.app';
  const fullCanonical = canonical || `${baseUrl}${location.pathname}`;

  const defaultTitle = 'HydRent - Find Rental Homes in Hyderabad | PG, Apartments, Shared Rooms';
  const defaultDesc = 'Find verified rental properties in Hyderabad. Browse PGs, apartments, co-living spaces near HITEC City, Gachibowli, Madhapur. Trusted by 50,000+ tenants.';

  const pageTitle = title ? `${title} | HydRent` : defaultTitle;
  const pageDesc = description || defaultDesc;

  useEffect(() => {
    document.title = pageTitle;

    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', pageDesc);
    setMeta('og:title', pageTitle, 'property');
    setMeta('og:description', pageDesc, 'property');
    setMeta('og:url', fullCanonical, 'property');
    setMeta('YouTube:title', pageTitle, 'name');
    setMeta('YouTube:description', pageDesc, 'name');

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', fullCanonical);

    // JSON-LD
    const existingLd = document.getElementById('seo-jsonld');
    if (existingLd) existingLd.remove();

    const ldData = jsonLd || {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'HydRent',
      url: baseUrl,
      description: defaultDesc,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/properties?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    const script = document.createElement('script');
    script.id = 'seo-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ldData);
    document.head.appendChild(script);

    return () => {
      const s = document.getElementById('seo-jsonld');
      if (s) s.remove();
    };
  }, [pageTitle, pageDesc, fullCanonical, jsonLd]);

  return null;
};

export default SEOHead;
