const fs = require('fs');

async function testWebhook() {
  try {
    // Leer el archivo .env
    const envFile = fs.readFileSync('.env', 'utf8');
    const match = envFile.match(/ALERT_WEBHOOK_URL="?([^"\n]+)"?/);
    const webhookUrl = match ? match[1] : null;

    if (!webhookUrl) {
      console.error("❌ ALERT_WEBHOOK_URL no encontrada en .env");
      return;
    }

    console.log(`Enviando mensaje de prueba a: ${webhookUrl}`);
    
    // Enviar el mensaje de prueba
    const payload = {
      content: `🚨 **Alerta API SRI:** Este es un mensaje de prueba para verificar el Webhook.`
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('✅ ¡Mensaje de prueba enviado con éxito!');
      const data = await response.json();
      console.log('Respuesta del servidor:', JSON.stringify(data.data || data, null, 2));
    } else {
      console.error(`❌ Falló el envío. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWebhook();
