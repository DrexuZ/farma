import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function InventarioPage() {
    const [productos, setProductos] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '', descripcion: '', cantidad: '', unidad_medida: 'Litros',
        costo_unitario: '', proveedor_id: '', stock_minimo: '5'
    });
    const [editandoId, setEditandoId] = useState(null);

    const fetchDatos = async () => {
        setCargando(true);
        // Traemos el inventario y también los nombres de los proveedores
        const { data: invData } = await supabase.from('inventario').select(`*, directorio_cuentas(alias, titular)`).order('nombre');
        // Traemos solo las cuentas que son de tipo "Proveedor"
        const { data: provData } = await supabase.from('directorio_cuentas').select('*').eq('tipo', 'Proveedor');

        if (invData) setProductos(invData);
        if (provData) setProveedores(provData);
        setCargando(false);
    };

    useEffect(() => { fetchDatos(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);

        const datosAInsertar = {
            ...formData,
            cantidad: Number(formData.cantidad),
            costo_unitario: Number(formData.costo_unitario),
            stock_minimo: Number(formData.stock_minimo),
            proveedor_id: formData.proveedor_id || null
        };

        const accion = editandoId
            ? supabase.from('inventario').update(datosAInsertar).eq('id', editandoId)
            : supabase.from('inventario').insert([datosAInsertar]);

        const { error } = await accion;
        setGuardando(false);

        if (!error) {
            setModalAbierto(false);
            setFormData({ nombre: '', descripcion: '', cantidad: '', unidad_medida: 'Litros', costo_unitario: '', proveedor_id: '', stock_minimo: '5' });
            setEditandoId(null);
            fetchDatos();
        } else {
            alert("Error al guardar en el inventario.");
        }
    };

    const abrirModal = (prod = null) => {
        if (prod) {
            setFormData({ ...prod });
            setEditandoId(prod.id);
        } else {
            setFormData({ nombre: '', descripcion: '', cantidad: '', unidad_medida: 'Litros', costo_unitario: '', proveedor_id: '', stock_minimo: '5' });
            setEditandoId(null);
        }
        setModalAbierto(true);
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse">Cargando almacén...</div>;

    return (
        <div className="p-8 max-w-[95%] mx-auto flex flex-col gap-6 animate-in fade-in">

            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Control de Almacén e Inventario</h1>
                    <p className="text-sm text-slate-500">Administra tus insumos, materiales y equipos de trabajo.</p>
                </div>
                <button onClick={() => abrirModal()} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all">
                    + Añadir Producto
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Producto / Insumo</th>
                                <th className="px-6 py-4 text-center">Stock Actual</th>
                                <th className="px-6 py-4">Costo Unit.</th>
                                <th className="px-6 py-4">Proveedor Vinculado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {productos.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-400">El inventario está vacío.</td></tr>
                            ) : (
                                productos.map(p => (
                                    <tr key={p.id} className={`hover:bg-slate-50 ${p.cantidad <= p.stock_minimo ? 'bg-red-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{p.nombre}</div>
                                            <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.descripcion}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full font-black text-xs ${p.cantidad <= p.stock_minimo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {p.cantidad} {p.unidad_medida}
                                            </span>
                                            {p.cantidad <= p.stock_minimo && <p className="text-[9px] text-red-500 font-bold mt-1">¡Stock Bajo!</p>}
                                        </td>
                                        <td className="px-6 py-4 font-medium">Bs. {p.costo_unitario}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{p.directorio_cuentas?.alias || 'Sin proveedor fijo'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => abrirModal(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors">✏️ Editar</button>
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
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-slate-800">{editandoId ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre del Insumo *</label>
                                <input type="text" required className="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descripción corta</label>
                                <input type="text" className="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-500" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cantidad Inicial *</label>
                                <input type="number" step="0.01" required className="w-full border rounded-lg px-3 py-2 outline-none font-bold text-blue-600" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unidad de Medida</label>
                                <select className="w-full border rounded-lg px-3 py-2 outline-none bg-slate-50" value={formData.unidad_medida} onChange={e => setFormData({ ...formData, unidad_medida: e.target.value })}>
                                    <option value="Unidades">Unidades / Piezas</option>
                                    <option value="Litros">Litros</option>
                                    <option value="Galones">Galones</option>
                                    <option value="Kilos">Kilos</option>
                                    <option value="Cajas">Cajas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Costo Unitario (Bs.) *</label>
                                <input type="number" step="0.01" required className="w-full border rounded-lg px-3 py-2 outline-none" value={formData.costo_unitario} onChange={e => setFormData({ ...formData, costo_unitario: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alerta de Stock Mínimo</label>
                                <input type="number" step="0.01" required className="w-full border rounded-lg px-3 py-2 outline-none text-red-500" value={formData.stock_minimo} onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Proveedor Predeterminado (Opcional)</label>
                                <select className="w-full border rounded-lg px-3 py-2 outline-none bg-slate-50" value={formData.proveedor_id} onChange={e => setFormData({ ...formData, proveedor_id: e.target.value })}>
                                    <option value="">Seleccionar del Directorio...</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.alias}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4 border-t pt-4">
                            <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button type="submit" disabled={guardando} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md disabled:opacity-50">
                                {guardando ? 'Guardando...' : 'Guardar Producto'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}