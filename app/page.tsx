'use client';

import { useState } from 'react';

export default function Home() {
  const [claveAcceso, setClaveAcceso] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<any>(null);

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
    } catch (err: any) {
      setError(err.message);
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
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            API SRI Ecuador - Validador
          </h1>
          <p className="text-slate-500">
            Prueba el endpoint <code className="bg-slate-200 px-1 py-0.5 rounded text-sm">POST /api/consultar-estado</code> directamente desde aquí.
          </p>
        </div>

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

        {/* Resultados */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {resultado && (
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <span className="text-slate-300 text-sm font-medium">Respuesta de la API</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                resultado.estado === 'AUTORIZADO' ? 'bg-emerald-500/20 text-emerald-400' :
                resultado.estado === 'NO AUTORIZADO' ? 'bg-red-500/20 text-red-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {resultado.estado}
              </span>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-emerald-400 font-mono text-sm">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          </div>
        )}

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
              {webhookLoading ? 'Enviando...' : 'Enviar Alerta de Prueba'}
            </button>
          </div>
          
          {webhookResult && (
            <div className={`p-4 rounded-xl text-sm ${webhookResult.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <strong>{webhookResult.type === 'success' ? '¡Éxito!' : 'Error:'}</strong> {webhookResult.message}
            </div>
          )}
        </div>

        {/* Instrucciones de Integración */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">¿Cómo integrar esto en tu otra página web?</h2>
          <p className="text-slate-600 text-sm">
            Una vez que subas este proyecto a Vercel, obtendrás una URL (ej: <code className="bg-slate-100 px-1 rounded">https://tu-api-sri.vercel.app</code>). 
            Desde tu otra página web, solo debes hacer una petición `fetch` así:
          </p>
          <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-sm overflow-x-auto font-mono">
{`const consultarSRI = async (clave) => {
  const response = await fetch('https://tu-api-sri.vercel.app/api/consultar-estado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      claveAcceso: clave
    })
  });
  
  const data = await response.json();
  console.log("Estado del comprobante:", data.estado);
  return data;
};`}
          </pre>
        </div>
      </div>
    </main>
  );
}
