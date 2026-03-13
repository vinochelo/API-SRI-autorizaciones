const soap = require('soap');

async function checkSRI() {
  const clave = "2412202507179210356800120050010002092220400500116";
  const urls = [
    { name: 'PROD - Autorizacion', url: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl' },
    { name: 'PROD - Consulta', url: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/ConsultaComprobante?wsdl' },
    { name: 'PRUEBAS - Autorizacion', url: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl' },
    { name: 'PRUEBAS - Consulta', url: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/ConsultaComprobante?wsdl' }
  ];

  for (const {name, url} of urls) {
    console.log(`\n--- Testing ${name} ---`);
    try {
      const client = await soap.createClientAsync(url);
      if (name.includes('Autorizacion')) {
        const [res] = await client.autorizacionComprobanteAsync({ claveAccesoComprobante: clave });
        console.log(JSON.stringify(res, null, 2));
      } else {
        const [res] = await client.consultarEstadoAutorizacionComprobanteAsync({ claveAcceso: clave });
        console.log(JSON.stringify(res, null, 2));
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

checkSRI();
