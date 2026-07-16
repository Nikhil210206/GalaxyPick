import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Check } from 'lucide-react';
import { FaAmazon } from 'react-icons/fa';
import { Header } from '../components/Header';
import { useGalaxy } from '../context/GalaxyContext';

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;
const perks = {
  Samsung: ['Genuine products', 'Samsung care', 'Exclusive offers'],
  Amazon: ['Fast delivery', 'Easy returns', 'Great deals'],
  Flipkart: ['Fast delivery', 'Secure packaging', 'No Cost EMI'],
};
const StoreMark = ({ name }) => {
  if (name === 'Amazon') return <FaAmazon className="w-9 h-9 text-black" />;
  const bg = name === 'Samsung' ? '#1428A0' : '#F0B90B';
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white text-sm" style={{ background: bg }}>
      {name[0]}
    </div>
  );
};

export default function Buy() {
  const { id } = useParams();
  const { API } = useGalaxy();
  const [phone, setPhone] = useState(null);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    axios.get(`${API}/phones/${id}`).then(r => setPhone(r.data));
    axios.get(`${API}/buy-links/${id}`).then(r => setStores(r.data.stores));
  }, [id, API]);

  if (!phone) return <div className="min-h-screen bg-white"><Header variant="inner" /></div>;

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to={`/product/${id}`} className="text-sm text-gray-500 hover:text-black">← Back to details</Link>
        <h2 className="mt-6 font-display text-3xl lg:text-4xl font-extrabold text-black">Ready to buy your {phone.name}?</h2>
        <p className="text-gray-500 mt-2">Choose your preferred store.</p>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {stores.map((s, i) => {
            return (
              <div key={s.name} data-testid={`buy-card-${s.name.toLowerCase()}`} className="fade-up bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_rgba(27,78,255,0.12)] hover:-translate-y-1 transition-all" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">Buy on</div>
                    <div className="text-2xl font-extrabold text-black">{s.name}</div>
                  </div>
                  <StoreMark name={s.name} />
                </div>
                <div className="mt-4 text-2xl font-extrabold text-black">{fmt(s.price_inr)}<span className="text-[#1B4EFF]">*</span></div>
                <ul className="mt-4 space-y-2">
                  {(perks[s.name] || []).map(p => (
                    <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-[#00A344]" /> {p}
                    </li>
                  ))}
                </ul>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  data-testid={`buy-now-${s.name.toLowerCase()}`}
                  className="mt-6 block w-full text-center bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full py-3 font-semibold btn-primary-glow transition-all"
                >
                  Buy Now
                </a>
              </div>
            );
          })}
        </div>
        <div className="mt-6 text-xs text-gray-400">*Prices may vary based on offers and availability.</div>
      </section>
    </div>
  );
}
