using System.Data.SqlClient;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    
    options.SerializerOptions.PropertyNamingPolicy = null; 
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors("AllowAll");


string connStr = "Server=DESKTOP-TN18MTD;Database=QuizSystem;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True;";


var cachedAnswers = new ConcurrentDictionary<int, int>();
int totalQuestionsCount = 0;


async Task LoadAnswersCacheAsync()
{
    try
    {
        using var conn = new SqlConnection(connStr);
        await conn.OpenAsync(); // ใช้ OpenAsync

        using var cmd = new SqlCommand("SELECT Id, CorrectChoice FROM Questions", conn);
        using var reader = await cmd.ExecuteReaderAsync(); // ใช้ ExecuteReaderAsync แก้บั๊ก NRE

        while (await reader.ReadAsync())
        {
            cachedAnswers[reader.GetInt32(0)] = reader.GetInt32(1);
        }
        totalQuestionsCount = cachedAnswers.Count;
        Console.WriteLine($"✅ Loaded {totalQuestionsCount} questions into memory cache");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error loading cache: {ex.Message}");
    }
}


await LoadAnswersCacheAsync();


app.MapGet("/api/questions", async () =>
{
    var questions = new List<object>();
    using var conn = new SqlConnection(connStr);
    await conn.OpenAsync();

    using var cmd = new SqlCommand("SELECT Id, QuestionText, Choice1, Choice2, Choice3, Choice4 FROM Questions", conn);
    using var reader = await cmd.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        questions.Add(new
        {
            Id = reader.GetInt32(0),
            QuestionText = reader.GetString(1),
            Choice1 = reader.GetString(2),
            Choice2 = reader.GetString(3),
            Choice3 = reader.GetString(4),
            Choice4 = reader.GetString(5)
        });
    }
    return Results.Ok(questions);
});


app.MapPost("/api/submit", async (SubmitRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Name) || req.Answers == null)
    {
        return Results.BadRequest(new { error = "ข้อมูลไม่ครบถ้วน" });
    }

    int score = 0;
    foreach (var kvp in req.Answers)
    {
        if (int.TryParse(kvp.Key, out int qId))
        {
            if (cachedAnswers.TryGetValue(qId, out int correctAns) && correctAns == kvp.Value)
            {
                score++;
            }
        }
    }

    using var conn = new SqlConnection(connStr);
    await conn.OpenAsync();

    using var cmd = new SqlCommand("INSERT INTO ExamResults (ExamineeName, Score, Total) VALUES (@Name, @Score, @Total)", conn);
    cmd.Parameters.AddWithValue("@Name", req.Name);
    cmd.Parameters.AddWithValue("@Score", score);
    cmd.Parameters.AddWithValue("@Total", totalQuestionsCount);

    await cmd.ExecuteNonQueryAsync(); // ใช้ ExecuteNonQueryAsync

    return Results.Ok(new { name = req.Name, score = score, total = totalQuestionsCount });
});

// กำหนด Port เป็น 3000 ให้ตรงกับที่ Angular ตั้งค่าไว้
app.Run("http://localhost:3000");

class SubmitRequest
{
    public string Name { get; set; }
    public Dictionary<string, int> Answers { get; set; }
}