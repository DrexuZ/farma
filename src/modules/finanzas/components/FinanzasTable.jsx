import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export default function FinanzasTable({ refreshTrigger, onActualizarMetricas, onDatosFiltrados }) {
    const [movimientos, setMovimientos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Estados de Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('Todos');
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const fetchMovimientos = async () => {
        setCargando(true);
        // SOLUCIÓN AL ERROR 400: Ahora cruzamos los datos con la tabla 'leads' y pedimos las columnas correctas
        const { data, error } = await supabase
            .from('finanzas')
            .select(`
                *,
                leads (nombre, trabajo_solicitado)
            `)
            .order('fecha_registro', { ascending: false });

        if (error) {
            console.error("Error al cargar finanzas:", error.message);
        } else if (data) {
            setMovimientos(data);
        }
        setCargando(false);
    };

    useEffect(() => {
        fetchMovimientos();
    }, [refreshTrigger]);

    // Lógica de Filtrado
    const movimientosFiltrados = useMemo(() => {
        let resultado = [...movimientos];

        // 1. Búsqueda por texto (concepto o cliente)
        if (busqueda) {
            const b = busqueda.toLowerCase();
            resultado = resultado.filter(m =>
                (m.concepto?.toLowerCase() || '').includes(b) ||
                (m.leads?.nombre?.toLowerCase() || '').includes(b) // Ahora lee de leads.nombre
            );
        }

        // 2. Filtro por Tipo (Ingreso/Gasto)
        if (filtroTipo !== 'Todos') {
            resultado = resultado.filter(m => m.tipo === filtroTipo);
        }

        // 3. Filtro por Categoría
        if (filtroCategoria !== 'Todas') {
            resultado = resultado.filter(m => m.categoria === filtroCategoria);
        }

        // 4. Filtro por Fechas
        if (fechaInicio) {
            resultado = resultado.filter(m => new Date(m.fecha_registro) >= new Date(fechaInicio));
        }
        if (fechaFin) {
            // Se suma un día para incluir todo el día seleccionado
            const fin = new Date(fechaFin);
            fin.setDate(fin.getDate() + 1);
            resultado = resultado.filter(m => new Date(m.fecha_registro) < fin);
        }

        return resultado;
    }, [movimientos, busqueda, filtroTipo, filtroCategoria, fechaInicio, fechaFin]);

    // Calcular Métricas y enviar datos a la vista principal
    useEffect(() => {
        let ingresos = 0;
        let gastos = 0;

        movimientosFiltrados.forEach(m => {
            if (m.tipo === 'Ingreso') ingresos += Number(m.monto);
            if (m.tipo === 'Gasto') gastos += Number(m.monto);
        });

        onActualizarMetricas({
            ingresos,
            gastos,
            neto: ingresos - gastos
        });

        // Enviamos los datos filtrados para la exportación a Excel
        if (onDatosFiltrados) {
            onDatosFiltrados(movimientosFiltrados);
        }
    }, [movimientosFiltrados]);

    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroTipo('Todos');
        setFiltroCategoria('Todas');
        setFechaInicio('');
        setFechaFin('');
    };

    if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse font-bold tracking-widest uppercase">Consultando libros contables...</div>;

    return (
        <div className="flex flex-col">
            {/* Controles de Filtrado */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buscador</label>
                        <input type="text" placeholder="Concepto o cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium bg-white">
                            <option value="Todos">Todos</option>
                            <option value="Ingreso">Ingresos</option>
                            <option value="Gasto">Gastos</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium bg-white">
                            <option value="Todas">Todas</option>
                            <optgroup label="Ingresos">
                                <option value="Venta Directa">Venta Directa</option>
                                <option value="Abono / Anticipo">Abono / Anticipo</option>
                            </optgroup>
                            <optgroup label="Gastos">
                                <option value="Nómina y Salarios">Nómina y Salarios</option>
                                <option value="Materiales/Insumos">Materiales/Insumos</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Publicidad">Publicidad / Marketing</option>
                            </optgroup>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Inicio</label>
                        <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Fin</label>
                        <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium" />
                    </div>
                    <button onClick={limpiarFiltros} className="py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl text-sm transition-colors">
                        LIMPIAR FILTROS
                    </button>
                </div>
            </div>

            {/* Tabla de Datos */}
            <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100/50 border-b border-slate-200 uppercase text-[10px] font-black text-slate-500 tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Movimiento</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4">Cliente / Proyecto</th>
                            <th className="px-6 py-4">Ref. Bancaria</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {movimientosFiltrados.length === 0 ? (
                            <tr><td colSpan="6" className="p-12 text-center text-slate-400 italic font-medium">No hay registros financieros para mostrar.</td></tr>
                        ) : (
                            movimientosFiltrados.map((m) => (
                                /* SOLUCIÓN AL ERROR REACT: Limpiado de espacios y comentarios entre etiquetas <tr> y <td> */
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                                        {new Date(m.fecha_registro).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-black text-slate-800">{m.concepto}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{m.servicio || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                                            {m.categoria || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700">
                                        {m.leads ? m.leads.nombre : <span className="text-slate-400 italic font-medium">No asignado</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-600 text-xs">{m.banco}</div>
                                        {m.id_operacion && <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {m.id_operacion}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-black text-base ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {m.tipo === 'Ingreso' ? '+' : '-'} Bs. {Number(m.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                        </span>
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