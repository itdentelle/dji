import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, userRole, userName } = body;

    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { reply: "Error: N8N_WEBHOOK_URL belum dikonfigurasi di .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userRole,
        userName,
        sessionId: userName || "anonymous-session", // n8n membutuhkan ini untuk Memory
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook error: ${response.statusText}`);
    }

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      data = responseText;
    }

    // Asumsi n8n mengembalikan JSON dengan properti 'reply', 'output', atau 'message'
    // Sesuaikan dengan response n8n Anda
    let reply = "Tidak ada respon dari n8n.";
    
    if (typeof data === 'string') {
        reply = data;
    } else if (data.reply) {
        reply = data.reply;
    } else if (data.output) {
        reply = data.output;
    } else if (data.message) {
        reply = data.message;
    } else if (data[0] && data[0].output) {
        reply = data[0].output; // Beberapa n8n node mengembalikan array
    } else if (data[0] && data[0].message) {
        reply = data[0].message;
    } else {
        reply = JSON.stringify(data); // Fallback tampilkan data raw
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { reply: `Maaf, terjadi kesalahan saat menghubungi server AI: ${error.message}` },
      { status: 500 }
    );
  }
}
