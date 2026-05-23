using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mona_Interior.Migrations
{
    /// <inheritdoc />
    public partial class AddSiteFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "AdvanceBalance",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "BankDetails",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "GovId",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "SalaryType",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "WorkerId",
                table: "Employees");

            migrationBuilder.AddColumn<string>(
                name: "AssignedTeam",
                table: "Sites",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Sites",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ProjectTitle",
                table: "Quotations",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "WorkDescription",
                table: "Quotations",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ProjectTitle",
                table: "Invoices",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "WorkDescription",
                table: "Invoices",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedTeam",
                table: "Sites");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Sites");

            migrationBuilder.DropColumn(
                name: "ProjectTitle",
                table: "Quotations");

            migrationBuilder.DropColumn(
                name: "WorkDescription",
                table: "Quotations");

            migrationBuilder.DropColumn(
                name: "ProjectTitle",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "WorkDescription",
                table: "Invoices");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Employees",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "AdvanceBalance",
                table: "Employees",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "BankDetails",
                table: "Employees",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "GovId",
                table: "Employees",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SalaryType",
                table: "Employees",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "WorkerId",
                table: "Employees",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }
    }
}
