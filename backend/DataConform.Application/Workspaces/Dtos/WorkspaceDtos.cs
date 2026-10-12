using DataConform.Domain.Enums;

namespace DataConform.Application.Workspaces.Dtos;

public class CreateWorkspaceRequest
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}

public class UpdatePlanRequest
{
    public PlanTier Plan { get; set; }
}

public class WorkspaceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public int ProjectsCount { get; set; }
    public PlanTier Plan { get; set; } = PlanTier.Starter;
    public int MonthlyFilesUploaded { get; set; }
    public int MonthlyFilesQuota { get; set; }
    public int MaxRowsPerFile { get; set; }
}
