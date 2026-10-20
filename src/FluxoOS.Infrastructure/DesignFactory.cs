using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FluxoOS.Infrastructure;

public class DesignFactory : IDesignTimeDbContextFactory<FlowDb>
{
    public FlowDb CreateDbContext(string[] args) =>
        new(
            new DbContextOptionsBuilder<FlowDb>()
                .UseNpgsql(
                    Environment.GetEnvironmentVariable("ConnectionStrings__Database")
                        ?? "Host=localhost;Database=fluxo;Username=fluxo"
                )
                .Options
        );
}
