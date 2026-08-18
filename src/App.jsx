import { useState, useEffect } from 'react';
import LoginScreen from './modules/auth/LoginScreen';
import AppLegacy from './modules/legacy/AppLegacy';

// ─── SHELL DE LA APLICACIÓN (FarmaNova · Ecosistema NovaSolum) ──────────────
// Orquesta el flujo de sesión:
//   · Sin sesión  → LoginScreen (login híbrido: usuario+contraseña → sucursal → PIN)
//   · Con sesión  → AppLegacy (POS, inventario, ventas, dashboard, CRM, diccionario)
//
// El resto de la app vive en módulos (src/modules/*) y la lógica compartida en
// src/lib/* (api.js, pricing.js). Esta separación reemplaza al monolito.

export default function App() {
  const [sesionActiva, setSesionActiva] = useState(
    () => localStorage.getItem('cajaAbierta') === 'true'
  );

  // Si otra pestaña cierra sesión, esta también vuelve al login
  useEffect(() => {
    const alCambiarStorage = (e) => {
      if (e.key === 'cajaAbierta') {
        setSesionActiva(localStorage.getItem('cajaAbierta') === 'true');
      }
    };
    window.addEventListener('storage', alCambiarStorage);
    return () => window.removeEventListener('storage', alCambiarStorage);
  }, []);

  const iniciarSesion = () => setSesionActiva(true);
  const cerrarSesion = () => setSesionActiva(false);

  return sesionActiva
    ? <AppLegacy onCerrarSesion={cerrarSesion} />
    : <LoginScreen onSesionIniciada={iniciarSesion} />;
}