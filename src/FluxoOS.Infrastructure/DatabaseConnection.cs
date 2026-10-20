using Npgsql;

namespace FluxoOS.Infrastructure;

public static class DatabaseConnection
{
    public static string Resolve(string? connectionString, string? databaseUrl)
    {
        if (!string.IsNullOrWhiteSpace(connectionString))
            return connectionString;
        try
        {
            if (
                !Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri)
                || uri.Scheme is not ("postgres" or "postgresql")
                || string.IsNullOrWhiteSpace(uri.Host)
            )
                throw new FormatException();
            var credentials = uri.UserInfo.Split(':', 2);
            var database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
            if (
                credentials.Length != 2
                || string.IsNullOrWhiteSpace(credentials[0])
                || string.IsNullOrWhiteSpace(database)
                || database.Contains('/')
            )
                throw new FormatException();

            // URLs come from the hosting environment, never from a browser request.
            // TLS verification cannot be weakened through URL query parameters.
            return new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Port = uri.Port > 0 ? uri.Port : 5432,
                Database = database,
                Username = Uri.UnescapeDataString(credentials[0]),
                Password = Uri.UnescapeDataString(credentials[1]),
                SslMode = SslMode.VerifyFull,
                MaxPoolSize = 10,
                MinPoolSize = 0,
                ConnectionIdleLifetime = 60,
                Timeout = 15,
                CommandTimeout = 30,
                IncludeErrorDetail = false,
            }.ConnectionString;
        }
        catch
        {
            // Do not include the URL or an inner exception that could expose it.
            throw new InvalidOperationException(
                "Configure ConnectionStrings__Database ou DATABASE_URL com uma conexão PostgreSQL válida."
            );
        }
    }
}
