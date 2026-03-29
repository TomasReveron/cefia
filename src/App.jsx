import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import Examenes from './pages/Examenes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="examenes" element={<Examenes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
