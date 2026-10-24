using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DataConform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOptimizationIndexesAndOwner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_import_projects_WorkspaceId",
                table: "import_projects");

            migrationBuilder.DropIndex(
                name: "IX_import_files_ProjectId",
                table: "import_files");

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "workspaces",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_OwnerUserId",
                table: "workspaces",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_import_projects_WorkspaceId_CreatedAt",
                table: "import_projects",
                columns: new[] { "WorkspaceId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_import_files_ProjectId_CreatedAt",
                table: "import_files",
                columns: new[] { "ProjectId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId_Action",
                table: "audit_logs",
                columns: new[] { "UserId", "Action" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_workspaces_OwnerUserId",
                table: "workspaces");

            migrationBuilder.DropIndex(
                name: "IX_import_projects_WorkspaceId_CreatedAt",
                table: "import_projects");

            migrationBuilder.DropIndex(
                name: "IX_import_files_ProjectId_CreatedAt",
                table: "import_files");

            migrationBuilder.DropIndex(
                name: "IX_audit_logs_UserId_Action",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "workspaces");

            migrationBuilder.CreateIndex(
                name: "IX_import_projects_WorkspaceId",
                table: "import_projects",
                column: "WorkspaceId");

            migrationBuilder.CreateIndex(
                name: "IX_import_files_ProjectId",
                table: "import_files",
                column: "ProjectId");
        }
    }
}
