import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Header } from '../components/Header';
import { useGalaxy } from '../context/GalaxyContext';

// Exported so the recommendations empty state can name a blocking filter in the same
// words the user picked it by. Every id here must exist in the catalog's match_tags —
// tests/test_wizard_contract.py enforces that.
export const PREFS = [
  { id: 'foldable', label: 'Open to foldables' },
  { id: 'compact', label: 'Compact size' },
  { id: 'large_screen', label: 'Large screen' },
  { id: 's_pen', label: 'S-Pen support' },
  // '5G ready' was removed: every phone in the catalog is 5G, so the chip matched all
  // 12 and could never change a result — it only added noise to the empty state.
  // A preference must be able to exclude something; test_wizard_contract.py enforces it.
  { id: 'latest', label: 'Latest model only' },
];

const SIDEBAR = ['Persona', 'Needs', 'Budget', 'Preferences', 'Summary'];

export default function Preferences() {
  const nav = useNavigate();
  const { preferences, setPreferences, fetchRecommendations } = useGalaxy();
  const [picks, setPicks] = useState(preferences);
  const [loading, setLoading] = useState(false);

  const toggle = (id) => setPicks(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const finish = async () => {
    setPreferences(picks);
    setLoading(true);
    // Pass picks explicitly: setPreferences won't have re-rendered yet, so
    // fetchRecommendations would otherwise post the previous (empty) preferences and
    // silently ignore everything just selected on this screen.
    await fetchRecommendations({ preferences: picks });
    setLoading(false);
    nav('/recommendations');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-5 gap-8">
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-1">
            {SIDEBAR.map((label, i) => {
              const done = i < 3;
              const active = i === 3;
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
          <h2 className="font-display text-3xl lg:text-4xl font-extrabold text-black">Any style preferences?</h2>
          <p className="text-sm text-gray-500 mt-2">Optional — pick what matters. Or skip.</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {PREFS.map(p => {
              const on = picks.includes(p.id);
              return (
                <button
                  key={p.id}
                  data-testid={`pref-${p.id}`}
                  onClick={() => toggle(p.id)}
                  className={`px-6 py-3 rounded-full font-semibold text-sm border-2 transition-all ${on ? 'bg-[#1B4EFF] text-white border-[#1B4EFF]' : 'bg-white text-black border-gray-200 hover:border-[#1B4EFF]'}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="mt-12 flex justify-between">
            <button onClick={() => nav('/budget')} className="text-sm text-gray-500 hover:text-black font-semibold">Back</button>
            <button
              data-testid="get-recommendations-btn"
              onClick={finish}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-[#1B4EFF] hover:bg-[#1428A0] disabled:opacity-70 text-white rounded-full px-8 py-3 font-semibold btn-primary-glow transition-all">
              {loading ? 'Finding your matches…' : 'Show recommendations'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </section>
    </div>
  );
}
