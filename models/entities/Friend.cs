using System.ComponentModel.DataAnnotations;

namespace Nivoxar.Models.Entities
{
    public class Friend
    {
        // Frontend: { id, userId, username, friendId, friendUsername, friendEmail, status, createdAt, acceptedAt }
        public int Id { get; set; }

        public string UserId { get; set; } = string.Empty; // Who sent the request
        public string Username { get; set; } = string.Empty;

        public string FriendId { get; set; } = string.Empty; // Who received the request
        public string FriendUsername { get; set; } = string.Empty;
        public string FriendEmail { get; set; } = string.Empty;

        [Required]
        public string Status { get; set; } = "pending"; // "pending", "accepted", "rejected"

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? AcceptedAt { get; set; }
        public DateTime? RejectedAt { get; set; }

        // Navigation properties
        public virtual User UserInitiator { get; set; } = null!;
        public virtual User UserReceiver { get; set; } = null!;
    }
}
