"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  MessageSquare,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  HelpCircle,
  Smartphone,
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  const menuItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      roles: ["admin", "manager"],
      group: "MENU",
    },
    {
      name: "Dashboard Pegawai",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "manager", "employee"],
      group: "MENU",
    },
    {
      name: "Input Kehadiran",
      href: "/attendance",
      icon: User,
      roles: ["employee"],
      group: "MENU",
    },
    {
      name: "Employee Portal",
      href: "/input",
      icon: ClipboardList,
      roles: ["admin", "employee"],
      group: "MENU",
    },
    {
      name: "Chatbot AI",
      href: "/chatbot",
      icon: MessageSquare,
      roles: ["admin", "manager"],
      group: "MENU",
    },
    {
      name: "QC Inspection",
      href: "/qc",
      icon: ClipboardCheck,
      roles: ["admin", "qc"],
      group: "MENU",
    },
  ];

  const generalItems = [
    {
      name: "Settings",
      href: "#",
      icon: Settings,
      roles: ["admin"],
      group: "GENERAL",
    },
    {
      name: "Help",
      href: "#",
      icon: HelpCircle,
      roles: ["admin", "employee"],
      group: "GENERAL",
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user.role));
  const filteredGeneralItems = generalItems.filter((item) => item.roles.includes(user.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#f0f2f5] text-slate-800 md:border md:border-[#dbe1eb] md:rounded-[32px] md:shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Brand Logo Area */}
      <div className="h-20 flex items-center px-5.5 md:px-5 md:group-hover:px-6 border-b border-[#dbe1eb] gap-3 transition-all duration-300">
        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 transition-all duration-500 md:group-hover:scale-110 overflow-hidden shadow-xs">
          <img src="/assets/dji-logo.png" alt="DJI Logo" className="w-6 h-6 object-contain" />
        </div>
        <div className="flex flex-col whitespace-nowrap transition-all duration-300 md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden">
          <span className="font-extrabold tracking-tight text-slate-900 leading-tight text-base flex items-center gap-1.5">
            DJI
          </span>
          <span className="text-[8px] text-slate-450 font-extrabold tracking-widest uppercase mt-0.5">Portal & Dashboard</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3.5 py-6 space-y-7">
        {/* Group: MENU */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3.5 block mb-2 md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300">
            Menu
          </span>
          <nav className="space-y-1.5">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-4 px-3.5 h-11 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 group/item cursor-pointer border-none ${
                    isActive
                      ? "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-100/50 text-[#0070bc]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 group-hover/item:scale-105 shrink-0 ${
                    isActive ? "text-[#0070bc]" : "text-slate-400 group-hover/item:text-slate-600"
                  }`} />
                  <span className="whitespace-nowrap transition-all duration-300 md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Group: GENERAL */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3.5 block mb-2 md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden whitespace-nowrap transition-all duration-300">
            General
          </span>
          <nav className="space-y-1.5">
            {filteredGeneralItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-4 px-3.5 h-11 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 group/item cursor-pointer border-none ${
                    isActive
                      ? "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-100/50 text-[#0070bc]"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 group-hover/item:scale-105 shrink-0 ${
                    isActive ? "text-[#0070bc]" : "text-slate-400 group-hover/item:text-slate-600"
                  }`} />
                  <span className="whitespace-nowrap transition-all duration-300 md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden">
                    {item.name}
                  </span>
                </Link>
              );
            })}
            
            {/* Logout Link */}
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-3.5 h-11 rounded-2xl text-xs sm:text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50/80 transition-all duration-300 cursor-pointer group/logout"
            >
              <LogOut className="w-5 h-5 text-slate-400 group-hover/logout:text-red-600 shrink-0 transition-transform duration-300 group-hover/logout:translate-x-0.5" />
              <span className="whitespace-nowrap transition-all duration-300 md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden">
                Logout
              </span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP/TABLET SIDEBAR (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col w-20 hover:w-64 h-[calc(100vh-2rem)] fixed top-4 left-4 z-30 transition-all duration-300 ease-in-out group">
        {SidebarContent()}
      </aside>

      {/* MOBILE HEADER & MOBILE DRAWERS */}
      <header className="md:hidden h-16 w-full fixed top-0 left-0 bg-white border-b border-[#e9ecef] shadow-xs z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7.5 h-7.5 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img src="/assets/dji-logo.png" alt="DJI Logo" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight text-sm flex items-center gap-1.5 leading-none">
            DJI
          </span>
        </div>

        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-slate-500 hover:text-slate-900 focus:outline-none p-1 cursor-pointer"
          aria-label="Toggle Menu"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 animate-fadeIn"
        />
      )}

      {/* MOBILE DRAWER SIDEBAR */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 w-64 h-full z-40 transform transition-transform duration-300 ease-out bg-[#f0f2f5] ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {SidebarContent()}
      </div>
    </>
  );
}
