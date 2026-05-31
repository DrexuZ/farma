import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
    const [datos, setDatos] = useState({
        clientes: [],
        finanzas: [],
        inventario: []
    });
    const [cargando, setCargando] = useState(true);

    const COLORES_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    useEffect(() => {
        const cargarTodo = async () => {
            setCargando(true);
            const [resClientes, resFinanzas, resInventario] = await Promise.all([
                supabase.from('clientes').select('*'),
                supabase.from('finanzas').select('*, clientes(nombres)').order('fecha_registro', { ascending: false }),
                supabase.from('inventario').select('*')
            ]);

            setDatos({
                clientes: resClientes.data || [],
                finanzas: resFinanzas.data || [],
                inventario: resInventario.data || []
            });
            setCargando(false);
        };

        cargarTodo();
    }, []);

    const kpis = useMemo(() => {
        let ingresosTotales = 0;
        let gastosTotales = 0;

        datos.finanzas.forEach(f => {
            if (f.tipo === 'Ingreso') ingresosTotales += Number(f.monto);
            if (f.tipo === 'Gasto') gastosTotales += Number(f.monto);
        });

        const clientesActivos = datos.clientes.filter(c => !c.cerrado).length;
        const ventasConcretadas = datos.clientes.filter(c => c.cerrado && c.motivo_cierre === 'Venta concretada').length;

        return {
            ingresos: ingresosTotales,
            gastos: gastosTotales,
            neto: ingresosTotales - gastosTotales,
            clientesActivos,
            ventasConcretadas,
            margen: ingresosTotales > 0 ? Math.round(((ingresosTotales - gastosTotales) / ingresosTotales) * 100) : 0
        };
    }, [datos]);

    const flujoDeCaja = useMemo(() => {
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const dataMeses = meses.map(m => ({ nombre: m, ingresos: 0, gastos: 0 }));

        const añoActual = new Date().getFullYear();

        datos.finanzas.forEach(f => {
            const fecha = new Date(f.fecha_registro);
            if (fecha.getFullYear() === añoActual) {
                const mesIndex = fecha.getMonth();
                if (f.tipo === 'Ingreso') dataMeses[mesIndex].ingresos += Number(f.monto);
                if (f.tipo === 'Gasto') dataMeses[mesIndex].gastos += Number(f.monto);
            }
        });

        const mesActualIndex = new Date().getMonth();
        return dataMeses.slice(0, mesActualIndex + 1);
    }, [datos.finanzas]);

    const embudoClientes = useMemo(() => {
        const estados = {};
        datos.clientes.filter(c => !c.cerrado).forEach(c => {
            estados[c.estado] = (estados[c.estado] || 0) + 1;
        });
        return Object.keys(estados).map(key => ({ name: key, value: estados[key] }));
    }, [datos.clientes]);

    const alertasStock = useMemo(() => {
        return datos.inventario.filter(item => item.cantidad <= item.stock_minimo);
    }, [datos.inventario]);

    const movimientosRecientes = useMemo(() => {
        return datos.finanzas.slice(0, 5);
    }, [datos.finanzas]);

    if (cargando) return <div className="p-10 text-center text-slate-500 animate-pulse">Sincronizando base de datos central...</div>;

    return (
        <div className="p-4 md:p-8 max-w-[98%] mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">

            <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-black tracking-tight mb-2">Resumen Ejecutivo</h1>
                    <p className="text-blue-200 font-medium max-w-xl">
                        Un vistazo rápido a los indicadores clave de rendimiento.
                    </p>
                </div>
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-10 pointer-events-none">
                    <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flujo de Caja Neto</p>
                    <p className={`text-3xl font-black mt-1 ${kpis.neto >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        Bs. {Math.round(kpis.neto).toLocaleString('es-BO')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Margen Global: {kpis.margen}%</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">Bs. {Math.round(kpis.ingresos).toLocaleString('es-BO')}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proyectos Cerrados</p>
                    <p className="text-3xl font-black text-blue-600 mt-1">{kpis.ventasConcretadas}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Ventas exitosas históricas</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leads Activos</p>
                    <p className="text-3xl font-black text-amber-500 mt-1">{kpis.clientesActivos}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">En proceso de negociación</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-6 flex items-center gap-2">
                        <span>📈</span> Rendimiento Financiero ({new Date().getFullYear()})
                    </h3>
                    <div className="flex-1 min-h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={flujoDeCaja} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => `Bs. ${Math.round(value).toLocaleString('es-BO')}`}
                                />
                                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                        <span>🎯</span> Embudo de Ventas (Activos)
                    </h3>
                    <div className="flex-1 min-h-[250px] w-full">
                        {embudoClientes.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm text-slate-400 italic">No hay clientes activos.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={embudoClientes} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {embudoClientes.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORES_PIE[index % COLORES_PIE.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value} clientes`} />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-red-50/50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-red-700 uppercase flex items-center gap-2"><span>⚠️</span> Alertas de Inventario</h3>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black">{alertasStock.length} Insumos críticos</span>
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                        {alertasStock.length === 0 ? (
                            <div className="p-6 text-center text-sm text-emerald-600 font-medium">Todo el almacén está abastecido. ✅</div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {alertasStock.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{item.nombre}</p>
                                            <p className="text-[10px] text-slate-500">Stock mínimo requerido: {item.stock_minimo}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-red-600 text-lg leading-none">{item.cantidad}</p>
                                            <p className="text-[9px] text-slate-400 uppercase">{item.unidad_medida}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2"><span>💸</span> Últimos Movimientos</h3>
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                        {movimientosRecientes.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-400">No hay movimientos registrados.</div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {movimientosRecientes.map(mov => (
                                    <div key={mov.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-8 rounded-full ${mov.tipo === 'Ingreso' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{mov.concepto}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(mov.fecha_registro).toLocaleDateString('es-BO')} • {mov.categoria}</p>
                                            </div>
                                        </div>
                                        <div className={`text-right font-black ${mov.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {mov.tipo === 'Ingreso' ? '+' : '-'}Bs. {Math.round(Number(mov.monto)).toLocaleString('es-BO')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}