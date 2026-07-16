import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, LayoutGrid, ShieldCheck } from 'lucide-react';
import { Header } from '../components/Header';
import FLAGSHIP_HERO from '../assets/hero_devices.jpg';

const flagshipSeries = [
  {
    id: 's',
    name: 'S-Series',
    tagline: 'Ultra performance and the most advanced camera system in mobile.',
    icon: Smartphone,
    iconBg: 'bg-[#E8F0FE]',
    iconColor: 'text-[#1B4EFF]',
    to: '/product/s26-ultra',
  },
  {
    id: 'z',
    name: 'Z-Series',
    tagline: "Innovation meets portability with the world's most advanced foldables.",
    icon: LayoutGrid,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    to: '/product/z-fold-7',
  },
  {
    id: 'a',
    name: 'A-Series',
    tagline: "Everything you need in a smartphone at a price you'll love.",
    icon: ShieldCheck,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    to: '/product/a56',
  },
];


export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Header showAbout />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="fade-up">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-black leading-[1.05]">
              Find Your<br /><span className="text-[#1B4EFF]">Perfect Galaxy</span>
            </h1>
            <p className="mt-6 text-lg text-gray-500 max-w-md leading-relaxed">
              Personalized recommendations.<br />Smarter choices. Built for you.
            </p>
            <div className="mt-10">
              <Link
                to="/choose-mode"
                data-testid="hero-get-started-btn"
                className="inline-flex items-center gap-2 bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full px-8 py-4 font-semibold btn-primary-glow transition-all"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center items-center min-h-[440px]">
            <div className="hero-glow absolute inset-0 rounded-[3rem] bg-gradient-to-br from-blue-100 via-blue-50 to-white opacity-70 blur-3xl" />
            <div className="hero-device relative w-full max-w-xl aspect-[16/9] rounded-[2.5rem] overflow-hidden shadow-[0_30px_80px_rgba(27,78,255,0.20)]">
              <img
                src={FLAGSHIP_HERO}
                alt="Samsung Galaxy S26 Ultra — latest flagship"
                className="w-full h-full object-cover"
                data-testid="hero-flagship-image"
              />
            </div>
          </div>
        </div>

        {/* Flagship Series Showcase */}
        <div className="mt-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B4EFF] mb-2">Explore the Lineup</div>
              <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-black">Samsung Galaxy Flagship Models</h2>
            </div>
            <Link to="/models" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[#1B4EFF] hover:text-[#1428A0]" data-testid="view-all-models-link">
              View all models <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {flagshipSeries.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  data-testid={`series-card-${s.id}`}
                  className={`fade-up fade-up-${(i % 3) + 1} group bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(27,78,255,0.12)] hover:-translate-y-1 transition-all duration-300`}
                >
                  <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div className="text-lg font-extrabold text-black">{s.name}</div>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed min-h-[3rem]">{s.tagline}</p>
                  <Link
                    to={s.to}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#1B4EFF] hover:text-[#1428A0]"
                    data-testid={`view-models-${s.id}`}
                  >
                    View Models <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
