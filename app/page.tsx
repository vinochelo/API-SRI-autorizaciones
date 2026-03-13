'use client';

import { useState, useEffect } from 'react';

interface PeticionLog {
  id: string;
  fecha: string;
  clave: string;
  exito: boolean;
  estadoSri?: string;
  mensaje?: string;
}

export default function Home() {
  const [claveAcceso, setClaveAcceso] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<any>(null);
  
  const [historial, setHistorial] = useState<PeticionLog[]>([]);

  // Función para obtener logs del backend
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      if (response.ok) {
        const data = await response.json();
        setHistorial(data.logs || []);
      }
    } catch (error) {
      console.error("Error al obtener logs:", error);
    }
  };

  // Polling cada 5 segundos
  useEffect(() => {
    fetchLogs(); // Carga inicial
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultado(null);

    try {
      const response = await fetch('/api/consultar-estado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claveAcceso }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al consultar la API');
      }

      setResultado(data);
      
      // Refrescar logs inmediatamente después de una consulta local
      fetchLogs();

    } catch (err: any) {
      setError(err.message);
      
      // Refrescar logs inmediatamente después de un error local
      fetchLogs();
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    setWebhookLoading(true);
    setWebhookResult(null);

    try {
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al probar el Webhook');
      }

      setWebhookResult({ type: 'success', message: data.message });
    } catch (err: any) {
      setWebhookResult({ type: 'error', message: err.message });
    } finally {
      setWebhookLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            API SRI Ecuador - Validador
          </h1>
          <p className="text-slate-500">
            Monitor de peticiones y herramientas de prueba para tu API.
          </p>
        </div>

        {/* Monitor de Peticiones (Movido al inicio) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900">Monitor de Peticiones (Sesión Actual)</h2>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {historial.length} peticiones
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Hora</th>
                  <th className="px-4 py-3">Clave de Acceso</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 rounded-tr-lg">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No hay peticiones registradas en esta sesión. Realiza una consulta para ver el historial.
                    </td>
                  </tr>
                ) : (
                  historial.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-900">
                        {new Date(log.fecha).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.clave.substring(0, 8)}...{log.clave.substring(41)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${
                          log.exito 
                            ? (log.estadoSri === 'AUTORIZADO' ? 'bg-emerald-100 text-emerald-700' : 
                               log.estadoSri === 'NO AUTORIZADO' ? 'bg-red-100 text-red-700' : 
                               'bg-amber-100 text-amber-700')
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.exito ? log.estadoSri : 'ERROR API'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate" title={log.mensaje}>
                        {log.mensaje}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Separador para Herramientas de Prueba */}
        <div className="pt-8 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Herramientas de Prueba</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="clave" className="block text-sm font-medium text-slate-700">
                    Clave de Acceso (49 dígitos)
                  </label>
                  <input
                    id="clave"
                    type="text"
                    value={claveAcceso}
                    onChange={(e) => setClaveAcceso(e.target.value.replace(/\D/g, '').slice(0, 49))}
                    placeholder="Ej: 0101202401179001691900110010010000000011234567811"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                    required
                    minLength={49}
                    maxLength={49}
                  />
                  <p className="text-xs text-slate-500 text-right">
                    {claveAcceso.length}/49 caracteres
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || claveAcceso.length !== 49}
                  className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Consultando al SRI...
                    </span>
                  ) : (
                    "Consultar Estado"
                  )}
                </button>
              </form>
            </div>

            {/* Test Webhook Discord */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Prueba de Alertas (Discord)</h2>
                  <p className="text-slate-600 text-sm mt-1">
                    Verifica que la variable de entorno <code className="bg-slate-100 px-1 rounded">ALERT_WEBHOOK_URL</code> esté configurada correctamente en Vercel.
                  </p>
                </div>
                <button
                  onClick={handleTestWebhook}
                  disabled={webhookLoading}
                  className="bg-indigo-100 text-indigo-700 py-2 px-4 rounded-lg font-medium hover:bg-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {webhookLoading ? 'Enviando...' : 'Enviar Alerta'}
                </button>
              </div>
              
              {webhookResult && (
                <div className={`p-4 rounded-xl text-sm ${webhookResult.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  <strong>{webhookResult.type === 'success' ? '¡Éxito!' : 'Error:'}</strong> {webhookResult.message}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {/* Resultados */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {resultado && (
              <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                  <span className="text-slate-300 text-sm font-medium">Última Respuesta</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    resultado.estado === 'AUTORIZADO' ? 'bg-emerald-500/20 text-emerald-400' :
                    resultado.estado === 'NO AUTORIZADO' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {resultado.estado}
                  </span>
                </div>
                <div className="p-4 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                  <pre className="text-emerald-400 font-mono text-xs">
                    {JSON.stringify(resultado, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
