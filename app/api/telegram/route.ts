import { NextResponse } from 'next/server';

// Definisi interface untuk request body
interface TelegramPayload {
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramPayload;
    
    // GANTI DENGAN TOKEN & CHAT ID MILIKMU
    const TELEGRAM_BOT_TOKEN = '123456789:ABCDefghIJKLmnopQRSTuvwxyz'; 
    const TELEGRAM_CHAT_ID = '-100123456789'; // Gunakan ID Grup (biasanya ada tanda minus di depan)

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: body.message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal mengirim pesan' }, { status: 500 });
  }
}