using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DataConform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStripeBillingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PlanExpiresAtUtc",
                table: "workspaces",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeCustomerId",
                table: "workspaces",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StripeSubscriptionId",
                table: "workspaces",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_StripeCustomerId",
                table: "workspaces",
                column: "StripeCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_workspaces_StripeSubscriptionId",
                table: "workspaces",
                column: "StripeSubscriptionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_workspaces_StripeCustomerId",
                table: "workspaces");

            migrationBuilder.DropIndex(
                name: "IX_workspaces_StripeSubscriptionId",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "PlanExpiresAtUtc",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "StripeCustomerId",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "StripeSubscriptionId",
                table: "workspaces");
        }
    }
}
