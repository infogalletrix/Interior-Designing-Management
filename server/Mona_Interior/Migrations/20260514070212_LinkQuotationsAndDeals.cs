using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mona_Interior.Migrations
{
    /// <inheritdoc />
    public partial class LinkQuotationsAndDeals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DealId",
                table: "Quotations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Quotations",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DealId",
                table: "Quotations");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Quotations");
        }
    }
}
