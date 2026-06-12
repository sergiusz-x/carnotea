# Carnotea - Vehicle Diary Database

A PostgreSQL database project for tracking vehicle history (mileages, fuel logs, service records, expenses, and issues).
Developed as a final project for the Advanced Databases university course.

## How to Run

Start the local database via Docker:

```bash
docker compose up -d
```

**Connection String:**
```text
postgresql://carnotea:carnotea_dev_password@localhost:5433/carnotea
```

Stop the database and remove volumes:
```bash
docker compose down -v
```

## Project Structure

- `sql/` - Modular SQL files (schema, tables, functions, triggers, etc.)
- `tests/` - Audit scripts verifying constraints and university requirements.
- `scripts/build-final-sql.ps1` - PowerShell script to merge all modular files into a single submission file.
- `dist/` - Generated final SQL file ready for submission.

## Generating the Final Submission

To generate the single `.sql` file required for the assignment, run:

```powershell
.\scripts\build-final-sql.ps1
```
The unified output file will be created in the `dist/` directory.
