import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiGet, apiPost } from '../../lib/api';
import { precioVentaRedondeado, precioVentaSugerido, markupPorcentaje, MARKUP_POR_DEFECTO } from '../../lib/pricing';
import { puedeAdoptarDiccionario } from '../auth/permissions';

// ─── DICCIONARIO DE MEDICAMENTOS (catálogo maestro AGEMED) ──────────────────
// Tabla de referencia de los 11.115 medicamentos con registro sanitario en
// Bolivia. La sucursal "adopta" un medicamento a su inventario indicando el
// precio de compra; el sistema calcula la venta con markup 33.33% (redondeo
// al alza) y exige la clave de autorización admin.

export default function DiccionarioScreen({ sucursalId, sucursalNombre, onAdoptado }) {
  // Búsqueda y filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroPais, setFiltroPais] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [filtroControlado, setFiltroControlado] = useState('');
  const [filtros, setFiltros] = useState({ paises: [] });
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [buscoUnaVez, setBuscoUnaVez] = useState(false);

  // Adopción
  const [modalAdoptar, setModalAdoptar] = useState(null); // { medicamento }
  const [precioCompra, setPrecioCompra] = useState('');
  const [margen, setMargen] = useState(String(MARKUP_POR_DEFECTO));
  const [redondear, setRedondear] = useState(true);
  const [clave, setClave] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const rol = localStorage.getItem('rolUsuario') || 'CAJERO';

  const cargarFiltros = async () => {
    try {
      const datos = await apiGet('/api/v1/Medicamentos/filtros');
      setFiltros(datos);
    } catch { /* silencioso: los filtros son opcionales */ }
  };

  const buscar = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (busqueda.trim()) params.set('q', busqueda.trim());
      if (filtroPais) params.set('pais', filtroPais);
      if (filtroOrigen) params.set('origen', filtroOrigen);
      if (filtroControlado !== '') params.set('controlado', filtroControlado);
      params.set('limit', '80');
      const datos = await apiGet(`/api/v1/Medicamentos?${params.toString()}`);
      setResultados(datos);
      setBuscoUnaVez(true);
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  const abrirModalAdoptar = (medicamento) => {
    setModalAdoptar({ medicamento });
    setPrecioCompra('');
    setMargen(String(MARKUP_POR_DEFECTO));
    setRedondear(true);
    setClave('');
    setErrorModal('');
  };

  // Cerrar con tecla Escape mientras el modal esté abierto
  useEffect(() => {
    if (!modalAdoptar) return;
    const onKey = (e) => { if (e.key === 'Escape') setModalAdoptar(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalAdoptar]);

  const adoptar = async (e) => {
    e.preventDefault();
    setErrorModal('');
    const compra = parseFloat(precioCompra);
    if (!(compra > 0)) return setErrorModal('Indica el precio de compra en Bs.');
    if (!sucursalId) return setErrorModal('No hay sucursal activa en este turno. Vuelve a iniciar sesión.');
    setGuardando(true);
    try {
      const datos = await apiPost('/api/v1/Medicamentos/adoptar', {
        medicamentoId: modalAdoptar.medicamento.id,
        sucursalId,
        claveAutorizacion: clave,
        precioCompra: compra,
        margenPorcentaje: parseFloat(margen) || MARKUP_POR_DEFECTO,
        redondear,
      });
      alert(`✅ ${datos.Mensaje || 'Medicamento adoptado.'}\nVenta sugerida: Bs. ${Number(datos.PrecioVenta || datos.precioVenta || 0).toFixed(2)} (markup ${Number(datos.MarkupPorcentaje || datos.markupPorcentaje || 0).toFixed(1)}%)`);
      setModalAdoptar(null);
      if (onAdoptado) onAdoptado();
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Vista previa del cálculo dentro del modal
  const compraNum = parseFloat(precioCompra) || 0;
  const margenNum = parseFloat(margen) || MARKUP_POR_DEFECTO;
  const ventaPrevia = compraNum > 0
    ? (redondear ? precioVentaRedondeado(compraNum, margenNum) : precioVentaSugerido(compraNum, margenNum))
    : 0;

  return (
    <section className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800">📚 Diccionario de Medicamentos</h2>
          <p className="text-sm text-gray-500">
            Catálogo maestro AGEMED · registros sanitarios nacionales e importados.
            {sucursalNombre ? ` Adopción a: ${sucursalNombre}.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargarFiltros} className="bg-gray-100 hover:bg-gray-200 active:scale-95 py-2 px-4 rounded-xl text-xs font-bold text-gray-700 transition-all duration-200">🔄 Filtros</button>
          <button onClick={buscar} className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all duration-200 shadow-md">🔍 Buscar</button>
        </div>
      </div>

      {/* Barra de búsqueda + filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-4 card-elevated">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Buscar medicamento</label>
            <input
              type="text"
              placeholder="Nombre, genérico, laboratorio…"
              className="w-full mt-1 p-2 border border-gray-300 rounded text-xs outline-none focus:ring-2 focus:ring-brand-500"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">País de origen</label>
            <select className="w-full mt-1 p-2 border border-gray-300 rounded text-xs outline-none" value={filtroPais} onChange={(e) => setFiltroPais(e.target.value)}>
              <option value="">Todos</option>
              {(filtros.paises || []).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Origen</label>
            <select className="w-full mt-1 p-2 border border-gray-300 rounded text-xs outline-none" value={filtroOrigen} onChange={(e) => setFiltroOrigen(e.target.value)}>
              <option value="">Todos</option>
              <option value="II">Importado (II)</option>
              <option value="NN">Nacional (NN)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de venta</label>
            <select className="w-full mt-1 p-2 border border-gray-300 rounded text-xs outline-none" value={filtroControlado} onChange={(e) => setFiltroControlado(e.target.value)}>
              <option value="">Todos</option>
              <option value="false">Venta libre</option>
              <option value="true">Controlado (receta)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 font-bold">
            {cargando ? 'Consultando diccionario…' : `${resultados.length} resultados`}
          </p>
          <p className="text-[10px] text-gray-400">Fuente: Registro Sanitario AGEMED · Bolivia</p>
        </div>
      </div>

      {/* Tabla de resultados */}
      {cargando ? (
        <div className="flex items-center justify-center h-48 text-gray-400 animate-pulse">⏳ Consultando el diccionario maestro…</div>
      ) : resultados.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
          <span className="text-5xl mb-3">📚</span>
          <p className="font-bold">{buscoUnaVez ? 'Sin resultados.' : 'Busca en el catálogo AGEMED'}</p>
          <p className="text-xs mt-1">{buscoUnaVez ? 'Prueba con otro término o quita filtros.' : 'Escribe un nombre y presiona Buscar.'}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-gray-200/70">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 text-left">
              <tr className="uppercase text-[9px] text-gray-500 font-bold tracking-wider">
                <th className="px-3 py-2">Medicamento</th>
                <th className="px-3 py-2">Genérico (DCI)</th>
                <th className="px-3 py-2">Concentración</th>
                <th className="px-3 py-2">Laboratorio</th>
                <th className="px-3 py-2">País</th>
                <th className="px-3 py-2">Registro</th>
                <th className="px-3 py-2">Venta</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((m) => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-brand-50/50 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-gray-800">{m.nombreComercial}</td>
                  <td className="px-3 py-2.5 text-gray-600">{m.nombreGenerico || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{m.concentracion || m.formaFarmaceutica || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{m.laboratorioFabricante || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700">{m.paisOrigen || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${m.codigoRegistro === 'NN' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{m.codigoRegistro} {m.numeroRegistro}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${m.esControlado ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{m.esControlado ? 'RECETA' : 'LIBRE'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {puedeAdoptarDiccionario(rol) && (
                      <button onClick={() => abrirModalAdoptar(m)} className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all duration-200">⚡ Adoptar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL ADOPTAR (portal a body: evita recorte por transform/overflow de ancestros) ── */}
      {modalAdoptar && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalAdoptar(null)}>
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-[520px] max-w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-in border border-gray-200/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-black text-gray-800">⚡ Adoptar al Inventario</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {modalAdoptar.medicamento.nombreComercial} · {modalAdoptar.medicamento.nombreGenerico || ''}
                </p>
              </div>
              <button type="button" onClick={() => setModalAdoptar(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2">✕</button>
            </div>

            <form onSubmit={adoptar} className="flex flex-col gap-3 text-xs">
              <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                <p className="text-[10px] font-black text-blue-700 uppercase mb-1">📦 Datos del medicamento (AGEMED)</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-700">
                  <span>🏭 <b>{modalAdoptar.medicamento.laboratorioFabricante || '—'}</b></span>
                  <span>🌍 {modalAdoptar.medicamento.paisOrigen || '—'}</span>
                  <span>⚗️ {modalAdoptar.medicamento.concentracion || modalAdoptar.medicamento.formaFarmaceutica || '—'}</span>
                  <span>📋 {modalAdoptar.medicamento.codigoRegistro} {modalAdoptar.medicamento.numeroRegistro}</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">📍 Sucursal destino</p>
                <p className="text-emerald-800 font-bold">{sucursalNombre || '⚠️ Sin sucursal en el turno'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Precio de compra (Bs.) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    autoFocus
                    placeholder="0.00"
                    className="w-full mt-1 p-2 border border-gray-300 rounded text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                    value={precioCompra}
                    onChange={(e) => setPrecioCompra(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Margen (markup %)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full mt-1 p-2 border border-gray-300 rounded text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                    value={margen}
                    onChange={(e) => setMargen(e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-gray-700 font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-emerald-600"
                  checked={redondear}
                  onChange={(e) => setRedondear(e.target.checked)}
                />
                Redondear precio de venta al alza (política de la cadena)
              </label>

              {compraNum > 0 && (
                <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">Cálculo automático</p>
                  <div className="flex justify-between items-baseline text-emerald-800 font-bold">
                    <span>Venta sugerida:</span>
                    <span className="text-lg font-black">Bs. {ventaPrevia.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-emerald-600 font-bold mt-0.5">
                    <span>Utilidad:</span>
                    <span>Bs. {(ventaPrevia - compraNum).toFixed(2)} · markup {markupPorcentaje(compraNum, ventaPrevia).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {rol === 'SUPER_ADMIN' ? (
                <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">🔑 Autorización</p>
                  <p className="text-emerald-800 font-bold text-[11px]">Tu rol de Administrador General autoriza esta adopción sin clave adicional.</p>
                </div>
              ) : (
                <div className="bg-yellow-50/60 rounded-xl p-3 border border-yellow-100">
                  <label className="text-[10px] font-bold text-yellow-700 uppercase">🔑 Clave de autorización (Admin)</label>
                  <input
                    type="password"
                    required
                    placeholder="Clave para modificar el inventario"
                    className="w-full mt-1 p-2 border border-yellow-200 rounded text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                  />
                  <p className="text-[9px] text-yellow-600/80 mt-1">Solo personal autorizado puede adoptar medicamentos al inventario.</p>
                </div>
              )}

              {errorModal && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold rounded-xl px-3 py-2">⚠️ {errorModal}</div>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-md disabled:opacity-50"
              >
                {guardando ? 'Adoptando…' : '✅ Confirmar adopción al inventario'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}