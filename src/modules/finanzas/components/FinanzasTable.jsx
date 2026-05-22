import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export default function FinanzasTable({ refreshTrigger, onActualizarMetricas, onDatosFiltrados }) {
    const [movimientosBase, setMovimientosBase] = useState([]);
    const [cargando, setCargando] = useState(true);

    // --- NUEVOS ESTADOS PARA FILTROS DE FECHA ---
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const categoriasUnicas = useMemo(() => {
        const cats = movimientosBase.map(m => m.categoria).filter(Boolean);
        return [...new Set(cats)];
    }, [movimientosBase]);

    const fetchFinanzas = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('finanzas')
            .select(`*, clientes (nombres, apellido_paterno, trabajo_realizado)`)
            .order('fecha_registro', { ascending: false });

        if (!error && data) setMovimientosBase(data);
        setCargando(false);
    };

    useEffect(() => { fetchFinanzas(); }, [refreshTrigger]);

    // --- LÓGICA DE FILTRADO DINÁMICO (Incluye el Calendario) ---
    const movimientosFiltrados = useMemo(() => {
        let resultado = [...movimientosBase];

        // 1. Filtro de Texto
        if (busqueda) {
            const b = busqueda.toLowerCase();
            resultado = resultado.filter(mov =>
                (mov.concepto?.toLowerCase() || '').includes(b) ||
                (mov.clientes?.nombres?.toLowerCase() || '').includes(b)
            );
        }

        // 2. Filtros de Select (Tipo y Categoría)
        if (filtroTipo !== 'Todos') resultado = resultado.filter(mov => mov.tipo === filtroTipo);
        if (filtroCategoria !== 'Todas') resultado = resultado.filter(mov => mov.categoria === filtroCategoria);

        // 3. FILTRO DE CALENDARIO (Rango de Fechas)
        if (fechaInicio) {
            resultado = resultado.filter(mov => mov.fecha_registro >= fechaInicio);
        }
        if (fechaFin) {
            // Añadimos "T23:59:59" para que incluya todo el día final seleccionado
            resultado = resultado.filter(mov => mov.fecha_registro <= `${fechaFin}T23:59:59`);
        }

        return resultado;
    }, [movimientosBase, busqueda, filtroTipo, filtroCategoria, fechaInicio, fechaFin]);

    // Actualizar métricas y datos para Excel
    useEffect(() => {
        onDatosFiltrados(movimientosFiltrados);
        let totalI = 0; let totalG = 0;
        movimientosFiltrados.forEach(mov => {
            if (mov.tipo === 'Ingreso') totalI += Number(mov.monto);
            if (mov.tipo === 'Gasto') totalG += Number(mov.monto);
        });
        onActualizarMetricas({ ingresos: totalI, gastos: totalG, neto: totalI - totalG });
    }, [movimientosFiltrados]);

    // Función para resetear filtros
    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroTipo('Todos');
        setFiltroCategoria('Todas');
        setFechaInicio('');
        setFechaFin('');
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse">Filtrando datos...</div>;

    return (
        <div className="flex flex-col gap-4">

            {/* BARRA DE FILTROS POTENCIADA */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Buscador</label>
                        <input
                            type="text"
                            placeholder="Concepto o cliente..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none mt-1"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Tipo</label>
                        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 mt-1">
                            <option value="Todos">Todos</option>
                            <option value="Ingreso">Ingresos</option>
                            <option value="Gasto">Gastos</option>
                        </select>
                    </div>
                    <div className="w-full md:w-48">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Categoría</label>
                        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 mt-1">
                            <option value="Todas">Todas</option>
                            {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                {/* FILTROS DE CALENDARIO */}
                <div className="flex flex-col md:flex-row gap-4 items-end border-t pt-4">
                    <div className="w-full md:w-1/3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Fecha Inicio</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="w-full md:w-1/3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Fecha Fin</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={limpiarFiltros}
                        className="w-full md:w-auto px-6 py-2 text-slate-500 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* TABLA */}
            <div className="w-full overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-200">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Movimiento</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4">Cliente / Proyecto</th>
                            <th className="px-6 py-4">Ref. Bancaria</th> {/* NUEVA COLUMNA */}
                            <th className="px-6 py-4 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {movimientosFiltrados.map((mov) => (
                            <tr key={mov.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">
                                    {new Date(mov.fecha_registro).toLocaleDateString('es-BO')}
                                </td>
                                <td className="px-6 py-4">
                                    {mov.banco ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 text-[11px]">{mov.banco}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">OP: {mov.id_operacion || 'S/N'}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300 italic text-[11px]">Efectivo / NA</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-500">{mov.categoria}</td>
                                <td className="px-6 py-4">
                                    {mov.clientes ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-xs">{mov.clientes.nombres} {mov.clientes.apellido_paterno}</span>
                                            <span className="text-[9px] text-blue-500 font-bold uppercase">{mov.clientes.trabajo_realizado}</span>
                                        </div>
                                    ) : <span className="text-slate-300 italic text-xs">Gasto General</span>}
                                </td>
                                <td className={`px-6 py-4 text-right font-black ${mov.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    Bs. {Number(mov.monto).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}