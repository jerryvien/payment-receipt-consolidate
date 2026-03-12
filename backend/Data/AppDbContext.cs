using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Claim> Claims => Set<Claim>();
    public DbSet<ClaimFile> ClaimFiles => Set<ClaimFile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Claim>(e =>
        {
            e.Property(c => c.Amount).HasColumnType("decimal(18,2)");
            e.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);
            e.HasMany(c => c.Files).WithOne(f => f.Claim).HasForeignKey(f => f.ClaimId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
