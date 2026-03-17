# Ukespeil

Ukespeil er et internt verktøy for å sammenligne ukesplan mot faktisk tidsbruk.

## Kom i gang

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sett følgende variabler i `.env.local`:

- `DATABASE_URL`
- `API_SECRET`
- `VITE_API_SECRET`

## UI-oppgradering (mars 2026)

Denne iterasjonen oppdaterer kun visuell stil:

- mykere bakgrunn med subtile gradienter
- friskere kortdesign med glassmorphism-inspirert uttrykk
- mer tydelig typografi og bedre visuell hierarki
- oppdaterte knapper, badges og feedback-stater

Ingen funksjonell logikk er endret, inkludert slider-flyt og innsending.

## Kodehygiene

- Felles stil er holdt i Tailwind-klasser og `src/index.css`
- Ingen API-kontrakter eller datamodeller ble endret
- Endringene er begrenset til presentasjonslag
