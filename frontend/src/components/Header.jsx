import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, HelpCircle, X, Sparkles, ListChecks, ShoppingBag } from 'lucide-react';

const ABOUT_POINTS = [
  { icon: ListChecks, title: 'Answer a few questions', body: 'Tell us who you are, what matters to you and your budget — we score every Galaxy phone against your answers.' },
  { icon: Sparkles, title: 'Or just chat', body: 'Describe what you need in your own words and Galaxy AI narrows the lineup down for you.' },
  { icon: ShoppingBag, title: 'Compare and buy', body: 'Put models side by side, then jump straight to Samsung, Amazon or Flipkart to buy.' },
];

export const Header = ({ variant = 'default', onBack, showAbout = false }) => {
  const nav = useNavigate();
  const loc = useLocation();
  const showBack = variant === 'inner' && loc.pathname !== '/';
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {variant === 'default' && (
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-black">SAMSUNG</span>
            </div>
          )}
          <Link to="/" data-testid="brand-logo" className="flex items-center gap-1">
            <span className="text-lg font-extrabold tracking-tight text-black">Galaxy</span>
            <span className="text-lg font-extrabold tracking-tight text-[#1B4EFF]">Pick</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {showBack ? (
            <button
              data-testid="header-back-btn"
              onClick={() => (onBack ? onBack() : nav(-1))}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : showAbout ? (
            <button
              data-testid="about-btn"
              onClick={() => setAboutOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-black transition-colors"
            >
              About GalaxyPick <HelpCircle className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Portalled: the header's backdrop-blur makes it a containing block for
          fixed children, which would trap and clip this dialog inside the bar. */}
      {aboutOpen && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAboutOpen(false)}>
          <div data-testid="about-dialog" className="bg-white rounded-3xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-extrabold tracking-tight text-black">Galaxy</span>
                  <span className="text-lg font-extrabold tracking-tight text-[#1B4EFF]">Pick</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Find the Samsung Galaxy that actually fits you.</p>
              </div>
              <button
                data-testid="about-close"
                onClick={() => setAboutOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {ABOUT_POINTS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#1B4EFF]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-black">{title}</div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setAboutOpen(false); nav('/models'); }}
              data-testid="about-browse-btn"
              className="mt-6 w-full bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full py-2.5 text-sm font-semibold transition-colors"
            >
              Browse all models
            </button>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
