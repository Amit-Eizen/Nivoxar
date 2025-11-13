using Microsoft.AspNetCore.Identity;

namespace Nivoxar.Models.Entities
{
    public class User : IdentityUser
    {
        // Frontend: { id, name, email, password, createdAt }
        public string Name { get; set; } = string.Empty;
        public string? ProfilePicture { get; set; } // Base64 encoded image or URL
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }

        // Navigation properties
        public virtual ICollection<TaskEntity> Tasks { get; set; } = new List<TaskEntity>();
        public virtual ICollection<Category> Categories { get; set; } = new List<Category>();
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public virtual ICollection<Friend> FriendsInitiated { get; set; } = new List<Friend>();
        public virtual ICollection<Friend> FriendsReceived { get; set; } = new List<Friend>();
    }
}
