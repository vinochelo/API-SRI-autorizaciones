from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from zeep import Client
from zeep.exceptions import Fault
import os
import requests

app = FastAPI(
    title="API SRI Ecuador - Consulta de Comprobantes",
    description="API para consultar el estado de comprobantes electrónicos en el SRI de Ecuador.",
    version="1.0.0"
)

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, cambiar por ["http://localhost", "https://midominio.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint del SRI (Solo Producción)
SRI_URL_PRODUCCION = "https://cel.sri.gob.ec/comprobantes-electronicos-ws/ConsultaComprobante?wsdl"

class ConsultaRequest(BaseModel):
    claveAcceso: str = Field(..., min_length=49, max_length=49, description="Clave de acceso de 49 dígitos")

def enviar_alerta(mensaje: str):
    """
    Envía una notificación a un Webhook (Discord, Slack, Microsoft Teams, etc.)
    Configura la variable de entorno ALERT_WEBHOOK_URL con la URL de tu webhook.
    """
    webhook_url = os.getenv("ALERT_WEBHOOK_URL")
    if webhook_url:
        try:
            requests.post(webhook_url, json={"content": f"🚨 **Alerta API SRI:** {mensaje}"}, timeout=5)
        except Exception as e:
            print(f"No se pudo enviar la alerta al webhook: {e}")
    else:
        print(f"ALERTA (Sin Webhook configurado): {mensaje}")

def mapear_estado(estado_sri: str) -> str:
    """
    Mapea el estado devuelto por el SRI a los estados solicitados.
    """
    if not estado_sri:
        return "POR PROCESAR"
        
    estado_sri_upper = estado_sri.upper()
    
    if estado_sri_upper == 'AUTORIZADO':
        return 'AUTORIZADO'
    elif estado_sri_upper in ['RECHAZADA', 'DEVUELTA', 'NO AUTORIZADO']:
        return 'NO AUTORIZADO'
    elif estado_sri_upper in ['EN PROCESO', 'RECIBIDA']:
        return 'POR PROCESAR'
    elif estado_sri_upper == 'PENDIENTE DE ANULAR':
        return 'PENDIENTE DE ANULAR'
    elif estado_sri_upper == 'ANULADO':
        return 'ANULADO'
    else:
        return estado_sri_upper

def extract_sri_data(response_obj):
    """
    Extrae el estado y los mensajes de la respuesta del SRI, 
    manejando múltiples variaciones en la estructura del XML/Objeto.
    """
    try:
        from zeep.helpers import serialize_object
        data = serialize_object(response_obj)
    except Exception:
        data = response_obj

    if not isinstance(data, dict):
        return None, []

    estado_sri = None
    mensajes_list = []

    # 1. Estructura estándar: autorizaciones -> autorizacion
    autorizaciones = data.get('autorizaciones')
    if autorizaciones and isinstance(autorizaciones, dict):
        auth_data = autorizaciones.get('autorizacion')
        if auth_data:
            auth_list = auth_data if isinstance(auth_data, list) else [auth_data]
            if auth_list:
                # Tomar la última/primera autorización
                auth = auth_list[0]
                estado_sri = auth.get('estado')
                
                mensajes_data = auth.get('mensajes')
                if mensajes_data and isinstance(mensajes_data, dict):
                    msj = mensajes_data.get('mensaje', [])
                    mensajes_list = msj if isinstance(msj, list) else [msj]

    # 2. Estructura alternativa directa o anidada
    if not estado_sri:
        alt_resp = data.get('RespuestaAutorizacionComprobante') or data.get('EstadoAutorizacionComprobante') or data
        if isinstance(alt_resp, dict):
            estado_sri = alt_resp.get('estadoAutorizacion') or alt_resp.get('estadoConsulta') or alt_resp.get('estado')
            
            mensajes_data = alt_resp.get('mensajes')
            if mensajes_data and isinstance(mensajes_data, dict):
                msj = mensajes_data.get('mensaje', [])
                mensajes_list = msj if isinstance(msj, list) else [msj]

    # Limpiar el estado si viene como un diccionario con $value (común en algunas librerías XML)
    if isinstance(estado_sri, dict) and '$value' in estado_sri:
        estado_sri = estado_sri['$value']

    return estado_sri, mensajes_list

@app.post("/consultar-estado")
def consultar_estado(request: ConsultaRequest):
    wsdl = SRI_URL_PRODUCCION
    
    try:
        # Inicializar cliente SOAP
        client = Client(wsdl)
        
        # Llamar al método consultarEstadoAutorizacionComprobante del SRI
        # Nota: Dependiendo del WSDL exacto, el método puede llamarse autorizacionComprobante
        if hasattr(client.service, 'autorizacionComprobante'):
            response = client.service.autorizacionComprobante(claveAccesoComprobante=request.claveAcceso)
        else:
            response = client.service.consultarEstadoAutorizacionComprobante(claveAcceso=request.claveAcceso)
        
        # Extraer datos de forma robusta
        estado_sri, mensajes = extract_sri_data(response)

        mensaje_adicional = ""
        estado_final = ""

        # Procesar mensajes para buscar errores específicos (ej. 99 Fuera de rango)
        for msj_obj in mensajes:
            if not isinstance(msj_obj, dict):
                continue
            
            identificador = msj_obj.get('identificador')
            info_adicional = msj_obj.get('informacionAdicional') or msj_obj.get('mensaje') or ""
            
            if identificador == '99':
                mensaje_adicional = info_adicional
                estado_final = "FUERA DE RANGO"
                break
            
            # Guardar el primer mensaje como fallback si no hay uno específico
            if not mensaje_adicional:
                mensaje_adicional = info_adicional

        if not estado_sri:
            return {"estado": "POR PROCESAR"}
        
        if not estado_final:
            estado_final = mapear_estado(estado_sri)
            
        response_payload = {"estado": estado_final}
        if mensaje_adicional:
            response_payload["mensaje"] = mensaje_adicional
            
        return response_payload
        
    except Fault as f:
        error_msg = f"Error del servicio SOAP del SRI: {f.message}"
        enviar_alerta(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        error_msg = f"Error de conexión o cambio en el endpoint del SRI: {str(e)}"
        enviar_alerta(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
