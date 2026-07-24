import { useState, useEffect, useRef } from 'react';

const moleculasIniciales = [
  "Paracetamol",
  "Ibuprofeno",
  "Amoxicilina",
  "Diclofenaco",
  "Loratadina",
  "Omeprazol",
  "Losartán"
];

const concentracionesIniciales = [
  "10 mg",
  "50 mg",
  "100 mg",
  "400 mg",
  "500 mg",
  "800 mg",
  "1 g",
  "500 mg / 5 ml"
];

const presentacionesIniciales = [
  "Caja x 10 Comprimidos",
  "Caja x 20 Comprimidos",
  "Caja x 50 Comprimidos",
  "Caja x 100 Comprimidos",
  "Frasco Jarabe 100ml",
  "Frasco Jarabe 120ml",
  "Ampolla Inyectable",
  "Tubo Crema/Ungüento",
  "Gotas"
];

function CreatableSelect({ label, options: initialOptions, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState(initialOptions);
  const containerRef = useRef(null);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val) => {
    onChange(val);
    setSearch('');
    setIsOpen(false);
  };

  const handleCreate = () => {
    const trimmed = search.trim();
    if (trimmed) {
      if (!options.some(o => o.toLowerCase() === trimmed.toLowerCase())) {
        const newOptions = [...options, trimmed];
        setOptions(newOptions);
      }
      onChange(trimmed);
      setSearch('');
      setIsOpen(false);
    }
  };

  const showCreateOption = search.trim() !== '' && !options.some(o => o.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="relative text-left" ref={containerRef}>
      <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
      <div className="relative mt-1">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            className="w-full p-2 pr-8 border border-gray-300 rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] text-gray-800"
            value={isOpen ? search : (value || '')}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setSearch(value || '');
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (showCreateOption) {
                  handleCreate();
                } else if (filteredOptions.length > 0) {
                  handleSelect(filteredOptions[0]);
                }
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-2 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={() => {
              if (!isOpen) setSearch(value || '');
              setIsOpen(!isOpen);
            }}
          >
            <span className="text-[8px]">{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
            {filteredOptions.map((option, idx) => (
              <div
                key={idx}
                className={`p-2 text-xs cursor-pointer hover:bg-gray-100 ${value === option ? 'bg-blue-50 font-bold text-[#1b6f8f]' : 'text-gray-700'}`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))}
            {showCreateOption && (
              <div
                className="p-2 text-xs cursor-pointer bg-green-50 hover:bg-green-100 text-green-700 font-bold border-t border-green-100"
                onClick={handleCreate}
              >
                ✨ Añadir "{search.trim()}"
              </div>
            )}
            {filteredOptions.length === 0 && !showCreateOption && (
              <div className="p-2 text-xs text-gray-400 italic text-center">No hay opciones</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  // --------------------------------------------------------------------------
  // 1. ESTADOS DE CONTROL PRINCIPAL Y SESIÓN
  // --------------------------------------------------------------------------
  const [pantallaBloqueada, setPantallaBloqueada] = useState(localStorage.getItem('cajaAbierta') !== 'true');
  const [sesionCajaId, setSesionCajaId] = useState(localStorage.getItem('sesionCajaId') || null);
  const [cajeroNombre, setCajeroNombre] = useState(localStorage.getItem('cajeroNombre') || '');
  const [rolUsuario, setRolUsuario] = useState(localStorage.getItem('rolUsuario') || 'CAJERO');

  const [fondoInicial, setFondoInicial] = useState(parseFloat(localStorage.getItem('fondoInicial')) || 0);
  const [ventasEfectivoTurno, setVentasEfectivoTurno] = useState(parseFloat(localStorage.getItem('ventasEfectivoTurno')) || 0);

  const [pinAcceso, setPinAcceso] = useState('');
  const [montoApertura, setMontoApertura] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState('');

  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [montoCierreReal, setMontoCierreReal] = useState('');
  const [cargandoCierre, setCargandoCierre] = useState(false);
  const [reporteCierre, setReporteCierre] = useState(null);

  const [pestañaActiva, setPestañaActiva] = useState('pos');

  // --------------------------------------------------------------------------
  // 2. ESTADOS DE INVENTARIO Y CATÁLOGO
  // --------------------------------------------------------------------------
  const [alertasLotes, setAlertasLotes] = useState([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);

  const [mostrarModalIngreso, setMostrarModalIngreso] = useState(false);
  const [productosLookup, setProductosLookup] = useState([]);
  const [formularioLote, setFormularioLote] = useState({
    productoId: '',
    numeroLote: '',
    fechaVencimiento: '',
    cantidad: '',
    costoUnitario: ''
  });
  const [cargandoGuardarLote, setCargandoGuardarLote] = useState(false);

  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [cargandoGuardarProducto, setCargandoGuardarProducto] = useState(false);
  const [formularioProducto, setFormularioProducto] = useState({
    sku: '',
    codigoBarras: '',
    nombreComercial: '',
    nombreGenerico: '',
    concentracion: '',
    presentacion: '',
    precioVenta: '',
    stockMinimo: '5',
    controlado: false
  });

  const [subTabInventario, setSubTabInventario] = useState('lotes'); // 'lotes' o 'productos'
  const [productosMaestros, setProductosMaestros] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [productoEditandoId, setProductoEditandoId] = useState(null); // null = nuevo, string = id para editar

  const [modalAjuste, setModalAjuste] = useState({ visible: false, lote: null, variacion: '', motivo: 'MERMA_CADUCIDAD' });
  const [tipoAjuste, setTipoAjuste] = useState('VARIACION'); // [NEW] 'VARIACION' o 'ABSOLUTO'
  const [cargandoAjuste, setCargandoAjuste] = useState(false);

  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // --------------------------------------------------------------------------
  // 3. ESTADOS DE TRANSACCIONES Y CLIENTES
  // --------------------------------------------------------------------------
  const [carrito, setCarrito] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteNitCi, setClienteNitCi] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [estadoCliente, setEstadoCliente] = useState('');
  const [historialCompras, setHistorialCompras] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [ticketVenta, setTicketVenta] = useState(null);

  // --------------------------------------------------------------------------
  // 4. ESTADOS DE REPORTES Y AUDITORÍA
  // --------------------------------------------------------------------------
  const [datosDashboard, setDatosDashboard] = useState(null);
  const [cargandoDashboard, setCargandoDashboard] = useState(false);
  const [errorDashboard, setErrorDashboard] = useState(null); // [NEW] Manejo de error de dashboard

  const [listaVentas, setListaVentas] = useState([]);
  const [cargandoListaVentas, setCargandoListaVentas] = useState(false);
  const [busquedaVentas, setBusquedaVentas] = useState('');
  const [paginaVentas, setPaginaVentas] = useState(1);
  const itemsPorPagina = 12;

  const [historialCajas, setHistorialCajas] = useState([]);

  // [NEW] Filtros dinámicos para Ventas
  const [filtroMetodoVenta, setFiltroMetodoVenta] = useState('TODOS');
  const [filtroEstadoVenta, setFiltroEstadoVenta] = useState('TODOS');

  // [NEW] Filtros dinámicos para POS Catalog
  const [filtroRecetaPOS, setFiltroRecetaPOS] = useState('TODOS'); // 'TODOS', 'LIBRE', 'CONTROLADO'
  const [ordenPrecioPOS, setOrdenPrecioPOS] = useState('NINGUNO'); // 'NINGUNO', 'ASC', 'DESC'

  // [NEW] Filtros dinámicos para Inventario (Lotes)
  const [busquedaLotes, setBusquedaLotes] = useState('');
  const [filtroEstadoLote, setFiltroEstadoLote] = useState('TODOS'); // 'TODOS', 'VENCIDO', 'CRÍTICO', 'ADVERTENCIA', 'BUENO'

  // [NEW] Filtros dinámicos para Inventario (Medicamentos Base)
  const [busquedaProductosBase, setBusquedaProductosBase] = useState('');
  const [filtroRecetaBase, setFiltroRecetaBase] = useState('TODOS'); // 'TODOS', 'LIBRE', 'CONTROLADO'

  // [NEW] Estados para Editar/Anular Ventas
  const [ventaEditando, setVentaEditando] = useState(null);
  const [mostrarModalEditarVenta, setMostrarModalEditarVenta] = useState(false);
  const [formularioEditarVenta, setFormularioEditarVenta] = useState({ clienteNombre: '', clienteNitCi: '', tipoPago: 'EFECTIVO' });
  const [cargandoEditarVenta, setCargandoEditarVenta] = useState(false);

  const [ventaAnulando, setVentaAnulando] = useState(null);
  const [mostrarModalAnularVenta, setMostrarModalAnularVenta] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [cargandoAnulacion, setCargandoAnulacion] = useState(false);

  // 🔴 URL dinámica de la API
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5169';

  // --------------------------------------------------------------------------
  // 5. OPERACIONES DE CONTROL DE CAJA
  // --------------------------------------------------------------------------
  const manejarAperturaCaja = async (e) => {
    e.preventDefault();
    setCargandoLogin(true);
    setErrorLogin('');
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Caja/abrir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinAcceso: pinAcceso, montoApertura: parseFloat(montoApertura) || 0 })
      });
      if (respuesta.ok) {
        const datos = await respuesta.json();
        const fondo = parseFloat(montoApertura) || 0;

        // 🔴 BLINDAJE DE SEGURIDAD: Acepta tanto 'rol' como 'Rol' desde el servidor
        const rolDetectado = datos.rol || datos.Rol || 'CAJERO';

        localStorage.setItem('cajaAbierta', 'true');
        localStorage.setItem('sesionCajaId', datos.sesionId);
        localStorage.setItem('cajeroNombre', datos.cajero);
        localStorage.setItem('fondoInicial', fondo.toString());
        localStorage.setItem('ventasEfectivoTurno', '0');
        localStorage.setItem('rolUsuario', rolDetectado);

        setRolUsuario(rolDetectado);
        setFondoInicial(fondo);
        setVentasEfectivoTurno(0);
        setMontoApertura('');
        setSesionCajaId(datos.sesionId);
        setCajeroNombre(datos.cajero);
        setPantallaBloqueada(false);
      } else {
        const err = await respuesta.json();
        setErrorLogin(err.error || 'PIN incorrecto o inactivo');
      }
    } catch (error) {
      setErrorLogin('Error de conexión con el servidor.');
    } finally {
      setCargandoLogin(false);
    }
  };

  const manejarCierreCaja = async (e) => {
    e.preventDefault();
    setCargandoCierre(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Caja/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: sesionCajaId, montoCierreReal: parseFloat(montoCierreReal) || 0 })
      });
      if (respuesta.ok) {
        const informe = await respuesta.json();
        setReporteCierre(informe);
      } else {
        const errText = await respuesta.text();
        alert(`❌ Servidor C# dice:\n\n${errText}`);
        if (errText.includes("no existe") || errText.includes("ya está cerrada")) {
          // Forzar bloqueo local y limpieza de caché si el servidor ya cerró o invalidó la sesión
          confirmarBloqueo();
        }
      }
    } catch (error) {
      alert(`⚠️ Excepción en React: ${error.message}`);
    } finally {
      setCargandoCierre(false);
    }
  };

  const confirmarBloqueo = () => {
    localStorage.removeItem('cajaAbierta');
    localStorage.removeItem('sesionCajaId');
    localStorage.removeItem('cajeroNombre');
    localStorage.removeItem('fondoInicial');
    localStorage.removeItem('ventasEfectivoTurno');
    localStorage.removeItem('rolUsuario');

    setFondoInicial(0);
    setVentasEfectivoTurno(0);
    setRolUsuario('CAJERO');
    setPantallaBloqueada(true);
    setSesionCajaId(null);
    setCajeroNombre('');
    setPinAcceso('');
    setMontoApertura('');
    setMontoCierreReal('');
    setMostrarModalCierre(false);
    setReporteCierre(null);
    setCarrito([]);
    setPestañaActiva('pos');
  };

  // --------------------------------------------------------------------------
  // 6. SOLICITUDES DE CARGA DE DATOS
  // --------------------------------------------------------------------------
  const cargarCatalogo = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Pos/catalogo`);
      if (respuesta.ok) { const datos = await respuesta.json(); setCatalogo(datos); }
    } catch (error) { console.error(error); } finally { setCargando(false); }
  };

  const cargarAlertasLotes = async () => {
    setCargandoLotes(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/alertas-vencimiento`);
      if (respuesta.ok) { const datos = await respuesta.json(); setAlertasLotes(datos); }
    } catch (error) { console.error(error); } finally { setCargandoLotes(false); }
  };

  const cargarDashboard = async () => {
    setCargandoDashboard(true);
    setErrorDashboard(null);
    try {
      const [resDash, resCajas] = await Promise.all([
        fetch(`${API_URL}/api/v1/Reportes/dashboard`),
        fetch(`${API_URL}/api/v1/Caja/historial`)
      ]);
      if (!resDash.ok) throw new Error("Fallo al cargar las métricas gerenciales.");
      if (!resCajas.ok) throw new Error("Fallo al cargar el historial de arqueos de caja.");
      
      const datos = await resDash.json();
      const datosCajas = await resCajas.json();
      
      setDatosDashboard(datos);
      setHistorialCajas(datosCajas);
    } catch (error) {
      console.error(error);
      setErrorDashboard(error.message || "Error de conexión con el servidor.");
    } finally {
      setCargandoDashboard(false);
    }
  };

  const cargarHistorialVentas = async () => {
    setCargandoListaVentas(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Ventas/historial`);
      if (respuesta.ok) { const datos = await respuesta.json(); setListaVentas(datos); setPaginaVentas(1); }
    } catch (error) { console.error(error); } finally { setCargandoListaVentas(false); }
  };

  // [NEW] Handlers para Edición y Anulación de Ventas
  const iniciarEdicionVenta = (venta) => {
    setVentaEditando(venta);
    setFormularioEditarVenta({
      clienteNombre: venta.cliente,
      clienteNitCi: venta.nit,
      tipoPago: venta.metodo
    });
    setMostrarModalEditarVenta(true);
  };

  const guardarEdicionVenta = async (e) => {
    e.preventDefault();
    setCargandoEditarVenta(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Ventas/${ventaEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNombre: formularioEditarVenta.clienteNombre,
          clienteNitCi: formularioEditarVenta.clienteNitCi,
          tipoPago: formularioEditarVenta.tipoPago
        })
      });
      if (respuesta.ok) {
        alert("✅ Venta editada con éxito.");
        setMostrarModalEditarVenta(false);
        setVentaEditando(null);
        cargarHistorialVentas();
        cargarDashboard();
      } else {
        const err = await respuesta.json();
        alert(`❌ Error: ${err.error || 'No se pudo editar la venta.'}`);
      }
    } catch (error) {
      alert("⚠️ Error de conexión.");
    } finally {
      setCargandoEditarVenta(false);
    }
  };

  const iniciarAnulacionVenta = (venta) => {
    setVentaAnulando(venta);
    setMotivoAnulacion('');
    setMostrarModalAnularVenta(true);
  };

  const procesarAnulacionVenta = async (e) => {
    e.preventDefault();
    if (!motivoAnulacion.trim()) return alert("Debe especificar un motivo de anulación.");
    setCargandoAnulacion(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Ventas/anular/${ventaAnulando.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoAnulacion.trim() })
      });
      if (respuesta.ok) {
        alert("🗑️ Venta anulada, stock restaurado y registrado en auditoría.");
        setMostrarModalAnularVenta(false);
        setVentaAnulando(null);
        cargarHistorialVentas();
        cargarDashboard();
        cargarCatalogo();
        cargarAlertasLotes();
      } else {
        const err = await respuesta.json();
        alert(`❌ Error: ${err.error || 'No se pudo anular la venta.'}`);
      }
    } catch (error) {
      alert("⚠️ Error de conexión.");
    } finally {
      setCargandoAnulacion(false);
    }
  };

  // --------------------------------------------------------------------------
  // 7. ENTRADAS DE INVENTARIO MAESTRO Y LOTES
  // --------------------------------------------------------------------------
  const abrirModalIngresoMercaderia = async () => {
    setMostrarModalIngreso(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/productos-lookup`);
      if (respuesta.ok) { const datos = await respuesta.json(); setProductosLookup(datos); }
    } catch (error) { console.error(error); }
  };

  const guardarNuevoLote = async (e) => {
    e.preventDefault();
    if (!formularioLote.productoId) return alert("Selecciona un medicamento.");
    setCargandoGuardarLote(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/ingresar-lote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productoId: formularioLote.productoId, numeroLote: formularioLote.numeroLote, fechaVencimiento: formularioLote.fechaVencimiento, cantidad: parseInt(formularioLote.cantidad), costoUnitario: parseFloat(formularioLote.costoUnitario) }) });
      if (respuesta.ok) {
        alert("✅ Mercadería ingresada correctamente.");
        setMostrarModalIngreso(false);
        setFormularioLote({ productoId: '', numeroLote: '', fechaVencimiento: '', cantidad: '', costoUnitario: '' });
        cargarAlertasLotes();
        cargarCatalogo();
      } else {
        let mensajeError = "No se pudo guardar el lote.";
        try {
          const err = await respuesta.json();
          mensajeError = err.error || err.Error || err.mensaje || err.Mensaje || mensajeError;
        } catch (jsonErr) {
          try {
            const txt = await respuesta.text();
            if (txt) mensajeError = txt;
          } catch (txtErr) {}
        }
        alert(`❌ Error: ${mensajeError}`);
      }
    } catch (error) { alert("⚠️ Error de conexión."); } finally { setCargandoGuardarLote(false); }
  };

  const cargarProductosMaestros = async () => {
    setCargandoProductos(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/productos`);
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setProductosMaestros(datos);
      }
    } catch (error) {
      console.error("Error al cargar productos maestros:", error);
    } finally {
      setCargandoProductos(false);
    }
  };

  const iniciarEdicionProducto = (producto) => {
    setProductoEditandoId(producto.id);
    setFormularioProducto({
      sku: producto.sku || '',
      codigoBarras: producto.codigoBarras || '',
      nombreComercial: producto.nombreComercial || '',
      nombreGenerico: producto.nombreGenerico || '',
      concentracion: producto.concentracion || '',
      presentacion: producto.presentacion || '',
      precioVenta: producto.precioVenta?.toString() || '',
      stockMinimo: producto.stockMinimo?.toString() || '5',
      controlado: producto.controlado || false
    });
    setMostrarModalProducto(true);
  };

  const manejarEliminarProducto = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este producto maestro? Esta acción no se puede deshacer y fallará si el producto tiene lotes registrados.")) return;
    try {
      const respuesta = await fetch(`${API_URL}/api/v1/Inventario/eliminar-producto/${id}`, {
        method: 'DELETE'
      });
      if (respuesta.ok) {
        alert("🗑️ Producto maestro eliminado con éxito.");
        cargarProductosMaestros();
        cargarCatalogo();
      } else {
        const err = await respuesta.json();
        alert(`❌ Error: ${err.error || 'No se pudo eliminar el producto.'}`);
      }
    } catch (error) {
      alert("⚠️ Error de red al intentar eliminar el producto.");
    }
  };

  const guardarNuevoProductoMaestro = async (e) => {
    e.preventDefault();
    setCargandoGuardarProducto(true);
    const url = productoEditandoId 
      ? `${API_URL}/api/v1/Inventario/editar-producto/${productoEditandoId}`
      : `${API_URL}/api/v1/Inventario/crear-producto`;
    const metodo = productoEditandoId ? 'PUT' : 'POST';
    try {
      const respuesta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: formularioProducto.sku,
          codigoBarras: formularioProducto.codigoBarras,
          nombreComercial: formularioProducto.nombreComercial,
          nombreGenerico: formularioProducto.nombreGenerico,
          concentracion: formularioProducto.concentracion,
          presentacion: formularioProducto.presentacion,
          precioVenta: parseFloat(formularioProducto.precioVenta) || 0,
          stockMinimo: parseInt(formularioProducto.stockMinimo) || 5,
          controlado: formularioProducto.controlado
        })
      });
      if (respuesta.ok) {
        alert(productoEditandoId ? "✨ Producto maestro actualizado con éxito." : "✨ Producto maestro registrado con éxito.");
        setMostrarModalProducto(false);
        setFormularioProducto({ sku: '', codigoBarras: '', nombreComercial: '', nombreGenerico: '', concentracion: '', presentacion: '', precioVenta: '', stockMinimo: '5', controlado: false });
        setProductoEditandoId(null);
        cargarCatalogo();
        cargarProductosMaestros();
      } else {
        let mensajeError = "No se pudo guardar el producto.";
        try {
          const err = await respuesta.json();
          mensajeError = err.error || err.Error || err.mensaje || err.Mensaje || mensajeError;
        } catch (jsonErr) {
          try {
            const txt = await respuesta.text();
            if (txt) mensajeError = txt;
          } catch (txtErr) {}
        }
        alert(`❌ Error: ${mensajeError}`);
      }
    } catch (error) { alert("⚠️ Error de red o conexión."); } finally { setCargandoGuardarProducto(false); }
  };

  const procesarAjusteInventario = async (e) => {
    e.preventDefault();
    setCargandoAjuste(true);
    try {
      const isAbsolute = tipoAjuste === 'ABSOLUTO';
      const endpoint = isAbsolute 
        ? `${API_URL}/api/v1/Inventario/actualizar-stock-absoluto` 
        : `${API_URL}/api/v1/Inventario/ajustar-stock`;
      
      const payload = isAbsolute
        ? { loteId: modalAjuste.lote.loteId, nuevoStock: parseInt(modalAjuste.variacion), motivo: modalAjuste.motivo }
        : { loteId: modalAjuste.lote.loteId, cantidadVariacion: parseInt(modalAjuste.variacion), motivo: modalAjuste.motivo };

      const respuesta = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });

      if (respuesta.ok) {
        alert("📊 Inventario ajustado e historial auditado con éxito.");
        setModalAjuste({ visible: false, lote: null, variacion: '', motivo: 'MERMA_CADUCIDAD' });
        setTipoAjuste('VARIACION');
        cargarAlertasLotes();
        cargarCatalogo();
      } else {
        const errText = await respuesta.text(); alert(`❌ Fallo: ${errText}`);
      }
    } catch (error) { alert(`⚠️ Excepción: ${error.message}`); } finally { setCargandoAjuste(false); }
  };

  // --------------------------------------------------------------------------
  // 8. EFECTOS COLATERALES Y ESCUCHAS
  // --------------------------------------------------------------------------
  useEffect(() => { if (!pantallaBloqueada) cargarCatalogo(); }, [pantallaBloqueada]);
  useEffect(() => { 
    if (pestañaActiva === 'inventario') {
      if (subTabInventario === 'lotes') {
        cargarAlertasLotes();
      } else {
        cargarProductosMaestros();
      }
    }
    if (pestañaActiva === 'dashboard') cargarDashboard();
    if (pestañaActiva === 'ventas') cargarHistorialVentas();
  }, [pestañaActiva, subTabInventario]);

  useEffect(() => {
    if (clienteNitCi.trim().length < 4) { setEstadoCliente(''); setClienteId(null); setHistorialCompras([]); return; }
    const temporizador = setTimeout(async () => {
      setEstadoCliente('Buscando...');
      try {
        const respuesta = await fetch(`${API_URL}/api/v1/clientes/${clienteNitCi}`);
        if (respuesta.ok) {
          const cliente = await respuesta.json(); setClienteNombre(cliente.nombreCompleto); setClienteId(cliente.id); setEstadoCliente('✅ Frecuente');
        } else {
          setClienteId(null); setEstadoCliente('✨ Nuevo'); setHistorialCompras([]);
        }
      } catch (error) { setEstadoCliente('⚠️ Error'); }
    }, 600);
    return () => clearTimeout(temporizador);
  }, [clienteNitCi, API_URL]);

  useEffect(() => {
    if (!clienteId) return;
    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      try {
        const respuesta = await fetch(`${API_URL}/api/v1/clientes/${clienteId}/historial`);
        if (respuesta.ok) { const datos = await respuesta.json(); setHistorialCompras(datos); }
      } catch (error) { console.error(error); } finally { setCargandoHistorial(false); }
    };
    cargarHistorial();
  }, [clienteId, API_URL]);

  // --------------------------------------------------------------------------
  // 9. LÓGICA COMPLETA DEL CARRITO Y COBROS
  // --------------------------------------------------------------------------
  const agregarAlCarrito = (producto) => { setCarrito((carritoActual) => { const itemExistente = carritoActual.find(item => item.loteId === producto.loteId); if (itemExistente) { return carritoActual.map(item => item.loteId === producto.loteId ? { ...item, cantidad: item.cantidad + 1 } : item); } return [...carritoActual, { ...producto, cantidad: 1 }]; }); };
  const actualizarCantidad = (loteId, cantidadCambio) => { setCarrito((carritoActual) => { return carritoActual.map(item => { if (item.loteId === loteId) { return { ...item, cantidad: item.cantidad + cantidadCambio }; } return item; }).filter(item => item.cantidad > 0); }); };
  const calcularTotal = () => carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0).toFixed(2);
  const iniciarCobro = () => { if (carrito.length === 0) return alert("El carrito está vacío."); if (metodoPago === 'QR') { setMostrarModalQR(true); } else { procesarVentaEnBackend(); } };

  const procesarVentaEnBackend = async () => {
    let idClienteFinal = clienteId;
    if (!idClienteFinal && clienteNitCi.trim() !== '' && clienteNitCi.trim() !== '0') {
      try {
        const res = await fetch(`${API_URL}/api/v1/Clientes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ciNit: clienteNitCi.trim(), nombreCompleto: clienteNombre.trim() === '' ? 'Consumidor Final' : clienteNombre.trim() }) });
        if (res.ok) { const cli = await res.json(); idClienteFinal = cli.id; }
      } catch (error) { console.error(error); }
    }
    const totalVentaCálculo = parseFloat(calcularTotal());
    const payloadVenta = { clienteId: idClienteFinal, sesionCajaId: sesionCajaId, clienteNombre: clienteNombre.trim() === '' ? "Cliente de Mostrador" : clienteNombre, clienteNitCi: clienteNitCi.trim() === '' ? "0" : clienteNitCi, tipoPago: metodoPago, detalles: carrito.map(item => ({ loteId: item.loteId, cantidad: item.cantidad, precioUnitario: item.precio })) };
    try {
      const respuestaVenta = await fetch(`${API_URL}/api/v1/Pos/procesar-venta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadVenta) });
      if (respuestaVenta.ok) {
        const datos = await respuestaVenta.json();
        if (metodoPago === 'EFECTIVO') {
          const nuevoTotalEfectivo = ventasEfectivoTurno + totalVentaCálculo;
          setVentasEfectivoTurno(nuevoTotalEfectivo);
          localStorage.setItem('ventasEfectivoTurno', nuevoTotalEfectivo.toString());
        }
        setTicketVenta({ factura: datos.factura.numeroFactura, cajero: cajeroNombre, cliente: clienteNombre.trim() === '' ? 'Consumidor Final' : clienteNombre, nit: clienteNitCi.trim() === '' ? '0' : clienteNitCi, metodo: metodoPago, fecha: new Date().toLocaleString(), items: [...carrito], total: totalVentaCálculo.toFixed(2) });
        setCarrito([]); setClienteNombre(''); setClienteNitCi(''); setClienteId(null); setEstadoCliente(''); setHistorialCompras([]); setMostrarModalQR(false); cargarCatalogo();
      } else { const err = await respuestaVenta.json(); alert(`❌ Error: ${err.error}`); }
    } catch (error) { alert("⚠️ Error de red."); }
  };

  // [NEW] Filtros y ordenamiento aplicados dinámicamente al catálogo del POS
  const productosFiltrados = catalogo
    .filter(p => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const coincideReceta = filtroRecetaPOS === 'TODOS' || 
        (filtroRecetaPOS === 'CONTROLADO' && p.controlado) || 
        (filtroRecetaPOS === 'LIBRE' && !p.controlado);
      return coincideBusqueda && coincideReceta;
    })
    .sort((a, b) => {
      if (ordenPrecioPOS === 'ASC') return a.precio - b.precio;
      if (ordenPrecioPOS === 'DESC') return b.precio - a.precio;
      return 0;
    });

  const obtenerEstiloEstado = (estado) => { switch (estado) { case 'VENCIDO': return 'bg-red-100 text-red-800 border-red-200'; case 'CRÍTICO': return 'bg-orange-100 text-orange-800 border-orange-200'; case 'ADVERTENCIA': return 'bg-yellow-100 text-yellow-800 border-yellow-200'; default: return 'bg-green-100 text-green-800 border-green-200'; } };

  // [NEW] Filtro dinámico para Lotes Físicos e Inventario
  const lotesFiltrados = alertasLotes.filter(l => {
    const coincideBusqueda = l.producto.toLowerCase().includes(busquedaLotes.toLowerCase());
    const coincideEstado = filtroEstadoLote === 'TODOS' || l.estado === filtroEstadoLote;
    return coincideBusqueda && coincideEstado;
  });

  // [NEW] Filtro dinámico para Medicamentos Base (Catálogo Maestro)
  const productosBaseFiltrados = productosMaestros.filter(p => {
    const coincideBusqueda = 
      p.nombreComercial.toLowerCase().includes(busquedaProductosBase.toLowerCase()) || 
      (p.nombreGenerico && p.nombreGenerico.toLowerCase().includes(busquedaProductosBase.toLowerCase())) || 
      p.sku.toLowerCase().includes(busquedaProductosBase.toLowerCase());
    const coincideReceta = filtroRecetaBase === 'TODOS' || 
      (filtroRecetaBase === 'CONTROLADO' && p.controlado) || 
      (filtroRecetaBase === 'LIBRE' && !p.controlado);
    return coincideBusqueda && coincideReceta;
  });

  // [NEW] Filtro dinámico para Historial de Ventas (Metodo Pago + Estado Factura + Búsqueda)
  const ventasFiltradas = listaVentas.filter(v => {
    const coincideBusqueda = v.cliente.toLowerCase().includes(busquedaVentas.toLowerCase()) || v.fecha.includes(busquedaVentas) || v.nit.includes(busquedaVentas);
    const coincideMetodo = filtroMetodoVenta === 'TODOS' || v.metodo === filtroMetodoVenta;
    const coincideEstado = filtroEstadoVenta === 'TODOS' || 
      (filtroEstadoVenta === 'ANULADA' && v.estadoSiat === 'ANULADA') || 
      (filtroEstadoVenta === 'EMITIDA' && v.estadoSiat !== 'ANULADA');
    return coincideBusqueda && coincideMetodo && coincideEstado;
  });

  const totalPaginasVentas = Math.ceil(ventasFiltradas.length / itemsPorPagina);
  const indiceUltimoItem = paginaVentas * itemsPorPagina;
  const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
  const ventasPaginadas = ventasFiltradas.slice(indicePrimerItem, indiceUltimoItem);

  const exportarExcel = () => {
    const cabeceras = ['ID Venta,Cliente,NIT/CI,Monto Total (Bs),Metodo Pago,Fecha Transaccion\n'];
    const filas = ventasFiltradas.map(v => `${v.id},"${v.cliente}",${v.nit},${v.total.toFixed(2)},${v.metodo},"${v.fecha}"`);
    const contenidoCSV = cabeceras.concat(filas).join('\n');
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a'); enlace.href = url; enlace.setAttribute('download', `Reporte_Ventas_PharmCRM_${new Date().getTime()}.csv`); document.body.appendChild(enlace); enlace.click(); document.body.removeChild(enlace);
  };

  // --------------------------------------------------------------------------
  // RENDER 1: PANTALLA DE BLOQUEO EN BASE A #2596be
  // --------------------------------------------------------------------------
  if (pantallaBloqueada) {
    return (
      <div className="min-h-screen flex font-sans">
        {/* Panel izquierdo - branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#341645] via-[#2a1038] to-[#1a0a25] relative overflow-hidden flex-col items-center justify-center p-12">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#c9a84c]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#4a1a5e]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <img src="/logo_farmanova.png" alt="FarmaNova" className="w-48 h-48 object-contain mb-8 drop-shadow-2xl" />
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">FarmaNova</h1>
            <p className="text-[#e8d48b] text-sm font-bold uppercase tracking-[0.3em] mb-6">Solución Comercio</p>
            <div className="w-16 h-px bg-[#c9a84c]/40 mb-6"></div>
            <p className="text-[#b494c8] text-xs font-medium max-w-xs leading-relaxed">
              Sistema de gestión y punto de venta para farmacias y comercios.
            </p>
          </div>
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-[#6b4590] text-[9px] font-bold uppercase tracking-[0.25em]">Parte del Ecosistema NovaSolum</p>
          </div>
        </div>

        {/* Panel derecho - formulario */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
          <div className="absolute top-8 left-8 flex items-center gap-3 lg:hidden">
            <img src="/logo_farmanova.png" alt="FarmaNova" className="w-10 h-10 object-contain" />
            <div>
              <h2 className="text-sm font-black text-[#341645] tracking-tight">FarmaNova</h2>
              <p className="text-[8px] text-[#c9a84c] font-bold uppercase tracking-widest">Solución Comercio</p>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-[#341645] tracking-tight">Abrir Caja</h2>
              <p className="text-slate-400 text-sm mt-2 font-medium">Ingresa tu PIN para iniciar el turno.</p>
            </div>
            <form onSubmit={manejarAperturaCaja} className="w-full flex flex-col gap-4">
              <input type="password" maxLength="4" required placeholder="PIN de Acceso" className="w-full p-4 border-2 border-slate-100 rounded-2xl text-center text-2xl tracking-widest outline-none focus:border-[#341645] font-bold text-slate-700 transition-colors" value={pinAcceso} onChange={(e) => setPinAcceso(e.target.value)} />
              <input type="number" step="0.10" required placeholder="Fondo Inicial de Caja (Bs.)" className="w-full p-4 border-2 border-slate-100 rounded-2xl text-lg outline-none focus:border-[#341645] font-bold text-slate-700 transition-colors" value={montoApertura} onChange={(e) => setMontoApertura(e.target.value)} />
              {errorLogin && <p className="text-red-500 text-sm font-semibold text-center bg-red-50 p-3 rounded-xl">{errorLogin}</p>}
              <button type="submit" disabled={cargandoLogin} className="w-full bg-[#341645] hover:bg-[#2a1038] text-white font-bold py-4 rounded-2xl mt-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm uppercase tracking-wider">
                {cargandoLogin ? 'Validando...' : '🔓 Abrir Caja'}
              </button>
            </form>
            <div className="mt-12 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-px bg-slate-200"></div>
                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">NovaSolum</span>
                <div className="w-6 h-px bg-slate-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER 2: INTERFAZ GENERAL TOTALMENTE DESCOMPRIMIDA
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">

      {/* MODAL AJUSTE DE INVENTARIO */}
      {modalAjuste.visible && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-[400px]">
            <h3 className="text-xl font-black text-gray-800 mb-1">⚖️ Ajuste de Inventario</h3>
            <p className="text-xs text-gray-500 mb-4">Registra la variación para: <strong>{modalAjuste.lote?.producto}</strong></p>
            
            {/* [NEW] Selector de tipo de ajuste */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              <button 
                type="button" 
                onClick={() => { setTipoAjuste('VARIACION'); setModalAjuste({ ...modalAjuste, variacion: '' }); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${tipoAjuste === 'VARIACION' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🔢 Variación (+/-)
              </button>
              <button 
                type="button" 
                onClick={() => { setTipoAjuste('ABSOLUTO'); setModalAjuste({ ...modalAjuste, variacion: modalAjuste.lote?.stock.toString() || '' }); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${tipoAjuste === 'ABSOLUTO' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                🎯 Fijar Stock Real
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-600">Stock Actual en Sistema:</span>
              <span className="text-lg font-black text-[#2596be]">{modalAjuste.lote?.stock} unid.</span>
            </div>
            <form onSubmit={procesarAjusteInventario} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Motivo del Ajuste (Auditoría)</label>
                <select required className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={modalAjuste.motivo} onChange={(e) => setModalAjuste({ ...modalAjuste, motivo: e.target.value })}>
                  <option value="MERMA_CADUCIDAD">Baja: Producto Caducado</option>
                  <option value="MERMA_DANO">Baja: Empaque Dañado / Roto</option>
                  <option value="DEVOLUCION_CLIENTE">Ingreso: Devolución de Cliente</option>
                  <option value="ERROR_INGRESO">Corrección: Error en el conteo</option>
                  <option value="EXTRAVIO">Merma: Pérdida o Extravío</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 flex justify-between">
                  <span>{tipoAjuste === 'VARIACION' ? 'Variación Matemática' : 'Nuevo Stock Físico Real'}</span>
                  <span className="text-gray-400 font-normal">{tipoAjuste === 'VARIACION' ? 'Ej. -2 o +5' : 'Conteo absoluto final'}</span>
                </label>
                <input 
                  type="number" 
                  required 
                  placeholder={tipoAjuste === 'VARIACION' ? "-1" : "Ej. 15"} 
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center font-bold outline-none focus:ring-2 focus:ring-[#2596be]" 
                  value={modalAjuste.variacion} 
                  onChange={(e) => setModalAjuste({ ...modalAjuste, variacion: e.target.value })} 
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => { setModalAjuste({ visible: false, lote: null, variacion: '', motivo: 'MERMA_CADUCIDAD' }); setTipoAjuste('VARIACION'); }} className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-xl text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoAjuste} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-xl text-sm transition-colors shadow-md">
                  {cargandoAjuste ? 'Procesando...' : '💾 Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TICKET COMPROBANTE DE FACTURACIÓN */}
      {ticketVenta && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white p-6 w-80 text-black font-mono text-sm rounded-lg relative print:w-full print:bg-transparent print:p-0 print:shadow-none">
            <div className="text-center mb-4">
              <h2 className="text-xl font-black uppercase">FarmaGO</h2>
              <p className="text-xs">Santa Cruz, Bolivia</p>
              <p className="text-xs mt-2 font-bold">TICKET: {ticketVenta.factura}</p>
              <p className="text-xs text-gray-500">{ticketVenta.fecha}</p>
            </div>
            <hr className="border-dashed border-gray-400 my-2" />
            <div className="mb-2 text-xs">
              <p><strong>Cajero:</strong> {ticketVenta.cajero}</p>
              <p><strong>Cliente:</strong> {ticketVenta.cliente}</p>
              <p><strong>NIT/CI:</strong> {ticketVenta.nit}</p>
              <p><strong>Pago:</strong> {ticketVenta.metodo}</p>
            </div>
            <hr className="border-dashed border-gray-400 my-2" />
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="border-b border-dashed border-gray-400">
                  <th className="text-left pb-1">Cant</th>
                  <th className="text-left pb-1">Desc</th>
                  <th className="text-right pb-1">SubT</th>
                </tr>
              </thead>
              <tbody>
                {ticketVenta.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="pt-1 align-top">{item.cantidad}</td>
                    <td className="pt-1 pr-2 leading-tight">{item.nombre}</td>
                    <td className="text-right pt-1 align-top">{(item.cantidad * item.precio).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr className="border-dashed border-gray-400 my-2" />
            <div className="flex justify-between font-black text-base mt-2"><span>TOTAL:</span><span>Bs. {ticketVenta.total}</span></div>
            <div className="mt-6 flex gap-2 print:hidden">
              <button onClick={() => window.print()} className="w-1/2 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg transition-colors">🖨️ Imprimir</button>
              <button onClick={() => setTicketVenta(null)} className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded-lg transition-colors">Nueva Venta</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QR DE PAGO ESTÁTICO */}
      {mostrarModalQR && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 flex flex-col items-center">
            <h3 className="text-xl font-black text-gray-800 mb-1">Cobro por QR</h3>
            <p className="text-xs text-gray-500 mb-4 text-center">El cliente debe escanear y digitar el monto exacto.</p>

            {/* 1. EL QR ESTÁTICO DE TU CLIENTE */}
            <div className="bg-white p-2 rounded-xl border-2 border-dashed border-[#2596be] mb-4 shadow-sm">
              {/* Asegúrate de que el nombre aquí coincida con el archivo que guardaste en la carpeta public */}
              <img src="/qrfarma.png" alt="QR del Cliente" className="w-56 h-56 object-contain rounded" />
            </div>

            {/* 2. INSTRUCCIÓN CLARA DEL MONTO GIGANTE */}
            <div className="w-full bg-[#2596be]/10 border border-[#2596be]/30 p-4 rounded-xl flex flex-col items-center mb-6 shadow-inner">
              <span className="text-[11px] font-bold text-[#1b6f8f] uppercase tracking-widest mb-1">Monto a Transferir</span>
              <span className="text-4xl font-black text-[#2596be]">Bs. {calcularTotal()}</span>
            </div>

            <div className="flex gap-2 w-full">
              <button onClick={() => setMostrarModalQR(false)} className="w-1/3 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-bold transition-colors text-sm text-gray-700">Cancelar</button>
              <button onClick={procesarVentaEnBackend} className="w-2/3 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-md transition-colors text-sm">✅ Confirmar Recepción</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFORME DE ARQUEO DE CIERRE */}
      {mostrarModalCierre && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96">
            {!reporteCierre ? (
              <form onSubmit={manejarCierreCaja} className="flex flex-col gap-4">
                <h3 className="text-xl font-black text-gray-800">🔒 Procesar Arqueo</h3>
                <input type="number" step="0.10" required autoFocus placeholder="0.00" className="w-full mt-1 p-3 border border-gray-300 rounded-lg text-xl font-bold text-center outline-none focus:ring-2 focus:ring-red-500" value={montoCierreReal} onChange={(e) => setMontoCierreReal(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMostrarModalCierre(false)} className="w-1/2 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-bold transition-colors">Cancelar</button>
                  <button type="submit" className="w-1/2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold transition-colors">Cerrar Caja</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-center mb-4 text-gray-800">📊 Reporte de Turno</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm space-y-2 mb-6 shadow-inner">
                  <div className="flex justify-between text-gray-600"><span>Fondo Inicial:</span> <span>Bs. {Number(reporteCierre.fondoInicial || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Ventas Turno:</span> <span>Bs. {Number(reporteCierre.ventasRegistradas || 0).toFixed(2)}</span></div>
                  <hr className="border-gray-300 my-2" />
                  <div className="flex justify-between font-bold text-gray-800"><span>Deberías tener:</span> <span>Bs. {Number(reporteCierre.dineroEsperado || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-gray-800"><span>Entregaste:</span> <span>Bs. {Number(reporteCierre.dineroEntregado || 0).toFixed(2)}</span></div>
                  <hr className="border-gray-300 my-2" />
                  <div className={`flex justify-between text-lg font-black ${(reporteCierre.desfase || 0) === 0 ? 'text-[#2596be]' : (reporteCierre.desfase) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span>Balance:</span> <span>Bs. {Number(reporteCierre.desfase || 0).toFixed(2)}</span>
                  </div>
                  <p className={`text-center text-xs font-bold uppercase mt-1 ${(reporteCierre.desfase || 0) === 0 ? 'text-[#2596be]' : (reporteCierre.desfase) < 0 ? 'text-red-500' : 'text-green-500'}`}>({reporteCierre.resultado || 'Desconocido'})</p>
                </div>
                <button onClick={confirmarBloqueo} className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl shadow-md transition-all">Aceptar y Bloquear</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL INGRESO DE STOCK FÍSICO POR LOTE */}
      {mostrarModalIngreso && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96">
            <h3 className="text-xl font-black text-gray-800 mb-2">📦 Ingresar Lote Físico</h3>
            <form onSubmit={guardarNuevoLote} className="flex flex-col gap-3">
              <div>
                <select required className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioLote.productoId} onChange={(e) => setFormularioLote({ ...formularioLote, productoId: e.target.value })}>
                  <option value="">-- Elige un producto --</option>
                  {productosLookup.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" required placeholder="Nro Lote" className="w-1/2 p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioLote.numeroLote} onChange={(e) => setFormularioLote({ ...formularioLote, numeroLote: e.target.value })} />
                <input type="date" required className="w-1/2 p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioLote.fechaVencimiento} onChange={(e) => setFormularioLote({ ...formularioLote, fechaVencimiento: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <input type="number" required min="1" placeholder="Cantidad" className="w-1/2 p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioLote.cantidad} onChange={(e) => setFormularioLote({ ...formularioLote, cantidad: e.target.value })} />
                <input type="number" step="0.01" required min="0" placeholder="Costo Unitario" className="w-1/2 p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioLote.costoUnitario} onChange={(e) => setFormularioLote({ ...formularioLote, costoUnitario: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setMostrarModalIngreso(false)} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoGuardarLote} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-sm transition-colors">📥 Ingresar Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR DE PRODUCTO MAESTRO */}
      {mostrarModalProducto && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-[450px]">
            <h3 className="text-xl font-black text-gray-800 mb-1">
              {productoEditandoId ? "✏️ Editar Producto Maestro" : "✨ Nuevo Producto Maestro"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {productoEditandoId ? "Modifica los datos del medicamento base en el catálogo." : "Registra la definición base en el catálogo de la farmacia."}
            </p>
            <form onSubmit={guardarNuevoProductoMaestro} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">SKU Comercial</label>
                  <input type="text" required placeholder="Ej. SKU-1001" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.sku} onChange={(e) => setFormularioProducto({ ...formularioProducto, sku: e.target.value })} />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Código de Barras</label>
                  <input type="text" placeholder="Opcional" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.codigoBarras} onChange={(e) => setFormularioProducto({ ...formularioProducto, codigoBarras: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nombre Comercial</label>
                <input type="text" required placeholder="Ej. Paracetamol Delta" className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.nombreComercial} onChange={(e) => setFormularioProducto({ ...formularioProducto, nombreComercial: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <CreatableSelect
                    label="Molécula (Genérico)"
                    options={moleculasIniciales}
                    value={formularioProducto.nombreGenerico}
                    onChange={(val) => setFormularioProducto({ ...formularioProducto, nombreGenerico: val })}
                    placeholder="-- Seleccionar o Escribir --"
                  />
                </div>
                <div className="w-1/2">
                  <CreatableSelect
                    label="Concentración"
                    options={concentracionesIniciales}
                    value={formularioProducto.concentracion}
                    onChange={(val) => setFormularioProducto({ ...formularioProducto, concentracion: val })}
                    placeholder="-- Seleccionar o Escribir --"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <CreatableSelect
                    label="Presentación Física"
                    options={presentacionesIniciales}
                    value={formularioProducto.presentacion}
                    onChange={(val) => setFormularioProducto({ ...formularioProducto, presentacion: val })}
                    placeholder="-- Seleccionar o Escribir --"
                  />
                </div>
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Precio Venta (Bs.)</label>
                  <input type="number" step="0.01" required min="0" placeholder="0.00" className="w-full mt-1 p-2 border rounded text-xs outline-none font-bold focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.precioVenta} onChange={(e) => setFormularioProducto({ ...formularioProducto, precioVenta: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-1/2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Stock Mínimo</label>
                  <input type="number" min="1" required className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" value={formularioProducto.stockMinimo} onChange={(e) => setFormularioProducto({ ...formularioProducto, stockMinimo: e.target.value })} />
                </div>
                <div className="w-1/2 flex items-center h-full pt-4 pl-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input type="checkbox" className="rounded border-gray-300 text-[#2596be] focus:ring-[#2596be] w-4 h-4" checked={formularioProducto.controlado} onChange={(e) => setFormularioProducto({ ...formularioProducto, controlado: e.target.checked })} />
                    🚨 Requiere Receta
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => { setMostrarModalProducto(false); setProductoEditandoId(null); }} className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors">Cancelar</button>
                <button type="submit" disabled={cargandoGuardarProducto} className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors">
                  {cargandoGuardarProducto ? 'Guardando...' : productoEditandoId ? '💾 Guardar Cambios' : '✨ Registrar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* [NEW] MODAL EDITAR VENTA */}
      {mostrarModalEditarVenta && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96">
            <h3 className="text-xl font-black text-gray-800 mb-1">✏️ Editar Venta</h3>
            <p className="text-xs text-gray-500 mb-4">Modifica los datos del cliente y forma de pago de la venta.</p>
            <form onSubmit={guardarEdicionVenta} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Cliente / Razón Social</label>
                <input 
                  type="text" 
                  required 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" 
                  value={formularioEditarVenta.clienteNombre} 
                  onChange={(e) => setFormularioEditarVenta({ ...formularioEditarVenta, clienteNombre: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">NIT / CI</label>
                <input 
                  type="text" 
                  required 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be]" 
                  value={formularioEditarVenta.clienteNitCi} 
                  onChange={(e) => setFormularioEditarVenta({ ...formularioEditarVenta, clienteNitCi: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Forma de Pago</label>
                <select 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" 
                  value={formularioEditarVenta.tipoPago} 
                  onChange={(e) => setFormularioEditarVenta({ ...formularioEditarVenta, tipoPago: e.target.value })}
                >
                  <option value="EFECTIVO">💵 Efectivo</option>
                  <option value="QR">📱 QR</option>
                  <option value="TARJETA">💳 Tarjeta</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  type="button" 
                  onClick={() => { setMostrarModalEditarVenta(false); setVentaEditando(null); }} 
                  className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargandoEditarVenta} 
                  className="w-2/3 bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors"
                >
                  {cargandoEditarVenta ? 'Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* [NEW] MODAL ANULAR VENTA (SIAT + RESTAURACIÓN DE INVENTARIO) */}
      {mostrarModalAnularVenta && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-[400px]">
            <h3 className="text-xl font-black text-red-600 mb-1">⚠️ Anulación y Devolución de Factura</h3>
            <p className="text-xs text-gray-500 mb-4">Esta operación es irreversible e implica las siguientes acciones automáticas:</p>
            
            <ul className="text-xs text-gray-600 bg-red-50 border border-red-200 p-3 rounded-lg space-y-1.5 mb-4 font-semibold animate-pulse">
              <li>🔄 Reversión total de la factura en Impuestos (SIAT).</li>
              <li>📦 Devolución automática de cantidades al stock físico de cada lote.</li>
              <li>📊 Registro de auditoría inmutable en el historial de ajustes.</li>
            </ul>

            <form onSubmit={procesarAnulacionVenta} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Detalle/Motivo de la Eliminación (SIAT)</label>
                <textarea 
                  required 
                  rows="3"
                  placeholder="Ej. Error en los datos de facturación del cliente / devolución de medicamento..." 
                  className="w-full mt-1 p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white" 
                  value={motivoAnulacion} 
                  onChange={(e) => setMotivoAnulacion(e.target.value)} 
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={() => { setMostrarModalAnularVenta(false); setVentaAnulando(null); }} 
                  className="w-1/3 bg-gray-200 hover:bg-gray-300 font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargandoAnulacion} 
                  className="w-2/3 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-colors"
                >
                  {cargandoAnulacion ? 'Procesando Reversión...' : '🗑️ Proceder con la Anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CABECERA DINÁMICA CON SEGURIDAD POR ROLES */}
      <header className="bg-[#341645] text-white p-4 shadow-md flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <img src="/logo_farmanova.png" alt="FarmaNova" className="h-10 w-auto object-contain bg-white/10 p-1 rounded-lg border border-white/20" />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight leading-none">FarmaNova</span>
              <span className="text-[8px] text-[#c9a84c] font-bold uppercase tracking-widest">Solución Comercio</span>
            </div>
          <h1 className="text-xl font-black tracking-wider">FarmaGO</h1>

          <nav className="flex bg-[#1b6f8f]/30 p-1 rounded-lg border border-[#2596be]/30 ml-2">
            <button onClick={() => setPestañaActiva('pos')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${pestañaActiva === 'pos' ? 'bg-[#1b6f8f] text-white shadow' : 'text-blue-100 hover:text-white'}`}>🛒 Punto de Venta</button>

            {/* 🔒 FILTRO DE ROLES: Las pestañas desaparecen si el usuario no es un ADMIN homologado */}
            {rolUsuario === 'ADMIN' && (
              <>
                <button onClick={() => setPestañaActiva('inventario')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${pestañaActiva === 'inventario' ? 'bg-[#1b6f8f] text-white shadow' : 'text-blue-100 hover:text-white'}`}>📅 Inventario</button>
                <button onClick={() => setPestañaActiva('ventas')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${pestañaActiva === 'ventas' ? 'bg-[#1b6f8f] text-white shadow' : 'text-blue-100 hover:text-white'}`}>🧾 Ventas</button>
                <button onClick={() => setPestañaActiva('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${pestañaActiva === 'dashboard' ? 'bg-[#1b6f8f] text-white shadow' : 'text-blue-100 hover:text-white'}`}>📊 Reportes</button>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right bg-[#1b6f8f]/40 px-3 py-1.5 rounded-lg border border-[#2596be]/30">
            <span className="text-[9px] text-blue-100 font-bold uppercase tracking-widest mb-0.5">Control Físico de Gaveta</span>
            <div className="flex gap-3 text-[11px] font-mono items-center">
              <span title="Fondo Inicial" className="text-gray-200">Fondo: <span className="font-bold text-white">Bs. {fondoInicial.toFixed(2)}</span></span>
              <span className="text-[#1b6f8f]">|</span>
              <span title="Ventas en Efectivo del turno" className="text-green-200">Efvo: <span className="font-bold">+{ventasEfectivoTurno.toFixed(2)}</span></span>
              <span className="text-[#1b6f8f]">|</span>
              <span title="Saldo Actual Esperado en Caja" className="font-black text-white bg-[#1b6f8f] px-2 py-0.5 rounded shadow-inner">Total: Bs. {(fondoInicial + ventasEfectivoTurno).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end border-l border-[#1b6f8f] pl-4 ml-1">
            <span className="font-bold text-sm leading-tight text-yellow-300">{cajeroNombre}</span>
            <span className="text-[10px] text-green-300 font-bold flex items-center gap-1 uppercase">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span> {rolUsuario}
            </span>
          </div>
          <button onClick={() => setMostrarModalCierre(true)} className="ml-2 bg-red-500 hover:bg-red-600 px-4 py-2 text-sm rounded-lg font-black shadow-md transition-colors flex items-center gap-2">🔒 Cerrar</button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-hidden h-[calc(100vh-72px)] print:hidden">

        {pestañaActiva === 'pos' ? (
          <div className="flex h-full gap-4 max-h-[calc(100vh-100px)] overflow-hidden">
            {/* LADO IZQUIERDO: CATÁLOGO DE PRODUCTOS */}
            <section className="w-2/3 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
                <input type="text" placeholder="🔍 Buscar medicamento por nombre..." className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2596be] text-md shadow-inner" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <div className="flex gap-2 justify-between items-center">
                  
                  {/* [NEW] Selector premium de categorías rápidas (Slider de Categoría) */}
                  <div className="flex gap-1 bg-white border border-gray-200 p-0.5 rounded-lg shadow-sm">
                    <button 
                      type="button"
                      onClick={() => setFiltroRecetaPOS('TODOS')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${filtroRecetaPOS === 'TODOS' ? 'bg-[#2596be] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      💊 Todos
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFiltroRecetaPOS('LIBRE')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${filtroRecetaPOS === 'LIBRE' ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      🟢 Venta Libre
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFiltroRecetaPOS('CONTROLADO')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${filtroRecetaPOS === 'CONTROLADO' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      🚨 Controlados
                    </button>
                  </div>

                  {/* Ordenación Precio POS */}
                  <select className="p-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" value={ordenPrecioPOS} onChange={(e) => setOrdenPrecioPOS(e.target.value)}>
                    <option value="NINGUNO">Precio: Sin Orden</option>
                    <option value="ASC">Precio: Menor a Mayor</option>
                    <option value="DESC">Precio: Mayor a Menor</option>
                  </select>
                </div>
              </div>
              
              {/* Contenedor del catálogo con scroll y altura máxima fija */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 h-[calc(100vh-230px)] max-h-[calc(100vh-230px)]">
                {cargando ? (
                  <div className="flex justify-center items-center h-full text-gray-500 animate-spin text-4xl">⏳</div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {productosFiltrados.map((producto) => (
                      <div key={producto.loteId} onClick={() => agregarAlCarrito(producto)} className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-[#2596be] flex flex-col justify-between h-32 transition-all">
                        <span className="font-bold text-gray-800 leading-tight">{producto.nombre}</span>
                        <div className="flex justify-between items-end mt-2">
                          <span className="text-sm text-gray-500">Stock: {producto.stock}</span>
                          <span className="text-lg font-black text-[#2596be]">Bs. {producto.precio.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* LADO DERECHO: CARRITO, CLIENTE Y COBRO */}
            <section className="w-1/3 bg-white rounded-xl shadow-sm flex flex-col border border-gray-200 overflow-hidden h-full max-h-[calc(100vh-100px)]">
              {/* Contenedor del carrito con altura fija y scroll interno */}
              <div className="p-4 border-b border-gray-100 h-44 max-h-44 overflow-y-auto bg-gray-50/20">
                {carrito.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400"><p className="text-sm">El carrito está vacío</p></div>
                ) : (
                  <ul className="space-y-2">
                    {carrito.map((item) => (
                      <li key={item.loteId} className="flex justify-between items-center bg-white p-2 rounded text-xs border border-gray-200 shadow-sm">
                        <div className="flex flex-col w-1/2">
                          <span className="font-semibold text-gray-700 truncate" title={item.nombre}>{item.nombre}</span>
                          <span className="text-gray-500">Bs. {item.precio.toFixed(2)} c/u</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1">
                          <button onClick={() => actualizarCantidad(item.loteId, -1)} className="text-red-500 hover:bg-red-50 font-bold px-1.5 py-1 rounded transition-colors text-xs">-</button>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.cantidad} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1) {
                                setCarrito(carritoActual => 
                                  carritoActual.map(it => it.loteId === item.loteId ? { ...it, cantidad: val } : it)
                                );
                              }
                            }} 
                            className="font-bold text-gray-800 w-8 text-center bg-transparent focus:ring-1 focus:ring-[#2596be] outline-none rounded text-xs p-0 border-0"
                          />
                          <button onClick={() => actualizarCantidad(item.loteId, 1)} className="text-green-600 hover:bg-green-50 font-bold px-1.5 py-1 rounded transition-colors text-xs">+</button>
                        </div>
                        <span className="font-bold text-gray-800 w-1/4 text-right">Bs. {(item.cantidad * item.precio).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Registro de clientes de tamaño fijo, siempre visible y no afectado por el catálogo */}
              <div className="p-4 bg-white border-b border-gray-200 bg-gray-50/30 flex-shrink-0">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Datos del Cliente</h3>
                <input type="text" placeholder="NIT / CI" className="w-full p-2 border border-gray-300 rounded mb-2 text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white font-medium" value={clienteNitCi} onChange={(e) => setClienteNitCi(e.target.value)} />
                <input type="text" placeholder="Razón Social" className="w-full p-2 border border-gray-300 rounded text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white font-medium" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
              </div>

              {/* Últimas compras con scroll interno y altura fija */}
              <div className="p-4 bg-white border-b border-gray-200 h-32 max-h-32 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Últimas Compras</h3>
                  {estadoCliente && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${estadoCliente.includes('Frecuente') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{estadoCliente}</span>
                  )}
                </div>
                {!clienteId ? (
                  <p className="text-xs text-gray-400 italic text-center mt-2">Ingresa un CI/NIT para buscar paciente.</p>
                ) : cargandoHistorial ? (
                  <p className="text-xs text-[#2596be] animate-pulse text-center mt-2">Consultando historial...</p>
                ) : historialCompras.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center mt-2">Paciente sin compras previas.</p>
                ) : (
                  <div className="space-y-2">
                    {historialCompras.map((compra) => (
                      <div key={compra.id} className="p-2 bg-[#2596be]/10 border border-[#2596be]/20 rounded text-xs flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-700">Monto: <span className="font-bold text-[#1b6f8f]">Bs. {compra.total.toFixed(2)}</span></p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-tight">{compra.tipoPago}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(compra.fecha).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Métodos de Pago */}
              <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                  <button onClick={() => setMetodoPago('EFECTIVO')} className={`flex-1 py-1.5 rounded text-[11px] font-bold border transition-colors ${metodoPago === 'EFECTIVO' ? 'bg-[#2596be]/20 border-[#2596be] text-[#1b6f8f]' : 'bg-white hover:bg-gray-50'}`}>💵 Efectivo</button>
                  <button onClick={() => setMetodoPago('QR')} className={`flex-1 py-1.5 rounded text-[11px] font-bold border transition-colors ${metodoPago === 'QR' ? 'bg-[#2596be]/20 border-[#2596be] text-[#1b6f8f]' : 'bg-white hover:bg-gray-50'}`}>📱 QR</button>
                  <button onClick={() => setMetodoPago('TARJETA')} className={`flex-1 py-1.5 rounded text-[11px] font-bold border transition-colors ${metodoPago === 'TARJETA' ? 'bg-[#2596be]/20 border-[#2596be] text-[#1b6f8f]' : 'bg-white hover:bg-gray-50'}`}>💳 Tarjeta</button>
                </div>
              </div>

              {/* Botón Cobrar */}
              <div className="p-4 bg-gray-50 flex-shrink-0 mt-auto">
                <div className="flex justify-between items-center mb-4 text-xl font-black text-gray-800">
                  <span>Total:</span>
                  <span>Bs. {calcularTotal()}</span>
                </div>
                <button onClick={iniciarCobro} className="w-full bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-3 px-4 rounded-xl text-lg shadow-md transition-all">
                  <span>{metodoPago === 'QR' ? '📱' : '💸'}</span> Cobrar y Facturar
                </button>
              </div>
            </section>
          </div>

        ) : pestañaActiva === 'inventario' && rolUsuario === 'ADMIN' ? (

          <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-gray-800">
                  {subTabInventario === 'lotes' ? "Control de Lotes y Vencimientos" : "Catálogo Base de Medicamentos"}
                </h2>
                <p className="text-xs text-gray-500">
                  {subTabInventario === 'lotes' 
                    ? "Supervisa las caducidades o registra variaciones/mermas del stock físico." 
                    : "Gestiona el listado maestro de productos de la farmacia."}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setProductoEditandoId(null); setFormularioProducto({ sku: '', codigoBarras: '', nombreComercial: '', nombreGenerico: '', concentracion: '', presentacion: '', precioVenta: '', stockMinimo: '5', controlado: false }); setMostrarModalProducto(true); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"><span>✨</span> Crear Producto Maestro</button>
                <button onClick={abrirModalIngresoMercaderia} className="bg-[#2596be] hover:bg-[#1b6f8f] text-white font-bold py-2 px-4 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"><span>📦</span> Ingresar Mercadería</button>
              </div>
            </div>

            {/* PESTAÑAS DE NAVEGACIÓN SECUNDARIA */}
            <div className="flex border-b border-gray-200 mb-4">
              <button 
                onClick={() => setSubTabInventario('lotes')}
                className={`py-2 px-4 text-sm font-bold border-b-2 transition-all ${subTabInventario === 'lotes' ? 'border-[#2596be] text-[#1b6f8f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                📦 Lotes Físicos y Alertas
              </button>
              <button 
                onClick={() => setSubTabInventario('productos')}
                className={`py-2 px-4 text-sm font-bold border-b-2 transition-all ${subTabInventario === 'productos' ? 'border-[#2596be] text-[#1b6f8f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                💊 Medicamentos Base (Catálogo)
              </button>
            </div>

            {/* [NEW] Filtros Dinámicos de Inventario según la subpestaña */}
            <div className="mb-4 flex gap-2 justify-end bg-gray-50 p-2 rounded-lg border border-gray-150">
              {subTabInventario === 'lotes' ? (
                <>
                  <input 
                    type="text" 
                    placeholder="🔍 Buscar lote por medicamento..." 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] w-64 bg-white" 
                    value={busquedaLotes} 
                    onChange={(e) => setBusquedaLotes(e.target.value)} 
                  />
                  <select 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" 
                    value={filtroEstadoLote} 
                    onChange={(e) => setFiltroEstadoLote(e.target.value)}
                  >
                    <option value="TODOS">Estado: Todos</option>
                    <option value="BUENO">Bueno</option>
                    <option value="ADVERTENCIA">Advertencia</option>
                    <option value="CRÍTICO">Crítico</option>
                    <option value="VENCIDO">Vencido</option>
                  </select>
                </>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="🔍 Buscar por nombre/SKU/genérico..." 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] w-72 bg-white" 
                    value={busquedaProductosBase} 
                    onChange={(e) => setBusquedaProductosBase(e.target.value)} 
                  />
                  <select 
                    className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700" 
                    value={filtroRecetaBase} 
                    onChange={(e) => setFiltroRecetaBase(e.target.value)}
                  >
                    <option value="TODOS">Receta: Todos</option>
                    <option value="LIBRE">Receta: Venta Libre</option>
                    <option value="CONTROLADO">Receta: Controlados 🚨</option>
                  </select>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {subTabInventario === 'lotes' ? (
                cargandoLotes ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500"><span className="text-4xl mb-2 animate-spin">⏳</span><p>Analizando inventario...</p></div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold border-b">
                        <th className="p-4">Producto</th>
                        <th className="p-4 text-center">Stock</th>
                        <th className="p-4 text-center">Caducidad</th>
                        <th className="p-4 text-center">Ventas</th>
                        <th className="p-4 text-center">Devueltos</th>
                        <th className="p-4 text-center">Mermas</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotesFiltrados.map(a => (
                        <tr key={a.loteId} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-bold text-sm text-gray-800">{a.producto}</td>
                          <td className="p-4 text-center font-mono font-bold text-gray-600">{a.stock}</td>
                          <td className="p-4 text-center font-mono text-sm text-gray-600">{a.fechaVencimiento}</td>
                          <td className="p-4 text-center font-mono font-bold text-[#1b6f8f]">{a.ventas || 0} u.</td>
                          <td className="p-4 text-center font-mono font-bold text-green-600">+{a.devueltos || 0}</td>
                          <td className="p-4 text-center font-mono font-bold text-red-500">-{a.mermas || 0}</td>
                          <td className="p-4 flex justify-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold block w-24 text-center ${obtenerEstiloEstado(a.estado)}`}>{a.estado}</span></td>
                          <td className="p-4 text-center"><button onClick={() => setModalAjuste({ visible: true, lote: a, variacion: '', motivo: 'MERMA_CADUCIDAD' })} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">⚙️ Ajustar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                cargandoProductos ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500"><span className="text-4xl mb-2 animate-spin">⏳</span><p>Cargando catálogo maestro...</p></div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold border-b">
                        <th className="p-4">SKU</th>
                        <th className="p-4">Nombre Comercial</th>
                        <th className="p-4">Nombre Genérico</th>
                        <th className="p-4 text-center">Concentración</th>
                        <th className="p-4 text-center">Presentación</th>
                        <th className="p-4 text-right">Precio Venta</th>
                        <th className="p-4 text-center">Receta</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosBaseFiltrados.map(p => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-mono text-xs text-gray-600 font-bold">{p.sku}</td>
                          <td className="p-4 font-bold text-sm text-gray-800">{p.nombreComercial}</td>
                          <td className="p-4 text-sm text-gray-500">{p.nombreGenerico || 'N/A'}</td>
                          <td className="p-4 text-center text-xs text-gray-600">{p.concentracion || 'N/A'}</td>
                          <td className="p-4 text-center text-xs text-gray-600">{p.presentacion || 'N/A'}</td>
                          <td className="p-4 text-right font-bold text-[#1b6f8f]">Bs. {p.precioVenta.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            {p.controlado ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">🚨 CONTROLADO</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">LIBRE</span>
                            )}
                          </td>
                          <td className="p-4 text-center flex justify-center gap-2">
                            <button 
                              onClick={() => iniciarEdicionProducto(p)}
                              className="bg-[#2596be] hover:bg-[#1b6f8f] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              onClick={() => manejarEliminarProducto(p.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {productosBaseFiltrados.length === 0 && (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-gray-400 italic">No hay productos registrados que coincidan con la búsqueda o filtros.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </section>

        ) : pestañaActiva === 'ventas' && rolUsuario === 'ADMIN' ? (

          <section className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-800">Registro General de Ventas</h2>
                <p className="text-sm text-gray-500">Historial histórico detallado para auditoría contable.</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                <input 
                  type="text" 
                  placeholder="🔍 Buscar por cliente o NIT..." 
                  className="p-2 border border-gray-300 rounded-lg text-sm w-48 outline-none focus:ring-2 focus:ring-[#2596be]" 
                  value={busquedaVentas} 
                  onChange={(e) => { setBusquedaVentas(e.target.value); setPaginaVentas(1); }} 
                />
                
                {/* [NEW] Filtro por Método de Pago */}
                <select 
                  className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700 font-bold" 
                  value={filtroMetodoVenta} 
                  onChange={(e) => { setFiltroMetodoVenta(e.target.value); setPaginaVentas(1); }}
                >
                  <option value="TODOS">Método: Todos</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="QR">QR</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>

                {/* [NEW] Filtro por Estado Factura */}
                <select 
                  className="p-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2596be] bg-white text-gray-700 font-bold" 
                  value={filtroEstadoVenta} 
                  onChange={(e) => { setFiltroEstadoVenta(e.target.value); setPaginaVentas(1); }}
                >
                  <option value="TODOS">Estado: Todos</option>
                  <option value="EMITIDA">Emitidas</option>
                  <option value="ANULADA">Anuladas</option>
                </select>

                <button 
                  onClick={exportarExcel} 
                  disabled={ventasFiltradas.length === 0} 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <span>📊</span> Descargar CSV
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {cargandoListaVentas ? (<div className="flex flex-col items-center justify-center h-full text-gray-500"><span className="text-4xl mb-2 animate-spin">⏳</span><p>Recopilando registros...</p></div>) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold border-b sticky top-0">
                      <th className="p-4">Cliente / Razón Social</th>
                      <th className="p-4">NIT / CI</th>
                      <th className="p-4 text-right">Monto Total</th>
                      <th className="p-4 text-center">Método</th>
                      <th className="p-4 text-right">Fecha de Transacción</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasPaginadas.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-gray-400">No se encontraron ventas.</td></tr>
                    ) : (
                      ventasPaginadas.map(v => (
                        <tr 
                          key={v.id} 
                          className={`border-b transition-colors ${
                            v.estadoSiat === 'ANULADA' 
                              ? 'bg-red-50/50 hover:bg-red-50 text-gray-400 line-through opacity-70' 
                              : 'hover:bg-[#2596be]/10'
                          }`}
                        >
                          <td className="p-4 font-bold text-sm text-gray-800">{v.cliente}</td>
                          <td className="p-4 font-mono text-sm text-gray-600">{v.nit}</td>
                          <td className="p-4 text-right font-black text-[#1b6f8f]">Bs. {v.total.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                              v.estadoSiat === 'ANULADA'
                                ? 'bg-red-100 text-red-700'
                                : v.metodo === 'EFECTIVO' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-[#2596be]/20 text-[#1b6f8f]'
                            }`}>
                              {v.estadoSiat === 'ANULADA' ? 'ANULADA' : v.metodo}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-xs text-gray-500">{v.fecha}</td>
                          <td className="p-4 text-center">
                            {v.estadoSiat === 'ANULADA' ? (
                              <span className="text-[10px] font-bold text-red-500 uppercase">ANULADA</span>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => iniciarEdicionVenta(v)} 
                                  className="bg-[#2596be]/10 hover:bg-[#2596be] hover:text-white text-[#1b6f8f] px-2 py-1 rounded text-xs font-bold transition-all"
                                >
                                  ✏️ Editar
                                </button>
                                <button 
                                  onClick={() => iniciarAnulacionVenta(v)} 
                                  className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 px-2 py-1 rounded text-xs font-bold transition-all"
                                >
                                  🗑️ Anular
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {totalPaginasVentas > 1 && (
              <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-4"><span className="text-sm text-gray-500">Mostrando {indicePrimerItem + 1} - {Math.min(indiceUltimoItem, ventasFiltradas.length)} de {ventasFiltradas.length} registros</span><div className="flex gap-2"><button disabled={paginaVentas === 1} onClick={() => setPaginaVentas(paginaVentas - 1)} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-bold text-gray-600 disabled:opacity-30 hover:bg-gray-50">Anterior</button><div className="px-3 py-1 bg-[#2596be]/10 text-[#1b6f8f] font-bold rounded border border-[#2596be]/20">Página {paginaVentas} de {totalPaginasVentas}</div><button disabled={paginaVentas === totalPaginasVentas} onClick={() => setPaginaVentas(paginaVentas + 1)} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-bold text-gray-600 disabled:opacity-30 hover:bg-gray-50">Siguiente</button></div></div>
            )}
          </section>

        ) : pestañaActiva === 'dashboard' && rolUsuario === 'ADMIN' ? (

          <section className="h-full flex flex-col gap-4 overflow-y-auto">
            <div className="mb-2"><h2 className="text-2xl font-black text-gray-800">Panel de Control Gerencial</h2><p className="text-sm text-gray-500">Métricas operativas y de ingresos en tiempo real.</p></div>
            {errorDashboard ? (
              <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <span className="text-5xl mb-2">⚠️</span>
                <p className="font-bold text-lg text-gray-800">Error al calcular la inteligencia de negocios</p>
                <p className="text-xs text-gray-500 mt-1 mb-4 text-center max-w-md">{errorDashboard}</p>
                <button onClick={cargarDashboard} className="bg-[#2596be] hover:bg-[#1b6f8f] text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md">🔄 Reintentar Carga</button>
              </div>
            ) : cargandoDashboard || !datosDashboard ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200"><span className="text-4xl mb-2 animate-spin">⏳</span><p>Calculando inteligencia de negocios...</p></div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between"><span className="text-xs font-bold text-gray-500 uppercase">Ingresos Brutos</span><span className="text-2xl font-black text-[#1b6f8f] mt-2">Bs. {Number(datosDashboard?.kpis?.totalIngresos || 0).toFixed(2)}</span></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between"><span className="text-xs font-bold text-gray-500 uppercase">Ventas Exitosas</span><span className="text-2xl font-black text-gray-800 mt-2">{datosDashboard?.kpis?.totalTransacciones || 0}</span></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between border-l-4 border-l-red-500"><span className="text-xs font-bold text-red-500 uppercase">Mermas / Bajas</span><span className="text-2xl font-black text-red-600 mt-2">{datosDashboard?.kpis?.totalMermas || 0} u.</span></div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between border-l-4 border-l-green-500"><span className="text-xs font-bold text-green-600 uppercase">Devoluciones</span><span className="text-2xl font-black text-green-600 mt-2">{datosDashboard?.kpis?.totalDevoluciones || 0} u.</span></div>
                </div>
                <div className="flex gap-4 min-h-[300px]">
                  <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col"><h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Ingresos por Método</h3><div className="flex-1 flex flex-col gap-4">{datosDashboard.metodosPago.map((metodo, idx) => (<div key={idx} className="flex flex-col gap-1"><div className="flex justify-between text-xs font-bold text-gray-700"><span>{metodo.metodo || metodo.Metodo}</span><span>Bs. {Number(metodo.monto || metodo.Monto || 0).toFixed(2)}</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className={`h-3 rounded-full ${(metodo.metodo || metodo.Metodo) === 'EFECTIVO' ? 'bg-green-500' : (metodo.metodo || metodo.Metodo) === 'QR' ? 'bg-[#2596be]' : 'bg-purple-500'}`} style={{ width: `${metodo.porcentaje || metodo.Porcentaje}%` }}></div></div></div>))}</div></div>
                  <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col"><h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Últimas Ventas</h3><div className="flex-1 flex flex-col gap-2">{datosDashboard.ventasRecientes.map((venta, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg"><div className="flex flex-col"><span className="text-xs font-bold text-gray-800 truncate w-32">{venta.cliente || venta.Cliente}</span><span className="text-[10px] text-gray-500">{venta.fecha || venta.Fecha}</span></div><div className="flex flex-col items-end"><span className="text-sm font-black text-[#1b6f8f]">Bs. {Number(venta.monto || venta.Monto || 0).toFixed(2)}</span><span className="text-[9px] font-bold text-gray-400">{venta.metodo || venta.Metodo}</span></div></div>))}</div></div>
                  <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col"><h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Ajustes Recientes</h3><div className="flex-1 flex flex-col gap-2">{datosDashboard.ajustesRecientes?.length === 0 ? (<p className="text-xs text-gray-400 text-center mt-10">No hay ajustes registrados.</p>) : (datosDashboard.ajustesRecientes?.map((ajuste, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-lg"><div className="flex flex-col"><span className="text-[10px] font-bold text-gray-800">{ajuste.motivo || ajuste.Motivo}</span><span className="text-[9px] text-gray-500">{ajuste.fecha || ajuste.Fecha}</span></div><span className={`text-sm font-black ${(ajuste.cantidad || ajuste.Cantidad) > 0 ? 'text-green-600' : 'text-red-500'}`}>{(ajuste.cantidad || ajuste.Cantidad) > 0 ? '+' : ''}{ajuste.cantidad || ajuste.Cantidad}</span></div>)))}</div></div>
                </div>

                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col mt-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Auditoría de Turnos y Arqueos de Caja</h3>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold border-b">
                          <th className="p-3">Cajero Operativo</th>
                          <th className="p-3 text-center">Apertura</th>
                          <th className="p-3 text-center">Cierre</th>
                          <th className="p-3 text-right">Fondo + Ventas (Teórico)</th>
                          <th className="p-3 text-right">Dinero Entregado (Físico)</th>
                          <th className="p-3 text-right">Desfase</th>
                          <th className="p-3 text-center">Estado Auditoría</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialCajas.length === 0 ? (
                          <tr><td colSpan="7" className="p-4 text-center text-gray-400 text-xs">No hay registros de caja cerrada.</td></tr>
                        ) : (
                          historialCajas.map((caja, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-3 font-bold text-xs text-gray-800">{caja.cajero || caja.Cajero}</td>
                              <td className="p-3 text-center text-[10px] text-gray-500">{caja.fechaApertura || caja.FechaApertura}</td>
                              <td className="p-3 text-center text-[10px] text-gray-500">{caja.fechaCierre || caja.FechaCierre}</td>
                              <td className="p-3 text-right font-mono text-xs text-gray-600">Bs. {(Number(caja.fondoInicial || caja.FondoInicial) + Number(caja.ventas || caja.Ventas)).toFixed(2)}</td>
                              <td className="p-3 text-right font-mono text-xs font-bold text-[#1b6f8f]">Bs. {Number(caja.montoEntregado || caja.MontoEntregado).toFixed(2)}</td>
                              <td className={`p-3 text-right font-mono text-xs font-bold ${Number(caja.desfase || caja.Desfase) === 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {Number(caja.desfase || caja.Desfase) > 0 ? '+' : ''}{Number(caja.desfase || caja.Desfase).toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded text-[9px] font-bold ${(caja.estadoFinal || caja.EstadoFinal) === 'CUADRADO' ? 'bg-green-100 text-green-700' : (caja.estadoFinal || caja.EstadoFinal) === 'SOBRANTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  {caja.estadoFinal || caja.EstadoFinal}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>

        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <span className="text-6xl mb-4 block">🚫</span>
              <h2 className="text-2xl font-black text-gray-800">Acceso Restringido</h2>
              <p className="text-gray-500 mt-2">Tu perfil actual no tiene privilegios para ver esta sección.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;