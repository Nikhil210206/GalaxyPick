import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Falls back to a same-origin relative path when unset, rather than the literal
// string "undefined/api" — this is what makes a single-Vercel-project deploy work,
// where the frontend and API share one domain and REACT_APP_BACKEND_URL is unnecessary.
const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;
const Ctx = createContext(null);

export const GalaxyProvider = ({ children }) => {
  const [persona, setPersona] = useState(null);
  const [needs, setNeeds] = useState([]);
  const [budget, setBudget] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  // Set when the chosen preferences + budget can't be satisfied together — carries the
  // cheapest phone that does meet the preferences, so the UI can offer a way forward.
  const [unsatisfiable, setUnsatisfiable] = useState(null);
  const [location, setLocation] = useState({ currency: 'INR', country: 'India' });
  const [userName, setUserName] = useState('Friend');

  useEffect(() => {
    axios.get(`${API}/location`).then(r => setLocation(r.data)).catch(() => {});
  }, []);

  const reset = () => {
    setPersona(null); setNeeds([]); setBudget(null); setPreferences([]); setRecommendations([]);
    setUnsatisfiable(null);
  };

  // Overrides let a caller refetch with a changed constraint without waiting for the
  // state update to land — "raise my budget and show me the results" is one action.
  const fetchRecommendations = async (overrides = {}) => {
    const body = { persona, needs, budget, preferences, ...overrides };
    const { data } = await axios.post(`${API}/recommend`, body);
    setRecommendations(data.recommendations);
    setUnsatisfiable(data.unsatisfiable ?? null);
    return data;
  };

  return (
    <Ctx.Provider value={{
      persona, setPersona, needs, setNeeds, budget, setBudget,
      preferences, setPreferences, recommendations, fetchRecommendations,
      unsatisfiable, location, userName, setUserName, reset, API,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useGalaxy = () => useContext(Ctx);
