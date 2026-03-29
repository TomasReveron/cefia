import { useState, useEffect } from 'react';
import './Examenes.css';

const Examenes = () => {
  const [data, setData] = useState({});
  const [careers, setCareers] = useState([]);
  const [activeCareer, setActiveCareer] = useState('');
  const [activeSubject, setActiveSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/exam_data.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        const careerList = Object.keys(json).sort();
        setCareers(careerList);
        if (careerList.length > 0) {
          setActiveCareer(careerList[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error cargando los exámenes:", err);
        setLoading(false);
      });
  }, []);

  const toggleSubject = (subjectId) => {
    setActiveSubject(activeSubject === subjectId ? '' : subjectId);
  };

  const generateICS = (subject, career, cls) => {
    const partials = [
      { name: '1er Parcial', date: cls.parcial_1 },
      { name: '2do Parcial', date: cls.parcial_2 },
      { name: '3er Parcial', date: cls.parcial_3 },
      { name: '4to Parcial', date: cls.parcial_4 },
    ].filter(p => p.date && p.date !== '-' && p.date.trim() !== '');

    if (partials.length === 0) {
      alert("No hay fechas confirmadas para agregar al calendario.");
      return;
    }

    let startTimeStr = "080000";
    let endTimeStr = "100000";
    let isAllDay = false;

    if (cls.hora) {
      const timeMatch = cls.hora.match(/(\d{1,2}):(\d{2})\s*(a|A|-)\s*(\d{1,2}):(\d{2})/i);
      if (timeMatch) {
         let startH = parseInt(timeMatch[1], 10);
         let startM = timeMatch[2];
         let endH = parseInt(timeMatch[4], 10);
         let endM = timeMatch[5];
         startTimeStr = `${String(startH).padStart(2, '0')}${startM}00`;
         endTimeStr = `${String(endH).padStart(2, '0')}${endM}00`;
      } else {
         isAllDay = true;
      }
    } else {
      isAllDay = true;
    }

    // METHOD:PUBLISH es el estandar oficial para calendarios de Android.
    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CEFIA//Examenes//ES\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
    
    // Funcion para formatear texto y que Android Calendar no colapse por las comas, saltos o puntos y comas.
    const formatIcsText = (str) => {
      if (!str) return '';
      return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    };

    partials.forEach(partial => {
       const parts = partial.date.split('/');
       if (parts.length === 3) {
         const fileDate = `${parts[2]}${parts[1]}${parts[0]}`;
         const uid = `${fileDate}-${subject.replace(/[^a-zA-Z0-9]/g, '')}-${partial.name.replace(/\s/g, '')}@cefia.usm.ve`;
         
         icsContent += "BEGIN:VEVENT\r\n";
         icsContent += `UID:${uid}\r\n`;
         icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\r\n`;
         
         if (isAllDay) {
           icsContent += `DTSTART;VALUE=DATE:${fileDate}\r\n`;
         } else {
           icsContent += `DTSTART:${fileDate}T${startTimeStr}\r\n`;
           icsContent += `DTEND:${fileDate}T${endTimeStr}\r\n`;
         }
         
         const summary = formatIcsText(`${partial.name} - ${subject}`);
         const description = formatIcsText(`Profesor: ${cls.profesor || 'No asignado'} | Sección: ${cls.seccion} | Carrera: ${career} | Aula: ${cls.aula || 'Por definir'}`);
         const location = formatIcsText(cls.aula || 'Por definir');

         icsContent += `SUMMARY:${summary}\r\n`;
         icsContent += `DESCRIPTION:${description}\r\n`;
         icsContent += `LOCATION:${location}\r\n`;
         icsContent += "END:VEVENT\r\n";
       }
    });

    icsContent += "END:VCALENDAR\r\n";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${subject.replace(/[^a-zA-Z0-9]/g, '_')}_Examenes.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="examenes-page fade-in center-message">Cargando fechas de exámenes...</div>;
  }

  // Lógica de búsqueda
  let searchResults = [];
  if (searchTerm.trim().length > 0) {
    const term = searchTerm.toLowerCase();
    Object.keys(data).forEach(c => {
      Object.keys(data[c]).forEach(s => {
        if (s.toLowerCase().includes(term)) {
          searchResults.push({ career: c, subject: s, classes: data[c][s] });
        }
      });
    });
    // Ordenar alfabéticamente por materia
    searchResults.sort((a, b) => a.subject.localeCompare(b.subject));
  }

  const subjectsForCareer = data[activeCareer] || {};
  const subjectNames = Object.keys(subjectsForCareer).sort();

  return (
    <div className="examenes-page fade-in">
      <div className="container" style={{ padding: '4rem 2rem' }}>
        <h1 className="page-title">Fechas de Exámenes</h1>
        <p className="page-subtitle">Explora el calendario principal de evaluaciones de la facultad de forma instantánea.</p>
        
        {/* Buscador de Materias */}
        <div className="search-container glass-panel">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar materia (ej. Cálculo)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')} aria-label="Limpiar búsqueda">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {searchTerm.trim().length > 0 ? (
          /* Nivel: Resultados de Búsqueda */
          <div className="subjects-container search-results-view">
            {searchResults.length === 0 ? (
              <p className="empty-message">No se encontraron materias que coincidan con "{searchTerm}".</p>
            ) : (
              searchResults.map((result, idx) => {
                const searchSubjectId = `${result.career}-${result.subject}`;
                const isOpen = activeSubject === searchSubjectId;
                
                return (
                  <div key={idx} className={`subject-accordion glass-panel ${isOpen ? 'open' : ''}`}>
                    <button 
                      className="subject-header"
                      onClick={() => toggleSubject(searchSubjectId)}
                      aria-expanded={isOpen}
                    >
                      <div className="subject-header-title">
                        <h3>{result.subject}</h3>
                        <span className="career-badge">{result.career}</span>
                      </div>
                      <div className={`accordion-icon ${isOpen ? 'rotated' : ''}`}>
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </button>
                    
                    {isOpen && (
                      <div className="subject-content">
                        <div className="cards-grid">
                          {result.classes.map((cls, cIdx) => (
                            <div key={cIdx} className="class-card">
                              <div className="card-header">
                                <h4 className="card-prof">{cls.profesor || "Sin Profesor"}</h4>
                                <span className="card-section">Sección {cls.seccion}</span>
                              </div>
                              <div className="card-body">
                                 <div className="card-info-row">
                                   <strong>Día y Hora:</strong> <span>{cls.dia} a las {cls.hora || "-"}</span>
                                 </div>
                                 <div className="card-info-row">
                                   <strong>Aula:</strong> <span>{cls.aula || 'No asignada'}</span>
                                 </div>
                                 <div className="card-divider"></div>
                                 <div className="parciales-grid">
                                   <div className="parcial-item"><span className="p-label">1er Parcial</span><span className="p-date">{cls.parcial_1}</span></div>
                                   <div className="parcial-item"><span className="p-label">2do Parcial</span><span className="p-date">{cls.parcial_2}</span></div>
                                   <div className="parcial-item"><span className="p-label">3er Parcial</span><span className="p-date">{cls.parcial_3}</span></div>
                                   <div className="parcial-item"><span className="p-label">4to Parcial</span><span className="p-date">{cls.parcial_4}</span></div>
                                 </div>
                                 <button 
                                   className="add-calendar-btn glass-panel"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     generateICS(result.subject, result.career, cls);
                                   }}
                                   title="Agendar las 4 fechas en tu celular o computadora"
                                 >
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="calendar-icon">
                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                      <line x1="16" y1="2" x2="16" y2="6"></line>
                                      <line x1="8" y1="2" x2="8" y2="6"></line>
                                      <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    Añadir al Calendario
                                 </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Nivel: Navegación Tradicional */
          <>
            {/* Nivel 1: Pestañas de Carreras */}
            <div className="careers-tabs">
              {careers.map((career) => (
                <button
                  key={career}
                  className={`career-tab ${activeCareer === career ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCareer(career);
                    setActiveSubject('');
                  }}
                >
                  {career}
                </button>
              ))}
            </div>

            {/* Nivel 2: Acordeones de Materias */}
            <div className="subjects-container">
              {subjectNames.length === 0 ? (
                <p className="empty-message">No hay materias disponibles para esta escuela.</p>
              ) : (
                subjectNames.map((subject) => {
                  const isOpen = activeSubject === subject;
                  const classes = subjectsForCareer[subject];

                  return (
                    <div key={subject} className={`subject-accordion glass-panel ${isOpen ? 'open' : ''}`}>
                      <button 
                        className="subject-header"
                        onClick={() => toggleSubject(subject)}
                        aria-expanded={isOpen}
                      >
                        <div className="subject-header-title">
                          <h3>{subject}</h3>
                        </div>
                        <div className={`accordion-icon ${isOpen ? 'rotated' : ''}`}>
                          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </button>
                      
                      {/* Nivel 3: Tarjetas por Sección */}
                      {isOpen && (
                        <div className="subject-content">
                          <div className="cards-grid">
                            {classes.map((cls, idx) => (
                              <div key={idx} className="class-card">
                                <div className="card-header">
                                  <h4 className="card-prof">{cls.profesor || "Sin Profesor"}</h4>
                                  <span className="card-section">Sección {cls.seccion}</span>
                                </div>
                                
                                <div className="card-body">
                                   <div className="card-info-row">
                                     <strong>Día y Hora:</strong> <span>{cls.dia} a las {cls.hora || "-"}</span>
                                   </div>
                                   <div className="card-info-row">
                                     <strong>Aula:</strong> <span>{cls.aula || 'No asignada'}</span>
                                   </div>
                                   
                                   <div className="card-divider"></div>
                                   
                                   <div className="parciales-grid">
                                     <div className="parcial-item"><span className="p-label">1er Parcial</span><span className="p-date">{cls.parcial_1}</span></div>
                                     <div className="parcial-item"><span className="p-label">2do Parcial</span><span className="p-date">{cls.parcial_2}</span></div>
                                     <div className="parcial-item"><span className="p-label">3er Parcial</span><span className="p-date">{cls.parcial_3}</span></div>
                                     <div className="parcial-item"><span className="p-label">4to Parcial</span><span className="p-date">{cls.parcial_4}</span></div>
                                   </div>
                                   
                                   <button 
                                     className="add-calendar-btn glass-panel"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       generateICS(subject, activeCareer, cls);
                                     }}
                                     title="Agendar las 4 fechas en tu celular o computadora"
                                   >
                                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="calendar-icon">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                      </svg>
                                      Añadir al Calendario
                                   </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Examenes;
