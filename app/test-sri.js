const soap = require('soap');

async function test() {
  const clave = "2412202507179210356800120050010002092220400500116";
  
  console.log("=== TEST 1: AutorizacionComprobantesOffline ===");
  try {
    const client1 = await soap.createClientAsync("https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl");
    const [res1] = await client1.autorizacionComprobanteAsync({ claveAccesoComprobante: clave });
    console.log(JSON.stringify(res1, null, 2));
  } catch (e) {
    console.error("Error 1:", e.message);
  }

  console.log("\n=== TEST 2: ConsultaComprobante ===");
  try {
    const client2 = await soap.createClientAsync("https://cel.sri.gob.ec/comprobantes-electronicos-ws/ConsultaComprobante?wsdl");
    const [res2] = await client2.consultarEstadoAutorizacionComprobanteAsync({ claveAcceso: clave });
    console.log(JSON.stringify(res2, null, 2));
  } catch (e) {
    console.error("Error 2:", e.message);
  }
}

test();
