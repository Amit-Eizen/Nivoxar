using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nivoxar.Migrations
{
    /// <inheritdoc />
    public partial class UseNameAsUserName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update UserName to clean version of Name (remove spaces and special chars)
            // This ensures UserName is valid for Identity while Name can have spaces
            migrationBuilder.Sql(@"
                UPDATE AspNetUsers
                SET UserName = CASE
                    WHEN Name IS NOT NULL AND Name != '' THEN
                        -- Remove all non-alphanumeric characters from Name
                        REPLACE(REPLACE(REPLACE(REPLACE(Name, ' ', ''), '-', ''), '_', ''), '.', '')
                    ELSE SUBSTRING(Email, 1, CHARINDEX('@', Email) - 1)
                END,
                NormalizedUserName = UPPER(CASE
                    WHEN Name IS NOT NULL AND Name != '' THEN
                        REPLACE(REPLACE(REPLACE(REPLACE(Name, ' ', ''), '-', ''), '_', ''), '.', '')
                    ELSE SUBSTRING(Email, 1, CHARINDEX('@', Email) - 1)
                END)
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert UserName back to email prefix
            migrationBuilder.Sql(@"
                UPDATE AspNetUsers
                SET UserName = SUBSTRING(Email, 1, CHARINDEX('@', Email) - 1),
                    NormalizedUserName = UPPER(SUBSTRING(Email, 1, CHARINDEX('@', Email) - 1))
                WHERE CHARINDEX('@', Email) > 0
            ");
        }
    }
}
