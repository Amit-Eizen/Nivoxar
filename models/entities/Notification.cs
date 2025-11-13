using System.ComponentModel.DataAnnotations;

namespace Nivoxar.Models.Entities
{
    public class Notification
    {
        // Frontend: { id, userId, type, title, message, data, read, createdAt }
        public int Id { get; set; }

        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // "friend_request", "friend_accepted", "task_shared", "task_updated", etc.

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;

        public string? Data { get; set; } // JSON string for additional data

        public bool Read { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual User User { get; set; } = null!;
    }
}
