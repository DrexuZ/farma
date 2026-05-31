import { useState } from 'react';
import * as XLSX from 'xlsx';
import FinanzasTable from './FinanzasTable';
import FormularioFinanzaModal from './FormularioFinanzaModal';

export default function FinanzasPage() {
    const [modalAbierto, setModalAbierto] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [metricas, setMetricas] = useState({ ingresos: 0, gastos: 0, neto: 0 });
    const [exportando, setExportando] = useState(false);
    const [datosFiltradosParaExcel, setDatosFiltradosParaExcel] = useState([]);

    const exportarAExcel = () => {
        if (datosFiltradosParaExcel.length === 0) {
            alert("No hay datos para exportar con los filtros actuales.");
            return;
        }

        setExportando(true);
        try {
            const datosFormateados = datosFiltradosParaExcel.map(mov => ({
                'Fecha de Registro': new Date(mov.fecha_registro).toLocaleDateString('es-BO'),
                'Tipo': mov.tipo,
                'Categoría': mov.categoria || '-',
                'Detalle / Concepto': mov.concepto,
                'Monto (Bs)': Number(mov.monto),
                // ADAPTADO: Ahora lee de la relación con 'leads'
                'Lead / Cliente Relacionado': mov.leads ? mov.leads.nombre : 'Gasto General / No asignado',
                'Servicio Realizado': mov.servicio || '-',
                'Banco / Entidad': mov.banco || 'Efectivo',
                'Nro. Cuenta': mov.numero_cuenta || '-',
                'Titular Cuenta': mov.titular || '-',
                'ID Operación / Ref': mov.id_operacion || '-'
            }));

            const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Financiero");
            XLSX.writeFile(workbook, `Finanzas_ORE_${new Date().toLocaleDateString('es-BO')}.xlsx`);
        } catch (error) {
            alert("Error al exportar los datos.");
            console.error(error);
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[98%] mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Control Financiero</h1>
                    <p className="text-sm text-slate-500 mt-1">Registra ingresos, gastos operativos y evalúa la rentabilidad.</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <button
                        onClick={exportarAExcel}
                        disabled={exportando}
                        className="flex-1 lg:flex-none px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                        {exportando ? '⏳ Generando...' : '📊 Exportar a Excel'}
                    </button>
                    <button
                        onClick={() => setModalAbierto(true)}
                        className="flex-1 lg:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-600/30 transition-all flex justify-center items-center gap-2"
                    >
                        <span>+</span> Registrar Movimiento
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos Totales (Vista)</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">Bs. {Math.round(metricas.ingresos).toLocaleString('es-BO')}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos Operativos (Vista)</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">Bs. {Math.round(metricas.gastos).toLocaleString('es-BO')}</p>
                </div>
                <div className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 border-l-4 ${metricas.neto >= 0 ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rentabilidad Neta (Vista)</p>
                    <p className={`text-3xl font-black mt-2 ${metricas.neto >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Bs. {Math.round(metricas.neto).toLocaleString('es-BO')}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <FinanzasTable
                    refreshTrigger={refreshTrigger}
                    onActualizarMetricas={setMetricas}
                    onDatosFiltrados={setDatosFiltradosParaExcel}
                />
            </div>

            <FormularioFinanzaModal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                onGuardado={() => setRefreshTrigger(p => p + 1)}
            />
        </div>
    );
}