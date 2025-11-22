# VS Code Development Guide

This guide provides step-by-step instructions to set up, build, run, and test the Data Quality Checker application using Visual Studio Code.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [VS Code Setup](#vs-code-setup)
3. [Project Setup](#project-setup)
4. [Running the Application](#running-the-application)
5. [Debugging](#debugging)
6. [Testing](#testing)
7. [Common Issues](#common-issues)

---

## Prerequisites

### Required Software

1. **Node.js** (v20 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Required for PostgreSQL and Redis databases

3. **Visual Studio Code**
   - Download from: https://code.visualstudio.com/

4. **Git**
   - Download from: https://git-scm.com/

### Recommended VS Code Extensions

Open VS Code and install these extensions (Ctrl+Shift+X):

| Extension | ID | Purpose |
|-----------|-----|---------|
| ESLint | dbaeumer.vscode-eslint | JavaScript/TypeScript linting |
| Prettier | esbenp.prettier-vscode | Code formatting |
| Prisma | Prisma.prisma | Database schema syntax |
| TypeScript | ms-vscode.vscode-typescript-next | TypeScript support |
| Tailwind CSS IntelliSense | bradlc.vscode-tailwindcss | Tailwind autocomplete |
| REST Client | humao.rest-client | API testing |
| Docker | ms-azuretools.vscode-docker | Docker integration |
| Thunder Client | rangav.vscode-thunder-client | API testing GUI |
| GitLens | eamodio.gitlens | Git integration |

**Quick Install Command:**
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Prisma.prisma
code --install-extension bradlc.vscode-tailwindcss
code --install-extension humao.rest-client
code --install-extension ms-azuretools.vscode-docker
code --install-extension rangav.vscode-thunder-client
```

---

## VS Code Setup

### 1. Open the Project

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd AgentcDiscrepancytool

# Open in VS Code
code .
```

### 2. Workspace Settings

The project includes VS Code workspace settings in `.vscode/` folder. These configure:
- Editor formatting
- TypeScript settings
- Debug configurations
- Task runners

---

## Project Setup

### Step 1: Start Database Services

Open the integrated terminal in VS Code (Ctrl+`) and run:

```bash
# Start PostgreSQL and Redis containers
docker-compose -f docker-compose.dev.yml up -d
```

Verify containers are running:
```bash
docker ps
```

You should see:
- `dq_postgres_dev` - PostgreSQL database (port 5432)
- `dq_redis_dev` - Redis cache (port 6379)

### Step 2: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with default users
npm run seed
```

### Step 3: Setup Frontend

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

---

## Running the Application

### Option 1: Using VS Code Tasks (Recommended)

1. Press `Ctrl+Shift+P` to open Command Palette
2. Type "Tasks: Run Task"
3. Select one of:
   - **Start Backend** - Runs backend in development mode
   - **Start Frontend** - Runs frontend in development mode
   - **Start All** - Runs both backend and frontend

### Option 2: Using Integrated Terminal

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs at: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:3000

### Option 3: Using VS Code Debug Panel

1. Open the Run and Debug panel (Ctrl+Shift+D)
2. Select a configuration from dropdown:
   - **Debug Backend** - Debug backend with breakpoints
   - **Debug Frontend** - Debug frontend in Chrome
   - **Full Stack** - Debug both simultaneously

### Accessing the Application

Once running, open your browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

**Default Login Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dataqualitychecker.com | Admin@123 |
| User | user@dataqualitychecker.com | User@123 |

---

## Debugging

### Backend Debugging

1. Set breakpoints in any `.ts` file in `backend/src/`
2. Open Run and Debug (Ctrl+Shift+D)
3. Select "Debug Backend" configuration
4. Press F5 to start debugging

**Debug Features:**
- Breakpoints (click line number gutter)
- Watch expressions
- Call stack inspection
- Variable inspection

### Frontend Debugging

1. Set breakpoints in any `.tsx` file in `frontend/src/`
2. Select "Debug Frontend" configuration
3. Press F5 to start debugging (opens Chrome)

### API Testing with REST Client

Create a file `test.http` in the project root:

```http
### Health Check
GET http://localhost:3001/health

### Login
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@dataqualitychecker.com",
  "password": "Admin@123"
}

### Get Profile (replace YOUR_TOKEN)
GET http://localhost:3001/api/auth/profile
Authorization: Bearer YOUR_TOKEN

### Get Data Sources
GET http://localhost:3001/api/datasources
Authorization: Bearer YOUR_TOKEN

### Create Data Source
POST http://localhost:3001/api/datasources
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Test PostgreSQL",
  "type": "POSTGRESQL",
  "host": "localhost",
  "port": 5432,
  "database": "testdb",
  "username": "postgres",
  "password": "postgres"
}

### Get Rules
GET http://localhost:3001/api/rules
Authorization: Bearer YOUR_TOKEN

### Get Dashboard Stats
GET http://localhost:3001/api/dashboard/stats
Authorization: Bearer YOUR_TOKEN
```

Click "Send Request" above each request to execute.

---

## Testing

### Running Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Running Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Database Management

**Prisma Studio** - Visual database browser:
```bash
cd backend
npx prisma studio
```
Opens at http://localhost:5555

**Reset Database:**
```bash
cd backend
npx prisma migrate reset
npm run seed
```

**Create New Migration:**
```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

---

## Common Issues

### Issue: Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find process using port
lsof -i :3001  # or :3000, :5432, :6379

# Kill the process
kill -9 <PID>
```

Or change the port in `.env` file.

### Issue: Database Connection Failed

**Error:** `Can't reach database server`

**Solution:**
1. Ensure Docker containers are running:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```
2. Check DATABASE_URL in `backend/.env`
3. Verify PostgreSQL is accessible:
   ```bash
   docker logs dq_postgres_dev
   ```

### Issue: Prisma Client Not Generated

**Error:** `PrismaClientInitializationError`

**Solution:**
```bash
cd backend
npx prisma generate
```

### Issue: Frontend Proxy Error

**Error:** `Proxy error: Could not proxy request`

**Solution:**
1. Ensure backend is running on port 3001
2. Check `frontend/vite.config.ts` proxy settings

### Issue: TypeScript Errors

**Solution:**
```bash
# Rebuild TypeScript
cd backend
npm run build

# Or restart VS Code TypeScript server
# Ctrl+Shift+P -> "TypeScript: Restart TS Server"
```

### Issue: Node Modules Issues

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Useful VS Code Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+` | Open integrated terminal |
| Ctrl+Shift+P | Command palette |
| Ctrl+Shift+D | Debug panel |
| Ctrl+Shift+E | Explorer panel |
| Ctrl+Shift+F | Search across files |
| Ctrl+P | Quick file open |
| F5 | Start debugging |
| F9 | Toggle breakpoint |
| F10 | Step over |
| F11 | Step into |
| Shift+F11 | Step out |
| Ctrl+Shift+B | Run build task |

---

## Project Scripts Reference

### Backend Scripts (`backend/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| dev | `npm run dev` | Start development server with hot reload |
| build | `npm run build` | Compile TypeScript to JavaScript |
| start | `npm start` | Run compiled production build |
| migrate | `npm run migrate` | Run Prisma migrations |
| generate | `npm run generate` | Generate Prisma client |
| seed | `npm run seed` | Seed database with default data |

### Frontend Scripts (`frontend/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| dev | `npm run dev` | Start Vite development server |
| build | `npm run build` | Build for production |
| preview | `npm run preview` | Preview production build |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/data_quality_db?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key!

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Next Steps

1. **Explore the API**: Use Thunder Client or REST Client to test endpoints
2. **Add Data Sources**: Configure your database connections
3. **Create Rules**: Write SQL queries to detect data discrepancies
4. **Schedule Jobs**: Set up automated rule execution
5. **Monitor Dashboard**: View execution trends and discrepancies

For more information, see the main [README.md](./README.md).
