import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function CuentasPage() {
    const [cuentas, setCuentas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);

    const [formData, setFormData] = useState({
        alias: '',
        titular: '',
        banco: '',
        numero_cuenta: '',
        tipo: 'Propia'
    });
    const [editandoId, setEditandoId] = useState(null);

    const fetchCuentas = async () => {
        setCargando(true);
        const { data } = await supabase.from('directorio_cuentas').select('*').order('alias', { ascending: true });
        if (data) setCuentas(data);
        setCargando(false);
    };

    useEffect(() => { fetchCuentas(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const accion = editandoId
            ? supabase.from('directorio_cuentas').update(formData).eq('id', editandoId)
            : supabase.from('directorio_cuentas').insert([formData]);

        const { error } = await accion;
        if (!error) {
            setModalAbierto(false);
            setFormData({ alias: '', titular: '', banco: '', numero_cuenta: '', tipo: 'Propia' });
            setEditandoId(null);
            fetchCuentas();
        }
    };

    const eliminarCuenta = async (id) => {
        if (window.confirm("¿Eliminar esta cuenta del directorio?")) {
            await supabase.from('directorio_cuentas').delete().eq('id', id);
            fetchCuentas();
        }
    };

    return (
        <div className="p-8 max-w-[95%] mx-auto flex flex-col gap-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Directorio de Cuentas y Proveedores</h1>
                    <p className="text-sm text-slate-500">Administra las cuentas bancarias para conciliación automática.</p>
                </div>
                <button
                    onClick={() => { setEditandoId(null); setModalAbierto(true); }}
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all"
                >
                    + Añadir Cuenta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cuentas.map(c => (
                    <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 relative group">
                        <div className="flex justify-between items-start">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.tipo === 'Propia' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {c.tipo}
                            </span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditandoId(c.id); setFormData(c); setModalAbierto(true); }} className="text-blue-500 hover:text-blue-700">✏️</button>
                                <button onClick={() => eliminarCuenta(c.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">{c.alias}</h3>
                        <div className="text-xs space-y-1">
                            <p className="text-slate-500"><span className="font-bold text-slate-700">Banco:</span> {c.banco}</p>
                            <p className="text-slate-500"><span className="font-bold text-slate-700">Nro:</span> {c.numero_cuenta}</p>
                            <p className="text-slate-500"><span className="font-bold text-slate-700">Titular:</span> {c.titular}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Formulario */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-slate-800">{editandoId ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>

                        <div className="space-y-3">
                            <input type="text" placeholder="Alias (Ej: Mi Cuenta Mercantil)" required className="w-full border rounded-lg px-4 py-2" value={formData.alias} onChange={e => setFormData({ ...formData, alias: e.target.value })} />
                            <input type="text" placeholder="Titular de la cuenta" required className="w-full border rounded-lg px-4 py-2" value={formData.titular} onChange={e => setFormData({ ...formData, titular: e.target.value })} />
                            <select className="w-full border rounded-lg px-4 py-2" value={formData.banco} onChange={e => setFormData({ ...formData, banco: e.target.value })}>
                                <option value="">Seleccionar Banco...</option>
                                <option value="Banco Mercantil Santa Cruz">Banco Mercantil</option>
                                <option value="Banco Ganadero">Banco Ganadero</option>
                                <option value="Banco Unión">Banco Unión</option>
                                <option value="BCP">BCP</option>
                                <option value="BNB">BNB</option>
                            </select>
                            <input type="text" placeholder="Número de Cuenta" className="w-full border rounded-lg px-4 py-2" value={formData.numero_cuenta} onChange={e => setFormData({ ...formData, numero_cuenta: e.target.value })} />
                            <select className="w-full border rounded-lg px-4 py-2" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                                <option value="Propia">Cuenta Propia (Ingresos)</option>
                                <option value="Proveedor">Cuenta de Proveedor (Egresos)</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 text-slate-500">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}