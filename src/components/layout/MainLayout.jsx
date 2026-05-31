import { useState } from 'react';

// Configuración centralizada de módulos y permisos
const MODULOS_SISTEMA = [
    { id: 'Inicio', nombre: 'Dashboard', icono: '📊', rolesPermitidos: ['SA', 'Supervisor'] },
    { id: 'Clientes', nombre: 'Clientes Activos', icono: '👥', rolesPermitidos: ['SA', 'Supervisor'] },
    { id: 'ClientesCerrados', nombre: 'Clientes Cerrados', icono: '🗃️', rolesPermitidos: ['SA', 'Supervisor'] },
    { id: 'Finanzas', nombre: 'Finanzas', icono: '💰', rolesPermitidos: ['SA'] },
    { id: 'Proyectos', nombre: 'Analítica', icono: '📈', rolesPermitidos: ['SA'] },
    { id: 'Inventario', nombre: 'Inventario', icono: '📦', rolesPermitidos: ['SA'] },
    { id: 'Configuracion', nombre: 'Cuentas', icono: '⚙️', rolesPermitidos: ['SA'] },
    { id: 'Roles', nombre: 'Gestionar Roles', icono: '🔐', rolesPermitidos: ['SA'] }
];

export default function MainLayout({ children, vistaActiva, setVistaActiva, perfil, onLogout }) {
    // Estado para el menú hamburguesa en celulares
    const [menuAbierto, setMenuAbierto] = useState(false);

    // LLAVE MAESTRA: Si el rol es SA o el correo es el oficial, tiene poder absoluto.
    const esSuperAdmin = perfil?.rol === 'SA' || perfil?.email === 'novasolum.info@gmail.com';

    // Función combinada: cambia de vista y cierra el menú en móviles
    const cambiarVista = (vista) => {
        setVistaActiva(vista);
        setMenuAbierto(false);
    };

    // Reglas de negocio para accesos súper seguras
    const tieneAcceso = (vistaId) => {
        if (esSuperAdmin) return true; // El Jefe lo ve todo

        // Buscamos el módulo y verificamos si el rol del usuario está permitido
        const modulo = MODULOS_SISTEMA.find(m => m.id === vistaId);
        return modulo ? modulo.rolesPermitidos.includes(perfil?.rol) : false;
    };

    // Estilos limpios para los botones
    const getBotonClase = (vista) => {
        const base = "w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors font-medium";
        return vistaActiva === vista
            ? `${base} bg-blue-600 font-bold text-white shadow-md`
            : `${base} hover:bg-gray-800 text-gray-400`;
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden relative">

            {/* BARRA SUPERIOR MÓVIL */}
            <div className="md:hidden bg-gray-900 text-white flex justify-between items-center p-4 w-full absolute top-0 z-20 shadow-md">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-wider text-blue-400 leading-none">ORE CRM</h1>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {esSuperAdmin ? 'Super Administrador' : 'Supervisor'}
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

            {/* OVERLAY OSCURO MÓVIL */}
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
                        {esSuperAdmin ? 'Super Administrador' : 'Supervisor'}
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar mt-2">
                    {/* Renderizado dinámico del menú basado en permisos */}
                    {MODULOS_SISTEMA.map((modulo) => {
                        if (!tieneAcceso(modulo.id)) return null;

                        return (
                            <button
                                key={modulo.id}
                                onClick={() => cambiarVista(modulo.id)}
                                className={getBotonClase(modulo.id)}
                            >
                                <span className="text-xl">{modulo.icono}</span>
                                {modulo.nombre}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800 bg-gray-950">
                    <div className="flex flex-col gap-1 mb-4 px-2">
                        <p className="text-[12px] font-bold text-gray-300 truncate">{perfil?.nombre_completo || 'Usuario'}</p>
                        <p className="text-[10px] text-gray-500 truncate">{perfil?.email || 'Cargando...'}</p>
                    </div>
                    <button onClick={onLogout} className="w-full bg-red-500/10 text-red-500 py-2.5 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm">
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL CON MURO DE SEGURIDAD */}
            <main className="flex-1 overflow-y-auto bg-gray-50 pt-[72px] md:pt-0 w-full relative">
                {tieneAcceso(vistaActiva) ? (
                    children
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                        <span className="text-6xl mb-4">⛔</span>
                        <h2 className="text-2xl font-black text-slate-700 mb-2">Acceso Denegado</h2>
                        <p className="max-w-md">Tu rol actual no tiene los permisos suficientes para visualizar o gestionar este módulo del sistema.</p>
                        <button onClick={() => cambiarVista('Clientes')} className="mt-6 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all">
                            Volver a Clientes Activos
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}