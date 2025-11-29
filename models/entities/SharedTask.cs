using System.ComponentModel.DataAnnotations;

namespace Nivoxar.Models.Entities
{
    public class SharedTask
    {
        // Frontend: { id, taskId, ownerId, ownerUsername, sharedWith[], permissions, createdAt, updatedAt, lastEditedBy }
        public int Id { get; set; }

        public int TaskId { get; set; }

        public string OwnerId { get; set; } = string.Empty;
        public string OwnerUsername { get; set; } = string.Empty;

        // Permissions
        public bool CanEdit { get; set; } = true;
        public bool CanAddSubtasks { get; set; } = true;
        public bool CanShare { get; set; } = true;
        public bool CanDelete { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string LastEditedBy { get; set; } = string.Empty;

        // Navigation properties
        public virtual TaskEntity Task { get; set; } = null!;
        public virtual User Owner { get; set; } = null!;
        public virtual ICollection<SharedTaskParticipant> Participants { get; set; } = new List<SharedTaskParticipant>();
    }

    // Junction table for many-to-many relationship
    public class SharedTaskParticipant
    {
        public int Id { get; set; }
        public int SharedTaskId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "editor"; // "owner" or "editor"
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // Participant-specific permissions
        public bool CanEdit { get; set; } = true;
        public bool CanAddSubtasks { get; set; } = true;
        public bool CanShare { get; set; } = false;  // Default: participants can't share
        public bool CanDelete { get; set; } = false;

        // Navigation properties
        public virtual SharedTask SharedTask { get; set; } = null!;
        public virtual User User { get; set; } = null!;
    }
}
