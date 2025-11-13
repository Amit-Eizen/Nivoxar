using Microsoft.AspNetCore.Authorization;
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

        public TasksController(NivoxarDbContext context)
        {
            _context = context;
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

            // Load the category if exists
            if (task.CategoryId.HasValue)
            {
                await _context.Entry(task).Reference(t => t.Category).LoadAsync();
            }

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
                Category = task.Category != null ? new
                {
                    task.Category.Id,
                    task.Category.Name,
                    task.Category.Color
                } : null,
                SubTasks = new List<object>()
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
                task.Completed = request.Completed.Value;
                task.CompletedAt = request.Completed.Value ? DateTime.UtcNow : null;
            }
            if (request.IsRecurring.HasValue) task.IsRecurring = request.IsRecurring.Value;
            if (request.RecurringFrequency != null) task.RecurringFrequency = request.RecurringFrequency;
            if (request.RecurringEndDate.HasValue) task.RecurringEndDate = request.RecurringEndDate;
            if (request.CategoryId.HasValue) task.CategoryId = request.CategoryId;

            await _context.SaveChangesAsync();

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

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
            if (task == null)
            {
                return NotFound(new { message = "Task not found" });
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

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
            if (task == null)
            {
                return NotFound(new { message = "Task not found" });
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

            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
            if (task == null)
            {
                return NotFound(new { message = "Task not found" });
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
