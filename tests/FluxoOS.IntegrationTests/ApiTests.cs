using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluxoOS.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;
namespace FluxoOS.IntegrationTests;

public class ApiFixture:IAsyncLifetime {
    private PostgreSqlContainer? container;
    public WebApplicationFactory<Program> Factory {get;private set;}=null!;
    public const string Password="Only.Testing!9402";
    public async Task InitializeAsync(){
        var connection=Environment.GetEnvironmentVariable("FLOW_TEST_DATABASE");
        if(string.IsNullOrWhiteSpace(connection)){container=new PostgreSqlBuilder("postgres:17.10").WithDatabase("fluxo_tests").Build();await container.StartAsync();connection=container.GetConnectionString();}
        Factory=new WebApplicationFactory<Program>().WithWebHostBuilder(b=>{
            b.UseSetting("ConnectionStrings:Database",connection);b.UseSetting("Database:Migrate","true");b.UseSetting("Database:Seed","true");b.UseSetting("Bootstrap:Password",Password);b.UseSetting("Demo:Enabled","false");b.UseSetting("environment","Testing");
        });
        using var client=Factory.CreateClient();Assert.Equal(HttpStatusCode.OK,(await client.GetAsync("/health/ready")).StatusCode);
    }
    public async Task DisposeAsync(){await Factory.DisposeAsync();if(container is not null)await container.DisposeAsync();}
    public HttpClient Client()=>Factory.CreateClient(new WebApplicationFactoryClientOptions {BaseAddress=new Uri("https://localhost"),AllowAutoRedirect=false});
    public static async Task<HttpResponseMessage> Send(HttpClient client,string path,object value,HttpMethod? method=null){
        var token=(await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf")).GetProperty("token").GetString();
        var request=new HttpRequestMessage(method??HttpMethod.Post,path){Content=JsonContent.Create(value)};request.Headers.Add("X-CSRF-TOKEN",token);return await client.SendAsync(request);
    }
    public async Task<HttpClient> Login(string email="admin@fluxo.example"){var client=Client();var response=await Send(client,"/api/auth/login",new {email,password=Password});Assert.Equal(HttpStatusCode.OK,response.StatusCode);return client;}
    public static async Task<JsonElement> Json(HttpResponseMessage r){Assert.True(r.IsSuccessStatusCode,await r.Content.ReadAsStringAsync());return await r.Content.ReadFromJsonAsync<JsonElement>();}
}

public class ApiTests(ApiFixture f):IClassFixture<ApiFixture> {
    [Fact] public async Task Anonymous_requests_and_missing_csrf_are_rejected(){using var c=f.Client();Assert.Equal(HttpStatusCode.Unauthorized,(await c.GetAsync("/api/orders")).StatusCode);Assert.Equal(HttpStatusCode.BadRequest,(await c.PostAsJsonAsync("/api/auth/login",new {email="admin@fluxo.example",password=ApiFixture.Password})).StatusCode);}
    [Fact] public async Task Login_cookie_is_http_only_and_logout_revokes_client_session(){using var c=f.Client();var r=await ApiFixture.Send(c,"/api/auth/login",new {email="admin@fluxo.example",password=ApiFixture.Password});Assert.Contains(r.Headers.GetValues("Set-Cookie"),s=>s.Contains("httponly",StringComparison.OrdinalIgnoreCase));Assert.Equal(HttpStatusCode.OK,(await c.GetAsync("/api/auth/me")).StatusCode);Assert.Equal(HttpStatusCode.NoContent,(await ApiFixture.Send(c,"/api/auth/logout",new {})).StatusCode);Assert.Equal(HttpStatusCode.Unauthorized,(await c.GetAsync("/api/orders")).StatusCode);}
    [Fact] public async Task Technician_cannot_read_another_technicians_order_or_manage_users(){using var admin=await f.Login();using var tech=await f.Login("tecnico@fluxo.example");var me=await tech.GetFromJsonAsync<JsonElement>("/api/auth/me");var orders=await admin.GetFromJsonAsync<JsonElement>("/api/orders?pageSize=100");var other=orders.GetProperty("items").EnumerateArray().First(o=>o.GetProperty("technicianId").GetString()!=me.GetProperty("id").GetString());Assert.Equal(HttpStatusCode.NotFound,(await tech.GetAsync("/api/orders/"+other.GetProperty("id").GetString())).StatusCode);Assert.Equal(HttpStatusCode.Forbidden,(await tech.GetAsync("/api/users")).StatusCode);Assert.Equal(HttpStatusCode.Forbidden,(await ApiFixture.Send(tech,"/api/customers",new {name="Indevido",phone="11999990000"})).StatusCode);}
    [Fact] public async Task Customer_equipment_and_full_order_flow_persist_with_history(){
        using var admin=await f.Login();using var tech=await f.Login("tecnico@fluxo.example");var techId=(await tech.GetFromJsonAsync<JsonElement>("/api/auth/me")).GetProperty("id").GetString();
        var customer=await ApiFixture.Json(await ApiFixture.Send(admin,"/api/customers",new {name="Cliente de integração",phone="11999990000",email="integration@example.com"}));
        var equipment=await ApiFixture.Json(await ApiFixture.Send(admin,"/api/equipment",new {customerId=customer.GetProperty("id"),category="Notebook",brand="Teste",model="Integração",serial="INTEGRATION"}));
        var order=await ApiFixture.Json(await ApiFixture.Send(admin,"/api/orders",new {customerId=customer.GetProperty("id"),equipmentId=equipment.GetProperty("id"),problem="Não inicia",condition="Sem marcas",accessories="Carregador",priority="High",dueAt=DateTimeOffset.UtcNow.AddDays(2),technicianId=techId}));
        var path="/api/orders/"+order.GetProperty("id").GetString();
        Assert.Equal(HttpStatusCode.BadRequest,(await ApiFixture.Send(tech,path+"/actions/transition",new {version=order.GetProperty("version"),status="Repairing"})).StatusCode);
        order=await ApiFixture.Json(await ApiFixture.Send(tech,path+"/actions/transition",new {version=order.GetProperty("version"),status="Diagnosing"}));
        order=await ApiFixture.Json(await ApiFixture.Send(tech,path+"/actions/diagnosis",new {version=order.GetProperty("version"),text="SSD com defeito"}));
        order=await ApiFixture.Json(await ApiFixture.Send(tech,path+"/quotes",new {version=order.GetProperty("version"),validUntil=DateTimeOffset.UtcNow.AddDays(7),items=new[]{new {description="SSD",quantity=1,unitPrice=199.99}}}));
        Assert.Equal(199.99m,order.GetProperty("quotes")[0].GetProperty("total").GetDecimal());
        order=await ApiFixture.Json(await ApiFixture.Send(tech,path+"/actions/submit-quote",new {version=order.GetProperty("version")}));
        Assert.Equal(HttpStatusCode.Forbidden,(await ApiFixture.Send(tech,path+"/decision",new {version=order.GetProperty("version"),approved=true,channel="Telefone",note="Cliente confirmou",decidedAt=DateTimeOffset.UtcNow})).StatusCode);
        order=await ApiFixture.Json(await ApiFixture.Send(admin,path+"/decision",new {version=order.GetProperty("version"),approved=true,channel="Telefone",note="Cliente confirmou",decidedAt=DateTimeOffset.UtcNow}));
        order=await ApiFixture.Json(await ApiFixture.Send(tech,path+"/actions/transition",new {version=order.GetProperty("version"),status="Repairing"}));
        order=await ApiFixture.Json(await ApiFixture.Send(tech,path+"/actions/transition",new {version=order.GetProperty("version"),status="Ready",text="Substituição concluída e testes realizados."}));
        order=await ApiFixture.Json(await ApiFixture.Send(admin,path+"/actions/transition",new {version=order.GetProperty("version"),status="Delivered",receiver="Cliente de integração"}));
        Assert.Equal("Delivered",order.GetProperty("status").GetString());Assert.True(order.GetProperty("events").GetArrayLength()>=9);
        using var fresh=await f.Login();Assert.Equal("Cliente de integração",(await fresh.GetFromJsonAsync<JsonElement>(path)).GetProperty("receiver").GetString());
    }
    [Fact] public async Task Stale_version_cannot_overwrite_or_duplicate_event(){using var c=await f.Login();var list=await c.GetFromJsonAsync<JsonElement>("/api/orders?pageSize=100");var row=list.GetProperty("items")[0];var path="/api/orders/"+row.GetProperty("id").GetString();var initial=await c.GetFromJsonAsync<JsonElement>(path);var payload=new {version=initial.GetProperty("version"),text="Conferência registrada"};Assert.Equal(HttpStatusCode.OK,(await ApiFixture.Send(c,path+"/actions/note",payload)).StatusCode);Assert.Equal(HttpStatusCode.Conflict,(await ApiFixture.Send(c,path+"/actions/note",payload)).StatusCode);var after=await c.GetFromJsonAsync<JsonElement>(path);Assert.Equal(initial.GetProperty("events").GetArrayLength()+1,after.GetProperty("events").GetArrayLength());}
    [Fact] public async Task Last_active_administrator_cannot_be_disabled(){using var c=await f.Login();var me=await c.GetFromJsonAsync<JsonElement>("/api/auth/me");Assert.Equal(HttpStatusCode.Conflict,(await ApiFixture.Send(c,"/api/users/"+me.GetProperty("id").GetString(),new {displayName="Admin",role="Admin",disabled=true},HttpMethod.Put)).StatusCode);}
    [Fact] public async Task Pagination_is_bounded_and_technician_dashboard_is_scoped(){using var c=await f.Login("tecnico@fluxo.example");var list=await c.GetFromJsonAsync<JsonElement>("/api/orders?pageSize=100000");Assert.Equal(100,list.GetProperty("pageSize").GetInt32());var id=(await c.GetFromJsonAsync<JsonElement>("/api/auth/me")).GetProperty("id").GetString();Assert.All(list.GetProperty("items").EnumerateArray(),o=>Assert.Equal(id,o.GetProperty("technicianId").GetString()));}
    [Fact] public async Task Customer_edit_requires_version_and_equipment_owner_is_immutable(){using var c=await f.Login();var customers=await c.GetFromJsonAsync<JsonElement>("/api/customers?pageSize=100");var person=customers.GetProperty("items")[0];Assert.Equal(HttpStatusCode.Conflict,(await ApiFixture.Send(c,"/api/customers/"+person.GetProperty("id").GetString(),new {name="Indevido",phone="11999990000",version=Guid.NewGuid()},HttpMethod.Put)).StatusCode);var equipment=(await c.GetFromJsonAsync<JsonElement>("/api/equipment?pageSize=100")).GetProperty("items")[0];Assert.Equal(HttpStatusCode.BadRequest,(await ApiFixture.Send(c,"/api/equipment/"+equipment.GetProperty("id").GetString(),new {customerId=Guid.NewGuid(),category="Notebook",brand="Teste",model="Teste",version=equipment.GetProperty("version")},HttpMethod.Put)).StatusCode);}
    [Fact] public async Task Two_db_contexts_cannot_commit_same_order_version(){using var a=f.Factory.Services.CreateScope();using var b=f.Factory.Services.CreateScope();var dbA=a.ServiceProvider.GetRequiredService<FlowDb>();var dbB=b.ServiceProvider.GetRequiredService<FlowDb>();var first=await dbA.Orders.FirstAsync();var stale=await dbB.Orders.SingleAsync(o=>o.Id==first.Id);first.AddNote("Primeira atualização", "Teste A");await dbA.SaveChangesAsync();stale.AddNote("Não deve persistir","Teste B");await Assert.ThrowsAsync<DbUpdateConcurrencyException>(()=>dbB.SaveChangesAsync());Assert.False(await dbA.Set<FluxoOS.Domain.OrderEvent>().AnyAsync(e=>e.Detail=="Não deve persistir"));}
    [Fact] public async Task Demo_login_is_not_available_in_normal_operation(){using var c=f.Client();Assert.Equal(HttpStatusCode.NotFound,(await ApiFixture.Send(c,"/api/auth/demo",new {role="Admin"})).StatusCode);}
}
