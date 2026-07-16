import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Header } from '../components/Header';
import { useGalaxy } from '../context/GalaxyContext';

const BUCKETS = [
  { id: 15000, label: 'Under ₹15,000', body: 'Budget-friendly picks' },
  { id: 25000, label: '₹15,000 – ₹25,000', body: 'Solid mid-range value' },
  { id: 40000, label: '₹25,000 – ₹40,000', body: 'Premium mid-range' },
  { id: 75000, label: '₹40,000 – ₹75,000', body: 'Flagship-lite territory' },
  { id: 125000, label: '₹75,000 – ₹1.25L', body: 'Real flagship experience' },
  { id: 200000, label: 'Above ₹1.25L', body: 'The absolute best' },
];

const SIDEBAR = ['Persona', 'Needs', 'Budget', 'Preferences', 'Summary'];

export default function Budget() {
  const nav = useNavigate();
  const { budget, setBudget } = useGalaxy();
  const [pick, setPick] = useState(budget);

  const next = () => { setBudget(pick); nav('/preferences'); };

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-5 gap-8">
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-1">
            {SIDEBAR.map((label, i) => {
              const done = i < 2;
              const active = i === 2;
              return (
                <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${active ? 'bg-[#E8F0FE] text-[#1B4EFF]' : done ? 'text-black' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${active ? 'bg-[#1B4EFF] text-white' : done ? 'bg-black text-white' : 'bg-gray-100'}`}>
                    {done ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="lg:col-span-4 fade-up">
          <div className="mb-8">
            <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-black">What's your budget?</h2>
            <p className="text-sm text-gray-500 mt-2">Pick a range — we'll match Galaxy phones that fit perfectly.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUCKETS.map((b, i) => {
              const active = pick === b.id;
              return (
                <button
                  key={b.id}
                  data-testid={`budget-${b.id}`}
                  onClick={() => setPick(b.id)}
                  className={`text-left bg-white rounded-2xl p-6 border-2 transition-all hover:-translate-y-0.5 ${active ? 'border-[#1B4EFF] shadow-[0_8px_24px_rgba(27,78,255,0.15)]' : 'border-gray-100'}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="text-lg font-bold text-black">{b.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{b.body}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-10 flex justify-between">
            <button onClick={() => nav('/needs')} className="text-sm text-gray-500 hover:text-black font-semibold">Back</button>
            <button
              data-testid="budget-next-btn"
              onClick={next}
              disabled={!pick}
              className="inline-flex items-center gap-2 bg-[#1B4EFF] disabled:bg-gray-200 disabled:text-gray-400 hover:bg-[#1428A0] text-white rounded-full px-8 py-3 font-semibold btn-primary-glow transition-all">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </section>
    </div>
  );
}
