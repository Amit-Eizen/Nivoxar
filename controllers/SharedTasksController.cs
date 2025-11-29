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
            var sharedTasksData = await _context.SharedTasks
                .Include(st => st.Task)
                .ThenInclude(t => t.SubTasks)
                .Include(st => st.Task.Category)
                .Include(st => st.Owner)
                .Include(st => st.Participants)
                .ThenInclude(p => p.User)
                .Where(st => st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId))
                .ToListAsync();

            var sharedTasks = sharedTasksData.Select(st =>
            {
                var isOwner = st.OwnerId == userId;

                return new
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
                    IsOwner = isOwner,
                    Participants = new[] {
                        // Include owner as first participant
                        new {
                            Id = 0,
                            UserId = st.OwnerId,
                            Username = st.OwnerUsername,
                            Email = st.Owner.Email ?? "",
                            ProfilePicture = st.Owner.ProfilePicture,
                            Role = "owner",
                            AddedAt = st.CreatedAt
                        }
                    }
                    .Concat(st.Participants.Select(p => new
                    {
                        p.Id,
                        p.UserId,
                        p.Username,
                        p.Email,
                        ProfilePicture = p.User.ProfilePicture,
                        p.Role,
                        p.AddedAt
                    }))
                    .ToList(),
                    Permissions = new
                    {
                        CanEdit = isOwner || st.CanEdit,
                        CanAddSubtasks = isOwner || st.CanAddSubtasks,
                        CanShare = isOwner || st.CanShare,
                        CanDelete = isOwner || st.CanDelete  // Owner always has delete permission
                    },
                    st.CreatedAt,
                    st.UpdatedAt,
                    st.LastEditedBy
                };
            }).ToList();

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

            var sharedTaskData = await _context.SharedTasks
                .Include(st => st.Task)
                .ThenInclude(t => t.SubTasks)
                .Include(st => st.Task.Category)
                .Include(st => st.Owner)
                .Include(st => st.Participants)
                .ThenInclude(p => p.User)
                .Where(st => st.TaskId == taskId && (st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId)))
                .FirstOrDefaultAsync();

            if (sharedTaskData == null)
            {
                return NotFound(new { message = "Shared task not found" });
            }

            var isOwner = sharedTaskData.OwnerId == userId;

            var sharedTask = new
            {
                sharedTaskData.Id,
                sharedTaskData.TaskId,
                Task = new
                {
                    sharedTaskData.Task.Id,
                    sharedTaskData.Task.Title,
                    sharedTaskData.Task.Description,
                    sharedTaskData.Task.Priority,
                    sharedTaskData.Task.DueDate,
                    sharedTaskData.Task.DueTime,
                    sharedTaskData.Task.Completed,
                    sharedTaskData.Task.CreatedAt,
                    sharedTaskData.Task.CompletedAt,
                    Category = sharedTaskData.Task.Category != null ? new
                    {
                        sharedTaskData.Task.Category.Id,
                        sharedTaskData.Task.Category.Name,
                        sharedTaskData.Task.Category.Color
                    } : null,
                    SubTasks = sharedTaskData.Task.SubTasks.Select(sub => new
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
                sharedTaskData.OwnerId,
                sharedTaskData.OwnerUsername,
                IsOwner = sharedTaskData.OwnerId == userId,
                Participants = new[] {
                    // Include owner as first participant
                    new {
                        Id = 0,
                        UserId = sharedTaskData.OwnerId,
                        Username = sharedTaskData.OwnerUsername,
                        Email = sharedTaskData.Owner.Email ?? "",
                        ProfilePicture = sharedTaskData.Owner.ProfilePicture,
                        Role = "owner",
                        AddedAt = sharedTaskData.CreatedAt,
                        CanEdit = true,
                        CanAddSubtasks = true,
                        CanShare = true,
                        CanDelete = true
                    }
                }
                .Concat(sharedTaskData.Participants.Select(p => new
                {
                    p.Id,
                    p.UserId,
                    p.Username,
                    p.Email,
                    ProfilePicture = p.User.ProfilePicture,
                    p.Role,
                    p.AddedAt,
                    p.CanEdit,
                    p.CanAddSubtasks,
                    p.CanShare,
                    p.CanDelete
                }))
                .ToList(),
                // User permissions (with owner override for their own actions)
                Permissions = new
                {
                    CanEdit = isOwner || sharedTaskData.CanEdit,
                    CanAddSubtasks = isOwner || sharedTaskData.CanAddSubtasks,
                    CanShare = isOwner || sharedTaskData.CanShare,
                    CanDelete = isOwner || sharedTaskData.CanDelete
                },
                // Base permissions (without owner override, for UI display)
                BasePermissions = new
                {
                    CanEdit = sharedTaskData.CanEdit,
                    CanAddSubtasks = sharedTaskData.CanAddSubtasks,
                    CanShare = sharedTaskData.CanShare,
                    CanDelete = sharedTaskData.CanDelete
                },
                sharedTaskData.CreatedAt,
                sharedTaskData.UpdatedAt,
                sharedTaskData.LastEditedBy
            };

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

            // Check permission: owner OR participant with CanShare permission
            bool isOwner = sharedTask.OwnerId == userId;
            var participant = sharedTask.Participants.FirstOrDefault(p => p.UserId == userId);
            bool canSharePermission = participant?.CanShare ?? false;

            if (!isOwner && !canSharePermission)
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
                    var newParticipant = new SharedTaskParticipant
                    {
                        SharedTaskId = sharedTaskId,
                        UserId = participantUser.Id,
                        Username = participantUser.Name,
                        Email = participantUser.Email ?? string.Empty,
                        Role = "editor",
                        AddedAt = DateTime.UtcNow
                    };
                    newParticipants.Add(newParticipant);
                    _context.SharedTaskParticipants.Add(newParticipant);

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

        // PUT: api/sharedtasks/{sharedTaskId}/participants/{participantUserId}/permissions - Update participant permissions
        [HttpPut("{sharedTaskId}/participants/{participantUserId}/permissions")]
        public async Task<IActionResult> UpdateParticipantPermissions(
            int sharedTaskId,
            string participantUserId,
            [FromBody] UpdatePermissionsRequest request)
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

            // Only owner can update participant permissions
            if (sharedTask.OwnerId != userId)
            {
                return Forbid();
            }

            var participant = sharedTask.Participants.FirstOrDefault(p => p.UserId == participantUserId);
            if (participant == null)
            {
                return NotFound(new { message = "Participant not found" });
            }

            // Update permissions
            if (request.CanEdit.HasValue)
                participant.CanEdit = request.CanEdit.Value;

            if (request.CanAddSubtasks.HasValue)
                participant.CanAddSubtasks = request.CanAddSubtasks.Value;

            if (request.CanShare.HasValue)
                participant.CanShare = request.CanShare.Value;

            if (request.CanDelete.HasValue)
                participant.CanDelete = request.CanDelete.Value;

            sharedTask.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Participant permissions updated successfully",
                participant = new
                {
                    participant.UserId,
                    participant.Username,
                    permissions = new
                    {
                        participant.CanEdit,
                        participant.CanAddSubtasks,
                        participant.CanShare,
                        participant.CanDelete
                    }
                }
            });
        }

        // PUT: api/sharedtasks/{taskId}/permissions - Update shared task permissions (owner only)
        [HttpPut("{taskId}/permissions")]
        public async Task<IActionResult> UpdatePermissions(int taskId, [FromBody] UpdatePermissionsRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var sharedTask = await _context.SharedTasks
                .FirstOrDefaultAsync(st => st.TaskId == taskId);

            if (sharedTask == null)
            {
                return NotFound(new { message = "Shared task not found" });
            }

            // Only owner can update permissions
            if (sharedTask.OwnerId != userId)
            {
                return Forbid();
            }

            // Update permissions
            if (request.CanEdit.HasValue)
                sharedTask.CanEdit = request.CanEdit.Value;

            if (request.CanAddSubtasks.HasValue)
                sharedTask.CanAddSubtasks = request.CanAddSubtasks.Value;

            if (request.CanShare.HasValue)
                sharedTask.CanShare = request.CanShare.Value;

            if (request.CanDelete.HasValue)
                sharedTask.CanDelete = request.CanDelete.Value;

            sharedTask.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Permissions updated successfully",
                permissions = new
                {
                    sharedTask.CanEdit,
                    sharedTask.CanAddSubtasks,
                    sharedTask.CanShare,
                    sharedTask.CanDelete
                }
            });
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

    public class UpdatePermissionsRequest
    {
        public bool? CanEdit { get; set; }
        public bool? CanAddSubtasks { get; set; }
        public bool? CanShare { get; set; }
        public bool? CanDelete { get; set; }
    }
}
