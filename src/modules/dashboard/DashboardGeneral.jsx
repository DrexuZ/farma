import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { apiGet } from '../../lib/api';

// ─── DASHBOARD GERENCIAL MULTI-SUCURSAL ──────────────────────────────────────
// Panel interactivo para SUPER_ADMIN (consolidado de toda la cadena) y ADMIN
// (solo sus sucursales, filtrado por el claim del JWT). KPIs, comparativa de
// sucursales, tendencia diaria, métodos de pago, top productos y cajas abiertas.
// Todo filtrable por rango de fechas y sucursal, con exportación CSV.

const COLORES = ['#2596be', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

const fmtBs = (n) => 'Bs. ' + Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => Number(n || 0).toLocaleString('es-BO');
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const PRESETS = [
  { id: 'hoy', etiqueta: 'Hoy', dias: 1 },
  { id: '7', etiqueta: '7 días', dias: 7 },
  { id: '30', etiqueta: '30 días', dias: 30 },
  { id: '90', etiqueta: '90 días', dias: 90 },
];

export default function DashboardGeneral({ rol }) {
  const [preset, setPreset] = useState('30');
  const [desde, setDesde] = useState(() => isoLocal(new Date(Date.now() - 29 * 86400000)));
  const [hasta, setHasta] = useState(() => isoLocal(new Date()));
  const [sucursalFiltro, setSucursalFiltro] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const aplicarPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    const hoy = new Date();
    setHasta(isoLocal(hoy));
    setDesde(isoLocal(new Date(Date.now() - (p.dias - 1) * 86400000)));
  };

  const cambiarFecha = (campo, valor) => {
    setPreset('custom');
    if (campo === 'desde') setDesde(valor); else setHasta(valor);
  };

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return;
    setCargando(true);
    setError('');
    try {
      const params = new URLSearchParams({ desde, hasta });
      if (sucursalFiltro) params.set('sucursalId', sucursalFiltro);
      setDatos(await apiGet(`/api/v1/Reportes/dashboard-general?${params.toString()}`));
    } catch (err) {
      setError(err.message || 'No se pudo cargar el dashboard.');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, sucursalFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const exportarCSV = () => {
    if (!datos) return;
    const filas = [
      ['Dashboard General FarmaNova'],
      ['Rango', `${datos.rango.desde} a ${datos.rango.hasta}`],
      [],
      ['KPI', 'Valor'],
      ['Ingresos', datos.kpis.ingresos],
      ['Transacciones', datos.kpis.transacciones],
      ['Ticket promedio', datos.kpis.ticketPromedio],
      ['Utilidad', datos.kpis.utilidad],
      ['Margen promedio %', datos.kpis.margenPromedio],
      ['Mermas (u.)', datos.kpis.mermas],
      ['Valor inventario (costo)', datos.kpis.valorInventarioCosto],
      [],
      ['Sucursal', 'Ciudad', 'Ingresos', 'Transacciones', 'Ticket promedio', 'Utilidad', 'Participación %'],
      ...datos.sucursales.map((s) => [s.nombre, s.ciudad, s.ingresos, s.transacciones, s.ticketPromedio, s.utilidad, s.participacion]),
    ];
    const csv = filas.map((f) => f.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-farmanova_${datos.rango.desde}_${datos.rango.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const k = datos?.kpis;
  const tarjetasKpi = [
    { titulo: 'Ingresos', valor: fmtBs(k?.ingresos), sub: `${fmtNum(k?.transacciones)} transacciones`, color: 'from-brand-600 to-brand-400' },
    { titulo: 'Ticket Promedio', valor: fmtBs(k?.ticketPromedio), sub: 'por transacción', color: 'from-blue-600 to-blue-400' },
    { titulo: 'Utilidad', valor: fmtBs(k?.utilidad), sub: `margen ${Number(k?.margenPromedio || 0).toFixed(1)}%`, color: 'from-emerald-600 to-green-400' },
    { titulo: 'Mermas', valor: `${fmtNum(k?.mermas)} u.`, sub: `${fmtNum(k?.devoluciones)} u. devueltas`, color: 'from-red-500 to-rose-400' },
    { titulo: 'Inventario (costo)', valor: fmtBs(k?.valorInventarioCosto), sub: `venta ${fmtBs(k?.valorInventarioVenta)}`, color: 'from-violet-600 to-purple-400' },
    { titulo: 'Cajas Abiertas', valor: fmtNum(datos?.cajasAbiertas?.length || 0), sub: 'turnos en curso', color: 'from-amber-500 to-orange-400' },
  ];

  return (
    <section className="h-full flex flex-col gap-4 overflow-y-auto animate-fade-in">

      {/* Encabezado + filtros interactivos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-4 card-elevated">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-gray-800">📊 Panel de Control Gerencial</h2>
            <p className="text-sm text-gray-500">
              {rol === 'SUPER_ADMIN' ? 'Rendimiento consolidado de toda la cadena' : 'Rendimiento de sus sucursales asignadas'}
              {datos && ` · ${datos.rango.desde} → ${datos.rango.hasta}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportarCSV} disabled={!datos} className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-md">⬇️ Exportar CSV</button>
            <button onClick={cargar} disabled={cargando} className="bg-brand-500 hover:bg-brand-600 active:scale-95 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-md">🔄 Actualizar</button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => aplicarPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${preset === p.id ? 'bg-white text-brand-700 shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                {p.etiqueta}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Desde</label>
            <input type="date" value={desde} max={hasta} onChange={(e) => cambiarFecha('desde', e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Hasta</label>
            <input type="date" value={hasta} min={desde} max={isoLocal(new Date())} onChange={(e) => cambiarFecha('hasta', e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
          </div>
          <div className="min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Sucursal</label>
            <select value={sucursalFiltro} onChange={(e) => setSucursalFiltro(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="">🏬 Todas las sucursales</option>
              {(datos?.sucursalesDisponibles || []).map((s) => (
                <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center h-56 text-red-500 bg-white rounded-2xl border border-gray-200/70 p-6">
          <span className="text-4xl mb-2">⚠️</span>
          <p className="font-bold text-gray-800">Error al calcular métricas</p>
          <p className="text-xs text-gray-500 mt-1 mb-3 text-center max-w-md">{error}</p>
          <button onClick={cargar} className="btn-primary px-4 py-2 rounded-lg font-bold text-sm">🔄 Reintentar</button>
        </div>
      ) : cargando || !datos ? (
        <div className="flex flex-col items-center justify-center h-56 text-gray-500 bg-white rounded-2xl border border-gray-200/70">
          <span className="spinner spinner-lg mb-3"></span>
          <p className="font-medium text-sm">Calculando inteligencia de negocios…</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {tarjetasKpi.map((t, i) => (
              <div key={i} style={{ '--stagger': i }} className={`stagger-in bg-gradient-to-br ${t.color} text-white p-4 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute -right-5 -top-5 w-16 h-16 rounded-full bg-white/10 blur-xl"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">{t.titulo}</span>
                <span className="text-lg font-black mt-1 drop-shadow leading-tight break-words">{t.valor}</span>
                <span className="text-[9px] font-bold text-white/70 mt-0.5">{t.sub}</span>
              </div>
            ))}
          </div>

          {/* Comparativa de sucursales + métodos de pago */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 card-elevated">
              <h3 className="text-sm font-bold text-gray-800 uppercase mb-1">🏆 Comparativa de Sucursales</h3>
              <p className="text-[10px] text-gray-400 mb-3">Ingresos del período · pase el mouse para ver el detalle</p>
              {datos.sucursales.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">Sin sucursales en el alcance.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={datos.sucursales} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="codigo" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v, n) => (n === 'ingresos' ? [fmtBs(v), 'Ingresos'] : [fmtNum(v), n])}
                      labelFormatter={(i) => { const s = datos.sucursales[i]; return s ? `${s.codigo} · ${s.nombre} (${s.ciudad})` : ''; }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#2596be" radius={[8, 8, 0, 0]} maxBarSize={54} />
                    <Bar dataKey="utilidad" name="Utilidad" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={54} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 card-elevated">
              <h3 className="text-sm font-bold text-gray-800 uppercase mb-1">💳 Métodos de Pago</h3>
              <p className="text-[10px] text-gray-400 mb-3">Distribución de ingresos</p>
              {datos.metodosPago.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">Sin ventas en el período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={datos.metodosPago} dataKey="monto" nameKey="metodo" cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {datos.metodosPago.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [fmtBs(v), n]} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tendencia diaria */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 card-elevated">
            <h3 className="text-sm font-bold text-gray-800 uppercase mb-1">📈 Tendencia de Ventas</h3>
            <p className="text-[10px] text-gray-400 mb-3">Ingresos (izq.) y transacciones (der.) por día</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={datos.tendencia} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2596be" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#2596be" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="izq" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="der" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v, n) => (n === 'Ingresos' ? [fmtBs(v), n] : [fmtNum(v), n])} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="izq" type="monotone" dataKey="ingresos" name="Ingresos" stroke="#2596be" strokeWidth={2} fill="url(#gradIng)" />
                <Area yAxisId="der" type="monotone" dataKey="transacciones" name="Transacciones" stroke="#10b981" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking de sucursales + top productos + cajas abiertas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 card-elevated">
              <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">🥇 Ranking de Sucursales</h3>
              {datos.sucursales.length === 0 ? <p className="text-xs text-gray-400 text-center py-8">Sin datos.</p> : (
                <div className="flex flex-col gap-3">
                  {datos.sucursales.map((s, i) => (
                    <div key={s.id} className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-black text-gray-800 truncate">
                          {i + 1}. {s.codigo} · {s.nombre}
                        </span>
                        <span className="text-xs font-black text-brand-600 shrink-0">{fmtBs(s.ingresos)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${s.participacion}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1">
                        <span>{fmtNum(s.transacciones)} ventas · ticket {fmtBs(s.ticketPromedio)}</span>
                        <span>{s.participacion}% del total</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 card-elevated">
              <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">💊 Top Productos</h3>
              {datos.topProductos.length === 0 ? <p className="text-xs text-gray-400 text-center py-8">Sin ventas en el período.</p> : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {datos.topProductos.map((p, i) => (
                    <div key={i} className="flex justify-between items-center gap-2 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{i + 1}. {p.nombre}</p>
                        <p className="text-[9px] text-gray-500 font-bold">{fmtNum(p.cantidad)} u. · utilidad {fmtBs(p.utilidad)}</p>
                      </div>
                      <span className="text-xs font-black text-brand-600 shrink-0">{fmtBs(p.ingresos)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5 card-elevated">
              <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">🔓 Cajas Abiertas Ahora</h3>
              {datos.cajasAbiertas.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl">😴</span>
                  <p className="text-xs text-gray-400 font-bold mt-2">Ninguna sucursal en turno.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {datos.cajasAbiertas.map((c, i) => (
                    <div key={i} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-gray-800 truncate">{c.sucursal}</p>
                        <p className="text-[10px] text-gray-600 font-bold truncate">👤 {c.cajero} · desde {c.apertura}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-gray-500">fondo {fmtBs(c.fondo)}</p>
                        <p className="text-xs font-black text-emerald-700">{fmtBs(c.ventasTurno)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}