# CivicFix — MERN Community Issue Reporting Platform

CivicFix is a full-stack community platform for reporting and tracking local civic issues such as potholes, garbage, broken streetlights, and water leaks.

## Features

- Responsive React + Vite interface
- Register and log in with JWT authentication
- Create civic issue reports
- Browse, search, filter, and sort reports
- View issue details and status
- Report ownership: users can edit/delete their own reports
- Admin role support for updating issue status
- MongoDB persistence with Mongoose
- Input validation, centralized API errors, and password hashing
- Demo seed data endpoint for local development (optional)

> This is a local-development starter. Before production, configure HTTPS, secure secrets, rate limiting, email verification/password reset, moderation, and deployment-specific CORS.

## Requirements

- Node.js 20+ recommended
- MongoDB Atlas account or local MongoDB
- Git (optional)

## 1. Configure the backend

Open a terminal:

```bash
cd server
npm install
```

Copy `.env.example` to `.env`, then fill in your MongoDB connection string and a long random JWT secret.

```env
PORT=5000
MONGODB_URI=mongodb+srv://<db-user>:<db-password>@<cluster-host>/civicfix?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
```

Do not commit `.env` or share database credentials.

Start the API:

```bash
npm run dev
```

You should see `MongoDB connected` and `CivicFix API listening on port 5000`.

## 2. Configure the frontend

Open a second terminal:

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start React:

```bash
npm run dev
```

Open `http://localhost:5173`.

## 3. Create an account

Use the Register link in the website. The first account is a normal user. To grant admin privileges locally, register with the email configured in `ADMIN_EMAIL`; only do this in your own development environment. For a production deployment, role assignment must be managed securely by an administrator, not by public self-registration.

## API routes

### Authentication
- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` — authenticated current user

### Issues
- `GET /api/issues` — public list; supports `search`, `category`, `status`, `sort`
- `GET /api/issues/:id` — public issue details
- `POST /api/issues` — authenticated create; `{ title, category, location, description, priority }`
- `PATCH /api/issues/:id` — owner can edit own report; admin can update status
- `DELETE /api/issues/:id` — owner or admin

### Health
- `GET /api/health`

## Suggested production upgrades

1. Email verification and password reset
2. Image upload to Cloudinary/S3 with file validation
3. Rate limiting and abuse reporting
4. Audit logs and admin moderation dashboard
5. Automated tests and CI
6. Deploy frontend and API separately; set environment variables on the host
