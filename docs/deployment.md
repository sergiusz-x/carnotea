# Deployment Guide — uruchomienie CarNotea na świeżym VPS

## Wymagania

| Komponent      | Wersja  | Uwagi                             |
| -------------- | ------- | --------------------------------- |
| Docker         | 24+     | `docker --version`                |
| Docker Compose | v2+     | `docker compose version`          |
| Git            | dowolna | `git --version`                   |
| Domain         | —       | Skonfiguruj rekord A → IP serwera |

## Krok po kroku

### 1. Przygotowanie serwera

```bash
# SSH na VPS
ssh root@twoj-serwer.example.com

# Instalacja Dockera (Debian/Ubuntu)
apt update && apt install -y docker.io docker-compose-v2

# Weryfikacja
docker --version
docker compose version
```

### 2. Pobranie repozytorium

```bash
git clone https://github.com/sergiusz-x/carnotea.git /opt/carnotea
cd /opt/carnotea
```

### 3. Konfiguracja środowiska

```bash
cp .env.example .env
# Edytuj .env — wypełnij rzeczywistymi wartościami produkcyjnymi
nano .env
```

**Wymagane zmienne w `.env`:**

| Zmienna              | Przykład wartości                                      | Opis                                                      |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `POSTGRES_DB`        | `carnotea`                                             | Nazwa bazy danych                                         |
| `POSTGRES_USER`      | `carnotea`                                             | Użytkownik bazy danych                                    |
| `POSTGRES_PASSWORD`  | `<wygenerowane silne hasło>`                           | Hasło do bazy danych                                      |
| `DATABASE_URL`       | `postgresql://carnotea:<haslo>@postgres:5432/carnotea` | Connection string (użyj `postgres` jako hosta, port 5432) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`                              | Sekret dla better-auth                                    |
| `BETTER_AUTH_URL`    | `https://twoj-serwer.example.com/api/auth`             | Publiczny URL auth                                        |
| `DOMAIN`             | `twoj-serwer.example.com`                              | Domena dla certyfikatów TLS                               |

> **Uwaga:** W `DATABASE_URL` jako hosta używamy `postgres` (nazwa serwisu w Docker Compose), a port to `5432` (wewnętrzny port PostgreSQL w kontenerze).

### 4. Budowa i uruchomienie

```bash
# Budowa obrazów
docker compose -f docker-compose.prod.yml build

# Uruchomienie całego stacka
docker compose -f docker-compose.prod.yml --env-file .env up -d

# Sprawdzenie statusu
docker compose -f docker-compose.prod.yml ps
```

### 5. Weryfikacja

```bash
# Sprawdź logi
docker compose -f docker-compose.prod.yml logs -f

# Health check API
curl https://twoj-serwer.example.com/healthz
curl https://twoj-serwer.example.com/readyz

# Otwórz przeglądarkę — https://twoj-serwer.example.com
```

## Struktura stacka

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Caddy      │────▶│   web (80)   │     │  postgres    │
│ :80/:443     │     │  nginx:S     │     │  :5432       │
│ auto TLS     │     └──────────────┘     └──────────────┘
│              │────▶│   api (3001)  │◀───│              │
└──────────────┘     └──────────────┘     └──────────────┘
```

- **Caddy** — reverse proxy z automatycznym TLS (Let's Encrypt).
- **web** — statyczne pliki SPA serwowane przez nginx.
- **api** — NestJS/Fastify API (port 3001, wewnętrzny).
- **postgres** — baza danych PostgreSQL 16.

Tylko Caddy wystawia porty na hoście (80/443). Pozostałe serwisy są dostępne tylko przez wewnętrzną sieć Dockera.

## Przydatne komendy

```bash
# Zatrzymanie
docker compose -f docker-compose.prod.yml down

# Zatrzymanie + usunięcie woluminów (← tracisz dane!)
docker compose -f docker-compose.prod.yml down -v

# Podgląd logów konkretnego serwisu
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f caddy

# Restart serwisu
docker compose -f docker-compose.prod.yml restart api

# Przebudowa po zmianach w kodzie
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d
```

## Aktualizacja

```bash
cd /opt/carnotea
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

> **Uwaga:** Migracje bazy danych (np. po dodaniu nowej tabeli) są wykonywane osobno — zobacz T-046 / CI/CD pipeline. Po wdrożeniu nowej wersji API uruchom migracje ręcznie lub przez skrypt deployowy.

## Rozwiązywanie problemów

| Problem                           | Przyczyna                                | Rozwiązanie                                                                         |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Certyfikat TLS nie został wydany  | Domena nie wskazuje na IP serwera        | Sprawdź rekord A w DNS, odczekaj na propagację, sprawdź `docker compose logs caddy` |
| API nie odpowiada (503)           | Baza danych niegotowa                    | Sprawdź `docker compose logs postgres`, odczekaj na healthcheck                     |
| `readyz` zwraca 503               | Brak połączenia z bazą                   | Sprawdź `DATABASE_URL` w `.env`, czy host to `postgres`                             |
| Błąd `ECONNREFUSED` przy buildzie | Brak pliku `.env` z wymaganymi zmiennymi | Skopiuj `.env.example` → `.env` i wypełnij wartości                                 |

## Zmienne środowiskowe (podsumowanie)

### Wymagane w `.env`

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `DOMAIN`

### Opcjonalne (z wartościami domyślnymi)

- `VITE_API_URL` (domyślnie `/api`)
- `API_PORT` (domyślnie `3001`)
- `API_HOST` (domyślnie `0.0.0.0`)
