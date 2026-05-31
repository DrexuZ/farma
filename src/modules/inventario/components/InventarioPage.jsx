import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function InventarioPage() {
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Adaptado a la nueva estructura SQL
    const valoresPorDefecto = {
        producto: '',
        stock_actual: '',
        costo_unitario: '',
        proveedor_vinculado: ''
    };

    const [formData, setFormData] = useState(valoresPorDefecto);
    const [editandoId, setEditandoId] = useState(null);

    const fetchDatos = async () => {
        setCargando(true);
        // Consulta directa y limpia a la nueva tabla inventario
        const { data: invData, error } = await supabase
            .from('inventario')
            .select('*')
            .order('producto');

        if (!error && invData) setProductos(invData);
        setCargando(false);
    };

    useEffect(() => { fetchDatos(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);

        // Formateamos los números para evitar errores en Supabase
        const datosAInsertar = {
            producto: formData.producto,
            stock_actual: parseInt(formData.stock_actual, 10),
            costo_unitario: parseFloat(formData.costo_unitario),
            proveedor_vinculado: formData.proveedor_vinculado || 'Sin proveedor'
        };

        const accion = editandoId
            ? supabase.from('inventario').update(datosAInsertar).eq('id', editandoId)
            : supabase.from('inventario').insert([datosAInsertar]);

        const { error } = await accion;
        setGuardando(false);

        if (!error) {
            setModalAbierto(false);
            setFormData(valoresPorDefecto);
            setEditandoId(null);
            fetchDatos();
        } else {
            alert("Error al guardar en el inventario.");
            console.error(error);
        }
    };

    const abrirModal = (prod = null) => {
        if (prod) {
            setFormData({ ...prod });
            setEditandoId(prod.id);
        } else {
            setFormData(valoresPorDefecto);
            setEditandoId(null);
        }
        setModalAbierto(true);
    };

    // Añadida la función para eliminar productos que faltaba
    const eliminarProducto = async (id, nombreProducto) => {
        if (window.confirm(`¿Estás seguro de eliminar "${nombreProducto}" del inventario?`)) {
            const { error } = await supabase.from('inventario').delete().eq('id', id);
            if (!error) fetchDatos();
        }
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse font-bold tracking-widest uppercase">Cargando almacén...</div>;

    return (
        <div className="p-8 max-w-[95%] mx-auto flex flex-col gap-6 animate-in fade-in">

            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Control de Almacén e Inventario</h1>
                    <p className="text-sm text-slate-500">Administra tus productos, insumos y herramientas.</p>
                </div>
                <button onClick={() => abrirModal()} className="px-5 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2">
                    <span>+</span> Añadir Producto
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Producto / Insumo</th>
                                <th className="px-6 py-4 text-center">Stock Actual</th>
                                <th className="px-6 py-4">Costo Unit. (Bs)</th>
                                <th className="px-6 py-4">Proveedor Vinculado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {productos.length === 0 ? (
                                <tr><td colSpan="5" className="p-12 text-center text-slate-400 italic">El inventario está vacío.</td></tr>
                            ) : (
                                productos.map(p => (
                                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.stock_actual <= 5 ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-800 text-base">{p.producto}</div>
                                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Actualizado: {new Date(p.fecha_actualizacion).toLocaleDateString('es-BO')}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-4 py-1.5 rounded-full font-black text-xs shadow-sm ${p.stock_actual <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {p.stock_actual}
                                            </span>
                                            {p.stock_actual <= 5 && <p className="text-[9px] text-red-500 font-bold mt-2 uppercase tracking-widest">¡Stock Bajo!</p>}
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-700">Bs. {Number(p.costo_unitario).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-indigo-600 bg-indigo-50/50 rounded-lg inline-block mt-3 px-3 py-1 border border-indigo-100">
                                            {p.proveedor_vinculado}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => abrirModal(p)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-bold text-xs">✏️ Editar</button>
                                                <button onClick={() => eliminarProducto(p.id, p.producto)} className="p-2 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-bold text-xs">🗑️ Borrar</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalAbierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 flex flex-col gap-5">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-black text-slate-800">{editandoId ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h2>
                            <button type="button" onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 w-8 h-8 rounded-full flex items-center justify-center font-black transition-colors">&times;</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Producto / Insumo *</label>
                                <input type="text" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-800 transition-all" value={formData.producto} onChange={e => setFormData({ ...formData, producto: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Stock Actual *</label>
                                <input type="number" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-black text-blue-600 transition-all" value={formData.stock_actual} onChange={e => setFormData({ ...formData, stock_actual: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Costo Unitario (Bs.) *</label>
                                <input type="number" step="0.01" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-800 transition-all" value={formData.costo_unitario} onChange={e => setFormData({ ...formData, costo_unitario: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Proveedor Vinculado (Opcional)</label>
                                <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-800 transition-all" value={formData.proveedor_vinculado} onChange={e => setFormData({ ...formData, proveedor_vinculado: e.target.value })} placeholder="Ej. Comercializadora ABC" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-5">
                            <button type="button" onClick={() => setModalAbierto(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" disabled={guardando} className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">
                                {guardando ? 'Guardando...' : 'Guardar Producto'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}