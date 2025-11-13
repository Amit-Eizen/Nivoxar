using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nivoxar.Data;

namespace Nivoxar.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly NivoxarDbContext _context;

        public AnalyticsController(NivoxarDbContext context)
        {
            _context = context;
        }

        // GET: api/analytics/overview
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var now = DateTime.UtcNow;
            var today = now.Date;
            var weekStart = today.AddDays(-(int)today.DayOfWeek);
            var monthStart = new DateTime(now.Year, now.Month, 1);

            var tasks = await _context.Tasks
                .Where(t => t.UserId == userId)
                .ToListAsync();

            var totalTasks = tasks.Count;
            var completedTasks = tasks.Count(t => t.Completed);
            var activeTasks = totalTasks - completedTasks;
            var overdueTasks = tasks.Count(t => !t.Completed && t.DueDate.HasValue && t.DueDate.Value.Date < today);

            // Completion rate
            var completionRate = totalTasks > 0 ? Math.Round((double)completedTasks / totalTasks * 100, 1) : 0;

            // Tasks by priority
            var highPriority = tasks.Count(t => !t.Completed && t.Priority == 1);
            var mediumPriority = tasks.Count(t => !t.Completed && t.Priority == 2);
            var lowPriority = tasks.Count(t => !t.Completed && t.Priority == 3);

            // Tasks completed today, this week, this month
            var completedToday = tasks.Count(t => t.Completed && t.CompletedAt.HasValue && t.CompletedAt.Value.Date == today);
            var completedThisWeek = tasks.Count(t => t.Completed && t.CompletedAt.HasValue && t.CompletedAt.Value.Date >= weekStart);
            var completedThisMonth = tasks.Count(t => t.Completed && t.CompletedAt.HasValue && t.CompletedAt.Value.Date >= monthStart);

            // Tasks by category
            var tasksByCategory = await _context.Tasks
                .Where(t => t.UserId == userId)
                .GroupBy(t => t.Category != null ? t.Category.Name : "Uncategorized")
                .Select(g => new
                {
                    category = g.Key,
                    total = g.Count(),
                    completed = g.Count(t => t.Completed),
                    active = g.Count(t => !t.Completed)
                })
                .ToListAsync();

            return Ok(new
            {
                overview = new
                {
                    totalTasks,
                    completedTasks,
                    activeTasks,
                    overdueTasks,
                    completionRate
                },
                byPriority = new
                {
                    high = highPriority,
                    medium = mediumPriority,
                    low = lowPriority
                },
                completionStats = new
                {
                    today = completedToday,
                    thisWeek = completedThisWeek,
                    thisMonth = completedThisMonth
                },
                byCategory = tasksByCategory
            });
        }

        // GET: api/analytics/productivity
        [HttpGet("productivity")]
        public async Task<IActionResult> GetProductivityStats([FromQuery] int days = 30)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var startDate = DateTime.UtcNow.Date.AddDays(-days);

            var completedTasks = await _context.Tasks
                .Where(t => t.UserId == userId && t.Completed && t.CompletedAt.HasValue && t.CompletedAt.Value.Date >= startDate)
                .ToListAsync();

            // Group by date
            var dailyStats = completedTasks
                .GroupBy(t => t.CompletedAt!.Value.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    count = g.Count()
                })
                .OrderBy(x => x.date)
                .ToList();

            // Calculate streak
            var today = DateTime.UtcNow.Date;
            var currentStreak = 0;
            var checkDate = today;

            while (true)
            {
                var hasTasksOnDate = completedTasks.Any(t => t.CompletedAt!.Value.Date == checkDate);
                if (hasTasksOnDate)
                {
                    currentStreak++;
                    checkDate = checkDate.AddDays(-1);
                }
                else
                {
                    break;
                }
            }

            // Average tasks per day
            var avgTasksPerDay = days > 0 ? Math.Round((double)completedTasks.Count / days, 1) : 0;

            return Ok(new
            {
                dailyStats,
                currentStreak,
                totalCompleted = completedTasks.Count,
                avgTasksPerDay,
                periodDays = days
            });
        }

        // GET: api/analytics/categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategoryStats()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var categories = await _context.Categories
                .Where(c => c.UserId == userId)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Color,
                    totalTasks = c.Tasks.Count,
                    completedTasks = c.Tasks.Count(t => t.Completed),
                    activeTasks = c.Tasks.Count(t => !t.Completed),
                    completionRate = c.Tasks.Count > 0 ? Math.Round((double)c.Tasks.Count(t => t.Completed) / c.Tasks.Count * 100, 1) : 0
                })
                .OrderByDescending(c => c.totalTasks)
                .ToListAsync();

            return Ok(categories);
        }

        // GET: api/analytics/trends
        [HttpGet("trends")]
        public async Task<IActionResult> GetTrends([FromQuery] int months = 6)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var startDate = DateTime.UtcNow.Date.AddMonths(-months);

            var tasks = await _context.Tasks
                .Where(t => t.UserId == userId && t.CreatedAt >= startDate)
                .ToListAsync();

            // Group by month
            var monthlyStats = tasks
                .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    monthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                    created = g.Count(),
                    completed = g.Count(t => t.Completed && t.CompletedAt.HasValue &&
                                         t.CompletedAt.Value.Year == g.Key.Year &&
                                         t.CompletedAt.Value.Month == g.Key.Month)
                })
                .OrderBy(x => x.year)
                .ThenBy(x => x.month)
                .ToList();

            return Ok(monthlyStats);
        }

        // GET: api/analytics/recurring
        [HttpGet("recurring")]
        public async Task<IActionResult> GetRecurringStats()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var recurringTasks = await _context.Tasks
                .Where(t => t.UserId == userId && t.IsRecurring)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    t.RecurringFrequency,
                    t.Completed,
                    t.CompletedAt,
                    t.DueDate
                })
                .ToListAsync();

            var totalRecurring = recurringTasks.Count;
            var completedRecurring = recurringTasks.Count(t => t.Completed);
            var activeRecurring = totalRecurring - completedRecurring;

            var byFrequency = recurringTasks
                .GroupBy(t => t.RecurringFrequency ?? "none")
                .Select(g => new
                {
                    frequency = g.Key,
                    count = g.Count(),
                    completed = g.Count(t => t.Completed)
                })
                .ToList();

            return Ok(new
            {
                totalRecurring,
                completedRecurring,
                activeRecurring,
                byFrequency
            });
        }

        // GET: api/analytics/shared
        [HttpGet("shared")]
        public async Task<IActionResult> GetSharedTasksStats()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var sharedTasks = await _context.SharedTasks
                .Include(st => st.Participants)
                .Include(st => st.Task)
                .Where(st => st.OwnerId == userId || st.Participants.Any(p => p.UserId == userId))
                .ToListAsync();

            var totalShared = sharedTasks.Count;
            var asOwner = sharedTasks.Count(st => st.OwnerId == userId);
            var asParticipant = totalShared - asOwner;
            var completedShared = sharedTasks.Count(st => st.Task.Completed);

            return Ok(new
            {
                totalShared,
                asOwner,
                asParticipant,
                completedShared,
                activeShared = totalShared - completedShared
            });
        }
    }
}
