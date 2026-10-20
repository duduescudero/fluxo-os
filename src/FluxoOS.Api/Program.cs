using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluxoOS.Application;
using FluxoOS.Domain;
using FluxoOS.Infrastructure;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;

var builder=WebApplication.CreateBuilder(args);
builder.Services.ConfigureHttpJsonOptions(o=>o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddDbContext<FlowDb>(o=>o.UseNpgsql(builder.Configuration.GetConnectionString("Database")??throw new InvalidOperationException("Configure ConnectionStrings__Database antes de iniciar.")));
builder.Services.AddScoped<IFlowDb>(sp=>sp.GetRequiredService<FlowDb>());
builder.Services.AddScoped<OrderService>();
builder.Services.AddIdentity<AppUser,IdentityRole>(o=>{
    o.Password.RequiredLength=12;o.Password.RequireNonAlphanumeric=true;
    o.Lockout.MaxFailedAccessAttempts=5;o.Lockout.DefaultLockoutTimeSpan=TimeSpan.FromMinutes(10);
    o.User.RequireUniqueEmail=true;
}).AddEntityFrameworkStores<FlowDb>().AddDefaultTokenProviders().AddClaimsPrincipalFactory<FlowClaimsFactory>();
builder.Services.ConfigureApplicationCookie(o=>{
    o.Cookie.Name="fluxo.session";o.Cookie.HttpOnly=true;o.Cookie.SameSite=SameSiteMode.Strict;
    o.Cookie.SecurePolicy=builder.Environment.IsDevelopment()||builder.Environment.IsEnvironment("Testing")?CookieSecurePolicy.SameAsRequest:CookieSecurePolicy.Always;
    o.ExpireTimeSpan=TimeSpan.FromHours(2);o.SlidingExpiration=true;
    o.Events.OnRedirectToLogin=c=>{c.Response.StatusCode=401;return Task.CompletedTask;};
    o.Events.OnRedirectToAccessDenied=c=>{c.Response.StatusCode=403;return Task.CompletedTask;};
});
builder.Services.Configure<SecurityStampValidatorOptions>(o=>o.ValidationInterval=TimeSpan.Zero);
builder.Services.AddAntiforgery(o=>{o.HeaderName="X-CSRF-TOKEN";o.Cookie.Name="fluxo.csrf";o.Cookie.SameSite=SameSiteMode.Strict;});
builder.Services.AddAuthorization();builder.Services.AddOpenApi();builder.Services.AddProblemDetails();
builder.Services.AddRateLimiter(o=>{
    o.RejectionStatusCode=429;
    o.AddPolicy("login",c=>RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString()??"local",_=>new FixedWindowRateLimiterOptions {PermitLimit=15,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));
});
builder.Services.AddHealthChecks().AddDbContextCheck<FlowDb>();
var keys=builder.Configuration["DataProtection:Path"];
if(!string.IsNullOrWhiteSpace(keys)) builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keys)).SetApplicationName("FluxoOS");
var app=builder.Build();
var demo=app.Configuration.GetValue<bool>("Demo:Enabled");

app.Use(async(c,next)=>{
    c.Response.Headers["X-Content-Type-Options"]="nosniff";
    c.Response.Headers["Referrer-Policy"]="strict-origin-when-cross-origin";
    c.Response.Headers["Content-Security-Policy"]="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
    if(c.Request.Path.StartsWithSegments("/api")) c.Response.Headers.CacheControl="no-store";
    try {await next();}
    catch(Exception e) when(e is RuleException or AppException or DbUpdateConcurrencyException or AntiforgeryValidationException or BadHttpRequestException){
        int status=e switch {AppException x=>x.Status,DbUpdateConcurrencyException=>409,AntiforgeryValidationException=>400,_=>400};
        string message=e is DbUpdateConcurrencyException?"Os dados foram alterados em outra sessão. Atualize e tente novamente.":e is AntiforgeryValidationException?"Sua sessão de formulário expirou. Atualize a página.":e is BadHttpRequestException?"Revise o formato dos dados enviados.":e.Message;
        await Results.Problem(statusCode:status,title:message,extensions:new Dictionary<string,object?>{{"traceId",c.TraceIdentifier}}).ExecuteAsync(c);
    }
    catch(Exception e){
        app.Logger.LogError(e,"Falha na requisição {TraceId}",c.TraceIdentifier);
        if(!c.Response.HasStarted) await Results.Problem(statusCode:500,title:"Não foi possível concluir. Tente novamente ou informe o código de atendimento.",extensions:new Dictionary<string,object?>{{"traceId",c.TraceIdentifier}}).ExecuteAsync(c);
    }
});
app.UseAuthentication();app.UseAuthorization();app.UseRateLimiter();
app.Use(async(c,next)=>{
    if(c.Request.Path.StartsWithSegments("/api")&&c.Request.Method is not ("GET" or "HEAD" or "OPTIONS")) {
        await c.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(c);
        if(demo&&!c.Request.Path.StartsWithSegments("/api/auth")) {await Results.Problem(statusCode:403,title:"A demonstração pública é somente leitura. Execute localmente para experimentar alterações.").ExecuteAsync(c);return;}
    }
    await next();
});
app.MapGet("/health/live",()=>Results.Ok(new {status="ok"}));
app.MapHealthChecks("/health/ready");
app.MapGet("/api/auth/csrf",(HttpContext c,IAntiforgery af)=>new {token=af.GetAndStoreTokens(c).RequestToken,demo});
app.MapPost("/api/auth/login",async(LoginInput input,SignInManager<AppUser> signIn,UserManager<AppUser> users)=>{
    var u=await users.FindByEmailAsync(input.Email?.Trim()??"");
    if(u is null||u.Disabled) return Results.Problem(statusCode:401,title:"E-mail ou senha inválidos.");
    var result=await signIn.PasswordSignInAsync(u,input.Password??"",false,true);
    return result.Succeeded?Results.Ok(new {ok=true}):Results.Problem(statusCode:401,title:"E-mail ou senha inválidos ou acesso temporariamente bloqueado.");
}).RequireRateLimiting("login");
app.MapPost("/api/auth/demo",async(DemoInput input,UserManager<AppUser> users,SignInManager<AppUser> signIn)=>{
    if(!demo) return Results.NotFound();
    var email=input.Role=="Technician"?"tecnico@fluxo.example":"admin@fluxo.example";
    var user=await users.FindByEmailAsync(email);
    if(user is null||user.Disabled) return Results.Problem(statusCode:503,title:"Demonstração indisponível.");
    await signIn.SignInAsync(user,false);return Results.Ok(new {ok=true});
}).RequireRateLimiting("login");
app.MapPost("/api/auth/logout",async(SignInManager<AppUser> signIn)=>{await signIn.SignOutAsync();return Results.NoContent();}).RequireAuthorization();
app.MapGet("/api/auth/me",async(ClaimsPrincipal principal,UserManager<AppUser> users)=>{
    var u=await users.GetUserAsync(principal);
    return u is null||u.Disabled?Results.Unauthorized():Results.Ok(new {u.Id,u.DisplayName,u.Email,role=principal.IsInRole("Admin")?"Admin":"Technician",demo});
}).RequireAuthorization();
var api=app.MapGroup("/api").RequireAuthorization();
api.MapGet("/team",async(FlowDb db)=>await db.Users.Where(u=>!u.Disabled).OrderBy(u=>u.DisplayName).Select(u=>new {u.Id,u.DisplayName}).ToListAsync());
api.MapGet("/customers",async(HttpContext ctx,FlowDb db,OrderService service,string? search,int? page,int? pageSize)=>{
    var actor=GetActor(ctx.User);var query=db.Customers.AsNoTracking();
    if(!actor.Admin) query=query.Where(c=>service.Visible(actor).Any(o=>o.CustomerId==c.Id));
    if(!string.IsNullOrWhiteSpace(search)){var term=search.Trim().ToLower();query=query.Where(c=>c.Name.ToLower().Contains(term)||c.Phone.Contains(term));}
    var p=Math.Max(1,page??1);var size=Math.Clamp(pageSize??20,1,100);var total=await query.CountAsync();
    var items=await query.OrderBy(c=>c.Name).ThenBy(c=>c.Id).Skip((p-1)*size).Take(size).Select(c=>new CustomerDto(c.Id,c.Name,c.Phone,c.Email,c.Archived,c.Version)).ToListAsync();
    return new Page<CustomerDto>(items,total,p,size);
});
api.MapPost("/customers",async(CustomerInput input,HttpContext ctx,FlowDb db)=>{
    OrderService.Admin(GetActor(ctx.User));var c=new Customer();ApplyCustomer(c,input);db.Customers.Add(c);await db.SaveChangesAsync();return Results.Created($"/api/customers/{c.Id}",new CustomerDto(c.Id,c.Name,c.Phone,c.Email,c.Archived,c.Version));
});
api.MapPut("/customers/{id:guid}",async(Guid id,CustomerInput input,HttpContext ctx,FlowDb db)=>{
    OrderService.Admin(GetActor(ctx.User));var c=await db.Customers.FindAsync(id)??throw new AppException(404,"Cliente não encontrado.");
    if(input.Version!=c.Version) throw new AppException(409,"O cliente foi atualizado em outra sessão.");
    ApplyCustomer(c,input);c.Version=Guid.NewGuid();await db.SaveChangesAsync();return new CustomerDto(c.Id,c.Name,c.Phone,c.Email,c.Archived,c.Version);
});
api.MapGet("/equipment",async(Guid? customerId,HttpContext ctx,FlowDb db,OrderService service,int? page,int? pageSize)=>{
    var actor=GetActor(ctx.User);var q=db.Equipment.AsNoTracking();
    if(customerId.HasValue) q=q.Where(e=>e.CustomerId==customerId);
    if(!actor.Admin) q=q.Where(e=>service.Visible(actor).Any(o=>o.EquipmentId==e.Id));
    var p=Math.Max(1,page??1);var size=Math.Clamp(pageSize??20,1,100);var total=await q.CountAsync();
    var items=await q.OrderBy(e=>e.Brand).ThenBy(e=>e.Id).Skip((p-1)*size).Take(size).Select(e=>new EquipmentDto(e.Id,e.CustomerId,e.Customer.Name,e.Category,e.Brand,e.Model,e.Serial,e.Notes,e.Archived,e.Version)).ToListAsync();
    return new Page<EquipmentDto>(items,total,p,size);
});
api.MapPost("/equipment",async(EquipmentInput input,HttpContext ctx,FlowDb db)=>{
    OrderService.Admin(GetActor(ctx.User));if(!await db.Customers.AnyAsync(c=>c.Id==input.CustomerId&&!c.Archived)) throw new AppException(400,"Escolha um cliente ativo.");
    var e=new Equipment {CustomerId=input.CustomerId};ApplyEquipment(e,input);db.Equipment.Add(e);await db.SaveChangesAsync();return Results.Created($"/api/equipment/{e.Id}",new {e.Id});
});
api.MapPut("/equipment/{id:guid}",async(Guid id,EquipmentInput input,HttpContext ctx,FlowDb db)=>{
    OrderService.Admin(GetActor(ctx.User));var e=await db.Equipment.FindAsync(id)??throw new AppException(404,"Equipamento não encontrado.");
    if(e.Version!=input.Version) throw new AppException(409,"O equipamento foi atualizado em outra sessão.");
    if(e.CustomerId!=input.CustomerId) throw new AppException(400,"O proprietário não pode ser alterado. Preserve o histórico.");
    ApplyEquipment(e,input);e.Version=Guid.NewGuid();await db.SaveChangesAsync();return Results.Ok(new {e.Id});
});
api.MapGet("/orders",async(HttpContext ctx,OrderService service,string? search,OrderStatus? status,Priority? priority,string? technicianId,Guid? customerId,Guid? equipmentId,bool? overdue,string? sort,int? page,int? pageSize)=>{
    var q=service.Visible(GetActor(ctx.User)).AsNoTracking();
    if(!string.IsNullOrWhiteSpace(search)) {var term=search.Trim().ToLower();q=q.Where(o=>o.Customer.Name.ToLower().Contains(term)||o.Equipment.Model.ToLower().Contains(term)||o.Problem.ToLower().Contains(term)||o.Number.ToString().Contains(term));}
    if(status.HasValue)q=q.Where(o=>o.Status==status);if(priority.HasValue)q=q.Where(o=>o.Priority==priority);
    if(technicianId is not null)q=q.Where(o=>o.TechnicianId==technicianId);
    if(customerId.HasValue)q=q.Where(o=>o.CustomerId==customerId);
    if(equipmentId.HasValue)q=q.Where(o=>o.EquipmentId==equipmentId);
    if(overdue==true)q=q.Where(o=>o.DueAt<DateTimeOffset.UtcNow&&o.Status!=OrderStatus.Delivered&&o.Status!=OrderStatus.Cancelled);
    q=sort=="due"?q.OrderBy(o=>o.DueAt).ThenBy(o=>o.Number):q.OrderByDescending(o=>o.Number);
    var p=Math.Max(1,page??1);var size=Math.Clamp(pageSize??20,1,100);var total=await q.CountAsync();
    var items=await q.Skip((p-1)*size).Take(size).Select(o=>new {o.Id,o.Number,o.CustomerId,customerName=o.Customer.Name,equipmentName=o.Equipment.Brand+" "+o.Equipment.Model,o.TechnicianId,o.Problem,o.Priority,o.Status,o.CreatedAt,o.DueAt,o.Version}).ToListAsync();
    return Results.Ok(new {items,total,pageNumber=p,pageSize=size});
});
api.MapGet("/orders/{id:guid}",async(Guid id,HttpContext ctx,OrderService service)=>OrderService.Map(await service.Load(id,GetActor(ctx.User))));
api.MapPost("/orders",async(OrderInput input,HttpContext ctx,OrderService service,UserManager<AppUser> users)=>{
    if(input.TechnicianId is not null)await CheckTechnician(input.TechnicianId,users);
    var dto=await service.Create(input,GetActor(ctx.User));return Results.Created($"/api/orders/{dto.Id}",dto);
});
api.MapPost("/orders/{id:guid}/actions/{action}",async(Guid id,string action,OrderCommand input,HttpContext ctx,OrderService service,UserManager<AppUser> users)=>{
    if(action=="assign") {OrderService.Admin(GetActor(ctx.User));await CheckTechnician(input.TechnicianId??"",users);}
    return await service.Command(id,action,input,GetActor(ctx.User));
});
api.MapPost("/orders/{id:guid}/quotes",async(Guid id,QuoteInput input,HttpContext ctx,OrderService service)=>await service.Quote(id,input,GetActor(ctx.User)));
api.MapPost("/orders/{id:guid}/decision",async(Guid id,DecisionInput input,HttpContext ctx,OrderService service)=>await service.Decide(id,input,GetActor(ctx.User)));
api.MapGet("/dashboard",async(HttpContext ctx,OrderService service)=>{
    var q=service.Visible(GetActor(ctx.User));var now=DateTimeOffset.UtcNow;
    var groups=await q.GroupBy(o=>o.Status).Select(g=>new {status=g.Key,count=g.Count()}).ToListAsync();
    var open=await q.CountAsync(o=>o.Status!=OrderStatus.Delivered&&o.Status!=OrderStatus.Cancelled);
    var late=await q.CountAsync(o=>o.Status!=OrderStatus.Delivered&&o.Status!=OrderStatus.Cancelled&&o.DueAt<now);
    var recent=await q.OrderByDescending(o=>o.UpdatedAt).Take(6).Select(o=>new {o.Id,o.Number,customerName=o.Customer.Name,equipmentName=o.Equipment.Brand+" "+o.Equipment.Model,o.Status,o.Priority,o.DueAt}).ToListAsync();
    return new {open,late,groups,recent};
});
api.MapGet("/users",async(HttpContext c,UserManager<AppUser> users)=>{
    OrderService.Admin(GetActor(c.User));var list=await users.Users.OrderBy(u=>u.DisplayName).ToListAsync();var result=new List<object>();
    foreach(var u in list) result.Add(new {u.Id,u.DisplayName,u.Email,u.Disabled,role=await users.IsInRoleAsync(u,"Admin")?"Admin":"Technician"});
    return Results.Ok(result);
});
api.MapPost("/users",async(UserInput input,HttpContext c,UserManager<AppUser> users)=>{
    OrderService.Admin(GetActor(c.User));if(input.Role is not ("Admin" or "Technician"))throw new AppException(400,"Perfil inválido.");
    if(!ValidEmail(input.Email))throw new AppException(400,"Informe um e-mail válido.");
    var u=new AppUser {UserName=input.Email.Trim(),Email=input.Email.Trim(),DisplayName=ServiceOrder.Required(input.DisplayName,"Informe o nome.",160),EmailConfirmed=true};
    var r=await users.CreateAsync(u,input.Password??"");if(!r.Succeeded)throw new AppException(400,"Não foi possível criar o usuário. Use e-mail único e senha com 12 caracteres, maiúscula, minúscula, número e símbolo.");
    await users.AddToRoleAsync(u,input.Role);return Results.Created($"/api/users/{u.Id}",new {u.Id});
});
api.MapPut("/users/{id}",async(string id,UserUpdate input,HttpContext c,UserManager<AppUser> users,FlowDb db)=>{
    OrderService.Admin(GetActor(c.User));if(input.Role is not ("Admin" or "Technician"))throw new AppException(400,"Perfil inválido.");
    // Serialize administrator changes so concurrent requests cannot disable both last admins.
    await using var tx=await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
    await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(652091)");
    var u=await users.FindByIdAsync(id)??throw new AppException(404,"Usuário não encontrado.");
    if((input.Disabled||input.Role!="Admin")&&await users.IsInRoleAsync(u,"Admin")) {
        var admins=await users.GetUsersInRoleAsync("Admin");if(admins.Count(a=>!a.Disabled)<=1)throw new AppException(409,"Mantenha pelo menos um administrador ativo.");
    }
    if(input.Disabled&&await db.Orders.AnyAsync(o=>o.TechnicianId==id&&o.Status!=OrderStatus.Delivered&&o.Status!=OrderStatus.Cancelled))throw new AppException(409,"Reatribua as ordens abertas antes de desativar o técnico.");
    u.DisplayName=ServiceOrder.Required(input.DisplayName,"Informe o nome.",160);u.Disabled=input.Disabled;
    var roles=await users.GetRolesAsync(u);await users.RemoveFromRolesAsync(u,roles);await users.AddToRoleAsync(u,input.Role);await users.UpdateAsync(u);await users.UpdateSecurityStampAsync(u);await tx.CommitAsync();return Results.NoContent();
});
if(app.Environment.IsDevelopment())app.MapOpenApi();
app.UseDefaultFiles();app.UseStaticFiles();
app.MapFallback(async c=>{if(c.Request.Path.StartsWithSegments("/api")){c.Response.StatusCode=404;return;}var index=Path.Combine(app.Environment.WebRootPath??"wwwroot","index.html");if(File.Exists(index)){c.Response.ContentType="text/html";await c.Response.SendFileAsync(index);}else{c.Response.StatusCode=404;}});
if(app.Configuration.GetValue<bool>("Database:Migrate")) {await using var scope=app.Services.CreateAsyncScope();var db=scope.ServiceProvider.GetRequiredService<FlowDb>();await db.Database.MigrateAsync();}
if(app.Configuration.GetValue<bool>("Database:Seed")) {await using var scope=app.Services.CreateAsyncScope();await SeedData.Run(scope.ServiceProvider,app.Configuration,demo);}
app.Run();

static Actor GetActor(ClaimsPrincipal p)=>new(p.FindFirstValue(ClaimTypes.NameIdentifier)??throw new AppException(401,"Entre novamente."),p.FindFirstValue("display_name")??p.Identity?.Name??"Usuário",p.IsInRole("Admin"));
static bool ValidEmail(string? value)=>!string.IsNullOrWhiteSpace(value)&&value.Length<=254&&System.Net.Mail.MailAddress.TryCreate(value,out var address)&&address.Address==value;
static void ApplyCustomer(Customer c,CustomerInput input){c.Name=ServiceOrder.Required(input.Name,"Informe o nome do cliente.",160);c.Phone=ServiceOrder.Required(input.Phone,"Informe o telefone.",30);if(input.Email is not null&&input.Email!=""&&!ValidEmail(input.Email))throw new AppException(400,"E-mail inválido.");c.Email=string.IsNullOrWhiteSpace(input.Email)?null:input.Email.Trim();c.Archived=input.Archived;}
static void ApplyEquipment(Equipment e,EquipmentInput input){e.Category=ServiceOrder.Required(input.Category,"Informe a categoria.",80);e.Brand=ServiceOrder.Required(input.Brand,"Informe a marca.",100);e.Model=ServiceOrder.Required(input.Model,"Informe o modelo.",160);if(input.Serial?.Length>160||input.Notes?.Length>2000)throw new AppException(400,"Identificação ou observações muito longas.");e.Serial=input.Serial?.Trim();e.Notes=input.Notes?.Trim();e.Archived=input.Archived;}
static async Task CheckTechnician(string id,UserManager<AppUser> users){var u=await users.FindByIdAsync(id);if(u is null||u.Disabled||!await users.IsInRoleAsync(u,"Technician"))throw new AppException(400,"Selecione um técnico ativo.");}
public record LoginInput(string Email,string Password);
public record DemoInput(string Role);
public record UserInput(string DisplayName,string Email,string Password,string Role);
public record UserUpdate(string DisplayName,string Role,bool Disabled);
public partial class Program;
