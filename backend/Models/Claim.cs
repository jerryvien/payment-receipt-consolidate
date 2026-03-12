using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Claim
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public decimal Amount { get; set; }

    public ClaimStatus Status { get; set; } = ClaimStatus.Draft;

    [Required, MaxLength(100)]
    public string SubmittedBy { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ReviewedBy { get; set; }

    [MaxLength(1000)]
    public string? ReviewNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<ClaimFile> Files { get; set; } = new();
}
