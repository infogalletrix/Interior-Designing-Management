using Microsoft.EntityFrameworkCore;
using Mona_Interior;

var builder = WebApplication.CreateBuilder(args);

// 1. SERVICES
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. CORS — allow the Vite dev server
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000","http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// 3. MYSQL via Pomelo EF Core
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var serverVersion = ServerVersion.AutoDetect(connectionString);
builder.Services.AddDbContext<MonainteriorDbContext>(options =>
    options.UseMySql(connectionString, serverVersion));

// 4. CONFIGURE PORT 5000
builder.WebHost.UseUrls("http://localhost:5000");

var app = builder.Build();

try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<MonainteriorDbContext>();
    db.Database.CanConnect();
    Console.WriteLine("DB CONNECTION SUCCESSFUL!");
    
    // Seed sample data
    // try
    // {
    //     DataSeeder.SeedData(db);
    //     Console.WriteLine("DATA SEEDED SUCCESSFULLY!");
    // }
    // catch (Exception ex)
    // {
    //     Console.WriteLine("DATA SEEDING FAILED: " + ex.Message);
    // }
}
catch (Exception ex)
{
    Console.WriteLine("DB CONNECTION FAILED: " + ex.Message);
    if (ex.InnerException != null) Console.WriteLine("INNER EXCEPTION: " + ex.InnerException.Message);
}

// 5. PIPELINE
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.Run();