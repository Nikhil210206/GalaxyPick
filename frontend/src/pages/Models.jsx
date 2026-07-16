import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Bookmark, GitCompareArrows } from 'lucide-react';
import { Header } from '../components/Header';
import { useSaved } from '../hooks/useSaved';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

// Every `series` value in the catalog needs a home here, or those phones are only
// reachable from "All models" — F-Series was added for exactly that reason.
const FILTERS = [
  { id: 'all', label: 'All models' },
  { id: 'S', label: 'S-Series' },
  { id: 'Fold', label: 'Foldables', match: p => p.series === 'Fold' || p.series === 'Flip' },
  { id: 'A', label: 'A-Series' },
  { id: 'M', label: 'M-Series' },
  { id: 'F', label: 'F-Series' },
];

export default function Models() {
  const [phones, setPhones] = useState([]);
  const [filter, setFilter] = useState('all');
  const { saved, toggle, isSaved } = useSaved();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const savedOnly = params.get('saved') === '1';

  useEffect(() => {
    axios.get(`${API}/phones`).then(r => setPhones(r.data.phones)).catch(() => setPhones([]));
  }, []);

  const shown = useMemo(() => {
    const base = savedOnly ? phones.filter(p => saved.includes(p.id)) : phones;
    const f = FILTERS.find(x => x.id === filter);
    if (!f || f.id === 'all') return base;
    return base.filter(f.match || (p => p.series === f.id));
  }, [phones, filter, savedOnly, saved]);

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B4EFF] mb-2">{savedOnly ? 'Your shortlist' : 'Explore the lineup'}</div>
            <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-black">{savedOnly ? 'Saved phones' : 'All Galaxy models'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {savedOnly
                ? `${shown.length} saved — tap the bookmark on any phone to add or remove it.`
                : `${shown.length} phones — pick one to see full specs, reviews and buy options.`}
            </p>
          </div>
          <button
            data-testid="models-compare-btn"
            onClick={() => nav('/compare')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-gray-200 hover:border-[#1B4EFF] text-sm font-semibold text-black transition-colors"
          >
            <GitCompareArrows className="w-4 h-4" /> Compare models
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.id}
              data-testid={`models-filter-${f.id}`}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === f.id ? 'bg-[#1B4EFF] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {savedOnly && shown.length === 0 && (
          <div className="mt-10 rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center" data-testid="models-saved-empty">
            <p className="text-gray-500">You haven't saved any phones yet.</p>
            <button
              data-testid="models-saved-browse"
              onClick={() => setParams({})}
              className="mt-4 inline-flex items-center gap-2 bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
            >
              Browse all models
            </button>
          </div>
        )}

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map(p => (
            <div
              key={p.id}
              data-testid={`models-card-${p.id}`}
              className="fade-up bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(27,78,255,0.14)] hover:-translate-y-1 transition-all flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                <button
                  data-testid={`models-save-${p.id}`}
                  aria-label={isSaved(p.id) ? `Remove ${p.name} from saved` : `Save ${p.name}`}
                  onClick={() => toggle(p.id)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved(p.id) ? 'fill-[#1B4EFF] text-[#1B4EFF]' : 'text-gray-400'}`} />
                </button>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{p.series}-Series · {p.year}</span>
                </div>
                <div className="mt-1 font-extrabold text-black">{p.name}</div>
                <ul className="mt-3 space-y-1 flex-1">
                  {p.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-[#1B4EFF] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-sm text-gray-500">From <span className="text-lg font-extrabold text-black">{fmt(p.price_inr)}</span></div>
                <Link
                  to={`/product/${p.id}`}
                  data-testid={`models-details-${p.id}`}
                  className="mt-4 w-full bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full py-2.5 text-sm font-semibold btn-primary-glow inline-flex items-center justify-center gap-1 whitespace-nowrap transition-all"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
