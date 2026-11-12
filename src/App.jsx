import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/MainLayout/MainLayout';
import Home from './pages/Home/Home';

const Examenes = lazy(() => import('./pages/Examenes/Examenes'));
const Anuncios = lazy(() => import('./pages/Anuncios/Anuncios'));
const Reportes = lazy(() => import('./pages/Reportes/Reportes'));
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="examenes" element={<Examenes />} />
            <Route path="anuncios" element={<Anuncios />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
