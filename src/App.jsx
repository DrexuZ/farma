import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Importación de Páginas de Autenticación
import LoginPage from './modules/auth/LoginPage';
import RolesPage from './modules/auth/RolesPage';

// Importación del Layout y Módulos del CRM
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './modules/dashboard/components/DashboardPage';
import ClientesPage from './modules/clientes/components/ClientesPage';
import ClientesCerradosPage from './modules/clientes/components/ClientesCerradosPage';
import FinanzasPage from './modules/finanzas/components/FinanzasPage';
import ProyectosPage from './modules/proyectos/components/ProyectosPage';
import CuentasPage from './modules/configuracion/components/CuentasPage';
import InventarioPage from './modules/inventario/components/InventarioPage';

function App() {
  const [sesion, setSesion] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('Inicio');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // 1. Escuchar sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      if (session) cargarPerfil(session.user.id);
      else setCargando(false);
    });

    // 2. Escuchar cambios (cuando el usuario inicia o cierra sesión)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      if (session) cargarPerfil(session.user.id);
      else { setPerfil(null); setCargando(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const cargarPerfil = async (userId) => {
    const { data } = await supabase.from('perfiles').select('*').eq('id', userId).single();
    if (data) {
      setPerfil(data);
      // Si el supervisor entra y la vista Inicio (Dashboard) está bloqueada, lo movemos a Clientes
      if (data.rol === 'Supervisor') setVistaActiva('Clientes');
    }
    setCargando(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Pantalla de carga mientras verifica si estás logueado
  if (cargando) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="font-black text-slate-400 animate-pulse uppercase tracking-widest text-xl">
          Sincronizando ORE...
        </div>
      </div>
    );
  }

  // Si no hay sesión, mostramos la pantalla de Login
  if (!sesion) return <LoginPage />;
  // NUEVO: Pantalla de bloqueo para usuarios no aprobados
  if (perfil && perfil.rol === 'Pendiente') {
    return (
      <div className="h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-slate-200">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Cuenta en Revisión</h2>
          <p className="text-slate-500 text-sm mb-6">
            Has iniciado sesión correctamente, pero tu cuenta aún no tiene permisos asignados. Por favor, contacta al (Super Administrador) para que habilite tu acceso.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }
  // Si hay sesión, mostramos el CRM
  return (
    <MainLayout setVistaActiva={setVistaActiva} vistaActiva={vistaActiva} perfil={perfil} onLogout={handleLogout}>
      {vistaActiva === 'Dashboard' && <DashboardPage />}
      {vistaActiva === 'Clientes' && <ClientesPage />}
      {vistaActiva === 'ClientesCerrados' && <ClientesCerradosPage />}
      {vistaActiva === 'Finanzas' && <FinanzasPage />}
      {vistaActiva === 'Proyectos' && <ProyectosPage />}
      {vistaActiva === 'Configuracion' && <CuentasPage />}
      {vistaActiva === 'Inventario' && <InventarioPage />}
      {vistaActiva === 'Roles' && <RolesPage />}
    </MainLayout>
  );
}

// ¡AQUÍ ESTÁ LA LÍNEA QUE FALTABA!
export default App;
