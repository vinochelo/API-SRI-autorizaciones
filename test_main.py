import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

# Clave de acceso de prueba válida (49 dígitos)
CLAVE_PRUEBA = "1234567890123456789012345678901234567890123456789"

# Clases Mock para simular la respuesta de Zeep
class MockRespuesta:
    def __init__(self, estado, identificador=None, mensaje_adicional=None):
        self.estadoAutorizacion = estado
        self.mensajes = None
        
        if identificador:
            class MockMensaje:
                def __init__(self, ident, msj):
                    self.identificador = ident
                    self.informacionAdicional = msj
            
            class MockMensajes:
                def __init__(self, ident, msj):
                    self.mensaje = [MockMensaje(ident, msj)]
            
            self.mensajes = MockMensajes(identificador, mensaje_adicional)

class MockResponse:
    def __init__(self, estado, identificador=None, mensaje_adicional=None):
        self.EstadoAutorizacionComprobante = MockRespuesta(estado, identificador, mensaje_adicional)

@pytest.fixture
def mock_zeep_client():
    with patch('main.Client') as mock_client:
        yield mock_client

class TestSRI:
    
    def test_estado_autorizado(self, mock_zeep_client):
        # Configurar el mock para devolver 'AUTORIZADO'
        mock_instance = mock_zeep_client.return_value
        mock_instance.service.consultarEstadoAutorizacionComprobante.return_value = MockResponse('AUTORIZADO')
        
        response = client.post("/consultar-estado", json={
            "claveAcceso": CLAVE_PRUEBA
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "AUTORIZADO"
        assert "estado_original" not in data

    def test_estado_no_autorizado_rechazada(self, mock_zeep_client):
        # Configurar el mock para devolver 'RECHAZADA'
        mock_instance = mock_zeep_client.return_value
        mock_instance.service.consultarEstadoAutorizacionComprobante.return_value = MockResponse('RECHAZADA')
        
        response = client.post("/consultar-estado", json={
            "claveAcceso": CLAVE_PRUEBA
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "NO AUTORIZADO"
        assert "estado_original" not in data

    def test_estado_fuera_de_rango(self, mock_zeep_client):
        # Configurar el mock para devolver 'RECHAZADA' con identificador 99
        mock_instance = mock_zeep_client.return_value
        mock_instance.service.consultarEstadoAutorizacionComprobante.return_value = MockResponse(
            'RECHAZADA', 
            identificador='99', 
            mensaje_adicional='Fuera de rango'
        )
        
        response = client.post("/consultar-estado", json={
            "claveAcceso": CLAVE_PRUEBA
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "FUERA DE RANGO"
        assert "estado_original" not in data
        assert data["mensaje"] == "Fuera de rango"

    def test_estado_no_autorizado_devuelta(self, mock_zeep_client):
        # Configurar el mock para devolver 'DEVUELTA'
        mock_instance = mock_zeep_client.return_value
        mock_instance.service.consultarEstadoAutorizacionComprobante.return_value = MockResponse('DEVUELTA')
        
        response = client.post("/consultar-estado", json={
            "claveAcceso": CLAVE_PRUEBA
        })
        
        assert response.status_code == 200
        assert response.json()["estado"] == "NO AUTORIZADO"

    def test_estado_por_procesar_en_proceso(self, mock_zeep_client):
        # Configurar el mock para devolver 'EN PROCESO'
        mock_instance = mock_zeep_client.return_value
        mock_instance.service.consultarEstadoAutorizacionComprobante.return_value = MockResponse('EN PROCESO')
        
        response = client.post("/consultar-estado", json={
            "claveAcceso": CLAVE_PRUEBA
        })
        
        assert response.status_code == 200
        assert response.json()["estado"] == "POR PROCESAR"

    def test_estado_pendiente_anular(self, mock_zeep_client):
        mock_instance = mock_zeep_client.return_value
        mock_instance.service.consultarEstadoAutorizacionComprobante.return_value = MockResponse('PENDIENTE DE ANULAR')
        
        response = client.post("/consultar-estado", json={
            "claveAcceso": CLAVE_PRUEBA
        })
        
        assert response.status_code == 200
        assert response.json()["estado"] == "PENDIENTE DE ANULAR"

    def test_estado_anulado(self, mock_zeep_client):
        mock_instance = mock_zeep_client.return_value
        mock_instance.service.consultarEstadoAutorizacionComprobante.return_value = MockResponse('ANULADO')
        
        response = client.post("/consultar-estado", json={
            "claveAcceso": CLAVE_PRUEBA
        })
        
        assert response.status_code == 200
        assert response.json()["estado"] == "ANULADO"

    def test_validacion_clave_acceso_corta(self):
        # Probar con una clave de menos de 49 dígitos
        response = client.post("/consultar-estado", json={
            "claveAcceso": "12345"
        })
        
        assert response.status_code == 422 # Error de validación de Pydantic

