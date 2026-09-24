/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Boutons d'action : un seul bouton principal (doré) par page, les autres en contour
export const btnPrimary =
  'px-4 py-2 text-xs bg-[#bda165] hover:bg-[#cca96e] text-black font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer';
export const btnSecondary =
  'px-4 py-2 text-xs bg-[#171e2c] hover:bg-[#1f283d] text-gray-300 hover:text-white border border-[#27354d] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

// En-tête commun à toutes les pages : titre et description à gauche, actions à droite
export default function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex justify-between items-center flex-wrap gap-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-white font-sans">{title}</h1>
        {description && <p className="text-xs text-gray-400 mt-0.5 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
