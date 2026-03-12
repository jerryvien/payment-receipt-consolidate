namespace backend.Models;

public class ClaimCreateDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string SubmittedBy { get; set; } = string.Empty;
}

public class ClaimUpdateDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public decimal? Amount { get; set; }
}

public class ClaimReviewDto
{
    public string ReviewedBy { get; set; } = string.Empty;
    public string? ReviewNotes { get; set; }
}
