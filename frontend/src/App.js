import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GalaxyProvider } from "./context/GalaxyContext";
import Landing from "./pages/Landing";
import ChooseMode from "./pages/ChooseMode";
import SelectPersona from "./pages/SelectPersona";
import Needs from "./pages/Needs";
import Budget from "./pages/Budget";
import Preferences from "./pages/Preferences";
import Recommendations from "./pages/Recommendations";
import ProductDetail from "./pages/ProductDetail";
import Buy from "./pages/Buy";
import Chat from "./pages/Chat";
import Models from "./pages/Models";
import Compare from "./pages/Compare";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App">
      <GalaxyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/choose-mode" element={<ChooseMode />} />
            <Route path="/persona" element={<SelectPersona />} />
            <Route path="/needs" element={<Needs />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/buy/:id" element={<Buy />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/models" element={<Models />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </GalaxyProvider>
    </div>
  );
}

export default App;
