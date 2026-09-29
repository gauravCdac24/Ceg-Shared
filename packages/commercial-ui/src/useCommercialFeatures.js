import { useEffect, useState } from 'react';

export function useCommercialFeatures({ product, fetchFeatures }) {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchFeatures(product);
        if (!cancelled) setFeatures(data?.features || data || {});
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product, fetchFeatures]);

  const hasFeature = (feature) => Boolean(features[feature]);

  return { features, hasFeature, loading, error };
}
