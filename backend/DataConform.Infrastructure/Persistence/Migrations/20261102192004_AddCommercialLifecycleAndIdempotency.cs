using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DataConform.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCommercialLifecycleAndIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CancelAtPeriodEnd",
                table: "workspaces",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "QuotaPeriodStartedAtUtc",
                table: "workspaces",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_stripe_idempotency",
                table: "audit_logs",
                columns: new[] { "Action", "EntityId" },
                unique: true,
                filter: "\"Action\" IN ('StripeWebhookProcessed', 'StripeCheckoutConfirmed')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_audit_logs_stripe_idempotency",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "CancelAtPeriodEnd",
                table: "workspaces");

            migrationBuilder.DropColumn(
                name: "QuotaPeriodStartedAtUtc",
                table: "workspaces");
        }
    }
}
