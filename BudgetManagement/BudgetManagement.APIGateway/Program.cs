using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// Cookie HttpOnly (refresh token) yêu cầu AllowCredentials + origin cụ thể —
// KHÔNG dùng AllowAnyOrigin được nữa (trình duyệt chặn credentials với "*").
// Danh sách origin đọc từ cấu hình "Cors:AllowedOrigins", fallback về dev.
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? new[]
    {
        "http://localhost:5173",  // Vite dev
        "http://127.0.0.1:5173",
        "http://localhost:4173",  // Vite preview
        "http://127.0.0.1:4173",
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
    );
});

builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();

app.UseCors("AllowFrontend");

await app.UseOcelot();

app.Run();
