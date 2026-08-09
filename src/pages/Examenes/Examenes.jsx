import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebase';
import './Examenes.css';

const Examenes = () => {
  const [data, setData] = useState({});
  const [careers, setCareers] = useState([]);
  const [activeCareer, setActiveCareer] = useState('');
  const [activeSubject, setActiveSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);

  // Authentication and role states
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  // Excel upload and preview states
  const [excelFile, setExcelFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewCareers, setPreviewCareers] = useState([]);
  const [previewActiveCareer, setPreviewActiveCareer] = useState('');
  const [previewActiveSubject, setPreviewActiveSubject] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Listen to Auth State and role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "usuarios", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setRole(userSnap.data().role || 'estudiante');
          } else {
            setRole('estudiante');
          }
        } catch (err) {
          console.error("Error al obtener rol del usuario:", err);
          setRole('estudiante');
        }
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Exams dates on load
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const docRef = doc(db, "examenes", "main_data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const json = docSnap.data().data || {};
          setData(json);
          const careerList = Object.keys(json).sort();
          setCareers(careerList);
          if (careerList.length > 0) {
            setActiveCareer(careerList[0]);
          }
        } else {
          console.warn("Documento 'examenes/main_data' no encontrado en Firestore.");
        }
      } catch (err) {
        console.error("Error cargando los exámenes desde Firestore:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  // Helper to format Excel date serial numbers to string (DD/MM/YYYY)
  const formatExcelDate = (excelValue) => {
    if (excelValue === undefined || excelValue === null || excelValue === "") return '-';

    if (typeof excelValue === 'number') {
      const utcDate = new Date((excelValue - 25569) * 86400 * 1000);
      const dd = String(utcDate.getUTCDate()).padStart(2, '0');
      const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = utcDate.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }

    return String(excelValue).trim();
  };

  // Parse Excel file selected by user in-browser
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    setUploadError('');
    setUploadSuccess(false);
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBytes = new Uint8Array(evt.target.result);
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(dataBytes, { type: 'array' });

        const allExamsMap = new Map();

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

          rawData.forEach(row => {
            const keys = Object.keys(row);
            const getVal = (possibleEnds) => {
              const key = keys.find(k => k.trim().toUpperCase().includes(possibleEnds));
              return key ? row[key] : "";
            };

            const materia = getVal('MATERIA');
            const profesor = getVal('PROFESOR');

            if (materia && profesor && materia.trim().toUpperCase() !== 'MATERIA') {
              const key = `${getVal('ESCUELA')}-${materia.trim()}-${profesor.trim()}-${getVal('SECCION')}`;

              allExamsMap.set(key, {
                escuela: getVal('ESCUELA'),
                materia: materia.trim(),
                profesor: profesor.trim(),
                seccion: getVal('SECCION'),
                aula: getVal('AULA'),
                hora: getVal('HORA'),
                dia: getVal('DIA') || sheetName,
                parcial_1: formatExcelDate(getVal('I PARCIAL') || getVal('1 PARCIAL') || getVal('PARCIAL I')),
                parcial_2: formatExcelDate(getVal('II PARCIAL') || getVal('2 PARCIAL') || getVal('PARCIAL II')),
                parcial_3: formatExcelDate(getVal('III PARCIAL') || getVal('3 PARCIAL') || getVal('PARCIAL III')),
                parcial_4: formatExcelDate(getVal('IV PARCIAL') || getVal('4 PARCIAL') || getVal('PARCIAL IV'))
              });
            }
          });
        });

        const allExams = Array.from(allExamsMap.values());
        const structuredData = {};

        allExams.forEach(exam => {
          let escuelaRaw = exam.escuela || "Otras Especiales";
          let escuelasList = escuelaRaw.split('/').map(s => s.trim()).filter(s => s.length > 0);
          let materia = exam.materia || "Sin Nombre";

          escuelasList.forEach(escuela => {
            if (!structuredData[escuela]) {
              structuredData[escuela] = {};
            }
            if (!structuredData[escuela][materia]) {
              structuredData[escuela][materia] = [];
            }

            structuredData[escuela][materia].push({
              profesor: exam.profesor,
              seccion: exam.seccion,
              aula: exam.aula,
              hora: exam.hora,
              dia: exam.dia,
              parcial_1: exam.parcial_1,
              parcial_2: exam.parcial_2,
              parcial_3: exam.parcial_3,
              parcial_4: exam.parcial_4
            });
          });
        });

        setPreviewData(structuredData);
        const careerList = Object.keys(structuredData).sort();
        setPreviewCareers(careerList);
        if (careerList.length > 0) {
          setPreviewActiveCareer(careerList[0]);
        }
      } catch (err) {
        console.error("Error al procesar el archivo Excel:", err);
        setUploadError("El archivo no pudo ser procesado. Verifica que tenga un formato de Excel válido.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Publish previewData to Firestore
  const handlePublishExams = async () => {
    if (!previewData) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const docRef = doc(db, "examenes", "main_data");
      await setDoc(docRef, {
        data: previewData,
        updatedAt: new Date().toISOString()
      });

      // Update local state instantly
      setData(previewData);
      const careerList = Object.keys(previewData).sort();
      setCareers(careerList);
      if (careerList.length > 0) {
        setActiveCareer(careerList[0]);
      }

      setUploadSuccess(true);
      setPreviewData(null);
      setExcelFile(null);
    } catch (err) {
      console.error("Error al publicar exámenes en Firestore:", err);
      setUploadError("Error al guardar en Firestore. Revisa tu conexión o reglas de seguridad.");
    } finally {
      setUploading(false);
    }
  };

  const toggleSubject = (subjectId) => {
    setActiveSubject(activeSubject === subjectId ? '' : subjectId);
  };

  const handlePrepareDownload = (subject, career, cls) => {
    setPendingDownload({ subject, career, cls });
    const isMobile = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileDevice(isMobile);
    setShowTutorial(true);
  };

  const executeDownload = () => {
    if (!pendingDownload) return;
    const { subject, career, cls } = pendingDownload;

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

    if (cls.hora && cls.hora !== '-') {
      // Intentamos procesar el string de hora individual "HH:MM:SS a.m./p.m." o "HH:MM a/p"
      const timeMatch = cls.hora.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(a|p)/i);

      if (timeMatch) {
        let startH = parseInt(timeMatch[1], 10);
        const startM = timeMatch[2];
        const isPm = timeMatch[3].toLowerCase() === 'p';

        // Conversión a 24 horas
        if (isPm && startH < 12) startH += 12;
        if (!isPm && startH === 12) startH = 0;

        // Se asume 2 horas de duración del examen como estándar
        let endH = startH + 2;
        if (endH >= 24) endH -= 24;

        startTimeStr = `${String(startH).padStart(2, '0')}${startM}00`;
        endTimeStr = `${String(endH).padStart(2, '0')}${startM}00`;
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
      return String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
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

    setShowTutorial(false);
    setPendingDownload(null);
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
      <div className="container examenes-container">
        <h1 className="page-title">Fechas de Exámenes</h1>
        <p className="page-subtitle">Explora el calendario principal de evaluaciones de la facultad de forma instantánea.</p>

        {role === 'admin' && (
          <div className="admin-exams-panel card-panel">
            <div className="admin-panel-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="admin-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <h2>Panel de Administración: Subir Fechas de Parciales</h2>
            </div>
            <p className="admin-panel-desc">
              Sube el archivo Excel oficial (<code>.xlsx</code>) con el calendario de exámenes.
              El sistema convertirá el archivo localmente y podrás revisar los datos antes de publicarlos en la base de datos de Firestore.
            </p>

            <div className="upload-controls">
              <label className="file-upload-btn">
                <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} style={{ display: 'none' }} />
                {excelFile ? 'Cambiar archivo Excel' : 'Seleccionar archivo Excel'}
              </label>
              {excelFile && <span className="selected-filename">Archivo seleccionado: <strong>{excelFile.name}</strong></span>}
            </div>

            {uploadError && <div className="upload-message error-message">{uploadError}</div>}
            {uploadSuccess && <div className="upload-message success-message">¡Fechas de exámenes publicadas correctamente en la nube! Realiza una recarga para verificar. 🎉</div>}

            {previewData && (
              <div className="preview-container">
                <div className="preview-header">
                  <h3>🔍 Vista Previa del Calendario</h3>
                  <p>Confirma que las materias y parciales detectados sean correctos antes de publicar en la nube.</p>
                </div>

                {/* Career Selection inside preview */}
                <div className="career-tabs-container">
                  <div className="career-tabs">
                    {previewCareers.map((career) => (
                      <button
                        key={career}
                        className={`career-tab ${previewActiveCareer === career ? 'active' : ''}`}
                        onClick={() => {
                          setPreviewActiveCareer(career);
                          setPreviewActiveSubject('');
                        }}
                      >
                        {previewActiveCareer === career && <span className="active-indicator"></span>}
                        {career}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject list in preview */}
                <div className="preview-subjects-list">
                  {previewActiveCareer && Object.entries(previewData[previewActiveCareer] || {}).map(([subjectName, sections]) => (
                    <div key={subjectName} className="preview-subject-card">
                      <div className="preview-subject-header">
                        <h4>{subjectName}</h4>
                        <span className="sections-badge">{sections.length} {sections.length === 1 ? 'sección' : 'secciones'}</span>
                      </div>

                      <div className="preview-sections-grid">
                        {sections.map((sec, idx) => (
                          <div key={idx} className="preview-section-detail">
                            <p><strong>Sección:</strong> {sec.seccion} | <strong>Profesor:</strong> {sec.profesor}</p>
                            <p><strong>Clase:</strong> {sec.dia} ({sec.hora}) | <strong>Aula:</strong> {sec.aula}</p>
                            <div className="preview-parciales-row">
                              <span><strong>P1:</strong> {sec.parcial_1}</span>
                              <span><strong>P2:</strong> {sec.parcial_2}</span>
                              <span><strong>P3:</strong> {sec.parcial_3}</span>
                              <span><strong>P4:</strong> {sec.parcial_4}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="preview-actions">
                  <button className="publish-confirm-btn" onClick={handlePublishExams} disabled={uploading}>
                    {uploading ? 'Publicando...' : 'Confirmar y Publicar en la Nube'}
                  </button>
                  <button className="publish-cancel-btn" onClick={() => { setPreviewData(null); setExcelFile(null); }} disabled={uploading}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
                                    handlePrepareDownload(result.subject, result.career, cls);
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
                                      handlePrepareDownload(subject, activeCareer, cls);
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

      {showTutorial && (
        <div className="tutorial-modal-overlay fade-in">
          <div className="tutorial-modal">
            <button className="close-modal-btn" onClick={() => { setShowTutorial(false); setPendingDownload(null); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="tutorial-content">
              <h3>Archivo Generado Correctamente 🎉</h3>
              {isMobileDevice ? (
                <div className="tutorial-steps">
                  <p><strong>Paso 1:</strong> Abre el archivo <code>calendario.ics</code> desde tus notificaciones o gestor de descargas del teléfono.</p>
                  <p><strong>Paso 2:</strong> Tu dispositivo te preguntará con qué aplicación abrirlo.</p>
                  <p><strong>Paso 3:</strong> Selecciona <strong>Google Calendar</strong> (o tu app de calendario por defecto).</p>
                  <p><strong>Paso 4:</strong> Selecciona "Añadir a mi calendario" o "Importar" para agendar las 4 fechas de una sola vez.</p>
                </div>
              ) : (
                <div className="tutorial-steps">
                  <p><strong>Opción Automática:</strong> Haz doble clic sobre el archivo descargado para agregarlo directamente si tienes la App de Calendario de Windows/Mac instalada.</p>
                  <div className="tutorial-divider">O agrega a Google Calendar (Web):</div>
                  <p><strong>Paso 1:</strong> Ve a <a href="https://calendar.google.com/" target="_blank" rel="noreferrer" className="calendar-link">Google Calendar</a> en tu navegador.</p>
                  <p><strong>Paso 2:</strong> En la barra lateral izquierda, dale al botón <strong>+</strong> situado junto a "Otros calendarios" y elige <strong>"Importar"</strong>.</p>
                  <p><strong>Paso 3:</strong> Sube el archivo descargado y haz clic en importar.</p>
                </div>
              )}
              <button className="got-it-btn" onClick={executeDownload}>¡Entendido! Descargar ahora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Examenes;
