import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, requestForToken } from '../../firebase';
import './Register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('estudiante'); // 'estudiante' or 'admin'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Por favor, rellena todos los campos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Lay groundwork for Push Notifications (request token)
      let fcmToken = null;
      let permissionState = 'default';
      
      try {
        const result = await requestForToken();
        if (result) {
          fcmToken = result.token;
          permissionState = result.permission;
        }
      } catch (fcmErr) {
        console.warn("FCM Token generation skipped or unsupported:", fcmErr);
      }

      // 3. Write user profile document to Firestore
      const userProfile = {
        email: user.email,
        role: role,
        createdAt: new Date().toISOString(),
        notificationPermission: permissionState,
        fcmTokens: fcmToken ? [fcmToken] : []
      };

      await setDoc(doc(db, "usuarios", user.uid), userProfile);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/anuncios');
      }, 2000);

    } catch (err) {
      console.error("Error al registrarse:", err);
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Este correo electrónico ya está registrado.');
          break;
        case 'auth/invalid-email':
          setError('El formato del correo electrónico no es válido.');
          break;
        case 'auth/weak-password':
          setError('La contraseña es demasiado débil.');
          break;
        default:
          setError('Error al registrarse. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page fade-in">
      <div className="register-overlay"></div>
      
      <div className="register-container">
        <form className="register-card glass-panel" onSubmit={handleSubmit}>
          <div className="register-header">
            <img src="/CefiaLogo.png" alt="Logo de CEFIA" className="register-logo" />
            <h1>Crear Cuenta</h1>
            <p>Regístrate para mantenerte informado y configurar tus notificaciones.</p>
          </div>

          {error && (
            <div className="register-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="register-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>¡Cuenta creada con éxito! Redireccionando...</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input
                type="email"
                id="email"
                placeholder="tu_correo@estudiante.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                id="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <div className="input-with-icon">
              <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || success}
                required
              />
            </div>
          </div>

          <button type="submit" className="register-submit-btn" disabled={loading || success}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              'Registrarse'
            )}
          </button>

          <div className="register-footer">
            ¿Ya tienes una cuenta? <Link to="/login">Inicia Sesión aquí</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
