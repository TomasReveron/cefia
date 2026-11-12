import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  role: null,
  loadingAuth: true,
});
