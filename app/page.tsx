'use client';

import React, { useEffect, useState, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Definisi Tipe Data yang Ketat
interface SensorData {
  jarak: string;
  cahaya: string;
  status: string;
}

interface ChartData {
  waktu: string;
  jarak: number;
  cahaya: number;
}

export default function LandingPage() {
  const [sensorData, setSensorData] = useState<SensorData>({
    jarak: '--', cahaya: '--', status: 'MENUNGGU DATA...',
  });
  const [connectionStatus, setConnectionStatus] = useState<string>('Menghubungkan...');
  
  // State untuk menyimpan riwayat data grafik
  const [historyData, setHistoryData] = useState<ChartData[]>([]);
  
  // Ref untuk mencegah pengiriman pesan Telegram beruntun (spam)
  const lastAlertTime = useRef<number>(0);

  // Fungsi menembak API Telegram Next.js
  const sendTelegramAlert = async (status: string, jarak: string) => {
    const now = Date.now();
    // Beri jeda 1 menit (60000ms) sebelum mengirim pesan bahaya berikutnya
    if (now - lastAlertTime.current > 60000) {
      lastAlertTime.current = now;
      const pesanDarurat = `🚨 *PERINGATAN DINI BANJIR!* 🚨\n\n*Status:* ${status}\n*Level Air Saat Ini:* ${jarak} cm\n*Lokasi:* Bendungan Utama Sungai Siak\n\n_Segera lakukan evakuasi dan ikuti arahan petugas._`;
      
      try {
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: pesanDarurat }),
        });
        console.log('Pesan Telegram Terkirim');
      } catch (error) {
        console.error('Gagal mengirim Telegram', error);
      }
    }
  };

  useEffect(() => {
    const client: MqttClient = mqtt.connect('ws://broker.hivemq.com:8000/mqtt');

    client.on('connect', () => {
      setConnectionStatus('Terhubung ke Jaringan WSN');
      client.subscribe('sjnk/kelompok12/jarak');
      client.subscribe('sjnk/kelompok12/cahaya');
      client.subscribe('sjnk/kelompok12/status');
    });

    client.on('message', (topic: string, message: Buffer) => {
      const payloadString: string = message.toString();

      setSensorData((prev) => {
        const newData = { ...prev };
        let isUpdated = false;

        if (topic === 'sjnk/kelompok12/jarak') {
          newData.jarak = payloadString;
          isUpdated = true;
        } else if (topic === 'sjnk/kelompok12/cahaya') {
          newData.cahaya = payloadString;
        } else if (topic === 'sjnk/kelompok12/status') {
          newData.status = payloadString;
          // Pemicu Notifikasi Telegram
          if (payloadString.includes('SIAGA') || payloadString.includes('BANDANG')) {
            sendTelegramAlert(payloadString, newData.jarak);
          }
        }

        // Memperbarui grafik jika ada data jarak baru yang masuk
        if (isUpdated && !isNaN(parseFloat(newData.jarak))) {
          const waktuSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setHistoryData((prevHistory) => {
            const newHistory = [...prevHistory, {
              waktu: waktuSekarang,
              jarak: parseFloat(newData.jarak),
              cahaya: parseFloat(newData.cahaya) || 0
            }];
            // Batasi grafik hanya menampilkan 15 titik terakhir agar tidak menumpuk
            return newHistory.slice(-15);
          });
        }

        return newData;
      });
    });

    return () => { client.end(); };
  }, []);

  const getStatusColor = (status: string): string => {
    if (status.includes('AMAN')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500';
    if (status.includes('WASPADA')) return 'bg-amber-500/20 text-amber-400 border-amber-500';
    if (status.includes('SIAGA') || status.includes('BANDANG')) return 'bg-red-500/20 text-red-400 border-red-500 animate-pulse';
    return 'bg-slate-800 text-slate-400 border-slate-600';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      
      {/* BAGIAN HERO / LANDING PAGE */}
      <main className="relative flex flex-col items-center justify-center pt-24 pb-12 px-6 text-center">
        <div className="absolute top-0 w-full h-96 bg-cyan-900/20 blur-[120px] -z-10 rounded-full"></div>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-sm font-medium text-cyan-400 mb-6 shadow-sm">
          <span className="relative flex h-3 w-3">
            {connectionStatus.includes('Terhubung') && <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
            <span className={`relative rounded-full h-3 w-3 ${connectionStatus.includes('Terhubung') ? 'bg-cyan-500' : 'bg-slate-500'}`}></span>
          </span>
          {connectionStatus}
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          Smart Flood <br className="md:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Early Warning System
          </span>
        </h1>
      </main>

      {/* METRIK KARTU */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center">
            <h3 className="text-slate-400 text-xs font-semibold tracking-widest uppercase mb-2">Elevasi Air</h3>
            <div className="text-5xl font-black text-slate-100">{sensorData.jarak} <span className="text-xl text-slate-500">cm</span></div>
          </div>
          
          <div className={`rounded-3xl p-8 border-2 flex flex-col items-center justify-center text-center transition-colors duration-500 ${getStatusColor(sensorData.status)}`}>
            <h3 className="text-xs font-bold tracking-widest uppercase mb-2 opacity-80">Klasifikasi Darurat</h3>
            <span className="text-2xl font-black uppercase">{sensorData.status}</span>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center">
            <h3 className="text-slate-400 text-xs font-semibold tracking-widest uppercase mb-2">Cahaya</h3>
            <div className="text-5xl font-black text-slate-100">{sensorData.cahaya} <span className="text-xl text-slate-500">%</span></div>
          </div>
        </div>
      </section>

      {/* GRAFIK HISTORIS (RECHARTS) */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
          <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            📊 Tren Ketinggian Air (Real-Time)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="waktu" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={[0, 150]} reversed={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Line type="monotone" dataKey="jarak" name="Jarak Air (cm)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} animationDuration={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

    </div>
  );
}