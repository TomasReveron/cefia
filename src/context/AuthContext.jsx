import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { AuthContext } from './authContextObject';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!isMounted) return;
      setUser(currentUser);

      if (currentUser) {
        try {
          const [{ doc, onSnapshot }, { db }] = await Promise.all([
            import('firebase/firestore'),
            import('../firebaseDb'),
          ]);
          if (!isMounted || auth.currentUser?.uid !== currentUser.uid) return;

          const userDocRef = doc(db, "usuarios", currentUser.uid);
          unsubscribeProfile = onSnapshot(
            userDocRef,
            (userSnap) => {
              if (!isMounted) return;
              if (userSnap.exists()) {
                setRole(userSnap.data().role || 'estudiante');
              } else {
                setRole('estudiante');
              }
              setLoadingAuth(false);
            },
            (err) => {
              console.error("Error al obtener rol del usuario:", err);
              if (!isMounted) return;
              setRole('estudiante');
              setLoadingAuth(false);
            }
          );
        } catch (err) {
          console.error("Error cargando el rol del usuario:", err);
          if (!isMounted) return;
          setRole('estudiante');
          setLoadingAuth(false);
        }
      } else {
        setRole(null);
        setLoadingAuth(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
