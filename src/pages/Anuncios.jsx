import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import './Anuncios.css';

const CATEGORIES = ["Todos", "Académico", "Eventos", "Urgente", "General"];

const Anuncios = () => {
  // DB & Auth states
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedAnuncio, setSelectedAnuncio] = useState(null);

  // Admin form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnuncio, setEditingAnuncio] = useState(null);
  
  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formDate, setFormDate] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [formUrgent, setFormUrgent] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

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

  // Listen to Firestore collection 'anuncios' (starts empty, no seeding anymore)
  useEffect(() => {
    const colRef = collection(db, "anuncios");
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const dataList = [];
      snapshot.forEach((doc) => {
        dataList.push({ id: doc.id, ...doc.data() });
      });

      setAnuncios(dataList);
      setLoading(false);
    }, (err) => {
      console.error("Error al escuchar cambios de Firestore:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Open form for creating a new announcement
  const handleOpenCreateForm = () => {
    setEditingAnuncio(null);
    setFormTitle("");
    setFormCategory("General");
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormSummary("");
    setFormContent("");
    setFormPinned(false);
    setFormUrgent(false);
    setFormError("");
    setIsFormOpen(true);
  };

  // Open form for editing an existing announcement
  const handleOpenEditForm = (anuncio, e) => {
    e.stopPropagation(); // Prevent opening detail modal
    setEditingAnuncio(anuncio);
    setFormTitle(anuncio.title);
    setFormCategory(anuncio.category);
    setFormDate(anuncio.date);
    setFormSummary(anuncio.summary);
    setFormContent(anuncio.content);
    setFormPinned(anuncio.pinned || false);
    setFormUrgent(anuncio.urgent || false);
    setFormError("");
    setIsFormOpen(true);
  };

  // Delete announcement from Firestore
  const handleDeleteAnuncio = async (id, title, e) => {
    e.stopPropagation(); // Prevent opening detail modal
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar el anuncio "${title}"? Esta acción no se puede deshacer.`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "anuncios", id));
      // Close detail modal if the deleted announcement was open
      if (selectedAnuncio?.id === id) {
        setSelectedAnuncio(null);
      }
    } catch (err) {
      console.error("Error al eliminar el anuncio:", err);
      alert("Hubo un error al intentar eliminar el anuncio.");
    }
  };

  // Create or Update in Firestore
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSummary.trim() || !formContent.trim() || !formDate) {
      setFormError("Por favor, rellena todos los campos obligatorios.");
      return;
    }

    setFormError("");
    setFormSubmitting(true);

    const announcementData = {
      title: formTitle,
      category: formCategory,
      date: formDate,
      summary: formSummary,
      content: formContent,
      pinned: formPinned,
      urgent: formUrgent
    };

    try {
      if (editingAnuncio) {
        // Update document
        await updateDoc(doc(db, "anuncios", editingAnuncio.id), announcementData);
      } else {
        // Add new document
        await addDoc(collection(db, "anuncios"), announcementData);

        // Send push notification using Vercel Serverless Function
        try {
          fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: formTitle,
              body: formSummary
            })
          });
        } catch (fcmErr) {
          console.warn("FCM notify trigger failed:", fcmErr);
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error al guardar anuncio:", err);
      setFormError("Error al guardar en la base de datos. Inténtalo de nuevo.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredAnuncios = useMemo(() => {
    return anuncios.filter((anuncio) => {
      const matchesCategory =
        selectedCategory === "Todos" ||
        anuncio.category.toLowerCase() === selectedCategory.toLowerCase();
      
      const matchesSearch =
        anuncio.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anuncio.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anuncio.content.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      // Sort pinned announcements first, then by date descending
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });
  }, [searchTerm, selectedCategory, anuncios]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Use split to avoid timezone offsets causing wrong date to display
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
  };

  return (
    <div className="anuncios-page fade-in">
      {/* Header Section */}
      <section className="anuncios-header">
        <div className="header-overlay"></div>
        <div className="header-content container">
          <h1>Anuncios y Comunicados</h1>
          <p>Mantente al día con la información oficial del Centro de Estudiantes y la Facultad.</p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container anuncios-container">
        
        {/* Search & Filter Bar */}
        <div className="controls-panel glass-panel">
          <div className="search-box">
            <svg viewBox="0 0 24 24" className="search-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Buscar anuncios..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-buttons">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Admin Create Button */}
          {role === 'admin' && (
            <button className="btn-create-anuncio" onClick={handleOpenCreateForm}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nuevo Anuncio
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="anuncios-loading">
            <span className="spinner"></span>
            <p>Cargando anuncios oficiales...</p>
          </div>
        ) : filteredAnuncios.length > 0 ? (
          <div className="anuncios-grid">
            {filteredAnuncios.map((anuncio) => (
              <article 
                key={anuncio.id} 
                className={`anuncio-card glass-panel ${anuncio.pinned ? 'pinned' : ''} ${anuncio.urgent ? 'urgent' : ''}`}
                onClick={() => setSelectedAnuncio(anuncio)}
              >
                {/* Admin actions inside the card */}
                {role === 'admin' && (
                  <div className="card-admin-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="card-admin-btn btn-edit" 
                      onClick={(e) => handleOpenEditForm(anuncio, e)} 
                      title="Editar anuncio"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                      </svg>
                    </button>
                    <button 
                      className="card-admin-btn btn-delete" 
                      onClick={(e) => handleDeleteAnuncio(anuncio.id, anuncio.title, e)} 
                      title="Eliminar anuncio"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                )}

                <div className="card-header">
                  <span className={`category-tag ${anuncio.category.toLowerCase()}`}>
                    {anuncio.category}
                  </span>
                  
                  <div className="badge-container">
                    {anuncio.pinned && (
                      <span className="badge pin-badge" title="Anuncio Destacado">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="17" x2="12" y2="22"></line>
                          <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.33-2.91a1 1 0 0 1-.23-.64V5a3 3 0 0 0-6 0v5.45a1 1 0 0 1-.23.64l-2.33 2.9A2 2 0 0 0 5 15.24Z"></path>
                        </svg>
                        Fijado
                      </span>
                    )}
                    {anuncio.urgent && (
                      <span className="badge urgent-badge" title="Urgente / Importante">
                        ⚠️ Urgente
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="card-title">{anuncio.title}</h2>
                
                <p className="card-summary">{anuncio.summary}</p>
                
                <div className="card-footer">
                  <span className="card-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    {formatDate(anuncio.date)}
                  </span>
                  
                  <span className="read-more">
                    Ver más 
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="no-results glass-panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <h3>No se encontraron anuncios</h3>
            <p>Prueba ajustando los filtros o cambiando el término de búsqueda.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedAnuncio && (
        <div className="modal-overlay" onClick={() => setSelectedAnuncio(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedAnuncio(null)} aria-label="Cerrar modal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="modal-header">
              <span className={`category-tag ${selectedAnuncio.category.toLowerCase()}`}>
                {selectedAnuncio.category}
              </span>
              
              <div className="badge-container">
                {selectedAnuncio.pinned && (
                  <span className="badge pin-badge">
                    Fijado
                  </span>
                )}
                {selectedAnuncio.urgent && (
                  <span className="badge urgent-badge">
                    ⚠️ Urgente
                  </span>
                )}
              </div>
            </div>

            <h2 className="modal-title">{selectedAnuncio.title}</h2>
            <div className="modal-date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Publicado el {formatDate(selectedAnuncio.date)}
            </div>

            <div className="modal-body">
              {selectedAnuncio.content.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAnuncio(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Form Modal (Create or Edit) */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-content form-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsFormOpen(false)} aria-label="Cerrar formulario">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2 className="modal-title">
              {editingAnuncio ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}
            </h2>
            <p className="modal-subtitle-form">Rellena los campos para publicar un comunicado oficial.</p>

            {formError && (
              <div className="form-error-message">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="admin-announcement-form">
              <div className="form-row-grid">
                <div className="form-field">
                  <label htmlFor="form-title">Título del Anuncio *</label>
                  <input 
                    type="text" 
                    id="form-title" 
                    placeholder="Ej: Inscripciones de Cálculo I" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    maxLength={100}
                    disabled={formSubmitting}
                    required
                  />
                </div>

                <div className="form-row-flex">
                  <div className="form-field flex-1">
                    <label htmlFor="form-category">Categoría *</label>
                    <select 
                      id="form-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      disabled={formSubmitting}
                      required
                    >
                      {CATEGORIES.slice(1).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field flex-1">
                    <label htmlFor="form-date">Fecha de Publicación *</label>
                    <input 
                      type="date" 
                      id="form-date" 
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      disabled={formSubmitting}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="form-summary">Resumen Corto * (Se muestra en la tarjeta principal)</label>
                <input 
                  type="text" 
                  id="form-summary" 
                  placeholder="Ej: Se detallan fechas y pasos para el proceso..." 
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  maxLength={180}
                  disabled={formSubmitting}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="form-content">Contenido Completo * (Soporta saltos de línea para párrafos)</label>
                <textarea 
                  id="form-content" 
                  placeholder="Escribe el cuerpo del anuncio aquí..." 
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={8}
                  disabled={formSubmitting}
                  required
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={formPinned} 
                    onChange={(e) => setFormPinned(e.target.checked)}
                    disabled={formSubmitting}
                  />
                  <span className="checkbox-checkmark"></span>
                  Fijar anuncio al inicio de la lista
                </label>

                <label className="checkbox-container">
                  <input 
                    type="checkbox" 
                    checked={formUrgent} 
                    onChange={(e) => setFormUrgent(e.target.checked)}
                    disabled={formSubmitting}
                  />
                  <span className="checkbox-checkmark"></span>
                  Marcar anuncio como Urgente ⚠️
                </label>
              </div>

              <div className="form-actions-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsFormOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <span className="spinner spinner-small"></span>
                  ) : editingAnuncio ? (
                    'Guardar Cambios'
                  ) : (
                    'Publicar Anuncio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Anuncios;
