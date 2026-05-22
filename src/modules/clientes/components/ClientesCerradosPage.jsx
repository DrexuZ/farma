import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../lib/supabase';

export default function ClientesCerradosPage() {
    const [cerradosBase, setCerradosBase] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [exportando, setExportando] = useState(false);

    // Estados de Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroMotivo, setFiltroMotivo] = useState('Todos');

    const fetchCerrados = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('cerrado', true)
            .order('fecha_creacion', { ascending: false });

        if (!error) setCerradosBase(data);
        setCargando(false);
    };

    useEffect(() => { fetchCerrados(); }, []);

    // Lógica de Filtrado en tiempo real
    const cerradosFiltrados = useMemo(() => {
        let resultado = [...cerradosBase];

        if (busqueda) {
            const b = busqueda.toLowerCase();
            resultado = resultado.filter(c =>
                (c.nombres?.toLowerCase() || '').includes(b) ||
                (c.apellido_paterno?.toLowerCase() || '').includes(b)
            );
        }

        if (filtroMotivo !== 'Todos') {
            resultado = resultado.filter(c => c.motivo_cierre === filtroMotivo);
        }

        return resultado;
    }, [cerradosBase, busqueda, filtroMotivo]);

    // Función para Reabrir Cliente (Vuelve al directorio activo)
    const handleReabrir = async (id, nombre) => {
        if (window.confirm(`¿Deseas reabrir el expediente de ${nombre}? Volverá al Directorio de Clientes Activos.`)) {
            const { error } = await supabase
                .from('clientes')
                .update({
                    cerrado: false,
                    motivo_cierre: null,
                    estado: 'Reabierto'
                })
                .eq('id', id);

            if (error) alert("Error al reabrir.");
            else fetchCerrados(); // Recargar la lista
        }
    };

    // Función para Eliminar Definitivamente
    const handleEliminar = async (id, nombre) => {
        if (window.confirm(`ADVERTENCIA: ¿Eliminar a ${nombre} permanentemente? Se borrarán todos sus registros históricos y financieros.`)) {
            const { error } = await supabase.from('clientes').delete().eq('id', id);
            if (error) alert("Error al eliminar.");
            else fetchCerrados();
        }
    };

    // Exportación a Excel respetando los filtros actuales
    const exportarFiltradosAExcel = () => {
        setExportando(true);
        const datosParaExportar = cerradosFiltrados.map(c => ({
            'Cliente': `${c.nombres} ${c.apellido_paterno}`,
            'Teléfono': c.telefono,
            'Trabajo Realizado': c.trabajo_realizado || '-',
            'Motivo de Cierre': c.motivo_cierre || 'No especificado',
            'Estado Final': c.estado,
            'Fecha de Registro': new Date(c.fecha_creacion).toLocaleDateString('es-BO')
        }));

        const worksheet = XLSX.utils.json_to_sheet(datosParaExportar);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes Archivados");
        XLSX.writeFile(workbook, `Clientes_Cerrados_ORE_Filtrados.xlsx`);
        setExportando(false);
    };

    return (
        <div className="p-8 max-w-[95%] mx-auto flex flex-col gap-6 animate-in fade-in">

            {/* Cabecera */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Clientes Cerrados</h1>
                    <p className="text-sm text-slate-500 mt-1">Consulta los motivos de cierre y recupera prospectos.</p>
                </div>
                <button
                    onClick={exportarFiltradosAExcel}
                    disabled={exportando || cerradosFiltrados.length === 0}
                    className="px-5 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {exportando ? '⏳ Generando...' : '📊 Exportar Vista Actual'}
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="🔍 Buscar en el historial..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                />
                <select
                    value={filtroMotivo}
                    onChange={(e) => setFiltroMotivo(e.target.value)}
                    className="w-full md:w-64 border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 outline-none"
                >
                    <option value="Todos">Todos los Motivos</option>
                    <option value="Venta concretada">Venta concretada</option>
                    <option value="En gestión">En gestión</option>
                    <option value="Pendiente de pago">Pendiente de pago</option>
                    <option value="Postergado">Postergado</option>
                    <option value="Rechazado">Rechazado</option>
                    <option value="No responde">No responde</option>
                </select>
            </div>

            {/* Tabla de Resultados */}
            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {cargando ? (
                    <div className="p-10 text-center text-slate-400 animate-pulse">Consultando archivos de ORE...</div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Servicio</th>
                                <th className="px-6 py-4">Motivo de Cierre</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cerradosFiltrados.length === 0 ? (
                                <tr><td colSpan="4" className="p-12 text-center text-slate-400 italic">No hay registros que coincidan con la búsqueda.</td></tr>
                            ) : (
                                cerradosFiltrados.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{c.nombres} {c.apellido_paterno}</div>
                                            <div className="text-[10px] text-slate-400 uppercase">{new Date(c.fecha_creacion).toLocaleDateString('es-BO')}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold">{c.trabajo_realizado || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${c.motivo_cierre === 'Venta concretada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {c.motivo_cierre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleReabrir(c.id, c.nombres)}
                                                    title="Reabrir / Activar Cliente"
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-xs font-bold hover:bg-blue-100 transition-all"
                                                >
                                                    🔄 Reabrir
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(c.id, c.nombres)}
                                                    title="Eliminar permanentemente"
                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
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
                )}
            </div>
        </div>
    );
}