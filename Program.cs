using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using System;
using DotNetEnv;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

/* SKILLS API */

var skills = new List<Skill>();

// GET skills
app.MapGet("/api/skills", () => skills);

//GET skill by id
app.MapGet("/api/skills/{id}", (int id) =>
{
    var skill = skills.FirstOrDefault(s => s.Id == id);
    IResult result = skill == null ? Results.NotFound() : Results.Ok(skill);

    return result;
});

// POST new skill
app.MapPost("/api/skills", (Skill skill) =>
{
    skills.Add(skill);

    return Results.Created($"/api/skills/{skill.Id}", skill);
});

// PUT update skill
app.MapPut("/api/skills/{id}", (int id, Skill skill) =>
{
    var existingSkill = skills.FirstOrDefault(s => s.Id == id);

    if (existingSkill == null)
    {
        return Results.NotFound();
    }

    existingSkill.Name = skill.Name;
    existingSkill.Proficiency = skill.Proficiency;

    return Results.Ok(existingSkill);
});

// DELETE skill
app.MapDelete("/api/skills/{id}", (int id) =>
{
    var existingSkill = skills.FirstOrDefault(s => s.Id == id);

    if (existingSkill == null)
    {
        return Results.NotFound();
    }

    skills.Remove(existingSkill);

    return Results.NoContent();
});

// write skills to file
app.MapPost("/api/skills/write", () =>
{
    foreach (var skill in skills)
    {
        skill.WriteToFile();
    }

    return Results.Ok();
});

/* JOB DESCRIPTION */

// GET job description
// 
app.MapGet("/api/jobdescription", (string url) =>
{
    var webScraper = new WebScraper(url);
    var jobDescription = webScraper.GetJobDescription();

    return Results.Ok(jobDescription);
});

app.Run();

public class Skill
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Proficiency { get; set; }

    // Write to text file
    public void WriteToFile()
    {
        using (StreamWriter sw = File.AppendText("skills.txt"))
        {
            sw.WriteLine($"Id: {Id}, Name: {Name}, Proficiency: {Proficiency}");
        }
    }
}

public class WebScraper
{
    public string Url { get; set; }
    
    public WebScraper(string url)
    {
        Env.Load();
        Url = url;
    }

    public string GetJobDescription()
    {
        var options = new ChromeOptions();
        string? USERNAME = Environment.GetEnvironmentVariable("USERNAME");
        string? PASSWORD = Environment.GetEnvironmentVariable("PASSWORD");
        options.AddArgument("start-maximized");

        using (var driver = new ChromeDriver(options))
        {
            driver.Navigate().GoToUrl("https://www.linkedin.com/login");

            // Find username and password fields and login button
            var usernameField = driver.FindElement(By.Id("username"));
            var passwordField = driver.FindElement(By.Id("password"));
            var loginButton = driver.FindElement(By.XPath("//button[@type='submit']"));

            // Enter credentials (replace with your LinkedIn username and password)
            usernameField.SendKeys(USERNAME);
            passwordField.SendKeys(PASSWORD);

            // Click on the login button
            loginButton.Click();

            // Wait for the page to load
            Thread.Sleep(5000); // Adjust the sleep time as necessary

            driver.Navigate().GoToUrl(Url);

            // Wait for the page to load
            Thread.Sleep(5000); // Adjust the sleep time as necessary

            // Find the job description element
            var jobDescriptionElement = driver.FindElement(By.XPath("//div[@class='mt4']//p"));

            return jobDescriptionElement.Text;
        }

    }
}
