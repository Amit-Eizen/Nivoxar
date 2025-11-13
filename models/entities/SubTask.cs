using System.ComponentModel.DataAnnotations;

namespace Nivoxar.Models.Entities
{
    public class SubTask
    {
        // Frontend: { title, completed }
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool Completed { get; set; } = false;
        public int Order { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        // Foreign Key
        public int TaskId { get; set; }

        // Navigation property
        public virtual TaskEntity Task { get; set; } = null!;
    }
}
