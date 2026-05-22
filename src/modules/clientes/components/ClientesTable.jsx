import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ClientesTable({ refreshTrigger, onEditar, onCerrar, onRefrescar }) {
    const [clientesBase, setClientesBase] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Estados de Filtros y Orden
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [filtroOrigen, setFiltroOrigen] = useState('Todos');
    const [ordenColumna, setOrdenColumna] = useState('fecha_creacion');
    const [ordenDireccion, setOrdenDireccion] = useState('desc');

    const fetchClientes = async () => {
        setCargando(true);
        // Traemos SOLO a los clientes que NO estén cerrados
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .not('cerrado', 'eq', true);

        if (!error) setClientesBase(data);
        setCargando(false);
    };

    useEffect(() => {
        fetchClientes();
    }, [refreshTrigger]);

    // Lógica de Filtrado y Ordenamiento
    const clientesFiltradosYOrdenados = useMemo(() => {
        let resultado = [...clientesBase];

        if (busqueda) {
            const b = busqueda.toLowerCase();
            resultado = resultado.filter(c =>
                (c.nombres?.toLowerCase() || '').includes(b) ||
                (c.apellido_paterno?.toLowerCase() || '').includes(b) ||
                (c.telefono || '').includes(b)
            );
        }

        if (filtroEstado !== 'Todos') resultado = resultado.filter(c => c.estado === filtroEstado);
        if (filtroOrigen !== 'Todos') resultado = resultado.filter(c => c.origen === filtroOrigen);

        resultado.sort((a, b) => {
            let vA = a[ordenColumna] || '';
            let vB = b[ordenColumna] || '';
            if (typeof vA === 'string') vA = vA.toLowerCase();
            if (typeof vB === 'string') vB = vB.toLowerCase();

            if (vA < vB) return ordenDireccion === 'asc' ? -1 : 1;
            if (vA > vB) return ordenDireccion === 'asc' ? 1 : -1;
            return 0;
        });

        return resultado;
    }, [clientesBase, busqueda, filtroEstado, filtroOrigen, ordenColumna, ordenDireccion]);

    const cambiarOrden = (columna) => {
        if (ordenColumna === columna) setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc');
        else { setOrdenColumna(columna); setOrdenDireccion('asc'); }
    };

    // Función para Eliminar permanentemente un cliente
    const handleEliminar = async (id, nombre) => {
        if (window.confirm(`¿Estás completamente seguro de eliminar a ${nombre}? Esta acción NO se puede deshacer y borrará también sus finanzas asociadas.`)) {
            const { error } = await supabase.from('clientes').delete().eq('id', id);
            if (error) {
                alert("Hubo un error al eliminar el cliente.");
                console.error(error);
            } else {
                onRefrescar(); // Le avisamos a la página que recargue los datos
            }
        }
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse">Cargando directorio...</div>;

    return (
        <div className="flex flex-col gap-4">

            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                <input
                    type="text"
                    placeholder="🔍 Buscar por nombre o teléfono..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="flex-1 w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full md:w-48 border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Todos">Todos los Estados</option>
                    <option value="Nuevo Lead">Nuevo Lead</option>
                    <option value="No responde">No responde</option>
                    <option value="Cotización enviada">Cotización enviada</option>
                    <option value="Adquirió el servicio">Adquirió el servicio</option>
                </select>
                <select value={filtroOrigen} onChange={(e) => setFiltroOrigen(e.target.value)} className="w-full md:w-48 border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Todos">Todos los Orígenes</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Referido">Referido</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="w-full overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => cambiarOrden('nombres')}>Cliente ↕</th>
                            <th className="px-4 py-3">Contacto</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => cambiarOrden('origen')}>Origen ↕</th>
                            <th className="px-4 py-3">Servicio</th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-100" onClick={() => cambiarOrden('estado')}>Estado ↕</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {clientesFiltradosYOrdenados.length === 0 ? (
                            <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No hay clientes activos para mostrar.</td></tr>
                        ) : (
                            clientesFiltradosYOrdenados.map((c) => (
                                <tr key={c.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-4 py-4 font-medium text-slate-900">
                                        {c.nombres} {c.apellido_paterno}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col text-xs">
                                            <span className="font-semibold text-slate-700">{c.telefono}</span>
                                            <span className="text-slate-400">{c.calle_avenida}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-bold">{c.origen}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-700">{c.trabajo_realizado || '-'}</span>
                                            <span className="text-[10px] text-blue-500 font-bold uppercase">{c.id_servicio}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.estado === 'Nuevo Lead' ? 'bg-emerald-100 text-emerald-700' :
                                                c.estado === 'Adquirió el servicio' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-amber-100 text-amber-700'
                                            }`}>
                                            {c.estado}
                                        </span>
                                    </td>

                                    {/* AQUÍ ESTÁN LOS BOTONES DE ACCIÓN */}
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => onEditar(c)}
                                                title="Editar Datos"
                                                className="p-1.5 text-blue-600 hover:bg-blue-100 hover:scale-110 transition-all rounded"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => onCerrar(c)}
                                                title="Cerrar/Archivar Cliente"
                                                className="p-1.5 text-amber-600 hover:bg-amber-100 hover:scale-110 transition-all rounded"
                                            >
                                                🔒
                                            </button>
                                            <button
                                                onClick={() => handleEliminar(c.id, c.nombres)}
                                                title="Eliminar Definitivamente"
                                                className="p-1.5 text-red-600 hover:bg-red-100 hover:scale-110 transition-all rounded"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>

                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}