using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mona_Interior.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
        }
    }
}
