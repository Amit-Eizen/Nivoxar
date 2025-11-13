using System.ComponentModel.DataAnnotations;

namespace Nivoxar.Models.Entities
{
    public class TaskEntity
    {
        // Frontend: { id, title, description, category, priority, dueDate, dueTime, completed, recurring, subTasks, createdAt }
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        public int Priority { get; set; } = 2; // 1=Low, 2=Medium, 3=High, 4=Critical

        public DateTime? DueDate { get; set; }
        public string? DueTime { get; set; } // "14:00" format

        public bool Completed { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        // Recurring properties
        public bool IsRecurring { get; set; } = false;
        public string? RecurringFrequency { get; set; } // "daily", "weekly", "monthly"
        public DateTime? RecurringEndDate { get; set; }

        // Foreign Keys
        public string UserId { get; set; } = string.Empty;
        public int? CategoryId { get; set; }

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual Category? Category { get; set; }
        public virtual ICollection<SubTask> SubTasks { get; set; } = new List<SubTask>();
        public virtual ICollection<SharedTask> SharedTasks { get; set; } = new List<SharedTask>();
    }
}
