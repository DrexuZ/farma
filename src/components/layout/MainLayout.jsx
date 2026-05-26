    import { useState } from 'react';

export default function MainLayout({ children, vistaActiva, setVistaActiva, perfil, onLogout }) {
    // Estado para el menú hamburguesa en celulares
    const [menuAbierto, setMenuAbierto] = useState(false);

    // Función combinada: cambia de vista y cierra el menú en móviles
    const cambiarVista = (vista) => {
        setVistaActiva(vista);
        setMenuAbierto(false);
    };

    // Reglas de negocio para accesos
    const tieneAcceso = (vista) => {
        if (perfil?.rol === 'SA') return true; // El Jefe lo ve todo
        const accesosSupervisor = ['Clientes', 'ClientesCerrados', 'Inventario', 'Dashboard', 'Configuracion', 'Finanzas', 'Proyectos', 'Roles'];
        return accesosSupervisor.includes(vista);
    };

    // Estilos limpios para los botones
    const getBotonClase = (vista) => {
        const base = "w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors";
        return vistaActiva === vista
            ? `${base} bg-blue-600 font-bold text-white shadow-md`
            : `${base} hover:bg-gray-800 text-gray-400`;
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden relative">

            {/* BARRA SUPERIOR MÓVIL (Visible solo en celulares) */}
            <div className="md:hidden bg-gray-900 text-white flex justify-between items-center p-4 w-full absolute top-0 z-20 shadow-md">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-wider text-blue-400 leading-none">ORE CRM</h1>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {perfil?.rol === 'SA' ? 'Superadmin' : 'Supervisor'}
                    </span>
                </div>
                <button onClick={() => setMenuAbierto(!menuAbierto)} className="p-2 text-gray-300 hover:text-white focus:outline-none">
                    {menuAbierto ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    )}
                </button>
            </div>

            {/* OVERLAY OSCURO MÓVIL (Fondo negro transparente al abrir el menú) */}
            {menuAbierto && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMenuAbierto(false)}
                />
            )}

            {/* SIDEBAR PRINCIPAL */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out transform
        ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0
      `}>
                <div className="p-6 hidden md:flex flex-col items-center border-b border-gray-800">
                    <h1 className="text-2xl font-bold tracking-wider text-blue-400">CRM</h1>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full mt-2 font-black uppercase tracking-widest text-center">
                        {perfil?.rol === 'SA' ? 'Super Administrador' : 'Supervisor'}
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar mt-2">
                    {tieneAcceso('Inicio') && <button onClick={() => cambiarVista('Inicio')} className={getBotonClase('Inicio')}>📊 Dashboard</button>}

                    <button onClick={() => cambiarVista('Clientes')} className={getBotonClase('Clientes')}>👥 Clientes Activos</button>
                    <button onClick={() => cambiarVista('ClientesCerrados')} className={getBotonClase('ClientesCerrados')}>🗃️ Clientes Cerrados</button>

                    {tieneAcceso('Finanzas') && <button onClick={() => cambiarVista('Finanzas')} className={getBotonClase('Finanzas')}>💰 Finanzas</button>}
                    {tieneAcceso('Proyectos') && <button onClick={() => cambiarVista('Proyectos')} className={getBotonClase('Proyectos')}>📈 Analítica</button>}

                    <button onClick={() => cambiarVista('Inventario')} className={getBotonClase('Inventario')}>📦 Inventario</button>

                    {tieneAcceso('Configuracion') && <button onClick={() => cambiarVista('Configuracion')} className={getBotonClase('Configuracion')}>⚙️ Cuentas</button>}
                    {tieneAcceso('Roles') && <button onClick={() => cambiarVista('Roles')} className={getBotonClase('Roles')}>🔐 Gestionar Roles</button>}
                </nav>

                <div className="p-4 border-t border-gray-800 bg-gray-950">
                    <div className="flex flex-col gap-1 mb-4 px-2">
                        <p className="text-[12px] font-bold text-gray-300 truncate">{perfil?.nombre_completo}</p>
                        <p className="text-[10px] text-gray-500 truncate">{perfil?.email}</p>
                    </div>
                    <button onClick={onLogout} className="w-full bg-red-500/10 text-red-500 py-2.5 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm">
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL (pt-[72px] protege que el contenido no quede detrás de la barra móvil) */}
            <main className="flex-1 overflow-y-auto bg-gray-50 pt-[72px] md:pt-0 w-full relative">
                {children}
            </main>
        </div>
    );
}
