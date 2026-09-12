# Study Karnataka — Monorepo Foundation & Design System

Production-oriented monorepo for the **Study Karnataka** competitive-exam preparation platform powering KPSC, KAS, PSI, FDA, SDA, and state competitive exam preparation.

---

## 🎨 Frozen Design System & Tokens

Primary Red (`#EF2323`), Dark Red (`#D91E24`), Warm Orange (`#F59E0B`), Page Background (`#F7F8FC`), and Soft Supporting Colors (`#FDECEC`, `#FFF5E6`, `#ECFDF5`, `#F5EEFF`).

```
Control Radius : 10px
Card Radius    : 16px
Panel Radius   : 20px
Pill Radius    : 9999px
```

---

## 🏗️ Architecture Overview

The repository is structured as a `pnpm` workspace containing 5 applications and 5 shared packages:

```
├── apps/
│   ├── admin-web/     # Administration Panel Shell (React + Vite + TS)
│   ├── api/           # Express API Server (Node.js + Express + TS)
│   ├── mobile/        # Native App Shell (React Native + Expo + TS)
│   ├── public-web/    # Public Landing Page Shell (React + Vite + TS)
│   └── student-web/   # Student Portal Shell (React + Vite + TS)
│
├── packages/
│   ├── config/        # Design Tokens, TSConfig & Tooling Configs
│   ├── database/      # PostgreSQL Schema, Prisma ORM, Versioned Migrations & Seeds
│   ├── shared-types/  # Core TypeScript Types, Enums & Interfaces
│   ├── ui/            # 27+ Reusable Shared React UI Components
│   └── validation/    # Zod Schemas, Indian Mobile Regex & Language Rules
```

---

## 🚀 Quick Start & Local Development

### Prerequisites

- **Node.js**: `>= 18.0.0`
- **pnpm**: `>= 11.0.0` (`npm install -g pnpm`)
- **PostgreSQL**: Local or remote database instance running on port `5432`

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Versioned Migration & Seeding

Normal local development and production deployments use versioned Prisma migrations:

```bash
# Run local development migration
pnpm db:migrate:dev

# Deploy pending migrations in staging/production
pnpm db:migrate:deploy

# Seed initial system roles
pnpm db:seed
```

### 4. Workspace Verification Commands

```bash
pnpm lint            # Runs ESLint across workspace
pnpm typecheck       # Runs strict TypeScript checks
pnpm test            # Executes Vitest test suite
pnpm build           # Builds all shared packages and web apps
pnpm format          # Formats codebase with Prettier
```

---

## 📑 Checkpoint Document

- Checkpoint Report: [docs/checkpoints/prompt-01-foundation-and-design-system.md](file:///Users/kanishk/LGM%20SK/docs/checkpoints/prompt-01-foundation-and-design-system.md)
