using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NivoxarAPI.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFriendRejectedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAt",
                table: "Friends",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RejectedAt",
                table: "Friends");
        }
    }
}
