using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using DataConform.Application.Common.Interfaces;
using DataConform.Application.Common.Models;
using DataConform.Application.Files.Dtos;

namespace DataConform.Api.Endpoints;

public static class FileEndpoints
{
    public static RouteGroupBuilder MapFileEndpoints(this IEndpointRouteBuilder routes)
    {
        RouteGroupBuilder group = routes.MapGroup("/api")
            .WithTags("Files")
            .RequireAuthorization();

        group.MapPost("/projects/{projectId:guid}/files/upload", UploadFile)
            .WithName("UploadFile")
            .DisableAntiforgery()
            .Produces<ImportFileDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/projects/{projectId:guid}/files", GetFilesByProject)
            .WithName("GetFilesByProject")
            .Produces<List<ImportFileDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/files/{fileId:guid}/validate", ValidateFile)
            .WithName("ValidateFile")
            .Produces<ValidationReportDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapGet("/files/{fileId:guid}/report", GetValidationReport)
            .WithName("GetValidationReport")
            .Produces<ValidationReportDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapDelete("/files/{fileId:guid}", DeleteFile)
            .WithName("DeleteFile")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> UploadFile(
        Guid projectId,
        IFormFile? file,
        ClaimsPrincipal claimsPrincipal,
        IFileService fileService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        using Stream? stream = file != null && file.Length > 0 ? file.OpenReadStream() : null;

        ServiceResult<ImportFileDto> result = await fileService.UploadFileAsync(
            projectId,
            file?.FileName,
            file?.ContentType,
            file?.Length ?? 0,
            stream,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult(result.Data != null ? $"/api/files/{result.Data.Id}/report" : null);
    }

    private static async Task<IResult> GetFilesByProject(
        Guid projectId,
        ClaimsPrincipal claimsPrincipal,
        IFileService fileService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<List<ImportFileDto>> result = await fileService.GetFilesByProjectAsync(
            projectId,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> ValidateFile(
        Guid fileId,
        [FromQuery] string? requiredColumns,
        ClaimsPrincipal claimsPrincipal,
        IFileService fileService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<ValidationReportDto> result = await fileService.ValidateFileAsync(
            fileId,
            requiredColumns,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> GetValidationReport(
        Guid fileId,
        ClaimsPrincipal claimsPrincipal,
        IFileService fileService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        Guid? primaryWorkspaceId = TenantAuthorizationHelper.GetPrimaryWorkspaceId(claimsPrincipal);

        ServiceResult<ValidationReportDto> result = await fileService.GetValidationReportAsync(
            fileId,
            userId,
            primaryWorkspaceId,
            cancellationToken);

        return result.ToHttpResult();
    }

    private static async Task<IResult> DeleteFile(
        Guid fileId,
        ClaimsPrincipal claimsPrincipal,
        IFileService fileService,
        CancellationToken cancellationToken)
    {
        Guid? userId = TenantAuthorizationHelper.GetAuthenticatedUserId(claimsPrincipal);
        ServiceResult result = await fileService.DeleteFileAsync(fileId, userId, cancellationToken);
        return result.ToHttpResult();
    }
}
