import './Home.css';

const Home = () => {
  return (
    <div className="home-page fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Bienvenidos al sitio web de CEFIA</h1>
          <p>El Centro de Estudiantes de la Facultad de Ingeniería y Arquitectura.</p>
          <button className="cta-button">Conoce Más</button>
        </div>
      </section>

      {/* Main Container para el resto de la página */}
      <section className="container home-content">
        {/* Aquí puedes agregar más secciones como noticias recientes */}
      </section>
    </div>
  );
};

export default Home;
