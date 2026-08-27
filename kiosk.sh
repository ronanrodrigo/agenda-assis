#!/bin/bash

# Desativa a proteção de tela e o gerenciamento de energia do monitor
xset s noblank
xset s off
xset -dpms

# Esconde o cursor do mouse se ele ficar parado
unclutter -idle 0.5 -root &

# URL do Google Calendar em modo kiosk
# CALENDAR_URL="https://calendar.google.com/calendar/u/0/embed?src=assis.capim%40gmail.com&ctz=America%2FSao_Paulo&mode=MONTH&showTitle=0&showNav=0&showPrint=0&showTabs=0&showCalendars=0"
CALENDAR_URL="https://ronanrodrigo.dev/agenda-assis"

# Desativa o cache do Chromium para evitar páginas antigas
export CHROMIUM_FLAGS="--disk-cache-dir=/dev/null --media-cache-dir=/dev/null"

# TRAVA DE SEGURANÇA: Espera até ter conexão HTTP com a internet
# (ping sozinho não basta — precisa de DNS + HTTP funcional)
echo "[kiosk] Aguardando conexão com a internet..."
until curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://www.google.com" 2>/dev/null | grep -q "200\|301\|302"; do
    sleep 3
done
echo "[kiosk] Conexão estabelecida."

# Pausa extra para o X server e rede estabilizarem completamente
sleep 20

# Função para abrir o Chromium em modo kiosk
abrir_chrome() {
    chromium-browser \
        --noerrdialogs \
        --disable-infobars \
        --disable-gpu \
        --no-first-run \
        --kiosk \
        "$CALENDAR_URL" &
}

# Abre o Chromium pela primeira vez
abrir_chrome
CHROME_PID=$!
echo "[kiosk] Chromium iniciado (PID: $CHROME_PID)"

# Verifica se a página carregou em 30 segundos — se não, reinicia
sleep 30
if ! xdotool search --onlyvisible --class "chromium-browser" >/dev/null 2>&1; then
    echo "[kiosk] Chromium não encontrado, reiniciando..."
    kill $CHROME_PID 2>/dev/null
    sleep 5
    abrir_chrome
    CHROME_PID=$!
    echo "[kiosk] Chromium reiniciado (PID: $CHROME_PID)"
fi
