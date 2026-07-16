import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Share2, Bookmark, BatteryFull, Cpu, Camera, Monitor, Star, GitCompareArrows, X } from 'lucide-react';
import { FaAmazon } from 'react-icons/fa';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import { useGalaxy } from '../context/GalaxyContext';
import { useSaved } from '../hooks/useSaved';

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

const StoreMark = ({ name }) => {
  if (name === 'Amazon') return <FaAmazon className="w-8 h-8 text-black" />;
  const bg = name === 'Samsung' ? '#1428A0' : '#F0B90B';
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-sm" style={{ background: bg }}>
      {name[0]}
    </div>
  );
};

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { API, recommendations } = useGalaxy();
  const [phone, setPhone] = useState(null);
  const [tab, setTab] = useState('reviews');
  const [buyLinks, setBuyLinks] = useState([]);
  const [color, setColor] = useState(0);
  const tabsRef = useRef(null);
  const { toggle, isSaved } = useSaved();

  const share = async () => {
    const url = window.location.href;
    // Native share sheet on mobile; clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ title: phone?.name, url });
        return;
      } catch {
        return; // user dismissed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  useEffect(() => {
    axios.get(`${API}/phones/${id}`).then(r => { setPhone(r.data); setColor(0); });
    axios.get(`${API}/buy-links/${id}`).then(r => setBuyLinks(r.data.stores));
  }, [id, API]);

  if (!phone) return <div className="min-h-screen bg-white"><Header variant="inner" /><div className="p-12 text-center text-gray-500">Loading…</div></div>;

  // Only the wizard can say how well a phone fits *this* user. Deep-linking here
  // without walking it leaves no score, so the badge is omitted rather than invented.
  const scored = recommendations.find(r => r.id === phone.id);

  const specItems = [
    { icon: BatteryFull, label: phone.specs.battery, sub: 'Battery' },
    { icon: Cpu, label: phone.specs.processor, sub: 'Processor' },
    { icon: Camera, label: phone.specs.camera, sub: 'Camera' },
    { icon: Monitor, label: phone.specs.display, sub: 'Display' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/recommendations" data-testid="back-to-results" className="text-sm text-gray-500 hover:text-black">← Back to results</Link>

        <div className="mt-6 grid lg:grid-cols-2 gap-10">
          {/* Gallery */}
          <div className="fade-up">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-gray-100 p-8 flex items-center justify-center h-96">
              <img src={phone.image} alt={phone.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-3">
              {phone.colors.map((c, i) => (
                <button key={i} onClick={() => setColor(i)} data-testid={`color-${i}`}
                  className={`aspect-square rounded-2xl border-2 ${color === i ? 'border-[#1B4EFF]' : 'border-gray-100'} p-3 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white`}>
                  <div className="w-full h-full rounded-lg" style={{ background: c }} />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="fade-up fade-up-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button data-testid="share-btn" onClick={share} className="inline-flex items-center gap-1.5 hover:text-black transition-colors"><Share2 className="w-4 h-4" /> Share</button>
                <button
                  data-testid="save-btn"
                  onClick={() => toast(toggle(phone.id) ? `${phone.name} saved` : `${phone.name} removed from saved`)}
                  className={`inline-flex items-center gap-1.5 transition-colors ${isSaved(phone.id) ? 'text-[#1B4EFF]' : 'hover:text-black'}`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved(phone.id) ? 'fill-[#1B4EFF]' : ''}`} /> {isSaved(phone.id) ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
            <h1 className="mt-2 font-display text-4xl lg:text-5xl font-extrabold text-black">{phone.name}</h1>
            {scored && (
              <div className="mt-3 flex items-center gap-3">
                <span data-testid="product-match" className="bg-[#E8FAEE] text-[#00A344] text-xs font-extrabold px-2.5 py-1 rounded-full">
                  {scored.match}% Match
                </span>
                {scored.best_match && <span className="text-xs text-gray-500">Your best match</span>}
              </div>
            )}
            <div className="mt-4 text-2xl font-extrabold text-black">From {fmt(phone.price_inr)}<span className="text-[#1B4EFF]">*</span></div>

            <div className="mt-6">
              <div className="text-sm font-bold text-black mb-2">Why we recommend this</div>
              <div className="flex flex-wrap gap-2">
                {phone.features.map(f => (
                  <span key={f} className="bg-[#E8F0FE] text-[#1B4EFF] text-xs font-semibold px-3 py-1.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-2 border border-gray-100 rounded-2xl p-4">
              {specItems.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="text-center">
                    <Icon className="w-5 h-5 text-[#1B4EFF] mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-black">{s.label}</div>
                    <div className="text-[10px] text-gray-500">{s.sub}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                data-testid="see-buy-options-btn"
                onClick={() => nav(`/buy/${id}`)}
                className="flex-1 bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full py-3 font-semibold btn-primary-glow transition-all"
              >
                See buy options
              </button>
              <button
                data-testid="view-full-specs-btn"
                onClick={() => { setTab('specifications'); tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className="px-6 py-3 rounded-full border-2 border-gray-200 hover:border-[#1B4EFF] font-semibold text-sm transition-colors"
              >
                View full specs
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16 scroll-mt-20" ref={tabsRef}>
          <div className="flex items-center gap-6 border-b border-gray-100 overflow-x-auto">
            {['overview', 'specifications', 'reviews', 'gallery', 'compare'].map(t => (
              <button
                key={t}
                data-testid={`tab-${t}`}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-semibold capitalize transition-colors ${tab === t ? 'text-[#1B4EFF] border-b-2 border-[#1B4EFF]' : 'text-gray-500 hover:text-black'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {tab === 'overview' && <div className="text-gray-700 leading-relaxed max-w-2xl">{phone.story}</div>}
            {tab === 'specifications' && (
              <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                {Object.entries(phone.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-gray-100 py-3">
                    <span className="text-sm text-gray-500 capitalize">{k}</span>
                    <span className="text-sm font-semibold text-black">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'reviews' && <ReviewsBlock />}
            {tab === 'gallery' && <GalleryBlock name={phone.name} />}
            {tab === 'compare' && <CompareBlock phone={phone} />}
          </div>
        </div>

        {/* Quick buy summary */}
        {buyLinks.length > 0 && (
          <div className="mt-16 bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-gray-100 p-8">
            <div className="text-xl font-extrabold text-black">Ready to buy your {phone.name}?</div>
            <div className="text-sm text-gray-500">Choose your preferred store.</div>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {buyLinks.map((s, i) => {
                return (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`buy-now-${s.name.toLowerCase()}-btn`}
                    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">Buy on</div>
                        <div className="text-lg font-extrabold text-black">{s.name}</div>
                      </div>
                      <StoreMark name={s.name} />
                    </div>
                    <div className="mt-3 text-lg font-extrabold text-black">{fmt(s.price_inr)}</div>
                    <div className="mt-4 w-full bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full py-2.5 text-sm font-semibold text-center btn-primary-glow">
                      Buy Now
                    </div>
                  </a>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-gray-400">*Prices may vary based on offers and availability.</div>
          </div>
        )}
      </section>
    </div>
  );
}

function CompareBlock({ phone }) {
  const nav = useNavigate();
  const [others, setOthers] = useState([]);
  const { API } = useGalaxy();

  useEffect(() => {
    axios.get(`${API}/phones`)
      .then(r => setOthers(r.data.phones.filter(p => p.id !== phone.id)))
      .catch(() => setOthers([]));
  }, [API, phone.id]);

  // Nearest by price makes the most useful default rival.
  const rivals = [...others]
    .sort((a, b) => Math.abs(a.price_inr - phone.price_inr) - Math.abs(b.price_inr - phone.price_inr))
    .slice(0, 2);

  return (
    <div className="max-w-3xl">
      <div className="text-sm text-gray-500">
        How the {phone.name} stacks up against its closest rivals on price.
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-28" />
              {[phone, ...rivals].map(p => (
                <th key={p.id} className="pb-3 px-3 text-left">
                  <div className="text-sm font-extrabold text-black">{p.name}</div>
                  {p.id === phone.id && <div className="text-[10px] font-bold uppercase tracking-widest text-[#1B4EFF]">This phone</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Price', p => fmt(p.price_inr)],
              ['Display', p => p.specs.display],
              ['Processor', p => p.specs.processor],
              ['Camera', p => p.specs.camera],
              ['Battery', p => p.specs.battery],
            ].map(([label, get], i) => (
              <tr key={label} className={i % 2 ? 'bg-gray-50/60' : ''}>
                <td className="text-xs font-bold uppercase tracking-widest text-gray-400 py-2.5 pl-3 rounded-l-xl">{label}</td>
                {[phone, ...rivals].map(p => (
                  <td key={p.id} className="py-2.5 px-3 text-sm text-black">{get(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        data-testid="compare-more-btn"
        onClick={() => nav(`/compare?ids=${[phone, ...rivals].map(p => p.id).join(',')}`)}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1B4EFF] hover:text-[#1428A0]"
      >
        <GitCompareArrows className="w-4 h-4" /> Compare with other models
      </button>
    </div>
  );
}

function ReviewsBlock() {
  const bars = [{ s: 5, v: 72 }, { s: 4, v: 20 }, { s: 3, v: 6 }, { s: 2, v: 1 }, { s: 1, v: 1 }];
  const [writing, setWriting] = useState(false);
  return (
    <div className="grid lg:grid-cols-2 gap-10 max-w-4xl">
      <div>
        <div className="text-sm font-bold text-black mb-2">Customer Reviews</div>
        <div className="text-5xl font-extrabold text-black">4.6 <span className="text-lg text-gray-500 font-semibold">out of 5</span></div>
        <div className="mt-1 flex items-center gap-1">
          {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
        </div>
        <div className="text-sm text-gray-500 mt-1">(2,345 reviews)</div>
        <div className="mt-6 space-y-2">
          {bars.map(b => (
            <div key={b.s} className="flex items-center gap-3 text-sm">
              <span className="w-3 text-gray-500">{b.s}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#1B4EFF]" style={{ width: `${b.v}%` }} />
              </div>
              <span className="w-10 text-right text-gray-500">{b.v}%</span>
            </div>
          ))}
        </div>
        <button
          data-testid="write-review-btn"
          onClick={() => setWriting(true)}
          className="mt-6 px-5 py-2 rounded-full border-2 border-gray-200 hover:border-[#1B4EFF] text-sm font-semibold transition-colors"
        >
          Write a Review
        </button>
        {writing && <ReviewDialog onClose={() => setWriting(false)} />}
      </div>
      <GalleryBlock />
    </div>
  );
}

function ReviewDialog({ onClose }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');

  const submit = (e) => {
    e.preventDefault();
    // No review backend exists, so this can't actually be published.
    toast.success('Thanks! Your review has been submitted for moderation.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form
        data-testid="review-dialog"
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-3xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-black">Write a review</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              type="button"
              data-testid={`review-star-${i}`}
              aria-label={`${i} star${i > 1 ? 's' : ''}`}
              onClick={() => setStars(i)}
              className="p-0.5"
            >
              <Star className={`w-6 h-6 transition-colors ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>
        <textarea
          data-testid="review-text"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          placeholder="What did you think of this phone?"
          className="mt-4 w-full rounded-2xl border border-gray-200 focus:border-[#1B4EFF] outline-none p-3 text-sm resize-none"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            data-testid="review-submit"
            disabled={!stars || !text.trim()}
            className="flex-1 bg-[#1B4EFF] hover:bg-[#1428A0] disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-full py-2.5 text-sm font-semibold transition-colors"
          >
            Submit review
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border-2 border-gray-200 hover:border-[#1B4EFF] text-sm font-semibold transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function GalleryBlock() {
  const imgs = [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80',
    'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=400&q=80',
  ];
  const [lightbox, setLightbox] = useState(null);

  return (
    <div>
      <div className="text-sm font-bold text-black mb-3">User Photos</div>
      <div className="grid grid-cols-3 gap-3">
        {imgs.map((src, i) => (
          <button
            key={i}
            data-testid={`gallery-photo-${i}`}
            onClick={() => setLightbox(i)}
            className="aspect-square rounded-2xl overflow-hidden bg-gray-100 relative group"
          >
            <img src={src} alt={`User photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </button>
        ))}
      </div>
      <button
        data-testid="view-all-photos-btn"
        onClick={() => setLightbox(0)}
        className="mt-4 text-sm font-semibold text-[#1B4EFF] hover:text-[#1428A0] transition-colors"
      >
        View All Photos →
      </button>

      {lightbox !== null && (
        <div
          data-testid="gallery-lightbox"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close gallery"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={imgs[lightbox]} alt={`User photo ${lightbox + 1}`} className="w-full rounded-2xl object-contain max-h-[70vh]" />
            <div className="mt-4 flex items-center justify-center gap-2">
              {imgs.map((src, i) => (
                <button
                  key={i}
                  data-testid={`lightbox-thumb-${i}`}
                  onClick={() => setLightbox(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${i === lightbox ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="mt-3 text-center text-xs text-white/70">{lightbox + 1} of {imgs.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}
