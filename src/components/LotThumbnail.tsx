/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Lot } from '../types';

// Cache de session : une photo n'est demandée qu'une fois, même si la carte du lot
// est réaffichée. Les listes de lots ne transportent pas les images.
const imageCache = new Map<string, string | null>();

export default function LotThumbnail({ lot }: { lot: Lot }) {
  const [src, setSrc] = useState<string | null>(lot.image || imageCache.get(lot.id) || null);

  useEffect(() => {
    if (lot.image) { setSrc(lot.image); return; }
    if (!lot.hasImage) { setSrc(null); return; }
    const cached = imageCache.get(lot.id);
    if (cached !== undefined) { setSrc(cached); return; }
    let cancelled = false;
    fetch(`/api/lots/${lot.id}/image`)
      .then(r => (r.ok ? r.json() : { image: null }))
      .then(d => {
        imageCache.set(lot.id, d.image || null);
        if (!cancelled) setSrc(d.image || null);
      })
      .catch(() => { /* miniature facultative */ });
    return () => { cancelled = true; };
  }, [lot.id, lot.image, lot.hasImage]);

  if (!src) return null;
  return (
    <img
      src={src}
      alt="Aperçu du lot"
      referrerPolicy="no-referrer"
      className="w-12 h-12 object-cover rounded-lg border border-gray-800 bg-black shrink-0 animate-fadeIn"
    />
  );
}
