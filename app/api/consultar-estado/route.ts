import { NextResponse } from 'next/server';
import * as soap from 'soap';

// URL del WSDL del SRI (Solo Producción según solicitud)
const SRI_URL_PRODUCCION = "https://cel.sri.gob.ec/comprobantes-electronicos-ws/ConsultaComprobante?wsdl";

// Función para enviar alertas (Discord, Slack, etc.) si el SRI falla
async function enviarAlerta(mensaje: string) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("ALERTA SRI (Sin webhook configurado):", mensaje);
    return;
  }
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **Alerta API SRI:** ${mensaje}`
      })
    });
  } catch (e) {
    console.error("Error enviando alerta al webhook:", e);
  }
}

// Función para mapear el estado devuelto por el SRI a los estados solicitados
function mapearEstado(estadoSri: string): string {
  if (!estadoSri) return "POR PROCESAR";
  
  const upper = estadoSri.toUpperCase();
  
  if (upper === 'AUTORIZADO') return 'AUTORIZADO';
  if (['RECHAZADA', 'DEVUELTA', 'NO AUTORIZADO'].includes(upper)) return 'NO AUTORIZADO';
  if (['EN PROCESO', 'RECIBIDA'].includes(upper)) return 'POR PROCESAR';
  if (upper === 'PENDIENTE DE ANULAR') return 'PENDIENTE DE ANULAR';
  if (upper === 'ANULADO') return 'ANULADO';
  
  return upper;
}

// Función para extraer datos de forma robusta de la respuesta del SRI
function extractSriData(responseObj: any): { estadoSri: string | null, mensajesList: any[] } {
  if (!responseObj || typeof responseObj !== 'object') {
    return { estadoSri: null, mensajesList: [] };
  }

  let estadoSri: string | null = null;
  let mensajesList: any[] = [];

  // 1. Estructura estándar: autorizaciones -> autorizacion
  const autorizaciones = responseObj.autorizaciones;
  if (autorizaciones && typeof autorizaciones === 'object') {
    const authData = autorizaciones.autorizacion;
    if (authData) {
      const authList = Array.isArray(authData) ? authData : [authData];
      if (authList.length > 0) {
        const auth = authList[0];
        estadoSri = auth.estado || null;

        const mensajesData = auth.mensajes;
        if (mensajesData && typeof mensajesData === 'object') {
          const msj = mensajesData.mensaje;
          mensajesList = Array.isArray(msj) ? msj : (msj ? [msj] : []);
        }
      }
    }
  }

  // 2. Estructura alternativa directa o anidada
  if (!estadoSri) {
    const altResp = responseObj.RespuestaAutorizacionComprobante || responseObj.EstadoAutorizacionComprobante || responseObj;
    if (altResp && typeof altResp === 'object') {
      estadoSri = altResp.estadoAutorizacion || altResp.estadoConsulta || altResp.estado || null;

      const mensajesData = altResp.mensajes;
      if (mensajesData && typeof mensajesData === 'object') {
        const msj = mensajesData.mensaje;
        mensajesList = Array.isArray(msj) ? msj : (msj ? [msj] : []);
      }
    }
  }

  // Limpiar el estado si viene como un diccionario con $value (común en algunas librerías XML)
  if (estadoSri && typeof estadoSri === 'object' && (estadoSri as any).$value) {
    estadoSri = (estadoSri as any).$value;
  }

  return { estadoSri, mensajesList };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { claveAcceso } = body;

    // Validación básica de la clave de acceso
    if (!claveAcceso || claveAcceso.length !== 49) {
      return NextResponse.json(
        { error: "La clave de acceso debe tener exactamente 49 dígitos." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Usar siempre Producción
    const wsdl = SRI_URL_PRODUCCION;

    // Crear cliente SOAP
    const client = await soap.createClientAsync(wsdl);
    
    // Llamar al método del SRI
    // Nota: Dependiendo del WSDL exacto, el método puede llamarse autorizacionComprobante
    let result;
    if (typeof client.autorizacionComprobanteAsync === 'function') {
      [result] = await client.autorizacionComprobanteAsync({ claveAccesoComprobante: claveAcceso });
    } else {
      [result] = await client.consultarEstadoAutorizacionComprobanteAsync({ claveAcceso });
    }
    
    // Extraer datos de forma robusta
    const { estadoSri, mensajesList } = extractSriData(result);

    let mensajeAdicional = "";
    let estadoFinal = "";

    // Procesar mensajes para buscar errores específicos (ej. 99 Fuera de rango)
    for (const msjObj of mensajesList) {
      if (!msjObj || typeof msjObj !== 'object') continue;
      
      const identificador = msjObj.identificador;
      const infoAdicional = msjObj.informacionAdicional || msjObj.mensaje || "";
      
      if (identificador === '99') {
        mensajeAdicional = infoAdicional;
        estadoFinal = "FUERA DE RANGO";
        break;
      }
      
      // Guardar el primer mensaje como fallback si no hay uno específico
      if (!mensajeAdicional) {
        mensajeAdicional = infoAdicional;
      }
    }

    if (!estadoSri) {
      return NextResponse.json({
        estado: "POR PROCESAR"
      }, { headers: corsHeaders });
    }

    // Si no se asignó un estado final especial (como FUERA DE RANGO), usamos el mapeo normal
    if (!estadoFinal) {
      estadoFinal = mapearEstado(estadoSri);
    }

    const responsePayload: any = { estado: estadoFinal };
    if (mensajeAdicional) {
      responsePayload.mensaje = mensajeAdicional;
    }

    return NextResponse.json(responsePayload, { headers: corsHeaders });

  } catch (error: any) {
    const errorMsg = error.message || "Error interno del servidor al comunicarse con el SRI.";
    console.error("Error al consultar el SRI:", error);
    
    // Enviar alerta al webhook
    await enviarAlerta(`Error de conexión o cambio en el endpoint del SRI: ${errorMsg}`);
    
    return NextResponse.json(
      { error: errorMsg },
      { status: 500, headers: corsHeaders }
    );
  }
}
