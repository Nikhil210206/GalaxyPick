import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Header } from '../components/Header';
import chooseArt from '../assets/mode-choose.png';
import chatArt from '../assets/mode-chat.png';

export default function ChooseMode() {
  const nav = useNavigate();

  const modes = [
    {
      id: 'choose',
      title: 'Choose',
      body: "Answer a few guided questions and we'll recommend the best Galaxy for you.",
      art: chooseArt,
      to: '/persona',
    },
    {
      id: 'chat',
      title: 'Chat with Galaxy AI',
      body: 'Tell us what you need in your own words and Galaxy AI will find the perfect match.',
      art: chatArt,
      to: '/chat',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-14 fade-up">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">
            How would you like to<br />find your perfect Galaxy?
          </h2>
          <p className="mt-4 text-gray-500">Choose the experience that works best for you.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {modes.map((m, i) => {
            return (
              <button
                key={m.id}
                data-testid={`mode-${m.id}-btn`}
                onClick={() => nav(m.to)}
                className={`fade-up fade-up-${i + 1} text-left group bg-white rounded-3xl border border-gray-100 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(27,78,255,0.12)] hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="rounded-2xl overflow-hidden mb-6 border border-blue-50">
                  {/* Decorative: the title and body already name the mode, so an alt
                      here would only repeat them to a screen reader. Intrinsic size is
                      set to reserve the space before the image loads. */}
                  <img
                    src={m.art}
                    alt=""
                    width={816}
                    height={676}
                    loading="lazy"
                    className="w-full h-auto block transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                  />
                </div>
                <div className="text-xl font-bold text-black mb-2">{m.title}</div>
                <p className="text-sm text-gray-500 leading-relaxed">{m.body}</p>
                <div className="mt-6 w-11 h-11 rounded-full bg-[#1B4EFF] group-hover:bg-[#1428A0] flex items-center justify-center transition-all btn-primary-glow">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
