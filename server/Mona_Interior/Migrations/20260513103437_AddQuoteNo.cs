using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mona_Interior.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteNo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QuoteNo",
                table: "Quotations",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuoteNo",
                table: "Quotations");
        }
    }
}
