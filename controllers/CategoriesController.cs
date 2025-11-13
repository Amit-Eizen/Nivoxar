using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nivoxar.Data;
using Nivoxar.Models.Entities;

namespace Nivoxar.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly NivoxarDbContext _context;

        public CategoriesController(NivoxarDbContext context)
        {
            _context = context;
        }

        // GET: api/categories
        [HttpGet]
        public async Task<IActionResult> GetCategories()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var categories = await _context.Categories
                .Where(c => c.UserId == userId)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Color,
                    c.CreatedAt,
                    TaskCount = c.Tasks.Count
                })
                .ToListAsync();

            return Ok(categories);
        }

        // GET: api/categories/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategory(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var category = await _context.Categories
                .Where(c => c.Id == id && c.UserId == userId)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Color,
                    c.CreatedAt,
                    TaskCount = c.Tasks.Count
                })
                .FirstOrDefaultAsync();

            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            return Ok(category);
        }

        // POST: api/categories
        [HttpPost]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Category name is required" });
            }

            // Check if category with same name already exists for this user
            var existingCategory = await _context.Categories
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Name.ToLower() == request.Name.ToLower());

            if (existingCategory != null)
            {
                return BadRequest(new { message = "Category with this name already exists" });
            }

            var category = new Category
            {
                Name = request.Name,
                Color = request.Color ?? "#3b82f6",
                CreatedAt = DateTime.UtcNow,
                UserId = userId
            };

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, new
            {
                category.Id,
                category.Name,
                category.Color,
                category.CreatedAt,
                TaskCount = 0
            });
        }

        // PUT: api/categories/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateCategoryRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var category = await _context.Categories
                .Include(c => c.Tasks)
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            // Update fields
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                // Check if another category with same name exists
                var existingCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.Id != id && c.Name.ToLower() == request.Name.ToLower());

                if (existingCategory != null)
                {
                    return BadRequest(new { message = "Category with this name already exists" });
                }

                category.Name = request.Name;
            }

            if (request.Color != null)
            {
                category.Color = request.Color;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                category.Id,
                category.Name,
                category.Color,
                category.CreatedAt,
                TaskCount = category.Tasks.Count
            });
        }

        // DELETE: api/categories/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var category = await _context.Categories
                .Include(c => c.Tasks)
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            // Check if category has tasks
            if (category.Tasks.Any())
            {
                return BadRequest(new { message = "Cannot delete category with existing tasks. Please reassign or delete the tasks first." });
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Category deleted successfully" });
        }
    }

    // Request models
    public class CreateCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Color { get; set; }
    }

    public class UpdateCategoryRequest
    {
        public string? Name { get; set; }
        public string? Color { get; set; }
    }
}
