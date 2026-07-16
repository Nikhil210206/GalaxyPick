import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BatteryFull, Zap, Camera, Monitor, Shield, Music, Wallet, ArrowRight, Check } from 'lucide-react';
import { Header } from '../components/Header';
import { useGalaxy } from '../context/GalaxyContext';

// Every id here must exist in the catalog's match_tags, or the need silently scores
// nothing — tests/test_wizard_contract.py enforces that. 'storage' was removed rather
// than tagged: the catalog carries no storage spec, so there is nothing to match on.
export const NEEDS = [
  { id: 'battery', title: 'All-day Battery', body: 'For long classes and study sessions', icon: BatteryFull },
  { id: 'performance', title: 'Performance', body: 'Smooth multitasking and fast apps', icon: Zap },
  { id: 'camera', title: 'Camera', body: 'Capture notes, projects and memories', icon: Camera },
  { id: 'display', title: 'Display', body: 'Comfortable for reading & studying', icon: Monitor },
  { id: 'durability', title: 'Durability', body: 'Built to last through daily use', icon: Shield },
  { id: 'entertainment', title: 'Entertainment', body: 'Movies, music and gaming', icon: Music },
  { id: 'budget', title: 'Budget Friendly', body: 'Get the best value for money', icon: Wallet },
];

const SIDEBAR = [
  { label: 'Persona', done: true },
  { label: 'Needs', active: true },
  { label: 'Budget' },
  { label: 'Preferences' },
  { label: 'Summary' },
];

export default function Needs() {
  const nav = useNavigate();
  const { needs, setNeeds, userName } = useGalaxy();
  const [local, setLocal] = useState(needs);

  const toggle = (id) => {
    setLocal(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length < 3 ? [...prev, id] : prev));
  };
  const next = () => { setNeeds(local); nav('/budget'); };

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-5 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-1">
            {SIDEBAR.map((s, i) => (
              <div key={s.label} data-testid={`sidebar-${s.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${s.active ? 'bg-[#E8F0FE] text-[#1B4EFF]' : s.done ? 'text-black' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${s.active ? 'bg-[#1B4EFF] text-white' : s.done ? 'bg-black text-white' : 'bg-gray-100'}`}>
                  {s.done ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {s.label}
              </div>
            ))}
          </div>
        </aside>

        <main className="lg:col-span-4 fade-up">
          <div className="mb-8">
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-black">Hello {userName}</h2>
            <p className="text-xl font-semibold text-black mt-2">Let's find the perfect Galaxy for you.</p>
            <p className="text-sm text-gray-500 mt-2">What matters most to you? <span className="text-black font-semibold">Choose up to 3</span></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NEEDS.map((n, i) => {
              const Icon = n.icon;
              const active = local.includes(n.id);
              return (
                <button
                  key={n.id}
                  data-testid={`need-card-${n.id}`}
                  onClick={() => toggle(n.id)}
                  className={`text-left bg-white rounded-2xl p-5 border-2 transition-all hover:-translate-y-0.5 ${active ? 'border-[#1B4EFF] shadow-[0_8px_24px_rgba(27,78,255,0.15)]' : 'border-gray-100 hover:border-gray-200'}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${active ? 'bg-[#1B4EFF] text-white' : 'bg-[#E8F0FE] text-[#1B4EFF]'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-black flex items-center gap-2">
                    {n.title}
                    {active && <Check className="w-4 h-4 text-[#1B4EFF]" />}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{n.body}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex justify-between">
            <button data-testid="needs-skip-btn" onClick={() => nav('/budget')} className="text-sm text-gray-500 hover:text-black font-semibold">Skip for now</button>
            <button
              data-testid="needs-next-btn"
              onClick={next}
              disabled={local.length === 0}
              className="inline-flex items-center gap-2 bg-[#1B4EFF] disabled:bg-gray-200 disabled:text-gray-400 hover:bg-[#1428A0] text-white rounded-full px-8 py-3 font-semibold btn-primary-glow transition-all">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </section>
    </div>
  );
}
