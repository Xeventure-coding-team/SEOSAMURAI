"use client";

import { useState, useEffect, useMemo } from "react";

type WebsiteData = {
  title: string;
  logoUrl?: string;
};

export function Navbar({
  website,
  sections,
  phone,
  primaryColor: propPrimaryColor, // Accept as prop instead of reading from DOM
}: {
  website: Pick<WebsiteData, "title" | "logoUrl">;
  sections: string[];
  phone?: string;
  primaryColor?: string; // Add as optional prop
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("");
  
  // Use prop or fallback to CSS variable (only on client)
  const [primaryColor, setPrimaryColor] = useState(propPrimaryColor || "#3b82f6");

  // Get primary color from CSS variable on client side only
  useEffect(() => {
    if (!propPrimaryColor && typeof window !== "undefined") {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim();
      if (color) {
        setPrimaryColor(color);
      }
    }
  }, [propPrimaryColor]);

  // Nav links (filtered)
  const navLinks = useMemo(
    () =>
      [
        { id: "about", label: "About" },
        { id: "reviews", label: "Reviews" },
        { id: "gallery", label: "Gallery" },
        { id: "hours", label: "Hours" },
        { id: "contact", label: "Contact" },
      ].filter((l) => sections.includes(l.id)),
    [sections]
  );

  // Navbar shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active section detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-40% 0px -50% 0px",
        threshold: 0.1,
      }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#mobile-menu") && !target.closest("#menu-btn")) {
        setMobileOpen(false);
      }
    };

    if (mobileOpen) {
      document.addEventListener("click", handleClick);
    }

    return () => document.removeEventListener("click", handleClick);
  }, [mobileOpen]);

  // Close menu on hash change
  useEffect(() => {
    const closeMenu = () => setMobileOpen(false);
    window.addEventListener("hashchange", closeMenu);
    return () => window.removeEventListener("hashchange", closeMenu);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100"
            : "bg-white/90 backdrop-blur-sm border-b border-gray-100"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              {website.logoUrl && (
                <img
                  src={website.logoUrl}
                  alt={website.title}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              )}
              <span className="font-semibold text-base text-gray-900">
                {website.title}
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = active === link.id;

                return (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : {}}
                  >
                    {link.label}
                  </a>
                );
              })}

              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="ml-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Call Now
                </a>
              )}
            </div>

            {/* Mobile Button */}
            <button
              id="menu-btn"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="md:hidden p-1.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100 px-2 py-2 space-y-1"
          >
            {navLinks.map((link) => {
              const isActive = active === link.id;
              
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  style={isActive ? { backgroundColor: primaryColor } : {}}
                >
                  {link.label}
                </a>
              );
            })}

            {phone && (
              <>
                <div className="border-t border-gray-100 my-2" />
                <a
                  href={`tel:${phone}`}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-white text-center transition-all duration-200 hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Call {phone}
                </a>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}