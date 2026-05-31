import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function LeadsPage() {
    const [leads, setLeads] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Estados Modales y Formularios
    const [modalAbierto, setModalAbierto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        celular: '',
        direccion: '',
        trabajo_solicitado: '',
        resumen: '',
        imagen: '',
        estado: 'Nuevo Lead',
        cerrado: false
    });

    const [editandoId, setEditandoId] = useState(null);
    const [cerrandoId, setCerrandoId] = useState(null);
    const [motivoCierre, setMotivoCierre] = useState('Venta concretada');

    // Estado para controlar la imagen en pantalla completa
    const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

    // 🛠️ DETECTOR DE CONEXIÓN A SUPABASE
    useEffect(() => {
        const testConnection = async () => {
            try {
                const { error } = await supabase.from('leads').select('id').limit(1);
                if (error) console.error("❌ Error de permisos (RLS):", error.message);
                else console.log("✅ Conexión EXITOSA a Supabase");
            } catch (err) {
                console.error("🚨 FALLA DE RED: Navegador sin conexión a Supabase.", err.message);
            }
        };
        testConnection();
    }, []);

    const fetchLeads = async () => {
        setCargando(true);
        const { data } = await supabase
            .from('leads')
            .select('*')
            .eq('cerrado', false)
            .order('fecha_creacion', { ascending: false });

        if (data) setLeads(data);
        setCargando(false);
    };

    useEffect(() => { fetchLeads(); }, []);

    const abrirModal = (lead = null) => {
        if (lead) {
            setFormData({ ...lead });
            setEditandoId(lead.id);
        } else {
            setFormData({
                nombre: '',
                celular: '',
                direccion: '',
                trabajo_solicitado: '',
                resumen: '',
                imagen: '',
                estado: 'Nuevo Lead',
                cerrado: false
            });
            setEditandoId(null);
        }
        setModalAbierto(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);

        const accion = editandoId
            ? supabase.from('leads').update(formData).eq('id', editandoId)
            : supabase.from('leads').insert([formData]);

        const { error } = await accion;
        setGuardando(false);

        if (!error) {
            setModalAbierto(false);
            fetchLeads();
        } else {
            alert("Error al guardar el lead. Revisa la consola.");
            console.error(error);
        }
    };

    const cambiarEstado = async (id, nuevoEstado) => {
        await supabase.from('leads').update({ estado: nuevoEstado }).eq('id', id);
        fetchLeads();
    };

    const eliminarLead = async (id) => {
        if (window.confirm("¿Estás seguro de que deseas eliminar este lead permanentemente?")) {
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (!error) fetchLeads();
        }
    };

    const confirmarCierre = async () => {
        if (!cerrandoId) return;
        const estadoFinal = motivoCierre === 'Venta concretada' ? 'Venta concretada' : 'Perdido';
        const { error } = await supabase
            .from('leads')
            .update({ cerrado: true, motivo_cierre: motivoCierre, estado: estadoFinal })
            .eq('id', cerrandoId);

        if (!error) {
            setCerrandoId(null);
            fetchLeads();
        }
    };

    const leadsFiltrados = leads.filter(c =>
        (c.nombre?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
        (c.celular || '').includes(busqueda)
    );

    if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse font-bold tracking-widest uppercase">Cargando leads...</div>;

    return (
        <div className="p-4 md:p-8 max-w-[98%] mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">

            {/* Cabecera y Buscador */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Pipeline de Leads Activos</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestiona tus prospectos entrantes desde Botpress y redes sociales.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">🔍</div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o celular..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 md:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
                        />
                    </div>
                    <button onClick={() => abrirModal()} className="w-full md:w-auto px-6 py-3 md:py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2 shrink-0">
                        <span>+</span> Nuevo Lead Manual
                    </button>
                </div>
            </div>

            {/* Grid de Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {leadsFiltrados.length === 0 ? (
                    <div className="col-span-full p-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-slate-200 border-dashed">
                        <span className="text-4xl mb-3">👻</span>
                        <p className="font-bold text-lg text-slate-500">{busqueda ? 'No se encontraron leads con esa búsqueda.' : 'No hay leads activos en este momento.'}</p>
                    </div>
                ) : (
                    leadsFiltrados.map(c => (
                        // La clase hover:z-[100] fuerza a la tarjeta a posicionarse por encima de las demás al pasar el cursor
                        <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:z-[100] transition-all duration-300 flex flex-col relative group">

                            {/* Barra de Color Superior (Estado) */}
                            <div className={`absolute top-0 left-0 w-full h-1.5 rounded-t-2xl transition-colors
                                ${c.estado === 'Nuevo Lead' ? 'bg-amber-400' :
                                    c.estado === 'Cotización enviada' ? 'bg-blue-500' :
                                        c.estado === 'En negociación' ? 'bg-purple-500' : 'bg-slate-300'}
                            `}></div>

                            {/* 1. Nombre y Fecha */}
                            <div className="flex justify-between items-start mb-4 mt-1">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 leading-tight">{c.nombre}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider flex items-center gap-1">
                                        <span>🗓️</span> {new Date(c.fecha_creacion).toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>

                                {/* Resumen AI */}
                                {c.resumen && (
                                    <div className="group/ai relative cursor-help shrink-0">
                                        <div className="bg-blue-50 border border-blue-200 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all">🤖</div>
                                        <div className="absolute hidden group-hover/ai:block bg-slate-900 text-white p-5 rounded-2xl text-xs w-[260px] shadow-2xl right-0 sm:left-1/2 sm:-translate-x-1/2 top-12 pointer-events-none">
                                            <p className="font-black text-blue-400 mb-2 border-b border-slate-700 pb-2 uppercase text-[10px] tracking-widest flex items-center gap-2"><span>🤖</span> Contexto Extraído</p>
                                            <p className="leading-relaxed font-medium text-slate-200">{c.resumen}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2 y 3. Contacto, Dirección y Trabajo a realizar */}
                            <div className="flex flex-col gap-2 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">📱</div>
                                    <span className="text-sm font-bold text-slate-700">{c.celular}</span>
                                </div>
                                {c.direccion && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">📍</div>
                                        <span className="text-sm font-bold text-slate-600">{c.direccion}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">🛠️</div>
                                    <span className="text-sm font-bold text-slate-600">
                                        {c.trabajo_solicitado || <span className="italic text-slate-400 font-normal">Por definir</span>}
                                    </span>
                                </div>
                            </div>

                            {/* 4. Enlace para ver Imagen */}
                            {c.imagen && (
                                <div className="mb-5 flex-1">
                                    <button
                                        onClick={() => setImagenSeleccionada(c.imagen)}
                                        className="inline-flex items-center gap-2 text-sm font-black text-blue-600 hover:text-blue-800 hover:underline transition-all"
                                    >
                                        <span>🖼️</span> Ver imagen
                                    </button>
                                </div>
                            )}

                            {/* Separador flexible si no hay imagen para mantener la altura */}
                            {!c.imagen && <div className="flex-1 mb-5"></div>}

                            {/* 5. Etiqueta de Categoría (Estado) y Botones de Acción */}
                            <div className="flex flex-col gap-3 mt-auto">
                                <select
                                    value={c.estado}
                                    onChange={(e) => cambiarEstado(c.id, e.target.value)}
                                    className={`w-full border rounded-xl px-4 py-2.5 text-xs font-black outline-none cursor-pointer transition-all shadow-sm
                                        ${c.estado === 'Nuevo Lead' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                                            c.estado === 'Cotización enviada' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                                c.estado === 'En negociación' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                                    'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}
                                    `}
                                >
                                    <option value="Nuevo Lead">🟡 Nuevo Lead</option>
                                    <option value="En negociación">🟣 En negociación</option>
                                    <option value="Cotización enviada">🔵 Cotización enviada</option>
                                    <option value="No responde">⚪ No responde</option>
                                </select>

                                <div className="flex justify-between items-center gap-2 mt-1">
                                    <button onClick={() => abrirModal(c)} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors flex justify-center items-center gap-1.5">
                                        ✏️ Editar
                                    </button>
                                    <button onClick={() => setCerrandoId(c.id)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 border border-slate-800 text-white rounded-xl font-bold text-xs transition-colors flex justify-center items-center gap-1.5">
                                        📦 Archivar
                                    </button>
                                    <button onClick={() => eliminarLead(c.id)} className="w-12 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs transition-colors flex justify-center items-center">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL DE EDICIÓN / NUEVO LEAD */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 flex flex-col gap-5 max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-black text-slate-800">{editandoId ? 'Ficha del Lead' : 'Nuevo Lead Manual'}</h2>
                            <button type="button" onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center font-black transition-colors">&times;</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo *</label>
                                <input type="text" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-800 transition-all" value={formData.nombre || ''} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Celular *</label>
                                <input type="text" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-800 transition-all" value={formData.celular || ''} onChange={e => setFormData({ ...formData, celular: e.target.value })} />
                            </div>

                            {/* CAMPOS OBLIGATORIOS AÑADIDOS */}
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Dirección de la casa *</label>
                                <input type="text" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-800 transition-all" value={formData.direccion || ''} onChange={e => setFormData({ ...formData, direccion: e.target.value })} placeholder="Calle, Barrio, Número de casa..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Trabajo a realizar *</label>
                                <input type="text" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-800 transition-all" value={formData.trabajo_solicitado || ''} onChange={e => setFormData({ ...formData, trabajo_solicitado: e.target.value })} placeholder="Ej. Limpieza de piso, Vidrios..." />
                            </div>

                            {editandoId && formData.resumen && (
                                <div className="md:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl mt-2">
                                    <label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2"><span>🤖</span> Contexto Extraído por IA</label>
                                    <p className="text-sm text-blue-900 leading-relaxed font-medium">{formData.resumen}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-5">
                            <button type="button" onClick={() => setModalAbierto(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" disabled={guardando} className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                                {guardando ? 'Guardando...' : 'Guardar Ficha'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL ARCHIVAR */}
            {cerrandoId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 md:p-8 flex flex-col gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl mb-2">📦</div>
                        <h2 className="text-2xl font-black text-slate-800 leading-tight">Archivar Lead</h2>
                        <p className="text-sm text-slate-500 font-medium">¿Cuál fue el resultado? Se moverá al historial de Cerrados.</p>

                        <select
                            value={motivoCierre}
                            onChange={e => setMotivoCierre(e.target.value)}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 mt-2 outline-none focus:border-amber-500 font-bold text-slate-700 bg-slate-50 transition-colors"
                        >
                            <option value="Venta concretada">✅ Venta concretada</option>
                            <option value="Perdido por precio">❌ Perdido (Precio)</option>
                            <option value="No responde / Desistió">👻 Desistió / No responde</option>
                        </select>

                        <div className="flex justify-end gap-3 mt-4 pt-5 border-t border-slate-100">
                            <button onClick={() => setCerrandoId(null)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={confirmarCierre} className="px-5 py-2.5 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 hover:-translate-y-0.5 shadow-lg shadow-amber-500/30 transition-all">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VISOR DE IMAGEN EN PANTALLA COMPLETA */}
            {imagenSeleccionada && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                    <button
                        onClick={() => setImagenSeleccionada(null)}
                        className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center text-3xl font-light transition-all"
                    >
                        &times;
                    </button>

                    <img
                        src={imagenSeleccionada}
                        alt="Evidencia Ampliada"
                        className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                    />

                    <a
                        href={imagenSeleccionada}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2"
                    >
                        ⬇️ Abrir y Descargar Original
                    </a>
                </div>
            )}

        </div>
    );
}