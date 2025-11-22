# Data Quality Checker - System Discrepancy Tool

A comprehensive SaaS application for monitoring data quality and detecting discrepancies across multiple data sources including AWS Athena, PostgreSQL, and MySQL.

## Features

- **User Authentication & Roles**: Secure JWT-based authentication with role-based access control (Admin, User, Viewer)
- **Multiple Data Sources**: Configure and manage connections to PostgreSQL, MySQL, AWS Athena, SQL Server, and Oracle
- **Data Quality Rules**: Create SQL-based rules to detect data discrepancies
- **Scheduled Execution**: Cron-based scheduling for automated rule execution
- **Reports & Dashboard**: Visual dashboard with execution trends, discrepancy summaries, and exportable reports
- **Real-time Monitoring**: Track rule executions and view results in real-time

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- Prisma ORM with PostgreSQL
- JWT Authentication
- Node-cron for scheduling
- AWS SDK for Athena integration

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Recharts for visualizations
- React Router v6
- Zustand for state management

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)

### Running with Docker

1. Clone the repository:
```bash
git clone <repository-url>
cd AgentcDiscrepancytool
```

2. Start all services:
```bash
docker-compose up -d
```

3. Run database migrations:
```bash
docker-compose exec backend npx prisma migrate deploy
```

4. Seed the database:
```bash
docker-compose exec backend npm run seed
```

5. Access the application at http://localhost

### Default Credentials
- **Admin**: admin@dataqualitychecker.com / Admin@123
- **User**: user@dataqualitychecker.com / User@123

### Local Development

1. Start development databases:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. Setup backend:
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

3. Setup frontend:
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
.
├── backend/
│   ├── prisma/          # Database schema and migrations
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utilities
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── store/       # State management
│   │   └── types/       # TypeScript types
│   └── Dockerfile
│
├── docker-compose.yml       # Production compose
└── docker-compose.dev.yml   # Development compose
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Data Sources
- `GET /api/datasources` - List all data sources
- `POST /api/datasources` - Create data source (Admin)
- `GET /api/datasources/:id` - Get data source
- `PUT /api/datasources/:id` - Update data source (Admin)
- `DELETE /api/datasources/:id` - Delete data source (Admin)
- `POST /api/datasources/:id/test` - Test connection (Admin)

### Rules
- `GET /api/rules` - List all rules
- `POST /api/rules` - Create rule
- `GET /api/rules/:id` - Get rule
- `PUT /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule
- `POST /api/rules/:id/execute` - Execute rule
- `GET /api/rules/:id/executions` - Get execution history

### Schedules
- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create schedule
- `GET /api/schedules/:id` - Get schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `POST /api/schedules/:id/toggle` - Toggle active status
- `POST /api/schedules/:id/run` - Run immediately

### Reports
- `GET /api/reports` - List all reports
- `POST /api/reports` - Generate report
- `GET /api/reports/:id` - Get report
- `DELETE /api/reports/:id` - Delete report
- `GET /api/reports/:id/export/csv` - Export as CSV
- `GET /api/reports/:id/export/json` - Export as JSON

### Dashboard
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/recent-executions` - Recent executions
- `GET /api/dashboard/execution-trends` - Execution trends
- `GET /api/dashboard/discrepancy-summary` - Discrepancy summary
- `GET /api/dashboard/upcoming-schedules` - Upcoming schedules

## AWS Athena Configuration

To configure AWS Athena as a data source:

1. Create an S3 bucket for query results
2. Create an IAM user with Athena access
3. Add the data source with:
   - AWS Region
   - AWS Access Key ID
   - AWS Secret Access Key
   - Athena Workgroup
   - S3 Output Location

## License

MIT License
