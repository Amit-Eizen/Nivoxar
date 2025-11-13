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
    public class SharedTasksController : ControllerBase
    {
        private readonly NivoxarDbContext _context;

        public SharedTasksController(NivoxarDbContext context)
        {
            _context = context;
        }

        // GET: api/sharedtasks - Get all shared tasks for current user
        [HttpGet]
        public async Task<IActionResult> GetMySharedTasks()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Get tasks where user is owner or participant
            var sharedTasks = await _context.SharedTasks
                .Include(st => st.Task)
                .ThenInclude(t => t.SubTasks)
                .Include(st => st.Task.Category)
                .Include(st => st.Participants)
                .Where(st => st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId))
                .Select(st => new
                {
                    st.Id,
                    st.TaskId,
                    Task = new
                    {
                        st.Task.Id,
                        st.Task.Title,
                        st.Task.Description,
                        st.Task.Priority,
                        st.Task.DueDate,
                        st.Task.DueTime,
                        st.Task.Completed,
                        st.Task.CreatedAt,
                        st.Task.CompletedAt,
                        Category = st.Task.Category != null ? new
                        {
                            st.Task.Category.Id,
                            st.Task.Category.Name,
                            st.Task.Category.Color
                        } : null,
                        SubTasks = st.Task.SubTasks.Select(sub => new
                        {
                            sub.Id,
                            sub.Title,
                            sub.Description,
                            sub.Completed,
                            sub.Order,
                            sub.CreatedAt,
                            sub.CompletedAt
                        }).OrderBy(sub => sub.Order).ToList()
                    },
                    st.OwnerId,
                    st.OwnerUsername,
                    IsOwner = st.OwnerId == userId,
                    Participants = st.Participants.Select(p => new
                    {
                        p.Id,
                        p.UserId,
                        p.Username,
                        p.Email,
                        p.Role,
                        p.AddedAt
                    }).ToList(),
                    Permissions = new
                    {
                        st.CanEdit,
                        st.CanAddSubtasks,
                        st.CanShare,
                        st.CanDelete
                    },
                    st.CreatedAt,
                    st.UpdatedAt,
                    st.LastEditedBy
                })
                .ToListAsync();

            return Ok(sharedTasks);
        }

        // GET: api/sharedtasks/task/5 - Get shared task by task ID
        [HttpGet("task/{taskId}")]
        public async Task<IActionResult> GetSharedTaskByTaskId(int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var sharedTask = await _context.SharedTasks
                .Include(st => st.Task)
                .ThenInclude(t => t.SubTasks)
                .Include(st => st.Task.Category)
                .Include(st => st.Participants)
                .Where(st => st.TaskId == taskId && (st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId)))
                .Select(st => new
                {
                    st.Id,
                    st.TaskId,
                    Task = new
                    {
                        st.Task.Id,
                        st.Task.Title,
                        st.Task.Description,
                        st.Task.Priority,
                        st.Task.DueDate,
                        st.Task.DueTime,
                        st.Task.Completed,
                        st.Task.CreatedAt,
                        st.Task.CompletedAt,
                        Category = st.Task.Category != null ? new
                        {
                            st.Task.Category.Id,
                            st.Task.Category.Name,
                            st.Task.Category.Color
                        } : null,
                        SubTasks = st.Task.SubTasks.Select(sub => new
                        {
                            sub.Id,
                            sub.Title,
                            sub.Description,
                            sub.Completed,
                            sub.Order,
                            sub.CreatedAt,
                            sub.CompletedAt
                        }).OrderBy(sub => sub.Order).ToList()
                    },
                    st.OwnerId,
                    st.OwnerUsername,
                    IsOwner = st.OwnerId == userId,
                    Participants = st.Participants.Select(p => new
                    {
                        p.Id,
                        p.UserId,
                        p.Username,
                        p.Email,
                        p.Role,
                        p.AddedAt
                    }).ToList(),
                    Permissions = new
                    {
                        st.CanEdit,
                        st.CanAddSubtasks,
                        st.CanShare,
                        st.CanDelete
                    },
                    st.CreatedAt,
                    st.UpdatedAt,
                    st.LastEditedBy
                })
                .FirstOrDefaultAsync();

            if (sharedTask == null)
            {
                return NotFound(new { message = "Shared task not found" });
            }

            return Ok(sharedTask);
        }

        // POST: api/sharedtasks/share - Share a task
        [HttpPost("share")]
        public async Task<IActionResult> ShareTask([FromBody] ShareTaskRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var currentUser = await _context.Users.FindAsync(userId);
            if (currentUser == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            // Check if task exists and belongs to user
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == request.TaskId && t.UserId == userId);
            if (task == null)
            {
                return NotFound(new { message = "Task not found or you don't have permission to share it" });
            }

            // Check if task is already shared
            var existingSharedTask = await _context.SharedTasks.FirstOrDefaultAsync(st => st.TaskId == request.TaskId);
            if (existingSharedTask != null)
            {
                return BadRequest(new { message = "Task is already shared. Use addParticipants instead." });
            }

            // Get participants information
            var participants = new List<SharedTaskParticipant>();
            foreach (var participantUserId in request.UserIds)
            {
                var participantUser = await _context.Users.FindAsync(participantUserId);
                if (participantUser != null)
                {
                    participants.Add(new SharedTaskParticipant
                    {
                        UserId = participantUser.Id,
                        Username = participantUser.Name,
                        Email = participantUser.Email ?? string.Empty,
                        Role = "editor",
                        AddedAt = DateTime.UtcNow
                    });
                }
            }

            if (participants.Count == 0)
            {
                return BadRequest(new { message = "No valid users to share with" });
            }

            // Create shared task
            var sharedTask = new SharedTask
            {
                TaskId = request.TaskId,
                OwnerId = userId,
                OwnerUsername = currentUser.Name,
                CanEdit = true,
                CanAddSubtasks = true,
                CanShare = true,
                CanDelete = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                LastEditedBy = currentUser.Name,
                Participants = participants
            };

            _context.SharedTasks.Add(sharedTask);
            await _context.SaveChangesAsync();

            // Create notifications for participants
            foreach (var participant in participants)
            {
                var notification = new Notification
                {
                    UserId = participant.UserId,
                    Type = "task_shared",
                    Title = "Task Shared",
                    Message = $"{currentUser.Name} shared a task '{task.Title}' with you",
                    Data = System.Text.Json.JsonSerializer.Serialize(new { taskId = task.Id, sharedTaskId = sharedTask.Id }),
                    Read = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);
            }
            await _context.SaveChangesAsync();

            return Ok(new
            {
                sharedTask.Id,
                sharedTask.TaskId,
                sharedTask.OwnerId,
                sharedTask.OwnerUsername,
                Participants = participants.Select(p => new
                {
                    p.Id,
                    p.UserId,
                    p.Username,
                    p.Email,
                    p.Role,
                    p.AddedAt
                }).ToList(),
                Permissions = new
                {
                    sharedTask.CanEdit,
                    sharedTask.CanAddSubtasks,
                    sharedTask.CanShare,
                    sharedTask.CanDelete
                },
                sharedTask.CreatedAt,
                sharedTask.UpdatedAt,
                sharedTask.LastEditedBy
            });
        }

        // POST: api/sharedtasks/5/participants - Add participants to shared task
        [HttpPost("{sharedTaskId}/participants")]
        public async Task<IActionResult> AddParticipants(int sharedTaskId, [FromBody] AddParticipantsRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var currentUser = await _context.Users.FindAsync(userId);
            if (currentUser == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var sharedTask = await _context.SharedTasks
                .Include(st => st.Participants)
                .Include(st => st.Task)
                .FirstOrDefaultAsync(st => st.Id == sharedTaskId);

            if (sharedTask == null)
            {
                return NotFound(new { message = "Shared task not found" });
            }

            // Check permission (owner or if canShare is true)
            if (sharedTask.OwnerId != userId && !sharedTask.CanShare)
            {
                return Forbid();
            }

            // Add new participants
            var newParticipants = new List<SharedTaskParticipant>();
            foreach (var participantUserId in request.UserIds)
            {
                // Skip if already a participant
                if (sharedTask.Participants.Any(p => p.UserId == participantUserId))
                {
                    continue;
                }

                var participantUser = await _context.Users.FindAsync(participantUserId);
                if (participantUser != null)
                {
                    var participant = new SharedTaskParticipant
                    {
                        SharedTaskId = sharedTaskId,
                        UserId = participantUser.Id,
                        Username = participantUser.Name,
                        Email = participantUser.Email ?? string.Empty,
                        Role = "editor",
                        AddedAt = DateTime.UtcNow
                    };
                    newParticipants.Add(participant);
                    _context.SharedTaskParticipants.Add(participant);

                    // Create notification
                    var notification = new Notification
                    {
                        UserId = participantUser.Id,
                        Type = "task_shared",
                        Title = "Task Shared",
                        Message = $"{currentUser.Name} shared a task '{sharedTask.Task.Title}' with you",
                        Data = System.Text.Json.JsonSerializer.Serialize(new { taskId = sharedTask.TaskId, sharedTaskId = sharedTask.Id }),
                        Read = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Notifications.Add(notification);
                }
            }

            if (newParticipants.Count == 0)
            {
                return BadRequest(new { message = "No new participants to add" });
            }

            sharedTask.UpdatedAt = DateTime.UtcNow;
            sharedTask.LastEditedBy = currentUser.Name;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Added {newParticipants.Count} participant(s)",
                participants = newParticipants.Select(p => new
                {
                    p.Id,
                    p.UserId,
                    p.Username,
                    p.Email,
                    p.Role,
                    p.AddedAt
                }).ToList()
            });
        }

        // DELETE: api/sharedtasks/5/participants/userId - Remove participant
        [HttpDelete("{sharedTaskId}/participants/{participantUserId}")]
        public async Task<IActionResult> RemoveParticipant(int sharedTaskId, string participantUserId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var sharedTask = await _context.SharedTasks
                .Include(st => st.Participants)
                .FirstOrDefaultAsync(st => st.Id == sharedTaskId);

            if (sharedTask == null)
            {
                return NotFound(new { message = "Shared task not found" });
            }

            // Only owner can remove participants (or user can remove themselves)
            if (sharedTask.OwnerId != userId && participantUserId != userId)
            {
                return Forbid();
            }

            var participant = sharedTask.Participants.FirstOrDefault(p => p.UserId == participantUserId);
            if (participant == null)
            {
                return NotFound(new { message = "Participant not found" });
            }

            _context.SharedTaskParticipants.Remove(participant);
            sharedTask.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Participant removed successfully" });
        }

        // DELETE: api/sharedtasks/task/5 - Unshare task (owner only)
        [HttpDelete("task/{taskId}")]
        public async Task<IActionResult> UnshareTask(int taskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var sharedTask = await _context.SharedTasks
                .Include(st => st.Participants)
                .FirstOrDefaultAsync(st => st.TaskId == taskId);

            if (sharedTask == null)
            {
                return NotFound(new { message = "Task is not shared" });
            }

            // Only owner can unshare
            if (sharedTask.OwnerId != userId)
            {
                return Forbid();
            }

            _context.SharedTasks.Remove(sharedTask);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Task unshared successfully" });
        }

        // PUT: api/sharedtasks/5/lastedited - Update last edited info
        [HttpPut("{sharedTaskId}/lastedited")]
        public async Task<IActionResult> UpdateLastEdited(int sharedTaskId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var currentUser = await _context.Users.FindAsync(userId);
            if (currentUser == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            var sharedTask = await _context.SharedTasks
                .Include(st => st.Participants)
                .Include(st => st.Task)
                .FirstOrDefaultAsync(st => st.Id == sharedTaskId);

            if (sharedTask == null)
            {
                return NotFound(new { message = "Shared task not found" });
            }

            // Check if user has access
            if (sharedTask.OwnerId != userId && !sharedTask.Participants.Any(p => p.UserId == userId))
            {
                return Forbid();
            }

            sharedTask.UpdatedAt = DateTime.UtcNow;
            sharedTask.LastEditedBy = currentUser.Name;
            await _context.SaveChangesAsync();

            // Notify all participants except the editor
            foreach (var participant in sharedTask.Participants)
            {
                if (participant.UserId != userId)
                {
                    var notification = new Notification
                    {
                        UserId = participant.UserId,
                        Type = "task_updated",
                        Title = "Shared Task Updated",
                        Message = $"{currentUser.Name} updated the task '{sharedTask.Task.Title}'",
                        Data = System.Text.Json.JsonSerializer.Serialize(new { taskId = sharedTask.TaskId }),
                        Read = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Notifications.Add(notification);
                }
            }

            // Notify owner if they're not the editor
            if (sharedTask.OwnerId != userId)
            {
                var notification = new Notification
                {
                    UserId = sharedTask.OwnerId,
                    Type = "task_updated",
                    Title = "Shared Task Updated",
                    Message = $"{currentUser.Name} updated the task '{sharedTask.Task.Title}'",
                    Data = System.Text.Json.JsonSerializer.Serialize(new { taskId = sharedTask.TaskId }),
                    Read = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Last edited updated successfully" });
        }
    }

    // Request models
    public class ShareTaskRequest
    {
        public int TaskId { get; set; }
        public List<string> UserIds { get; set; } = new List<string>();
    }

    public class AddParticipantsRequest
    {
        public List<string> UserIds { get; set; } = new List<string>();
    }
}
