import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function RolesPage() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);

    const fetchUsuarios = async () => {
        setCargando(true);
        const { data } = await supabase.from('perfiles').select('*').order('rol', { ascending: false });
        if (data) setUsuarios(data);
        setCargando(false);
    };

    useEffect(() => { fetchUsuarios(); }, []);

    const cambiarRol = async (id, nuevoRol) => {
        await supabase.from('perfiles').update({ rol: nuevoRol }).eq('id', id);
        fetchUsuarios();
    };

    const getBadgeColor = (rol) => {
        if (rol === 'SA') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (rol === 'Supervisor') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        return 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse';
    };

    return (
        <div className="p-8 max-w-[95%] mx-auto animate-in fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-800">Control de Accesos y Roles</h1>
                <p className="text-sm text-slate-500">Asigna permisos a los miembros del equipo que inicien sesión en el CRM.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <span>💡</span> Flujo de trabajo: Pide a tu equipo que inicie sesión con Google. Aparecerán aquí como "Pendiente" y tú podrás asignarles un rol.
                    </p>
                </div>

                {cargando ? (
                    <div className="p-10 text-center text-slate-400">Cargando directorio de usuarios...</div>
                ) : (
                    /* 👇 AQUÍ ESTÁ LA SOLUCIÓN RESPONSIVE 👇 */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[600px]">
                            <thead className="bg-white font-bold uppercase text-[10px] text-slate-400 border-b">
                                <tr>
                                    <th className="px-6 py-4">Usuario / Email</th>
                                    <th className="px-6 py-4 text-center">Estado Actual</th>
                                    <th className="px-6 py-4 text-right">Asignar Acceso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usuarios.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{u.nombre_completo || 'Usuario sin nombre'}</div>
                                            <div className="text-slate-500 text-xs">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getBadgeColor(u.rol)}`}>
                                                {u.rol}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <select
                                                value={u.rol}
                                                onChange={(e) => cambiarRol(u.id, e.target.value)}
                                                className={`border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500
                          ${u.rol === 'Pendiente' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-300 text-slate-700'}
                        `}
                                            >
                                                <option value="Pendiente">Bloqueado (Pendiente)</option>
                                                <option value="Supervisor">Supervisor (Limitado)</option>
                                                <option value="SA">Super Administrador (Total)</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    /* 👆 FIN DE LA SOLUCIÓN RESPONSIVE 👆 */
                )}
            </div>
        </div>
    );
}