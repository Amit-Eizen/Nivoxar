# Nivoxar API Integration Guide

## Backend Setup Complete ✅

The .NET backend is now running and ready to accept requests!

### Backend Server
- **URL**: http://localhost:5000
- **Status**: Running in background
- **Database**: NivoxarDB on SQL Server Express

---

## API Endpoints

### Authentication
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login user

### Tasks
- **GET** `/api/tasks` - Get all tasks
- **GET** `/api/tasks/{id}` - Get single task
- **POST** `/api/tasks` - Create task
- **PUT** `/api/tasks/{id}` - Update task
- **DELETE** `/api/tasks/{id}` - Delete task
- **POST** `/api/tasks/{taskId}/subtasks` - Add subtask
- **PUT** `/api/tasks/{taskId}/subtasks/{subTaskId}` - Update subtask
- **DELETE** `/api/tasks/{taskId}/subtasks/{subTaskId}` - Delete subtask

### Categories
- **GET** `/api/categories` - Get all categories
- **GET** `/api/categories/{id}` - Get single category
- **POST** `/api/categories` - Create category
- **PUT** `/api/categories/{id}` - Update category
- **DELETE** `/api/categories/{id}` - Delete category

### Shared Tasks
- **GET** `/api/sharedtasks` - Get all shared tasks
- **GET** `/api/sharedtasks/task/{taskId}` - Get shared task by task ID
- **POST** `/api/sharedtasks/share` - Share a task
- **POST** `/api/sharedtasks/{sharedTaskId}/participants` - Add participants
- **DELETE** `/api/sharedtasks/{sharedTaskId}/participants/{userId}` - Remove participant
- **DELETE** `/api/sharedtasks/task/{taskId}` - Unshare task
- **PUT** `/api/sharedtasks/{sharedTaskId}/lastedited` - Update last edited

### Notifications
- **GET** `/api/notifications` - Get all notifications
- **GET** `/api/notifications/unread/count` - Get unread count
- **GET** `/api/notifications/{id}` - Get single notification
- **PUT** `/api/notifications/{id}/read` - Mark as read
- **PUT** `/api/notifications/mark-all-read` - Mark all as read
- **DELETE** `/api/notifications/{id}` - Delete notification
- **DELETE** `/api/notifications/clear-all` - Clear all notifications

### Analytics
- **GET** `/api/analytics/overview` - Get overview analytics
- **GET** `/api/analytics/productivity?days={days}` - Get productivity stats
- **GET** `/api/analytics/categories` - Get category stats
- **GET** `/api/analytics/trends?months={months}` - Get trends
- **GET** `/api/analytics/recurring` - Get recurring tasks stats
- **GET** `/api/analytics/shared` - Get shared tasks stats

---

## Frontend Services Updated ✅

### Services Now Using Backend API:

1. **AuthService.js** ✅
   - Login/Register now call backend
   - JWT token stored in localStorage
   - Automatic authentication header on all requests

2. **TasksService.js** ✅ (NEW)
   - Complete CRUD for tasks
   - SubTask management
   - Toggle completion

3. **CategoryService.js** ✅
   - API mode enabled
   - Auto-switches between localStorage/API
   - Full CRUD operations

4. **NotificationsService.js** ✅
   - All notification operations via API
   - Backend creates notifications automatically

5. **AnalyticsService.js** ✅ (NEW)
   - Complete analytics from backend
   - Productivity, trends, category stats

6. **SharedTasksService.js** ✅
   - All shared task operations via API
   - Share, unshare, add/remove participants
   - Backend creates notifications automatically

---

## Testing the Integration

### 1. Test Registration
```javascript
// Open browser console on http://127.0.0.1:5501
import { register } from './services/AuthService.js';
const result = await register({
    name: 'Test User',
    email: 'test@example.com',
    password: '1234'
});
console.log(result);
```

### 2. Test Login
```javascript
import { login } from './services/AuthService.js';
const result = await login('test@example.com', '1234');
console.log(result);
```

### 3. Test Creating Task
```javascript
import { createTask } from './services/TasksService.js';
const task = await createTask({
    title: 'Test Task',
    description: 'This is a test',
    priority: 1,
    dueDate: new Date().toISOString()
});
console.log(task);
```

### 4. Test Categories
```javascript
import { getAllCategories, createCategory } from './services/CategoryService.js';
const categories = await getAllCategories();
console.log(categories);

const newCat = await createCategory({
    name: 'My Category',
    color: '#ff0000'
});
console.log(newCat);
```

---

## Important Notes

### CORS Configuration
The backend is configured to accept requests from:
- http://127.0.0.1:5501
- http://localhost:5501

If you run the frontend on a different port, update `Program.cs`:
```csharp
policy.WithOrigins("http://127.0.0.1:YOUR_PORT", "http://localhost:YOUR_PORT")
```

### Authentication Flow
1. User logs in/registers → receives JWT token
2. Token stored in localStorage as `nivoxar_auth_token`
3. All API requests include: `Authorization: Bearer {token}`
4. Token valid for 24 hours

### Category Service Special Note
CategoryService has a toggle between API and localStorage:
- Currently: `CONFIG.useAPI = true` (using backend)
- To switch back to localStorage: Call `disableAPIMode()`
- To enable API: Call `enableAPIMode()`

---

## Next Steps

### 1. Update Existing Code
Some files still use localStorage directly. Need to update:
- `TaskManager.js` - Use TasksService instead of TaskUtils
- `DashboardPage.js` - Load tasks from API on init
- Any direct localStorage calls

### 2. Update SharedTasksService ✅
SharedTasksService.js has been updated to use the backend API!

### 3. Handle Errors
Add proper error handling UI:
- Show error messages to user
- Handle 401 (Unauthorized) → redirect to login
- Handle network errors

### 4. Loading States
Add loading indicators while fetching data from API.

---

## Troubleshooting

### Backend Not Running
```bash
cd C:\Users\amite\Documents\GitHub\Nivoxar
dotnet run
```

### CORS Errors
Check that frontend URL matches CORS config in `Program.cs`

### 401 Unauthorized
- Token expired (24h validity)
- User not logged in
- Token missing from request

### Connection Refused
- Backend not running
- Check port 5000 is available
- Firewall blocking connection

---

## Database

### Connection String
```
Server=עמיתPC\SQLEXPRESS;Database=NivoxarDB;Trusted_Connection=True;TrustServerCertificate=True
```

### Tables Created
- AspNetUsers (+ Identity tables)
- Tasks
- Categories
- SubTasks
- SharedTasks
- SharedTaskParticipants
- Friends
- Notifications

### Reset Database
```bash
dotnet ef database drop --force
dotnet ef database update
```

---

## Success! 🎉

Your Nivoxar application now has:
- ✅ Complete .NET Backend API
- ✅ SQL Server Database
- ✅ JWT Authentication
- ✅ Updated Frontend Services
- ✅ Ready for Integration Testing
