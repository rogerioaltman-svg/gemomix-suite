/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Layers, FileCheck, ShoppingBag, Sparkles, Receipt, Users,
  Search, Award, Cpu, Trash2, Settings, ChevronsLeft, ChevronsRight
} from 'lucide-react';

interface NavItem {
  id: string;
  tab: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  selectedTab: string;
  onSelectTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenTrash: () => void;
}

const METIER_ITEMS: NavItem[] = [
  { id: 'tab-dashboard-sidebar', tab: 'dashboard', label: 'Tableau de Bord', icon: <Layers className="h-4 w-4" /> },
  { id: 'tab-inventory-sidebar', tab: 'inventory', label: 'Inventaire', icon: <FileCheck className="h-4 w-4" /> },
  { id: 'tab-purchases-sidebar', tab: 'purchases', label: 'Achats', icon: <ShoppingBag className="h-4 w-4 text-emerald-400" /> },
  { id: 'tab-bijoux-sidebar', tab: 'bijoux', label: 'Bijoux', icon: <Sparkles className="h-4 w-4 text-pink-400" /> },
  { id: 'tab-invoices-sidebar', tab: 'invoices', label: 'Facturation', icon: <Receipt className="h-4 w-4 text-amber-400" /> },
  { id: 'tab-contacts-sidebar', tab: 'contacts', label: 'Tiers & CSV', icon: <Users className="h-4 w-4 text-blue-400" /> }
];

const OUTILS_ITEMS: NavItem[] = [
  { id: 'tab-identifier-sidebar', tab: 'identifier', label: 'Identificateur', icon: <Search className="h-4 w-4" /> },
  { id: 'tab-ai-sidebar', tab: 'ai', label: 'Lab Copilot', icon: <Cpu className="h-4 w-4 text-amber-500" /> }
];

export default function Sidebar({ selectedTab, onSelectTab, collapsed, onToggleCollapsed, onOpenTrash }: SidebarProps) {
  const renderItem = (item: NavItem) => {
    const isActive = selectedTab === item.tab;
    return (
      <button
        key={item.id}
        id={item.id}
        onClick={() => onSelectTab(item.tab)}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[#bda165] text-black' : 'text-gray-300 hover:bg-[#161d2d] hover:text-white'}`}
      >
        {item.icon}
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  return (
    <aside className={`hidden md:flex flex-col shrink-0 bg-[#101421] border-r border-[#1f283d] sticky top-[64px] h-[calc(100vh-64px)] transition-all duration-200 no-print ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="flex-grow overflow-y-auto py-4 px-2.5 space-y-5">
        <div className="space-y-1">
          {!collapsed && <p className="text-[10px] font-mono uppercase tracking-wider text-[#b4985c] px-3 mb-1.5">Métier</p>}
          {METIER_ITEMS.map(renderItem)}
        </div>
        <div className="space-y-1">
          {!collapsed && <p className="text-[10px] font-mono uppercase tracking-wider text-[#b4985c] px-3 mb-1.5">Outils</p>}
          {OUTILS_ITEMS.map(renderItem)}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#1f283d] p-2.5 space-y-1">
        <button
          id="tab-trash-sidebar"
          onClick={onOpenTrash}
          title={collapsed ? 'Corbeille' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${collapsed ? 'justify-center' : ''} ${selectedTab === 'trash' ? 'bg-[#bda165] text-black' : 'text-gray-300 hover:bg-[#161d2d] hover:text-white'}`}
        >
          <Trash2 className="h-4 w-4" />
          {!collapsed && <span className="whitespace-nowrap">Corbeille</span>}
        </button>
        <button
          id="tab-settings-sidebar"
          onClick={() => onSelectTab('settings')}
          title={collapsed ? 'Paramètres' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${collapsed ? 'justify-center' : ''} ${selectedTab === 'settings' ? 'bg-[#bda165] text-black' : 'text-gray-300 hover:bg-[#161d2d] hover:text-white'}`}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span className="whitespace-nowrap">Paramètres</span>}
        </button>
        <button
          id="sidebar-collapse-toggle"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-[#161d2d] hover:text-white transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span className="whitespace-nowrap">Replier</span>}
        </button>
      </div>
    </aside>
  );
}
