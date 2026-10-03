import { useState } from 'react';
import './Home.css';

const Home = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="home-page fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Bienvenidos al sitio web de CEFIA</h1>
          <p>El Centro de Estudiantes de la Facultad de Ingeniería y Arquitectura.</p>
          <button className="cta-button" onClick={() => setShowModal(true)}>
            Nuestras Redes
          </button>
        </div>
      </section>

      {/* Modal de Redes Sociales */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content socials-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Cerrar modal">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h2>Conecta con nosotros</h2>
            <p className="modal-subtitle">Únete a nuestra comunidad para estar al tanto de todo.</p>
            
            <div className="social-links-grid">
              <a href="https://t.me/+TITGAS_2a85jYTg5" target="_blank" rel="noopener noreferrer" className="social-card telegram">
                <div className="social-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </div>
                <span>Comunidad en Telegram</span>
              </a>
              
              <a href="https://www.instagram.com/cefiausm/" target="_blank" rel="noopener noreferrer" className="social-card instagram">
                <div className="social-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </div>
                <span>Instagram Oficial</span>
              </a>
              
              <a href="https://chat.whatsapp.com/Kje7lMGk97RCakVrp8JZFY?mode=gi_t" target="_blank" rel="noopener noreferrer" className="social-card whatsapp">
                <div className="social-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <span>Comunidad en WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Container para el resto de la página */}
      <section className="container home-content">
        {/* Aquí puedes agregar más secciones como noticias recientes */}
      </section>
    </div>
  );
};

export default Home;
