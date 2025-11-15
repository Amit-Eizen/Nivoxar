using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Nivoxar.Models.Entities;

namespace Nivoxar.Data
{
    public class NivoxarDbContext : IdentityDbContext<User>
    {
        public NivoxarDbContext(DbContextOptions<NivoxarDbContext> options) : base(options)
        {
        }

        // DbSets - All database tables
        public DbSet<TaskEntity> Tasks { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<SubTask> SubTasks { get; set; }
        public DbSet<SharedTask> SharedTasks { get; set; }
        public DbSet<SharedTaskParticipant> SharedTaskParticipants { get; set; }
        public DbSet<Friend> Friends { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<VerificationCode> VerificationCodes { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // TaskEntity Configuration
            builder.Entity<TaskEntity>(entity =>
            {
                entity.ToTable("Tasks");
                entity.HasKey(t => t.Id);
                entity.Property(t => t.Title).IsRequired().HasMaxLength(200);
                entity.Property(t => t.Description).HasMaxLength(1000);
                entity.Property(t => t.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                // Relationships
                entity.HasOne(t => t.User)
                    .WithMany(u => u.Tasks)
                    .HasForeignKey(t => t.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(t => t.Category)
                    .WithMany(c => c.Tasks)
                    .HasForeignKey(t => t.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Indexes
                entity.HasIndex(t => t.UserId);
                entity.HasIndex(t => t.CreatedAt);
                entity.HasIndex(t => t.DueDate);
            });

            // Category Configuration
            builder.Entity<Category>(entity =>
            {
                entity.ToTable("Categories");
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
                entity.Property(c => c.Color).HasMaxLength(7);
                entity.Property(c => c.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(c => c.User)
                    .WithMany(u => u.Categories)
                    .HasForeignKey(c => c.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SubTask Configuration
            builder.Entity<SubTask>(entity =>
            {
                entity.ToTable("SubTasks");
                entity.HasKey(st => st.Id);
                entity.Property(st => st.Title).IsRequired().HasMaxLength(200);
                entity.Property(st => st.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(st => st.Task)
                    .WithMany(t => t.SubTasks)
                    .HasForeignKey(st => st.TaskId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(st => st.TaskId);
            });

            // SharedTask Configuration
            builder.Entity<SharedTask>(entity =>
            {
                entity.ToTable("SharedTasks");
                entity.HasKey(st => st.Id);
                entity.Property(st => st.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
                entity.Property(st => st.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(st => st.Task)
                    .WithMany(t => t.SharedTasks)
                    .HasForeignKey(st => st.TaskId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(st => st.Owner)
                    .WithMany()
                    .HasForeignKey(st => st.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // SharedTaskParticipant Configuration
            builder.Entity<SharedTaskParticipant>(entity =>
            {
                entity.ToTable("SharedTaskParticipants");
                entity.HasKey(p => p.Id);
                entity.Property(p => p.AddedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(p => p.SharedTask)
                    .WithMany(st => st.Participants)
                    .HasForeignKey(p => p.SharedTaskId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(p => p.User)
                    .WithMany()
                    .HasForeignKey(p => p.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Friend Configuration
            builder.Entity<Friend>(entity =>
            {
                entity.ToTable("Friends");
                entity.HasKey(f => f.Id);
                entity.Property(f => f.Status).IsRequired().HasMaxLength(20);
                entity.Property(f => f.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(f => f.UserInitiator)
                    .WithMany(u => u.FriendsInitiated)
                    .HasForeignKey(f => f.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(f => f.UserReceiver)
                    .WithMany(u => u.FriendsReceived)
                    .HasForeignKey(f => f.FriendId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(f => f.UserId);
                entity.HasIndex(f => f.FriendId);
            });

            // Notification Configuration
            builder.Entity<Notification>(entity =>
            {
                entity.ToTable("Notifications");
                entity.HasKey(n => n.Id);
                entity.Property(n => n.Type).IsRequired().HasMaxLength(50);
                entity.Property(n => n.Title).IsRequired().HasMaxLength(200);
                entity.Property(n => n.Message).IsRequired().HasMaxLength(1000);
                entity.Property(n => n.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(n => n.User)
                    .WithMany(u => u.Notifications)
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(n => n.UserId);
                entity.HasIndex(n => n.Read);
                entity.HasIndex(n => n.CreatedAt);
            });

            // VerificationCode Configuration
            builder.Entity<VerificationCode>(entity =>
            {
                entity.ToTable("VerificationCodes");
                entity.HasKey(v => v.Id);
                entity.Property(v => v.Email).IsRequired().HasMaxLength(256);
                entity.Property(v => v.Code).IsRequired().HasMaxLength(6);
                entity.Property(v => v.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
                entity.Property(v => v.ExpiresAt).IsRequired();
                entity.Property(v => v.IsUsed).HasDefaultValue(false);

                entity.HasIndex(v => v.Email);
                entity.HasIndex(v => v.Code);
                entity.HasIndex(v => v.ExpiresAt);
            });
        }
    }
}
