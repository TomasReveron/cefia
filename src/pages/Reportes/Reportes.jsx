import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebase';
import './Reportes.css';

const CATEGORIES = ["Académico", "Infraestructura", "Servicios Estudiantiles", "Seguridad/Acoso", "Otros"];
const STATUS_OPTIONS = [
  { value: "Recibido", label: "Recibido", color: "status-red" },
  { value: "En Revisión", label: "En Revisión", color: "status-yellow" },
  { value: "Resuelto", label: "Resuelto", color: "status-green" },
  { value: "Archivado", label: "Archivado", color: "status-gray" }
];

const Reportes = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Student form states
  const [category, setCategory] = useState("Académico");
  const [urgency, setUrgency] = useState("Media");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Student active tab ("form" or "history")
  const [studentTab, setStudentTab] = useState("form");
  const [myReports, setMyReports] = useState([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  // Admin dashboard states
  const [allReports, setAllReports] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterUrgency, setFilterUrgency] = useState("Todos");

  // Ticket Chat states
  const [activeTicket, setActiveTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const messagesEndRef = useRef(null);

  // 1. Listen to Auth State and role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const { getDoc } = await import('firebase/firestore');
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
        setStudentTab("form");
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Query personal reports (Student history)
  useEffect(() => {
    if (!user || role === 'admin' || studentTab !== 'history') return;

    setLoadingMyReports(true);
    const q = query(
      collection(db, "reportes"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      setMyReports(reports);
      setLoadingMyReports(false);
    }, (err) => {
      console.error("Error cargando mis reportes:", err);
      setLoadingMyReports(false);
    });

    return () => unsubscribe();
  }, [user, role, studentTab]);

  // 3. Query all reports (Admin Dashboard)
  useEffect(() => {
    if (!user || role !== 'admin') return;

    setLoadingAdmin(true);
    const q = query(
      collection(db, "reportes"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      setAllReports(reports);
      setLoadingAdmin(false);

      // If active ticket is currently open, update its references in real-time
      if (activeTicket) {
        const updated = reports.find(r => r.id === activeTicket.id);
        if (updated) setActiveTicket(updated);
      }
    }, (err) => {
      console.error("Error cargando todos los reportes para admin:", err);
      setLoadingAdmin(false);
    });

    return () => unsubscribe();
  }, [user, role, activeTicket]);

  // 4. Query messages for the active chat ticket
  useEffect(() => {
    if (!activeTicket) return;

    const q = query(
      collection(db, "reportes", activeTicket.id, "mensajes"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setChatMessages(msgs);
      
      // Smooth scroll to bottom on new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }, (err) => {
      console.error("Error cargando los mensajes del ticket:", err);
    });

    return () => unsubscribe();
  }, [activeTicket]);

  // Handle student submit report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) {
      setSubmitError("Por favor, rellena el asunto y los detalles del reporte.");
      return;
    }

    if (!isAnonymous && !user) {
      setSubmitError("Para enviar un reporte identificado, debes iniciar sesión. Activa la opción de reporte anónimo si no deseas iniciar sesión.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const reportPayload = {
        category,
        urgency,
        subject: subject.trim(),
        details: details.trim(),
        isAnonymous,
        status: "Recibido",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!isAnonymous && user) {
        reportPayload.userId = user.uid;
        reportPayload.userEmail = user.email;
      }

      await addDoc(collection(db, "reportes"), reportPayload);
      
      setSubject("");
      setDetails("");
      setIsAnonymous(false);
      setSubmitSuccess(true);
    } catch (err) {
      console.error("Error al registrar reporte:", err);
      setSubmitError("Error al guardar en la base de datos. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Admin/Student status change in real time
  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const docRef = doc(db, "reportes", reportId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error actualizando estado del reporte:", err);
    }
  };

  // Handle send chat message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeTicket || !user || sendingMessage) return;

    setSendingMessage(true);
    try {
      const msgPayload = {
        senderId: user.uid,
        senderEmail: user.email,
        senderRole: role === 'admin' ? 'admin' : 'estudiante',
        text: newMessageText.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "reportes", activeTicket.id, "mensajes"), msgPayload);
      
      // Update ticket modification timestamp
      const docRef = doc(db, "reportes", activeTicket.id);
      await updateDoc(docRef, {
        updatedAt: new Date().toISOString()
      });

      setNewMessageText("");
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Admin notes submission for anonymous tickets
  const handleSaveNotes = async () => {
    if (!activeTicket) return;
    try {
      const docRef = doc(db, "reportes", activeTicket.id);
      await updateDoc(docRef, {
        adminNotes: tempNotesText.trim(),
        updatedAt: new Date().toISOString()
      });
      
      // Update local activeTicket state with new notes
      setActiveTicket(prev => ({ ...prev, adminNotes: tempNotesText.trim() }));
      setEditingNotes(false);
      setTempNotesText("");
    } catch (err) {
      console.error("Error al guardar notas de resolución:", err);
    }
  };

  // Admin filter and search logic
  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      const matchesSearch = 
        report.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.userEmail && report.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === "Todos" || report.category === filterCategory;
      const matchesStatus = filterStatus === "Todos" || report.status === filterStatus;
      const matchesUrgency = filterUrgency === "Todos" || report.urgency === filterUrgency;

      return matchesSearch && matchesCategory && matchesStatus && matchesUrgency;
    });
  }, [allReports, searchTerm, filterCategory, filterStatus, filterUrgency]);

  // Admin Summary metrics
  const adminMetrics = useMemo(() => {
    const counts = { total: allReports.length, recibido: 0, revision: 0, resuelto: 0, alta: 0 };
    allReports.forEach(r => {
      if (r.status === "Recibido") counts.recibido++;
      if (r.status === "En Revisión") counts.revision++;
      if (r.status === "Resuelto") counts.resuelto++;
      if (r.urgency === "Alta" && r.status !== "Archivado" && r.status !== "Resuelto") counts.alta++;
    });
    return counts;
  }, [allReports]);

  if (loadingAuth) {
    return <div className="reportes-page center-message">Cargando buzón de reportes...</div>;
  }

  // --- RENDERING CHAT TICKET VIEW (Dual view for admin and student) ---
  if (activeTicket) {
    return (
      <div className="reportes-page fade-in">
        <div className="container reportes-container">
          
          {/* Header Panel del Chat */}
          <div className="chat-ticket-header glass-panel">
            <button className="back-btn" onClick={() => setActiveTicket(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="back-icon">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Volver
            </button>

            <div className="ticket-meta-title">
              <div className="ticket-badge-row">
                <span className={`urgency-badge urgency-${activeTicket.urgency.toLowerCase()}`}>{activeTicket.urgency}</span>
                <span className="category-tag">{activeTicket.category}</span>
                {activeTicket.isAnonymous && <span className="anonymous-pill">Anónimo</span>}
              </div>
              <h2 className="ticket-title">{activeTicket.subject}</h2>
              <p className="ticket-subtitle">
                Creado el {new Date(activeTicket.createdAt).toLocaleDateString()} a las {new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {!activeTicket.isAnonymous && ` • Estudiante: ${activeTicket.userEmail}`}
              </p>
            </div>

            {/* Workflow Control en Cabecera */}
            <div className="ticket-workflow-control">
              {role === 'admin' ? (
                <div className="status-selector-wrapper">
                  <span className="workflow-label">Cambiar Estado:</span>
                  <select 
                    value={activeTicket.status} 
                    onChange={(e) => handleStatusChange(activeTicket.id, e.target.value)}
                    className={`status-select ${STATUS_OPTIONS.find(o => o.value === activeTicket.status)?.color || 'status-gray'}`}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className={`status-badge-static ${STATUS_OPTIONS.find(o => o.value === activeTicket.status)?.color || 'status-gray'}`}>
                  {activeTicket.status}
                </span>
              )}
            </div>
          </div>

          {/* Cuerpo del Chat o Detalles de Reporte Anónimo */}
          {activeTicket.isAnonymous ? (
            <div className="ticket-details-box glass-panel">
              <div className="details-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="details-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <h3>Detalle de la Incidencia (Anónima)</h3>
              </div>
              <div className="details-body">
                <p className="details-text">{activeTicket.details}</p>
              </div>

              {role === 'admin' && (
                <div className="admin-notes-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <h4>Notas de Resolución / Seguimiento Estático:</h4>
                  {editingNotes ? (
                    <div className="notes-editor-wrapper">
                      <textarea 
                        value={tempNotesText} 
                        onChange={(e) => setTempNotesText(e.target.value)}
                        placeholder="Escribe aquí las notas de resolución o medidas tomadas con esta queja anónima..."
                        rows="4"
                      />
                      <div className="editor-buttons">
                        <button className="save-notes-btn" onClick={handleSaveNotes}>Guardar Notas</button>
                        <button className="cancel-notes-btn" onClick={() => { setEditingNotes(false); setTempNotesText(""); }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="notes-display-wrapper">
                      <p className={activeTicket.adminNotes ? 'has-notes' : 'no-notes'}>
                        {activeTicket.adminNotes || "Ninguna nota de resolución registrada todavía."}
                      </p>
                      <button 
                        className="edit-notes-btn" 
                        onClick={() => {
                          setEditingNotes(true);
                          setTempNotesText(activeTicket.adminNotes || "");
                        }}
                      >
                        {activeTicket.adminNotes ? 'Editar notas de resolución' : 'Agregar notas de resolución'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="ticket-chat-box glass-panel">
              <div className="chat-messages-container">
                
                {/* Primer burbuja: Detalle inicial del reporte */}
                <div className="chat-starter-bubble">
                  <div className="starter-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="starter-icon">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>Mensaje Inicial de Reporte</span>
                  </div>
                  <div className="starter-body">
                    <p>{activeTicket.details}</p>
                  </div>
                </div>

                {/* Hilo de mensajes en tiempo real */}
                {chatMessages.map((msg) => {
                  const isOwnMessage = user && msg.senderId === user.uid;
                  
                  return (
                    <div key={msg.id} className={`chat-message-row ${isOwnMessage ? 'msg-own' : 'msg-other'}`}>
                      <div className="message-bubble">
                        <div className="message-header">
                          <span className="msg-sender-name">
                            {msg.senderRole === 'admin' ? 'Directiva CEFIA' : 'Estudiante'}
                          </span>
                          <span className="msg-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="msg-text">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input para Escribir Mensajes */}
              <div className="chat-input-bar">
                <form onSubmit={handleSendMessage} className="chat-form">
                  <input 
                    type="text"
                    placeholder="Escribe tu mensaje aquí..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    disabled={sendingMessage}
                  />
                  <button type="submit" className="send-btn" disabled={!newMessageText.trim() || sendingMessage}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="send-icon">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // --- RENDERING LIST VIEW: ADMINISTRADOR ---
  if (user && role === 'admin') {
    return (
      <div className="reportes-page fade-in">
        <div className="container reportes-container">
          <h1 className="page-title">Buzón de Reportes y Reclamos</h1>
          <p className="page-subtitle">Revisa, atiende y gestiona las quejas y reclamos de la comunidad estudiantil en tiempo real.</p>

          {/* Métricas Rápidas */}
          {loadingAdmin ? (
            <div className="metrics-skeleton">Cargando estadísticas...</div>
          ) : (
            <div className="metrics-grid">
              <div className="metric-card glass-panel">
                <span className="metric-num">{adminMetrics.total}</span>
                <span className="metric-label">Total Recibidos</span>
              </div>
              <div className="metric-card glass-panel border-red">
                <span className="metric-num status-red-text">{adminMetrics.recibido}</span>
                <span className="metric-label">Nuevos (Sin Leer)</span>
              </div>
              <div className="metric-card glass-panel border-yellow">
                <span className="metric-num status-yellow-text">{adminMetrics.revision}</span>
                <span className="metric-label">En Revisión</span>
              </div>
              <div className="metric-card glass-panel border-green">
                <span className="metric-num status-green-text">{adminMetrics.resuelto}</span>
                <span className="metric-label">Resueltos</span>
              </div>
              <div className="metric-card glass-panel border-orange">
                <span className="metric-num urgency-high-text">{adminMetrics.alta}</span>
                <span className="metric-label">Pendientes Críticos</span>
              </div>
            </div>
          )}

          {/* Barra de Filtros */}
          <div className="filters-bar glass-panel">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar por asunto, detalles o correo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-selectors">
              <div className="filter-group">
                <label htmlFor="filterCategory">Categoría</label>
                <select id="filterCategory" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="Todos">Todas</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filterStatus">Estado</label>
                <select id="filterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="Todos">Todos</option>
                  {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filterUrgency">Urgencia</label>
                <select id="filterUrgency" value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}>
                  <option value="Todos">Todas</option>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Listado de Reportes */}
          <div className="reports-list-container">
            {loadingAdmin ? (
              <div className="loader-container"><span className="spinner"></span></div>
            ) : filteredReports.length === 0 ? (
              <p className="empty-message glass-panel">No se encontraron reportes con los criterios seleccionados.</p>
            ) : (
              <div className="reports-grid">
                {filteredReports.map((report) => (
                  <div key={report.id} className={`report-admin-card glass-panel urgency-${report.urgency.toLowerCase()}`}>
                    
                    <div className="report-card-header">
                      <div className="header-meta">
                        <span className={`urgency-badge urgency-${report.urgency.toLowerCase()}`}>{report.urgency}</span>
                        <span className="category-tag">{report.category}</span>
                      </div>
                      
                      <span className={`status-badge-static ${STATUS_OPTIONS.find(o => o.value === report.status)?.color || 'status-gray'}`}>
                        {report.status}
                      </span>
                    </div>

                    <h3 className="report-subject">{report.subject}</h3>
                    <p className="report-details">{report.details.substring(0, 160)}{report.details.length > 160 ? '...' : ''}</p>

                    <div className="report-user-info" style={{ marginBottom: '1.25rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="user-icon">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      {report.isAnonymous ? (
                        <span className="anonymous-text">Enviado de forma Anónima</span>
                      ) : (
                        <span className="identified-text">{report.userEmail || "Usuario Anonimo"}</span>
                      )}
                      <span className="report-date-sep">•</span>
                      <span className="report-date">{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>

                    <button className="submit-report-btn open-ticket-btn" onClick={() => setActiveTicket(report)} style={{ width: '100%' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chat-btn-icon" style={{ marginRight: '8px', width: '18px', height: '18px' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      {report.isAnonymous ? 'Ver Detalles' : 'Abrir Chat y Detalles'}
                    </button>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING LIST VIEW: ESTUDIANTE / VISITANTE ---
  return (
    <div className="reportes-page fade-in">
      <div className="container reportes-container">
        <h1 className="page-title">Buzón de Reportes</h1>
        <p className="page-subtitle">Haz oír tu voz. Reporta fallas de infraestructura, inconvenientes académicos o propón ideas de forma segura.</p>

        {/* Tab Selection (only visible if logged in) */}
        {user && (
          <div className="careers-tabs tab-selectors" style={{ marginBottom: '2.5rem' }}>
            <button 
              className={`career-tab ${studentTab === 'form' ? 'active' : ''}`}
              onClick={() => setStudentTab('form')}
            >
              Crear Reporte
            </button>
            <button 
              className={`career-tab ${studentTab === 'history' ? 'active' : ''}`}
              onClick={() => setStudentTab('history')}
            >
              Mis Reportes Enviados
            </button>
          </div>
        )}

        {studentTab === 'form' ? (
          /* Formulario de Registro */
          <div className="report-form-card glass-panel">
            <h2 className="form-card-title">Enviar un nuevo Reporte o Sugerencia</h2>
            
            {submitSuccess && (
              <div className="upload-message success-message">
                ¡Tu reporte ha sido enviado al Centro de Estudiantes con éxito! Trabajaremos en revisarlo pronto.
              </div>
            )}

            {submitError && (
              <div className="upload-message error-message">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitReport} className="report-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="category">Categoría del Incidente</label>
                  <select 
                    id="category" 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={submitting}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="urgency">Nivel de Urgencia Estimado</label>
                  <select 
                    id="urgency" 
                    value={urgency} 
                    onChange={(e) => setUrgency(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="Baja">Baja (Sugerencia o consulta general)</option>
                    <option value="Media">Media (Falla o molestia menor)</option>
                    <option value="Alta">Alta (Incidente crítico, acoso o evaluación injusta)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Asunto / Resumen</label>
                <input 
                  type="text" 
                  id="subject"
                  placeholder="Ej: Bombillo quemado en Laboratorio 3 de Redes"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting}
                  maxLength="100"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="details">Explicación detallada de los hechos</label>
                <textarea 
                  id="details"
                  placeholder="Por favor, describe detalladamente la situación. Incluye fechas, salones y toda la información que sea de utilidad para poder investigar el caso."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={submitting}
                  rows="6"
                  required
                />
              </div>

              {/* Anonymous Checkbox */}
              <div className="anonymous-toggle-wrapper">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    disabled={submitting}
                  />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Enviar este reporte de forma 100% Anónima</span>
                </label>
                <p className="anonymous-disclaimer">
                  {isAnonymous ? (
                    "🔒 Seleccionado: Tus datos de cuenta (correo, ID) no se registrarán en la base de datos. Nadie sabrá quién envió este reporte."
                  ) : (
                    user ? (
                      `👤 Identificado: Tu correo (${user.email}) quedará asociado para que los administradores te den feedback y puedas hacer seguimiento.`
                    ) : (
                      <span className="login-warning-text">
                        ⚠️ Para enviar un reporte identificado y habilitar el chat, debes <Link to="/login" className="login-link-inline">iniciar sesión</Link>. Si no deseas iniciar sesión, marca la opción anónima arriba.
                      </span>
                    )
                  )}
                </p>
              </div>

              <button type="submit" className="submit-report-btn" disabled={submitting || (!isAnonymous && !user)}>
                {submitting ? <span className="spinner"></span> : 'Enviar Reporte al CEFIA'}
              </button>
            </form>
          </div>
        ) : (
          /* Historial Personal de Reportes (Mis Reportes) */
          <div className="reports-history-container">
            {loadingMyReports ? (
              <div className="loader-container"><span className="spinner"></span></div>
            ) : myReports.length === 0 ? (
              <div className="empty-message glass-panel">
                <h3>No has enviado ningún reporte identificado todavía.</h3>
                <p>Si enviaste reportes en el pasado con la opción "Anónima", estos no aparecen en tu historial por seguridad de tu identidad.</p>
                <button className="got-it-btn" onClick={() => setStudentTab('form')} style={{ maxWidth: '250px', margin: '1rem auto 0 auto' }}>Crear primer reporte</button>
              </div>
            ) : (
              <div className="reports-grid">
                {myReports.map((report) => (
                  <div key={report.id} className={`report-student-card glass-panel urgency-${report.urgency.toLowerCase()}`}>
                    
                    <div className="report-card-header">
                      <div className="header-meta">
                        <span className={`urgency-badge urgency-${report.urgency.toLowerCase()}`}>{report.urgency}</span>
                        <span className="category-tag">{report.category}</span>
                      </div>
                      
                      <span className={`status-badge-static ${STATUS_OPTIONS.find(o => o.value === report.status)?.color || 'status-gray'}`}>
                        {report.status}
                      </span>
                    </div>

                    <h3 className="report-subject">{report.subject}</h3>
                    <p className="report-details">{report.details.substring(0, 160)}{report.details.length > 160 ? '...' : ''}</p>
                    <span className="report-meta-date" style={{ marginBottom: '1.25rem', display: 'block' }}>Enviado el {new Date(report.createdAt).toLocaleDateString()}</span>

                    <button className="submit-report-btn open-ticket-btn" onClick={() => setActiveTicket(report)} style={{ width: '100%' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chat-btn-icon" style={{ marginRight: '8px', width: '18px', height: '18px' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      Abrir Chat y Detalles
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reportes;
