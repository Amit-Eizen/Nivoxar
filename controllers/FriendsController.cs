using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nivoxar.Data;
using Nivoxar.Models.Entities;
using System.Security.Claims;

namespace Nivoxar.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FriendsController : ControllerBase
    {
        private readonly NivoxarDbContext _context;
        private readonly UserManager<User> _userManager;

        public FriendsController(NivoxarDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/friends
        [HttpGet]
        public async Task<IActionResult> GetFriends()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var friends = await _context.Friends
                .Where(f => f.Status == "accepted" && (f.UserId == userId || f.FriendId == userId))
                .Include(f => f.UserInitiator)
                .Include(f => f.UserReceiver)
                .Select(f => new
                {
                    id = f.Id,
                    userId = f.UserId,
                    username = f.Username,
                    friendId = f.FriendId,
                    friendUsername = f.FriendUsername,
                    friendEmail = f.FriendEmail,
                    status = f.Status,
                    createdAt = f.CreatedAt,
                    acceptedAt = f.AcceptedAt
                })
                .ToListAsync();

            return Ok(friends);
        }

        // GET: api/friends/requests
        [HttpGet("requests")]
        public async Task<IActionResult> GetFriendRequests()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var incoming = await _context.Friends
                .Where(f => f.FriendId == userId && f.Status == "pending")
                .Include(f => f.UserInitiator)
                .Select(f => new
                {
                    id = f.Id,
                    userId = f.UserId,
                    username = f.Username,
                    friendId = f.FriendId,
                    friendUsername = f.FriendUsername,
                    friendEmail = f.FriendEmail,
                    status = f.Status,
                    createdAt = f.CreatedAt
                })
                .ToListAsync();

            var outgoing = await _context.Friends
                .Where(f => f.UserId == userId && f.Status == "pending")
                .Include(f => f.UserReceiver)
                .Select(f => new
                {
                    id = f.Id,
                    userId = f.UserId,
                    username = f.Username,
                    friendId = f.FriendId,
                    friendUsername = f.FriendUsername,
                    friendEmail = f.FriendEmail,
                    status = f.Status,
                    createdAt = f.CreatedAt
                })
                .ToListAsync();

            return Ok(new { incoming, outgoing });
        }

        // POST: api/friends/search
        [HttpPost("search")]
        public async Task<IActionResult> SearchUsers([FromBody] SearchRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest(new { message = "Search query is required" });
            }

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var query = request.Query.ToLower();

            var users = await _userManager.Users
                .Where(u => u.Id != currentUserId &&
                           (u.UserName!.ToLower().Contains(query) ||
                            u.Email!.ToLower().Contains(query) ||
                            u.Name.ToLower().Contains(query)))
                .Select(u => new
                {
                    id = u.Id,
                    username = u.UserName,
                    email = u.Email,
                    name = u.Name,
                    profilePicture = u.ProfilePicture
                })
                .Take(10)
                .ToListAsync();

            return Ok(users);
        }

        // POST: api/friends/request
        [HttpPost("request")]
        public async Task<IActionResult> SendFriendRequest([FromBody] FriendRequestDto request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            if (string.IsNullOrWhiteSpace(request.FriendId))
            {
                return BadRequest(new { message = "Friend ID is required" });
            }

            if (userId == request.FriendId)
            {
                return BadRequest(new { message = "Cannot send friend request to yourself" });
            }

            // Check if friendship already exists
            var existingFriendship = await _context.Friends
                .FirstOrDefaultAsync(f =>
                    (f.UserId == userId && f.FriendId == request.FriendId) ||
                    (f.UserId == request.FriendId && f.FriendId == userId));

            if (existingFriendship != null)
            {
                if (existingFriendship.Status == "accepted")
                {
                    return BadRequest(new { message = "Already friends" });
                }
                else if (existingFriendship.Status == "pending")
                {
                    return BadRequest(new { message = "Friend request already sent" });
                }
            }

            // Get both users
            var currentUser = await _userManager.FindByIdAsync(userId);
            var friendUser = await _userManager.FindByIdAsync(request.FriendId);

            if (friendUser == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Create friend request
            var friendRequest = new Friend
            {
                UserId = userId,
                Username = currentUser!.UserName!,
                FriendId = request.FriendId,
                FriendUsername = friendUser.UserName!,
                FriendEmail = friendUser.Email!,
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Friends.Add(friendRequest);

            // Create notification for the recipient
            var notification = new Notification
            {
                UserId = request.FriendId,
                Type = "friend-request",
                Title = "New Friend Request",
                Message = $"{currentUser.Name} sent you a friend request",
                Data = System.Text.Json.JsonSerializer.Serialize(new { friendRequestId = friendRequest.Id, senderId = userId, senderName = currentUser.Name }),
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);

            Console.WriteLine($"[DEBUG] Creating notification for UserId: {request.FriendId}, Type: friend-request");

            await _context.SaveChangesAsync();

            Console.WriteLine($"[DEBUG] Notification saved with ID: {notification.Id}");

            return Ok(new
            {
                id = friendRequest.Id,
                userId = friendRequest.UserId,
                username = friendRequest.Username,
                friendId = friendRequest.FriendId,
                friendUsername = friendRequest.FriendUsername,
                friendEmail = friendRequest.FriendEmail,
                status = friendRequest.Status,
                createdAt = friendRequest.CreatedAt
            });
        }

        // PUT: api/friends/{id}/accept
        [HttpPut("{id}/accept")]
        public async Task<IActionResult> AcceptFriendRequest(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var friendRequest = await _context.Friends.FindAsync(id);
            if (friendRequest == null)
            {
                return NotFound(new { message = "Friend request not found" });
            }

            // Only the recipient can accept
            if (friendRequest.FriendId != userId)
            {
                return Forbid();
            }

            if (friendRequest.Status != "pending")
            {
                return BadRequest(new { message = "Friend request is not pending" });
            }

            friendRequest.Status = "accepted";
            friendRequest.AcceptedAt = DateTime.UtcNow;

            // Create notification for the sender that their request was accepted
            var acceptor = await _userManager.FindByIdAsync(userId);
            var notification = new Notification
            {
                UserId = friendRequest.UserId, // Send to the original sender
                Type = "friend-request-accepted",
                Title = "Friend Request Accepted",
                Message = $"{acceptor!.Name} accepted your friend request",
                Data = System.Text.Json.JsonSerializer.Serialize(new { friendRequestId = friendRequest.Id, acceptorId = userId, acceptorName = acceptor.Name }),
                Read = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = friendRequest.Id,
                userId = friendRequest.UserId,
                username = friendRequest.Username,
                friendId = friendRequest.FriendId,
                friendUsername = friendRequest.FriendUsername,
                friendEmail = friendRequest.FriendEmail,
                status = friendRequest.Status,
                createdAt = friendRequest.CreatedAt,
                acceptedAt = friendRequest.AcceptedAt
            });
        }

        // PUT: api/friends/{id}/reject
        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectFriendRequest(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var friendRequest = await _context.Friends.FindAsync(id);
            if (friendRequest == null)
            {
                return NotFound(new { message = "Friend request not found" });
            }

            // Only the recipient can reject
            if (friendRequest.FriendId != userId)
            {
                return Forbid();
            }

            if (friendRequest.Status != "pending")
            {
                return BadRequest(new { message = "Friend request is not pending" });
            }

            friendRequest.Status = "rejected";
            friendRequest.RejectedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/friends/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveFriend(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var friendship = await _context.Friends.FindAsync(id);
            if (friendship == null)
            {
                return NotFound(new { message = "Friendship not found" });
            }

            // Only users involved in the friendship can remove it
            if (friendship.UserId != userId && friendship.FriendId != userId)
            {
                return Forbid();
            }

            _context.Friends.Remove(friendship);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    // DTOs
    public class FriendRequestDto
    {
        public string FriendId { get; set; } = string.Empty;
    }

    public class SearchRequest
    {
        public string Query { get; set; } = string.Empty;
    }
}
