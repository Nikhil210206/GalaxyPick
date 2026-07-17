import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Plus, X } from 'lucide-react';
import { Header } from '../components/Header';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;
const MAX = 3;

const SPEC_ROWS = [
  { key: 'price_inr', label: 'Price', get: p => fmt(p.price_inr) },
  { key: 'display', label: 'Display', get: p => p.specs.display },
  { key: 'processor', label: 'Processor', get: p => p.specs.processor },
  { key: 'camera', label: 'Camera', get: p => p.specs.camera },
  { key: 'battery', label: 'Battery', get: p => p.specs.battery },
  { key: 'series', label: 'Series', get: p => `${p.series}-Series` },
  { key: 'year', label: 'Released', get: p => p.year },
];

export default function Compare() {
  const [phones, setPhones] = useState([]);
  const [params, setParams] = useSearchParams();
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    axios.get(`${API}/phones`).then(r => setPhones(r.data.phones)).catch(() => setPhones([]));
  }, []);

  const ids = useMemo(() => (params.get('ids') || '').split(',').filter(Boolean).slice(0, MAX), [params]);
  const selected = useMemo(
    () => ids.map(id => phones.find(p => p.id === id)).filter(Boolean),
    [ids, phones]
  );

  const setIds = (next) => {
    if (next.length) setParams({ ids: next.join(',') });
    else setParams({});
  };
  const add = (id) => { setIds([...ids, id].slice(0, MAX)); setPicking(false); };
  const remove = (id) => setIds(ids.filter(x => x !== id));

  // Highlight the winner per row where "best" is unambiguous.
  const cheapest = selected.length > 1
    ? Math.min(...selected.map(p => p.price_inr))
    : null;

  const available = phones.filter(p => !ids.includes(p.id));

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B4EFF] mb-2">Side by side</div>
        <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-black">Compare Galaxy phones</h1>
        <p className="text-sm text-gray-500 mt-1">Pick up to {MAX} models to see how they stack up.</p>

        {selected.length === 0 ? (
          <div className="mt-10 rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center" data-testid="compare-empty">
            <p className="text-gray-500">Nothing to compare yet.</p>
            <button
              data-testid="compare-add-first"
              onClick={() => setPicking(true)}
              className="mt-4 inline-flex items-center gap-2 bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add a phone
            </button>
            <div className="mt-3">
              <Link to="/models" className="text-sm font-semibold text-[#1B4EFF] hover:text-[#1428A0]">or browse all models →</Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0" data-testid="compare-table">
              <thead>
                <tr>
                  <th className="w-32 text-left align-bottom pb-4" />
                  {selected.map(p => (
                    <th key={p.id} className="align-bottom pb-4 px-3" data-testid={`compare-col-${p.id}`}>
                      <div className="relative rounded-2xl border border-gray-100 overflow-hidden bg-white">
                        <button
                          data-testid={`compare-remove-${p.id}`}
                          aria-label={`Remove ${p.name} from comparison`}
                          onClick={() => remove(p.id)}
                          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white"
                        >
                          <X className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <div className="aspect-[4/3] bg-gray-50">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3 text-left">
                          <div className="font-extrabold text-black text-sm">{p.name}</div>
                          <Link
                            to={`/product/${p.id}`}
                            data-testid={`compare-details-${p.id}`}
                            className="mt-2 w-full bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors"
                          >
                            View Details <ArrowRight className="w-3 h-3 shrink-0" />
                          </Link>
                        </div>
                      </div>
                    </th>
                  ))}
                  {selected.length < MAX && (
                    <th className="align-bottom pb-4 px-3">
                      <button
                        data-testid="compare-add-btn"
                        onClick={() => setPicking(true)}
                        className="w-full h-full min-h-[180px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#1B4EFF] text-sm font-semibold text-gray-500 hover:text-[#1B4EFF] flex flex-col items-center justify-center gap-2 transition-colors"
                      >
                        <Plus className="w-5 h-5" /> Add phone
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {SPEC_ROWS.map((row, ri) => (
                  <tr key={row.key} className={ri % 2 ? 'bg-gray-50/60' : ''}>
                    <td className="text-xs font-bold uppercase tracking-widest text-gray-400 py-3 pl-3 rounded-l-xl">{row.label}</td>
                    {selected.map(p => {
                      const best = row.key === 'price_inr' && cheapest === p.price_inr;
                      return (
                        <td key={p.id} className="py-3 px-3 text-sm text-black" data-testid={`compare-${row.key}-${p.id}`}>
                          <span className={best ? 'font-extrabold text-[#00A344]' : ''}>{row.get(p)}</span>
                          {best && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-[#00A344]">Lowest</span>}
                        </td>
                      );
                    })}
                    {selected.length < MAX && <td />}
                  </tr>
                ))}
                <tr>
                  <td className="text-xs font-bold uppercase tracking-widest text-gray-400 py-3 pl-3 align-top">Highlights</td>
                  {selected.map(p => (
                    <td key={p.id} className="py-3 px-3 align-top">
                      <ul className="space-y-1">
                        {p.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-[#1B4EFF] shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                  {selected.length < MAX && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {picking && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPicking(false)}>
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()} data-testid="compare-picker">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-extrabold text-black">Add a phone</h2>
                <button onClick={() => setPicking(false)} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2">
                {available.map(p => (
                  <button
                    key={p.id}
                    data-testid={`compare-pick-${p.id}`}
                    onClick={() => add(p.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-[#1B4EFF] text-left transition-colors"
                  >
                    <img src={p.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-50" />
                    <div className="flex-1">
                      <div className="font-bold text-sm text-black">{p.name}</div>
                      <div className="text-xs text-gray-500">{fmt(p.price_inr)}</div>
                    </div>
                    <Plus className="w-4 h-4 text-[#1B4EFF]" />
                  </button>
                ))}
                {available.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Every model is already in the comparison.</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
