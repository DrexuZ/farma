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
      // CAMBIO: Ahora pasamos todo el objeto 'user' en lugar de solo el 'id'
      if (session) cargarPerfil(session.user);
      else setCargando(false);
    });

    // 2. Escuchar cambios (cuando el usuario inicia o cierra sesión)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
      if (session) cargarPerfil(session.user);
      else { setPerfil(null); setCargando(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Recibimos el objeto user completo para leer su email y nombre de Google
  const cargarPerfil = async (user) => {
    const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
    
    if (data) {
      // Si el perfil ya existe en la base de datos, lo cargamos
      setPerfil(data);
      if (data.rol === 'Supervisor') setVistaActiva('Clientes');
    } else {
      // SI NO EXISTE (Primer inicio de sesión), aplicamos tus reglas maestras:
      const esSuperAdmin = user.email === 'novasolum.info@gmail.com';
      const rolAsignado = esSuperAdmin ? 'SA' : 'Supervisor';
      
      const nuevoPerfil = {
        id: user.id,
        email: user.email,
        rol: rolAsignado,
        // Intentamos sacar el nombre que viene de Google, si no hay, ponemos 'Usuario'
        nombre_completo: user.user_metadata?.full_name || 'Usuario Nuevo' 
      };

      // Guardamos el nuevo perfil en Supabase
      const { data: perfilCreado, error } = await supabase
        .from('perfiles')
        .insert([nuevoPerfil])
        .select()
        .single();

      if (perfilCreado) {
        setPerfil(perfilCreado);
        if (perfilCreado.rol === 'Supervisor') setVistaActiva('Clientes');
      } else if (error) {
        console.error("Error al crear el perfil:", error.message);
      }
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
  
  // Pantalla de bloqueo para usuarios no aprobados (o pendientes)
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
  
  // Si hay sesión y está aprobado, mostramos el CRM
  return (
    <MainLayout setVistaActiva={setVistaActiva} vistaActiva={vistaActiva} perfil={perfil} onLogout={handleLogout}>
      {vistaActiva === 'Inicio' && <DashboardPage />}
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

export default App;
