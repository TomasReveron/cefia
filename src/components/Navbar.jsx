import './Navbar.css';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ onMenuClick }) => {
  return (
    <nav className="navbar glass-panel">
      <button 
        className="hamburger-btn" 
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <div className="navbar-center" title="Volver al inicio">
        <img src="/CefiaLogo.png" alt="Logo de CEFIA" className="navbar-logo-img" />
        <span className="navbar-logo-text">CEFIA</span>
      </div>

      <div className="navbar-spacer">
        <ThemeToggle />
      </div>
    </nav>
  );
};

export default Navbar;
