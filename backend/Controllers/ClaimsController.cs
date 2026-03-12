using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClaimsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _fileStorage;

    public ClaimsController(AppDbContext db, IFileStorageService fileStorage)
    {
        _db = db;
        _fileStorage = fileStorage;
    }

    // GET /api/claims?status=Draft
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var query = _db.Claims.Include(c => c.Files).AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClaimStatus>(status, true, out var parsed))
            query = query.Where(c => c.Status == parsed);

        var claims = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(claims);
    }

    // GET /api/claims/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var claim = await _db.Claims.Include(c => c.Files).FirstOrDefaultAsync(c => c.Id == id);
        if (claim == null) return NotFound();
        return Ok(claim);
    }

    // POST /api/claims
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ClaimCreateDto dto)
    {
        var claim = new Claim
        {
            Title = dto.Title,
            Description = dto.Description,
            Amount = dto.Amount,
            SubmittedBy = dto.SubmittedBy,
            Status = ClaimStatus.Draft
        };

        _db.Claims.Add(claim);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = claim.Id }, claim);
    }

    // PUT /api/claims/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ClaimUpdateDto dto)
    {
        var claim = await _db.Claims.FindAsync(id);
        if (claim == null) return NotFound();
        if (claim.Status != ClaimStatus.Draft)
            return BadRequest("Only draft claims can be edited.");

        if (dto.Title != null) claim.Title = dto.Title;
        if (dto.Description != null) claim.Description = dto.Description;
        if (dto.Amount.HasValue) claim.Amount = dto.Amount.Value;
        claim.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(claim);
    }

    // DELETE /api/claims/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var claim = await _db.Claims.Include(c => c.Files).FirstOrDefaultAsync(c => c.Id == id);
        if (claim == null) return NotFound();

        foreach (var file in claim.Files)
            _fileStorage.DeleteFile(file.StoredPath);

        _db.Claims.Remove(claim);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/claims/{id}/files
    [HttpPost("{id}/files")]
    public async Task<IActionResult> UploadFiles(int id, [FromForm] List<IFormFile> files)
    {
        var claim = await _db.Claims.FindAsync(id);
        if (claim == null) return NotFound();

        var allowedTypes = new HashSet<string>
        {
            "application/pdf",
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv"
        };

        var uploaded = new List<ClaimFile>();

        foreach (var file in files)
        {
            if (!allowedTypes.Contains(file.ContentType))
                continue;

            var storedPath = await _fileStorage.SaveFileAsync(file, id);
            var claimFile = new ClaimFile
            {
                ClaimId = id,
                FileName = file.FileName,
                StoredPath = storedPath,
                ContentType = file.ContentType,
                FileSize = file.Length
            };

            _db.ClaimFiles.Add(claimFile);
            uploaded.Add(claimFile);
        }

        await _db.SaveChangesAsync();
        return Ok(uploaded);
    }

    // DELETE /api/claims/{id}/files/{fileId}
    [HttpDelete("{id}/files/{fileId}")]
    public async Task<IActionResult> DeleteFile(int id, int fileId)
    {
        var file = await _db.ClaimFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.ClaimId == id);
        if (file == null) return NotFound();

        _fileStorage.DeleteFile(file.StoredPath);
        _db.ClaimFiles.Remove(file);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/claims/{id}/files/{fileId}
    [HttpGet("{id}/files/{fileId}")]
    public async Task<IActionResult> DownloadFile(int id, int fileId)
    {
        var file = await _db.ClaimFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.ClaimId == id);
        if (file == null) return NotFound();

        var fullPath = _fileStorage.GetFullPath(file.StoredPath);
        if (!System.IO.File.Exists(fullPath)) return NotFound("File not found on disk.");

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);
        return File(stream, file.ContentType, file.FileName);
    }

    // POST /api/claims/{id}/submit
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(int id)
    {
        var claim = await _db.Claims.FindAsync(id);
        if (claim == null) return NotFound();
        if (claim.Status != ClaimStatus.Draft)
            return BadRequest("Only draft claims can be submitted.");

        claim.Status = ClaimStatus.Submitted;
        claim.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(claim);
    }

    // POST /api/claims/{id}/approve
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id, [FromBody] ClaimReviewDto dto)
    {
        var claim = await _db.Claims.FindAsync(id);
        if (claim == null) return NotFound();
        if (claim.Status != ClaimStatus.Submitted)
            return BadRequest("Only submitted claims can be approved.");

        claim.Status = ClaimStatus.Approved;
        claim.ReviewedBy = dto.ReviewedBy;
        claim.ReviewNotes = dto.ReviewNotes;
        claim.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(claim);
    }

    // POST /api/claims/{id}/reject
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] ClaimReviewDto dto)
    {
        var claim = await _db.Claims.FindAsync(id);
        if (claim == null) return NotFound();
        if (claim.Status != ClaimStatus.Submitted)
            return BadRequest("Only submitted claims can be rejected.");

        claim.Status = ClaimStatus.Rejected;
        claim.ReviewedBy = dto.ReviewedBy;
        claim.ReviewNotes = dto.ReviewNotes;
        claim.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(claim);
    }
}
