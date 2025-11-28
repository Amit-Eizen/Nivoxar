using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nivoxar.Models.Entities;
using System.Security.Claims;

namespace Nivoxar.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<User> _userManager;

        public UsersController(UserManager<User> userManager)
        {
            _userManager = userManager;
        }

        // GET: api/users/me
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                username = user.UserName,
                profilePicture = user.ProfilePicture,
                createdAt = user.CreatedAt,
                lastLoginAt = user.LastLoginAt
            });
        }

        // PUT: api/users/me
        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Update allowed fields
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                user.Name = request.Name;
            }

            if (request.ProfilePicture != null)
            {
                user.ProfilePicture = request.ProfilePicture;
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Failed to update profile: {errors}" });
            }

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                username = user.UserName,
                profilePicture = user.ProfilePicture,
                createdAt = user.CreatedAt,
                lastLoginAt = user.LastLoginAt
            });
        }

        // PUT: api/users/me/profile-picture
        [HttpPut("me/profile-picture")]
        public async Task<IActionResult> UpdateProfilePicture([FromBody] UpdateProfilePictureRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (string.IsNullOrWhiteSpace(request.ProfilePicture))
            {
                return BadRequest(new { message = "Profile picture data is required" });
            }

            user.ProfilePicture = request.ProfilePicture;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Failed to update profile picture: {errors}" });
            }

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                username = user.UserName,
                profilePicture = user.ProfilePicture,
                createdAt = user.CreatedAt,
                lastLoginAt = user.LastLoginAt
            });
        }

        // PUT: api/users/me/name
        [HttpPut("me/name")]
        public async Task<IActionResult> UpdateName([FromBody] UpdateNameRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Name is required" });
            }

            // Check if name is already taken by another user
            var existingUser = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Name.ToLower() == request.Name.ToLower() && u.Id != userId);
            if (existingUser != null)
            {
                return BadRequest(new { message = "This name is already taken. Please choose a different name." });
            }

            user.Name = request.Name;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Failed to update name: {errors}" });
            }

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                name = user.Name,
                username = user.UserName,
                profilePicture = user.ProfilePicture,
                createdAt = user.CreatedAt,
                lastLoginAt = user.LastLoginAt
            });
        }

        // GET: api/users/search?query=name
        [HttpGet("search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            {
                return Ok(new { users = new List<object>() });
            }

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Search users by name (case-insensitive, partial match)
            var users = await _userManager.Users
                .Where(u => u.Id != currentUserId && u.Name.ToLower().Contains(query.ToLower()))
                .OrderBy(u => u.Name)
                .Take(10)
                .Select(u => new
                {
                    id = u.Id,
                    name = u.Name,
                    email = u.Email,
                    profilePicture = u.ProfilePicture
                })
                .ToListAsync();

            return Ok(new { users });
        }

        // GET: api/users/check-name?name=username
        [HttpGet("check-name")]
        public async Task<IActionResult> CheckNameAvailability([FromQuery] string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Name is required" });
            }

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Check if name exists (case-insensitive) for another user
            var exists = await _userManager.Users
                .AnyAsync(u => u.Name.ToLower() == name.ToLower() && u.Id != currentUserId);

            return Ok(new { available = !exists });
        }
    }

    // Request models
    public class UpdateProfileRequest
    {
        public string? Name { get; set; }
        public string? ProfilePicture { get; set; }
    }

    public class UpdateProfilePictureRequest
    {
        public string ProfilePicture { get; set; } = string.Empty;
    }

    public class UpdateNameRequest
    {
        public string Name { get; set; } = string.Empty;
    }
}
