using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using backend.Data;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Railway provides PORT env var
var port = Environment.GetEnvironmentVariable("PORT") ?? "5062";
builder.WebHost.UseUrls($"http://+:{port}");

// Database — PostgreSQL in production (Railway), SQLite for local dev
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(databaseUrl))
{
    // Railway provides postgres://user:pass@host:port/db — convert to Npgsql format
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    var connStr = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
    builder.Services.AddDbContext<AppDbContext>(opt =>
    {
        opt.UseNpgsql(connStr);
        opt.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
    });
}
else
{
    builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlite("Data Source=claims.db"));
}

// Services
builder.Services.AddScoped<IFileStorageService, FileStorageService>();

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddOpenApi();

// CORS for React dev server (dev only)
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("AllowFrontend", p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

// File upload size limit (50MB)
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 52_428_800);

var app = builder.Build();

// Auto-create/migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        if (!string.IsNullOrEmpty(databaseUrl))
        {
            // PostgreSQL — create schema directly from model (no SQLite migrations)
            db.Database.EnsureCreated();
            logger.LogInformation("PostgreSQL database schema ensured.");
        }
        else
        {
            // SQLite local dev — use migrations
            db.Database.Migrate();
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database initialization failed.");
        throw;
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("AllowFrontend");
}

// Serve React frontend static files
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

// SPA fallback — any non-API, non-file route falls back to index.html
app.MapFallbackToFile("index.html");

app.Run();

