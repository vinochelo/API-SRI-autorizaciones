import { NextResponse } from 'next/server';

export async function POST() {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "La variable de entorno ALERT_WEBHOOK_URL no está configurada." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: "✅ **Prueba Exitosa:** El webhook de Discord está configurado correctamente en tu despliegue de Vercel y la API puede enviar mensajes.",
      }),
    });

    if (!response.ok) {
      throw new Error(`Error de Discord: ${response.status}`);
    }

    return NextResponse.json({ success: true, message: "Alerta de prueba enviada a Discord correctamente." });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al intentar enviar el mensaje a Discord.", details: error.message },
      { status: 500 }
    );
  }
}
