import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useGalaxy } from '../context/GalaxyContext';
import creatorAvatar from '../assets/persona-creator.png';
import studentAvatar from '../assets/persona-student.png';
import professionalAvatar from '../assets/persona-professional.png';
import gamerAvatar from '../assets/persona-gamer.png';

const PERSONAS = [
  { id: 'creator', title: 'Creator', body: 'Capture, create and inspire', avatar: creatorAvatar },
  { id: 'student', title: 'Student', body: 'Study, learn and stay entertained', avatar: studentAvatar },
  { id: 'professional', title: 'Professional', body: 'Work, multitask and stay productive', avatar: professionalAvatar },
  { id: 'gamer', title: 'Gamer', body: 'Play hard, win big and enjoy more', avatar: gamerAvatar },
];

export default function SelectPersona() {
  const nav = useNavigate();
  const { persona, setPersona, setUserName } = useGalaxy();

  const pick = (p) => {
    setPersona(p.id);
    setUserName(p.title.split(' ')[0]);
    setTimeout(() => nav('/needs'), 220);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header variant="inner" />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="text-center mb-12 fade-up">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black">Who are you?</h2>
          <p className="mt-3 text-gray-500">This helps us personalize your recommendations.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {PERSONAS.map((p, i) => {
            const active = persona === p.id;
            return (
              <button
                key={p.id}
                data-testid={`persona-card-${p.id}`}
                onClick={() => pick(p)}
                className={`fade-up text-center bg-white rounded-3xl p-5 lg:p-6 border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(27,78,255,0.10)] ${active ? 'border-[#1B4EFF] shadow-[0_10px_28px_rgba(27,78,255,0.18)]' : 'border-gray-100'}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="w-full aspect-square rounded-2xl bg-white overflow-hidden mb-4">
                  <img
                    src={p.avatar}
                    alt=""
                    className="w-full h-full object-contain"
                    data-testid={`persona-avatar-${p.id}`}
                  />
                </div>
                <div className="font-bold text-black">{p.title}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{p.body}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
