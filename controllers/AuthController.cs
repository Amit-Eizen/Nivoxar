using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Nivoxar.Models.Entities;
using Nivoxar.Data;
using Nivoxar.Services;
using Microsoft.EntityFrameworkCore;

namespace Nivoxar.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;
        private readonly NivoxarDbContext _context;
        private readonly IEmailService _emailService;

        public AuthController(
            UserManager<User> userManager,
            IConfiguration configuration,
            NivoxarDbContext context,
            IEmailService emailService)
        {
            _userManager = userManager;
            _configuration = configuration;
            _context = context;
            _emailService = emailService;
        }

        // POST: api/auth/send-verification
        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerificationCode([FromBody] SendVerificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            // Check if email already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "User with this email already exists" });
            }

            // Generate 6-digit verification code
            var code = new Random().Next(100000, 999999).ToString();

            // Delete any existing codes for this email
            var existingCodes = await _context.VerificationCodes
                .Where(v => v.Email == request.Email)
                .ToListAsync();
            _context.VerificationCodes.RemoveRange(existingCodes);

            // Create new verification code
            var verificationCode = new VerificationCode
            {
                Email = request.Email,
                Code = code,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsUsed = false
            };

            _context.VerificationCodes.Add(verificationCode);
            await _context.SaveChangesAsync();

            // Send email
            try
            {
                await _emailService.SendVerificationEmailAsync(request.Email, code);
                return Ok(new { message = "Verification code sent to email" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to send verification email", error = ex.Message });
            }
        }

        // POST: api/auth/verify-code
        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
            {
                return BadRequest(new { message = "Email and code are required" });
            }

            // Find the verification code
            var verification = await _context.VerificationCodes
                .Where(v => v.Email == request.Email && v.Code == request.Code && !v.IsUsed)
                .OrderByDescending(v => v.CreatedAt)
                .FirstOrDefaultAsync();

            if (verification == null)
            {
                return BadRequest(new { message = "Invalid verification code" });
            }

            // Check if code expired
            if (verification.ExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Verification code has expired" });
            }

            // Mark as used
            verification.IsUsed = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Email verified successfully", verified = true });
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            // Check if user already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "User with this email already exists" });
            }

            // Create new user
            var user = new User
            {
                UserName = request.Email,
                Email = request.Email,
                Name = request.Name ?? request.Email.Split('@')[0],
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new { message = $"Failed to create user: {errors}" });
            }

            // Create default categories for the new user
            await CreateDefaultCategoriesAsync(user.Id);

            // Generate JWT token
            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token = token,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.Name,
                    createdAt = user.CreatedAt
                }
            });
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            // Find user by email
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Check password
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            // Generate JWT token
            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token = token,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.Name,
                    createdAt = user.CreatedAt,
                    lastLoginAt = user.LastLoginAt
                }
            });
        }

        // Private helper method to create default categories for a new user
        private async Task CreateDefaultCategoriesAsync(string userId)
        {
            var defaultCategories = new[]
            {
                new Category { Name = "Work", Color = "#3b82f6", UserId = userId, CreatedAt = DateTime.UtcNow },
                new Category { Name = "Personal", Color = "#8b5cf6", UserId = userId, CreatedAt = DateTime.UtcNow },
                new Category { Name = "Urgent", Color = "#ef4444", UserId = userId, CreatedAt = DateTime.UtcNow }
            };

            await _context.Categories.AddRangeAsync(defaultCategories);
            await _context.SaveChangesAsync();
        }

        // Private helper method to generate JWT token
        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(jwtKey))
            {
                throw new InvalidOperationException("JWT Key is not configured");
            }

            var key = Encoding.UTF8.GetBytes(jwtKey);
            var tokenHandler = new JwtSecurityTokenHandler();

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(24),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    // Request models
    public class SendVerificationRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class VerifyCodeRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Name { get; set; }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
