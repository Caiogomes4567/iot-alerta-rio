# 🌊 Sistema IoT de Monitoramento de Alagamento

Sistema completo de detecção e alerta de alagamento em tempo real.

## 📦 Estrutura

- **`monitor-alagamento/`** — Web app Next.js (dashboard + API + Web Push)
- **`dashboard.js`** — Servidor Node.js simples (versão inicial)
- **`test-server.js`** — Servidor de teste
- **`código_para_arduinoIDE.txt`** — Firmware ESP32

## 🛠 Stack

- **Hardware:** ESP32 + HC-SR04 + LEDs + Buzzers
- **Backend:** Next.js + TypeScript
- **Frontend:** React + Tailwind CSS
- **Notificações:** Web Push API
- **Deploy:** Vercel

## ✨ Funcionalidades

- Alarme local independente da nuvem
- Dashboard em tempo real (SSE)
- Gráfico de histórico
- Timeline de eventos
- Notificações push no navegador
- API REST para telemetria

## 🚀 Como rodar

```bash
cd monitor-alagamento
npm install
npm run dev
