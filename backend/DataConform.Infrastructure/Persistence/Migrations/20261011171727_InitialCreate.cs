using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DataConform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "workspaces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workspaces", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "import_projects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkspaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TargetSystem = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_import_projects_workspaces_WorkspaceId",
                        column: x => x.WorkspaceId,
                        principalTable: "workspaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "import_files",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    StoredFileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ByteSize = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: true),
                    ValidRows = table.Column<int>(type: "integer", nullable: true),
                    ErrorRows = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_files", x => x.Id);
                    table.ForeignKey(
                        name: "FK_import_files_import_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "import_projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "validation_issues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileId = table.Column<Guid>(type: "uuid", nullable: false),
                    RowNumber = table.Column<int>(type: "integer", nullable: true),
                    ColumnName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IssueCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RawValue = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_validation_issues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_validation_issues_import_files_FileId",
                        column: x => x.FileId,
                        principalTable: "import_files",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_import_files_ProjectId",
                table: "import_files",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_import_projects_WorkspaceId",
                table: "import_projects",
                column: "WorkspaceId");

            migrationBuilder.CreateIndex(
                name: "IX_validation_issues_FileId_RowNumber",
                table: "validation_issues",
                columns: new[] { "FileId", "RowNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_validation_issues_FileId_Severity",
                table: "validation_issues",
                columns: new[] { "FileId", "Severity" });

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_Slug",
                table: "workspaces",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "validation_issues");

            migrationBuilder.DropTable(
                name: "import_files");

            migrationBuilder.DropTable(
                name: "import_projects");

            migrationBuilder.DropTable(
                name: "workspaces");
        }
    }
}
