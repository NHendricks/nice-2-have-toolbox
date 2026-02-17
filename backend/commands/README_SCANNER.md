# Scanner Command - Setup Guide

## Übersicht

Der Scanner Command unterstützt mehrere Scan-Methoden:

### Windows

- **WIA (Windows Image Acquisition)** - Integriert, keine Installation erforderlich

### macOS & Linux

- **SANE (scanimage)** - Muss installiert werden

---

## Installation

### Windows - Standard (WIA)

Die Grundfunktionalität funktioniert ohne zusätzliche Installation:

1. **Scanner anschließen** und einschalten
2. **Treiber installieren** vom Hersteller (wichtig!)
3. **Scanner testen** in "Windows Fax and Scan" App

**Fehlerbehebung bei WIA:**

- Stelle sicher, dass der Scanner in Windows erkannt wird
- Prüfe den Geräte-Manager für Scanner-Einträge
- Starte den WIA-Dienst neu: `services.msc` → "Windows Image Acquisition (WIA)"

### macOS

SANE installieren mit Homebrew:

```bash
brew install sane-backends
```

Scanner testen:

```bash
scanimage -L
```

### Linux (Ubuntu/Debian)

SANE installieren:

```bash
sudo apt-get update
sudo apt-get install sane sane-utils
```

Scanner testen:

```bash
scanimage -L
```

Für bestimmte Scanner zusätzliche Pakete installieren:

```bash
# Für HP Scanner
sudo apt-get install hplip

# Für Epson Scanner
sudo apt-get install iscan
```

---

## Verwendung

### In der DocManager UI

1. **Scanner prüfen**: Die App zeigt automatisch verfügbare Scanner an
2. **Einstellungen wählen**: Resolution, Farbmodus, Format
3. **Scan starten**: Button "Start Scan" klicken

### Via Command Line (für Tests)

```bash
# Scanner auflisten
node dist/cli.js scanner '{"action":"list-scanners"}'

# Dokument scannen
node dist/cli.js scanner '{"action":"scan","resolution":"300","colorMode":"color","format":"pdf"}'

# Gescannte Dokumente auflisten
node dist/cli.js scanner '{"action":"list-documents"}'
```

---

## Scan-Methoden im Detail

### 1. WIA (Windows)

**Vorteile:**

- Keine Installation nötig
- Funktioniert mit den meisten Windows-Scannern
- Standard Windows-Integration

**Verwendete Technologie:** PowerShell + COM-Objekte

### 2. SANE (macOS/Linux)

**Vorteile:**

- Standard auf Unix-Systemen
- Unterstützt viele Scanner
- Sehr stabil

**Nachteile:**

- Muss separat installiert werden
- Scanner-Unterstützung variiert

---

## Troubleshooting

### Problem: "No scanners found"

**Windows:**

1. Überprüfe Scanner-Verbindung (USB/Netzwerk)
2. Installiere aktuelle Treiber vom Hersteller
3. Teste in "Windows Fax and Scan"
4. Prüfe Geräte-Manager für gelbe Warnungen
5. Starte Scanner und Computer neu

**macOS/Linux:**

```bash
# Scanner suchen
scanimage -L

# Falls leer, SANE neu installieren
brew reinstall sane-backends  # macOS
sudo apt-get install --reinstall sane  # Linux
```

### Problem: "Scan failed" oder Timeout

1. **Scanner aufwärmen lassen** (manche brauchen 30-60 Sekunden)
2. **Scanner-Abdeckung schließen**
3. **Papier einlegen** (bei Dokumentenscannern)
4. **Timeout erhöhen** (bereits auf 2 Minuten gesetzt)
5. **WIA-Dienst neustarten** (Windows)

### Problem: Scans sind leer oder schwarz

1. **Scanner-Abdeckung öffnen** und wieder schließen
2. **Scanner kalibrieren** (siehe Handbuch)
3. **Andere Auflösung testen** (300 DPI statt 600 DPI)
4. **Farbmodus ändern** (Color → Grayscale)

---

## Unterstützte Scanner

### WIA-kompatible Scanner (Windows)

- Die meisten modernen Scanner mit Windows-Treibern
- HP, Canon, Epson, Brother, Samsung, usw.

### SANE-kompatible Scanner (macOS/Linux)

- Liste: http://www.sane-project.org/sane-backends.html
- HP Scanner (sehr gute Unterstützung)
- Epson Scanner (gute Unterstützung)
- Canon Scanner (teilweise Unterstützung)

---

## Scan-Ordner

Standard-Speicherort für Scans:

- **Windows:** `C:\Users\<username>\Documents\Scans`
- **macOS:** `/Users/<username>/Documents/Scans`
- **Linux:** `/home/<username>/Documents/Scans`

Der Ordner wird automatisch erstellt beim ersten Scan.

---

## Entwickler-Hinweise

### Scanner-Command erweitern

Die Scan-Methoden sind in `scanner-command.ts` implementiert:

```typescript
// WIA-Methode (Windows)
private async scanWindowsWIA(...)

// SANE-Methode (Unix)
private async scanUnixSANE(...)
```

### Neue Scan-Optionen hinzufügen

Parameter in `getParameters()` erweitern:

```typescript
{
  name: 'duplex',
  type: 'boolean',
  description: 'Duplex scanning (both sides)',
  required: false,
  default: false,
}
```

---

## FAQ

**Q: Warum startet der Scan nicht?**
A: Prüfe zuerst, ob der Scanner in der Liste erscheint. Wenn nicht, ist das ein Treiber-/Verbindungsproblem.

**Q: Kann ich mehrere Seiten auf einmal scannen?**
A: Ja, wenn dein Scanner einen Automatic Document Feeder (ADF) hat. Der Scanner scannt automatisch alle eingelegten Seiten.

**Q: Welche Format ist am besten?**
A: **PDF** für Dokumente, **PNG** für Screenshots, **JPG** für Fotos (kleinere Dateigröße).

**Q: Funktioniert Netzwerk-Scanning?**
A: Ja, wenn der Scanner WIA/TWAIN über Netzwerk unterstützt und entsprechend konfiguriert ist.

---

## Support

Bei Problemen:

1. Prüfe diese README
2. Teste Scanner mit System-Tools (Windows Fax and Scan, scanimage)
3. Überprüfe Log-Ausgabe in der Console
4. Erstelle ein Issue auf GitHub mit:
   - Betriebssystem & Version
   - Scanner-Modell
   - Fehlermeldung
   - Log-Ausgabe

---

## Lizenz

MIT License - siehe LICENSE-Datei im Projekt-Root
