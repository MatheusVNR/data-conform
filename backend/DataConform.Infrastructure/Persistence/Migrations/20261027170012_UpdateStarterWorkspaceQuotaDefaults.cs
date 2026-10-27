using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DataConform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateStarterWorkspaceQuotaDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "MonthlyFilesQuota",
                table: "workspaces",
                type: "integer",
                nullable: false,
                defaultValue: 5,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 20);

            migrationBuilder.AlterColumn<int>(
                name: "MaxRowsPerFile",
                table: "workspaces",
                type: "integer",
                nullable: false,
                defaultValue: 500,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 1000);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "MonthlyFilesQuota",
                table: "workspaces",
                type: "integer",
                nullable: false,
                defaultValue: 20,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 5);

            migrationBuilder.AlterColumn<int>(
                name: "MaxRowsPerFile",
                table: "workspaces",
                type: "integer",
                nullable: false,
                defaultValue: 1000,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 500);
        }
    }
}
