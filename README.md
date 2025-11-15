# Nivoxar - Task Management System

A modern, full-stack task management application with sharing capabilities, analytics, and real-time collaboration.

---

## 🚀 Quick Start

### **Option 1: Automatic Start (Recommended)**

Simply double-click:
```
start.bat
```

This will:
- ✅ Start the .NET Backend API
- ✅ Start the Frontend SPA Server
- ✅ Open the app in your browser automatically

**To stop all servers:**
```
stop.bat
```

---

### **Option 2: Manual Start**

**Backend:**
```bash
dotnet run
```
→ Runs on http://localhost:5000/api

**Frontend:**
```bash
npx serve -s . -p 5501
```
→ Runs on http://127.0.0.1:5501

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** Vanilla JavaScript (ES6 Modules)
- **Architecture:** SPA with History API
- **Router:** Custom router ([scripts/core/Router.js](scripts/core/Router.js))
- **Styling:** Pure CSS

### Backend
- **Framework:** ASP.NET Core 9 Web API
- **Language:** C#
- **Database:** SQL Server Express
- **ORM:** Entity Framework Core 9.0.10
- **Authentication:** JWT + ASP.NET Core Identity

---

## ✨ Features

- ✅ **Task Management** - Create, edit, delete tasks with priorities and due dates
- ✅ **Subtasks** - Break down complex tasks
- ✅ **Categories** - Custom categories with colors
- ✅ **Recurring Tasks** - Set up repeating tasks
- ✅ **Task Sharing** - Collaborate with other users
- ✅ **Notifications** - Real-time updates on shared tasks
- ✅ **Analytics** - Productivity insights and trends
- ✅ **Calendar View** - Visual task timeline
- ✅ **User Profiles** - Manage personal information

---

## 📁 Project Structure

```
Nivoxar/
├── start.bat                    # 🚀 Quick start script
├── stop.bat                     # ⏹️ Stop all servers
├── index.html                   # SPA entry point
│
├── scripts/                     # Frontend JavaScript
│   ├── app.js                  # Application entry
│   ├── core/Router.js          # SPA routing
│   └── managers/               # Business logic
│
├── views/                       # Page components
│   ├── DashboardPage.js
│   ├── CalendarPage.js
│   ├── AnalyticsPage.js
│   └── ...
│
├── services/                    # API communication
│   ├── AuthService.js
│   ├── TasksService.js
│   ├── CategoryService.js
│   └── ...
│
├── controllers/                 # Backend API
│   ├── AuthController.cs
│   ├── TasksController.cs
│   └── ...
│
├── models/entities/             # Database models
│   ├── User.cs
│   ├── TaskEntity.cs
│   └── ...
│
└── data/
    └── NivoxarDbContext.cs     # EF Core context
```

---

## 🗄️ Database

**Connection String:**
```
Server=YourLocalHost;Database=DbName;Trusted_Connection=True;TrustServerCertificate=True
```

**Migrations:**
```bash
# Create new migration
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update

# Drop database (⚠️ Warning: deletes all data)
dotnet ef database drop --force
```

---

## 🔐 Authentication

- JWT tokens with 24-hour validity
- Automatic token refresh on page reload
- Protected routes via middleware
- Password hashing with ASP.NET Core Identity

---

## 📡 API Endpoints

See [API_INTEGRATION.md](API_INTEGRATION.md) for complete API documentation.

**Base URL:** `http://localhost:5000/api`

### Key Endpoints:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `GET /api/analytics/overview` - Get analytics

---

## 🎨 UI/UX

- **Design:** Minimalist, modern interface
- **Navbar:** Icon-only navigation
- **Responsive:** Mobile-friendly
- **Loading States:** Global and local indicators
- **Error Handling:** User-friendly error messages

---

## 🔧 Development

### Prerequisites
- .NET 9 SDK
- Node.js (for frontend server)
- SQL Server Express

### First Time Setup
1. Clone the repository
2. Update connection string in `appsettings.json`
3. Run migrations: `dotnet ef database update`
4. Add JWT key to `appsettings.json`:
   ```json
   {
     "Jwt": {
       "Key": "your-super-secret-key-at-least-32-characters-long!"
     }
   }
   ```
5. Run `start.bat`

---

## 📝 Notes

- Frontend uses **History API** for SPA routing
- The `serve -s` flag ensures proper SPA fallback
- All API requests include JWT token in Authorization header
- CORS configured for `http://127.0.0.1:5501` and `http://localhost:5501`

---

## 🐛 Troubleshooting

**Port already in use:**
- Check if previous instances are running
- Run `stop.bat` to kill all servers
- Manually kill processes on ports 5000 and 5501

**Database connection failed:**
- Verify SQL Server Express is running
- Check connection string in `appsettings.json`
- Ensure Windows Authentication is enabled

**404 on page refresh:**
- Make sure you're using `serve -s` (SPA mode)
- Don't use `http-server` - it doesn't support SPA routing

---

## 📄 License

MIT License - feel free to use this project however you like!

---

**Built with ❤️ using .NET and Vanilla JavaScript**
