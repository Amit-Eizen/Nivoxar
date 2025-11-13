using System.ComponentModel.DataAnnotations;

namespace Nivoxar.Models.Entities
{
    public class Category
    {
        // Frontend: category is just a string name like "Work", "Personal"
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Color { get; set; } // Hex color like "#FF5733"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign Key
        public string UserId { get; set; } = string.Empty;

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual ICollection<TaskEntity> Tasks { get; set; } = new List<TaskEntity>();
    }
}
