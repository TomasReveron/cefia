import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content container">
        <div className="footer-left">
          <div className="footer-logo-container">
            <img src="/CefiaLogo.png" alt="Logo de CEFIA" className="footer-logo-img" />
            <span className="footer-logo">CEFIA</span>
          </div>
          <p className="footer-copyright">
            &copy; {currentYear} Centro de Estudiantes de Ingeniería y Arquitectura.
          </p>
        </div>

        <div className="footer-right">
          <p className="social-title">Nuestras Redes</p>
          <div className="social-links">
            {/* Instagram Icon */}
            {/* Update the href to point to CEFIA's actual link if needed */}
            <a href="https://www.instagram.com/cefiausm/" target="_blank" rel="noopener noreferrer" className="social-icon instagram" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>

            {/* WhatsApp Icon */}
            {/* Replace +58000000000 with CEFIA's Whatsapp number */}
            <a href="https://chat.whatsapp.com/Kje7lMGk97RCakVrp8JZFY?mode=gi_t" target="_blank" rel="noopener noreferrer" className="social-icon whatsapp" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </a>

            {/* Telegram Icon */}
            {/* Update the href to point to CEFIA's actual telegram link */}
            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="social-icon telegram" aria-label="Telegram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
