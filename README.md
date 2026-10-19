# CivicFix — Smart Public Issue Reporting Platform

CivicFix is a full-stack MERN web application that helps citizens report public issues such as potholes, garbage accumulation, damaged streetlights, and water leaks. It provides a centralized platform to track reported issues and monitor their resolution status.

## Features

- **Report Public Issues** — Submit complaints with a title, description, category, and location.
- **Issue Tracking** — Track issue progress from Reported to Assigned, In Progress, and Resolved.
- **User Authentication** — Secure access using JSON Web Tokens (JWT), when configured.
- **REST API** — Backend endpoints for managing issues and application data.
- **Database Persistence** — Store and retrieve issue records using MongoDB.
- **Responsive Interface** — Designed for desktop and mobile screens.
- **Role-Based Access** — Supports separating citizen and staff permissions when implemented and configured.

## Tech Stack

**Frontend**
- React.js
- Vite
- JavaScript
- HTML5
- CSS3

**Backend**
- Node.js
- Express.js
- REST APIs
- JWT authentication

**Database**
- MongoDB
- Mongoose

**Tools**
- Git
- GitHub
- Visual Studio Code
- npm

## Project Structure

```text
CivicFix-MERN/
├── client/              # React frontend
│   ├── src/
│   ├── public/
│   ├── .env.example
│   └── package.json
├── server/              # Express backend
│   ├── models/
│   ├── routes/
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

*Folder and file names may vary slightly depending on your current implementation.*

## Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (included with Node.js)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account or a local MongoDB instance
- Git

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/bharathsoftware/CivicFix-MERN.git
cd CivicFix-MERN
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

Create a `.env` file inside the `server` folder using the provided `.env.example` as a reference. Fill in the actual values for your environment.

Example configuration:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
```

**Important:** Use the exact variable names required by your backend code. Never commit real database credentials, JWT secrets, or `.env` files to GitHub.

### 3. Start the backend

From the `server` folder, run the development command defined in `server/package.json`. If the script is named `dev`, use:

```bash
npm run dev
```

The backend should start on the configured port, commonly `http://localhost:5000`.

### 4. Install frontend dependencies

Open a **second terminal** from the project root:

```bash
cd client
npm install
```

Create the frontend `.env` file if required by your application. Check `client/.env.example` for the expected variable names.

For Vite, frontend environment variables exposed to browser code generally use the `VITE_` prefix. Never put secrets in frontend environment variables.

### 5. Start the frontend

From the `client` folder, run:

```bash
npm run dev
```

Open the local URL displayed by Vite, commonly:

http://localhost:5173

## Application Workflow

1. A citizen opens the CivicFix application.
2. The citizen submits a public issue with relevant details.
3. The backend validates the request and stores data in MongoDB.
4. Users can view available issues and their current status.
5. Authorized staff can update issue status if those permissions and routes are configured.

## Environment Variables

Keep all credentials in local `.env` files or your deployment provider's environment settings.

Typical backend variables include:

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used for signing JWTs |
| `CLIENT_URL` | Frontend origin for CORS configuration |

Refer to the `.env.example` files in the repository for the configuration your implementation expects.

## Testing

Before publishing or deploying the application, verify:

- The frontend starts without build errors.
- The backend starts and connects to MongoDB.
- API endpoints return the expected responses.
- Issues are saved and retrieved correctly.
- Authentication and access control work if enabled.
- The UI works on desktop and mobile screens.

## GitHub Repository

**Repository:** https://github.com/bharathsoftware/CivicFix-MERN

## Future Enhancements

- Interactive map for reported issues
- Photo uploads for public complaints
- Nearby and duplicate issue detection
- Notifications when issue status changes
- Admin dashboard with analytics
- Deployment with a public live demo

## Author

**Bharathkumar**

GitHub: https://github.com/bharathsoftware

---

