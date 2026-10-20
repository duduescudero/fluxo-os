using System.Security.Claims;
using FluxoOS.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

public class FlowClaimsFactory(
    UserManager<AppUser> users,
    RoleManager<IdentityRole> roles,
    IOptions<IdentityOptions> options
) : UserClaimsPrincipalFactory<AppUser, IdentityRole>(users, roles, options)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(AppUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim("display_name", user.DisplayName));
        return identity;
    }
}
