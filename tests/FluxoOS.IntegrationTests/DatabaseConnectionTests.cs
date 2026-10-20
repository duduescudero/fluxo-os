using FluxoOS.Infrastructure;
using Npgsql;
using Xunit;

namespace FluxoOS.IntegrationTests;

public class DatabaseConnectionTests
{
    [Fact]
    public void Explicit_connection_string_takes_precedence()
    {
        const string direct = "Host=localhost;Database=fluxo;Username=fluxo";
        Assert.Equal(direct, DatabaseConnection.Resolve(direct, "invalid-url"));
    }

    [Fact]
    public void Url_decodes_credentials_and_database_without_connection_string_injection()
    {
        var parsed = new NpgsqlConnectionStringBuilder(
            DatabaseConnection.Resolve(
                null,
                "postgresql://demo%40user:p%3Aa%3Bss%2Fword@db.example:5433/fluxo%20demo?sslmode=disable"
            )
        );
        Assert.Equal("demo@user", parsed.Username);
        Assert.Equal("p:a;ss/word", parsed.Password);
        Assert.Equal("fluxo demo", parsed.Database);
        Assert.Equal("db.example", parsed.Host);
        Assert.Equal(5433, parsed.Port);
        Assert.Equal(SslMode.VerifyFull, parsed.SslMode);
        Assert.False(parsed.IncludeErrorDetail);
        Assert.Equal(10, parsed.MaxPoolSize);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("https://demo:secret@db.example/fluxo")]
    [InlineData("postgresql://demo:secret@db.example/")]
    [InlineData("postgresql://demo@db.example/fluxo")]
    [InlineData("postgresql://demo:secret@db.example/fluxo/extra")]
    public void Invalid_urls_fail_without_disclosing_credentials(string? url)
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            DatabaseConnection.Resolve(null, url)
        );
        Assert.DoesNotContain("secret", error.ToString());
        Assert.Null(error.InnerException);
    }
}
