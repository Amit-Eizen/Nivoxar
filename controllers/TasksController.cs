using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nivoxar.Data;
using Nivoxar.Models.Entities;

namespace Nivoxar.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly NivoxarDbContext _context;
        private readonly UserManager<User> _userManager;

        public TasksController(NivoxarDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/tasks
        [HttpGet]
        public async Task<IActionResult> GetTasks()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var tasks = await _context.Tasks
                .Include(t => t.Category)
                .Include(t => t.SubTasks)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Priority,
                    t.DueDate,
                    t.DueTime,
                    t.Completed,
                    t.CreatedAt,
                    t.CompletedAt,
                    t.IsRecurring,
                    t.RecurringFrequency,
                    t.RecurringEndDate,
                    t.CategoryId,
                    IsShared = _context.SharedTasks.Any(st => st.TaskId == t.Id), // Check if task is shared
                    Category = t.Category != null ? new
                    {
                        t.Category.Id,
                        t.Category.Name,
                        t.Category.Color
                    } : null,
                    SubTasks = t.SubTasks.Select(st => new
                    {
                        st.Id,
                        st.Title,
                        st.Description,
                        st.Completed,
                        st.Order,
                        st.CreatedAt,
                        st.CompletedAt
                    }).OrderBy(st => st.Order).ToList()
                })
                .ToListAsync();

            return Ok(tasks);
        }

        // GET: api/tasks/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTask(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var task = await _context.Tasks
                .Include(t => t.Category)
                .Include(t => t.SubTasks)
                .Where(t => t.Id == id && t.UserId == userId)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.Description,
                    t.Priority,
                    t.DueDate,
                    t.DueTime,
                    t.Completed,
                    t.CreatedAt,
                    t.CompletedAt,
                    t.IsRecurring,
                    t.RecurringFrequency,
                    t.RecurringEndDate,
                    t.CategoryId,
                    IsShared = _context.SharedTasks.Any(st => st.TaskId == t.Id), // Check if task is shared
                    Category = t.Category != null ? new
                    {
                        t.Category.Id,
                        t.Category.Name,
                        t.Category.Color
                    } : null,
                    SubTasks = t.SubTasks.Select(st => new
                    {
                        st.Id,
                        st.Title,
                        st.Description,
                        st.Completed,
                        st.Order,
                        st.CreatedAt,
                        st.CompletedAt
                    }).OrderBy(st => st.Order).ToList()
                })
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound(new { message = "Task not found" });
            }

            return Ok(task);
        }

        // POST: api/tasks
        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { message = "Title is required" });
            }

            var task = new TaskEntity
            {
                Title = request.Title,
                Description = request.Description,
                Priority = request.Priority,
                DueDate = request.DueDate,
                DueTime = request.DueTime,
                Completed = false,
                CreatedAt = DateTime.UtcNow,
                IsRecurring = request.IsRecurring,
                RecurringFrequency = request.RecurringFrequency,
                RecurringEndDate = request.RecurringEndDate,
                UserId = userId,
                CategoryId = request.CategoryId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Create subtasks if provided
            if (request.SubTasks != null && request.SubTasks.Count > 0)
            {
                int order = 0;
                foreach (var subTaskDto in request.SubTasks)
                {
                    var subTask = new SubTask
                    {
                        TaskId = task.Id,
                        Title = subTaskDto.Title,
                        Completed = subTaskDto.Completed,
                        Order = order++,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.SubTasks.Add(subTask);
                }
                await _context.SaveChangesAsync();
            }

            // Load related data
            if (task.CategoryId.HasValue)
            {
                await _context.Entry(task).Reference(t => t.Category).LoadAsync();
            }
            await _context.Entry(task).Collection(t => t.SubTasks).LoadAsync();

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, new
            {
                task.Id,
                task.Title,
                task.Description,
                task.Priority,
                task.DueDate,
                task.DueTime,
                task.Completed,
                task.CreatedAt,
                task.CompletedAt,
                task.IsRecurring,
                task.RecurringFrequency,
                task.RecurringEndDate,
                task.CategoryId,
                IsShared = false, // New tasks are not shared by default
                Category = task.Category != null ? new
                {
                    task.Category.Id,
                    task.Category.Name,
                    task.Category.Color
                } : null,
                SubTasks = task.SubTasks.Select(st => new
                {
                    st.Id,
                    st.Title,
                    st.Description,
                    st.Completed,
                    st.Order,
                    st.CreatedAt,
                    st.CompletedAt
                }).OrderBy(st => st.Order).ToList()
            });
        }

        // PUT: api/tasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            if (task == null)
            {
                return NotFound(new { message = "Task not found" });
            }

            // Update fields
            if (request.Title != null) task.Title = request.Title;
            if (request.Description != null) task.Description = request.Description;
            if (request.Priority.HasValue) task.Priority = request.Priority.Value;
            if (request.DueDate.HasValue) task.DueDate = request.DueDate;
            if (request.DueTime != null) task.DueTime = request.DueTime;
            if (request.Completed.HasValue)
            {
                bool wasCompleted = task.Completed;
                task.Completed = request.Completed.Value;
                task.CompletedAt = request.Completed.Value ? DateTime.UtcNow : null;

                // If task was marked as completed, notify users who have this task shared
                if (!wasCompleted && request.Completed.Value)
                {
                    var sharedWith = await _context.SharedTaskParticipants
                        .Where(stp => stp.SharedTask.TaskId == task.Id && stp.UserId != userId)
                        .Include(stp => stp.User)
                        .ToListAsync();

                    var currentUser = await _userManager.FindByIdAsync(userId);

                    foreach (var participant in sharedWith)
                    {
                        var notification = new Notification
                        {
                            UserId = participant.UserId,
                            Type = "task-completed",
                            Title = "Task Completed",
                            Message = $"{currentUser!.Name} completed the shared task '{task.Title}'",
                            Data = System.Text.Json.JsonSerializer.Serialize(new { taskId = task.Id, completedBy = currentUser.Name }),
                            Read = false,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.Notifications.Add(notification);
                    }
                }
            }
            if (request.IsRecurring.HasValue) task.IsRecurring = request.IsRecurring.Value;
            if (request.RecurringFrequency != null) task.RecurringFrequency = request.RecurringFrequency;
            if (request.RecurringEndDate.HasValue) task.RecurringEndDate = request.RecurringEndDate;
            if (request.CategoryId.HasValue) task.CategoryId = request.CategoryId;

            await _context.SaveChangesAsync();

            // Add new subtasks if provided (for edit mode when user adds subtasks)
            if (request.SubTasks != null && request.SubTasks.Count > 0)
            {
                // Use HashSet for O(1) lookups instead of O(n) for each check
                var existingSubTaskTitles = await _context.SubTasks
                    .Where(st => st.TaskId == task.Id)
                    .Select(st => st.Title.ToLower().Trim())
                    .ToListAsync();

                var existingTitlesSet = new HashSet<string>(existingSubTaskTitles);

                // Get max order in a single query
                var maxOrder = await _context.SubTasks
                    .Where(st => st.TaskId == task.Id)
                    .MaxAsync(st => (int?)st.Order) ?? -1;

                foreach (var subTaskDto in request.SubTasks)
                {
                    // Normalize title for comparison (case-insensitive, trimmed)
                    var normalizedTitle = subTaskDto.Title.ToLower().Trim();

                    // O(1) lookup instead of O(n)
                    if (!existingTitlesSet.Contains(normalizedTitle))
                    {
                        var subTask = new SubTask
                        {
                            TaskId = task.Id,
                            Title = subTaskDto.Title.Trim(), // Save original casing
                            Completed = subTaskDto.Completed,
                            Order = ++maxOrder,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.SubTasks.Add(subTask);
                    }
                }
                await _context.SaveChangesAsync();
            }

            // Reload with related data
            await _context.Entry(task).Reference(t => t.Category).LoadAsync();
            await _context.Entry(task).Collection(t => t.SubTasks).LoadAsync();

            return Ok(new
            {
                task.Id,
                task.Title,
                task.Description,
                task.Priority,
                task.DueDate,
                task.DueTime,
                task.Completed,
                task.CreatedAt,
                task.CompletedAt,
                task.IsRecurring,
                task.RecurringFrequency,
                task.RecurringEndDate,
                task.CategoryId,
                IsShared = _context.SharedTasks.Any(st => st.TaskId == task.Id), // Check if task is shared
                Category = task.Category != null ? new
                {
                    task.Category.Id,
                    task.Category.Name,
                    task.Category.Color
                } : null,
                SubTasks = task.SubTasks.Select(st => new
                {
                    st.Id,
                    st.Title,
                    st.Description,
                    st.Completed,
                    st.Order,
                    st.CreatedAt,
                    st.CompletedAt
                }).OrderBy(st => st.Order).ToList()
            });
        }

        // DELETE: api/tasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            if (task == null)
            {
                return NotFound(new { message = "Task not found" });
            }

            // Notify users who have this task shared before deleting
            var sharedWith = await _context.SharedTaskParticipants
                .Where(stp => stp.SharedTask.TaskId == task.Id && stp.UserId != userId)
                .Include(stp => stp.User)
                .ToListAsync();

            if (sharedWith.Any())
            {
                var currentUser = await _userManager.FindByIdAsync(userId);

                foreach (var participant in sharedWith)
                {
                    var notification = new Notification
                    {
                        UserId = participant.UserId,
                        Type = "task-deleted",
                        Title = "Shared Task Deleted",
                        Message = $"{currentUser!.Name} deleted the shared task '{task.Title}'",
                        Data = System.Text.Json.JsonSerializer.Serialize(new { taskId = task.Id, deletedBy = currentUser.Name, taskTitle = task.Title }),
                        Read = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Notifications.Add(notification);
                }
            }

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Task deleted successfully" });
        }

        // POST: api/tasks/5/subtasks
        [HttpPost("{taskId}/subtasks")]
        public async Task<IActionResult> AddSubTask(int taskId, [FromBody] CreateSubTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Check if user owns the task
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            // If not owner, check if it's a shared task with CanAddSubtasks permission
            if (task == null)
            {
                var sharedTask = await _context.SharedTasks
                    .Include(st => st.Task)
                    .Include(st => st.Participants)
                    .FirstOrDefaultAsync(st => st.TaskId == taskId &&
                        (st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId)));

                if (sharedTask == null || !sharedTask.CanAddSubtasks)
                {
                    return NotFound(new { message = "Task not found or you don't have permission to add subtasks" });
                }

                task = sharedTask.Task;
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { message = "SubTask title is required" });
            }

            var subTask = new SubTask
            {
                Title = request.Title,
                Description = request.Description,
                Completed = false,
                Order = request.Order,
                CreatedAt = DateTime.UtcNow,
                TaskId = taskId
            };

            _context.SubTasks.Add(subTask);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                subTask.Id,
                subTask.Title,
                subTask.Description,
                subTask.Completed,
                subTask.Order,
                subTask.CreatedAt,
                subTask.CompletedAt
            });
        }

        // PUT: api/tasks/5/subtasks/3
        [HttpPut("{taskId}/subtasks/{subTaskId}")]
        public async Task<IActionResult> UpdateSubTask(int taskId, int subTaskId, [FromBody] UpdateSubTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Check if user owns the task
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            // If not owner, check if it's a shared task with CanAddSubtasks permission (which includes updating subtasks)
            if (task == null)
            {
                var sharedTask = await _context.SharedTasks
                    .Include(st => st.Task)
                    .Include(st => st.Participants)
                    .FirstOrDefaultAsync(st => st.TaskId == taskId &&
                        (st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId)));

                if (sharedTask == null || !sharedTask.CanAddSubtasks)
                {
                    return NotFound(new { message = "Task not found or you don't have permission to update subtasks" });
                }

                task = sharedTask.Task;
            }

            var subTask = await _context.SubTasks.FirstOrDefaultAsync(st => st.Id == subTaskId && st.TaskId == taskId);
            if (subTask == null)
            {
                return NotFound(new { message = "SubTask not found" });
            }

            // Update fields
            if (request.Title != null) subTask.Title = request.Title;
            if (request.Description != null) subTask.Description = request.Description;
            if (request.Completed.HasValue)
            {
                subTask.Completed = request.Completed.Value;
                subTask.CompletedAt = request.Completed.Value ? DateTime.UtcNow : null;
            }
            if (request.Order.HasValue) subTask.Order = request.Order.Value;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                subTask.Id,
                subTask.Title,
                subTask.Description,
                subTask.Completed,
                subTask.Order,
                subTask.CreatedAt,
                subTask.CompletedAt
            });
        }

        // DELETE: api/tasks/5/subtasks/3
        [HttpDelete("{taskId}/subtasks/{subTaskId}")]
        public async Task<IActionResult> DeleteSubTask(int taskId, int subTaskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Check if user owns the task
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);

            // If not owner, check if it's a shared task with CanAddSubtasks permission (which includes deleting subtasks)
            if (task == null)
            {
                var sharedTask = await _context.SharedTasks
                    .Include(st => st.Task)
                    .Include(st => st.Participants)
                    .FirstOrDefaultAsync(st => st.TaskId == taskId &&
                        (st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId)));

                if (sharedTask == null || !sharedTask.CanAddSubtasks)
                {
                    return NotFound(new { message = "Task not found or you don't have permission to delete subtasks" });
                }

                task = sharedTask.Task;
            }

            var subTask = await _context.SubTasks.FirstOrDefaultAsync(st => st.Id == subTaskId && st.TaskId == taskId);
            if (subTask == null)
            {
                return NotFound(new { message = "SubTask not found" });
            }

            _context.SubTasks.Remove(subTask);
            await _context.SaveChangesAsync();

            return Ok(new { message = "SubTask deleted successfully" });
        }
    }

    // Request models
    public class CreateTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Priority { get; set; } = 2;
        public DateTime? DueDate { get; set; }
        public string? DueTime { get; set; }
        public bool IsRecurring { get; set; } = false;
        public string? RecurringFrequency { get; set; }
        public DateTime? RecurringEndDate { get; set; }
        public int? CategoryId { get; set; }
        public List<CreateSubTaskDto>? SubTasks { get; set; }
    }

    public class CreateSubTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public bool Completed { get; set; } = false;
    }

    public class UpdateTaskRequest
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public int? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public string? DueTime { get; set; }
        public bool? Completed { get; set; }
        public bool? IsRecurring { get; set; }
        public string? RecurringFrequency { get; set; }
        public DateTime? RecurringEndDate { get; set; }
        public int? CategoryId { get; set; }
        public List<CreateSubTaskDto>? SubTasks { get; set; } // Support adding new subtasks during edit
    }

    public class CreateSubTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Order { get; set; } = 0;
    }

    public class UpdateSubTaskRequest
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public bool? Completed { get; set; }
        public int? Order { get; set; }
    }
}
