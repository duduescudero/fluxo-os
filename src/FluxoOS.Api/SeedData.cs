using FluxoOS.Domain;
using FluxoOS.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public static class SeedData {
    public static async Task Run(IServiceProvider services,IConfiguration config,bool demo) {
        var db=services.GetRequiredService<FlowDb>();var roles=services.GetRequiredService<RoleManager<IdentityRole>>();var users=services.GetRequiredService<UserManager<AppUser>>();
        foreach(var role in new[]{"Admin","Technician"})if(!await roles.RoleExistsAsync(role))await roles.CreateAsync(new IdentityRole(role));
        var password=config["Bootstrap:Password"];
        if(!demo&&string.IsNullOrWhiteSpace(password))throw new InvalidOperationException("Defina Bootstrap__Password para criar os acessos locais. Não existe senha padrão de produção.");
        async Task<AppUser> User(string email,string name,string role){
            var u=await users.FindByEmailAsync(email);if(u is not null)return u;
            u=new AppUser {UserName=email,Email=email,DisplayName=name,EmailConfirmed=true};
            var r=demo?await users.CreateAsync(u):await users.CreateAsync(u,password!);
            if(!r.Succeeded)throw new InvalidOperationException("Não foi possível criar os acessos iniciais. Verifique a política de senha.");
            await users.AddToRoleAsync(u,role);return u;
        }
        await User("admin@fluxo.example","Marina Costa","Admin");
        var tech=await User("tecnico@fluxo.example","Lucas Almeida","Technician");
        var second=await User("tecnico2@fluxo.example","Camila Santos","Technician");
        if(await db.Orders.AnyAsync())return;
        var specs=new[]{
            ("Ana Martins","Dell","Inspiron 15","Não liga após queda de energia",OrderStatus.Received,Priority.High),
            ("Bruno Ferreira","Lenovo","ThinkPad E14","Aquecimento e desligamento durante o uso",OrderStatus.Diagnosing,Priority.Normal),
            ("Carolina Lima","Apple","MacBook Air M1","Bateria descarrega rapidamente",OrderStatus.AwaitingApproval,Priority.Normal),
            ("Diego Oliveira","Acer","Aspire 5","Tela com linhas e imagem intermitente",OrderStatus.Approved,Priority.High),
            ("Elisa Rodrigues","Samsung","Book Pro","Sistema lento e falhas no armazenamento",OrderStatus.Repairing,Priority.Urgent),
            ("Felipe Souza","Asus","VivoBook 15","Teclas falhando e limpeza interna",OrderStatus.Ready,Priority.Normal),
            ("Gabriela Alves","HP","ProBook 440","Conector de energia danificado",OrderStatus.Delivered,Priority.Normal),
            ("Henrique Rocha","Dell","Latitude 5420","Troca preventiva de SSD",OrderStatus.Declined,Priority.Normal),
            ("Isabela Nunes","Lenovo","IdeaPad 3","Porta USB sem funcionamento",OrderStatus.Cancelled,Priority.High),
            ("João Mendes","Acer","Nitro 5","Ventoinha com ruído constante",OrderStatus.Repairing,Priority.High),
            ("Laura Ribeiro","Samsung","Galaxy Book","Wi-Fi desconectando com frequência",OrderStatus.AwaitingApproval,Priority.Normal),
            ("Marcos Vieira","Asus","ZenBook 14","Revisão e manutenção preventiva",OrderStatus.Received,Priority.Normal)
        };
        var now=DateTimeOffset.UtcNow;int index=0;
        foreach(var (name,brand,model,problem,status,priority) in specs){
            var c=new Customer {Name=name,Phone=$"(11) 90000-{1000+index}",Email=$"cliente{index+1}@example.com"};
            var e=new Equipment {Customer=c,CustomerId=c.Id,Brand=brand,Model=model,Serial=$"DEMO-{1000+index}",Notes="Equipamento fictício para demonstração."};
            var o=new ServiceOrder {Customer=c,CustomerId=c.Id,Equipment=e,EquipmentId=e.Id,Problem=problem,Condition="Marcas leves de uso. Sem danos aparentes na carcaça.",Accessories="Carregador",Priority=priority,CreatedAt=now.AddDays(-5),DueAt=now.AddDays(index%4-1)};
            o.Record("Marina Costa","Ordem aberta","Dados fictícios. Equipamento recebido com carregador.");
            o.Assign(index%3==0?second.Id:tech.Id,"Marina Costa");
            if(status!=OrderStatus.Received){o.Transition(OrderStatus.Diagnosing,"Avaliação iniciada.",null,"Lucas Almeida",false);o.Diagnose("Inspeção concluída. Identificada necessidade de substituição do componente e revisão preventiva.","Lucas Almeida");}
            if(status is not (OrderStatus.Received or OrderStatus.Diagnosing or OrderStatus.Cancelled)){
                o.ReviseQuote([new QuoteItem {Description="Mão de obra especializada",Quantity=1,UnitPrice=180},new QuoteItem {Description="Componente de reposição",Quantity=1,UnitPrice=120+index*25}],now.AddDays(7),now,"Lucas Almeida");o.SubmitQuote("Lucas Almeida");
                if(status!=OrderStatus.AwaitingApproval)o.DecideQuote(status!=OrderStatus.Declined,"Telefone","Decisão fictícia registrada para demonstração.",now,"Marina Costa");
                if(status is OrderStatus.Repairing or OrderStatus.Ready or OrderStatus.Delivered)o.Transition(OrderStatus.Repairing,"Peças separadas para execução.",null,"Lucas Almeida",false);
                if(status is OrderStatus.Ready or OrderStatus.Delivered)o.Transition(OrderStatus.Ready,"Componente substituído, limpeza e testes de estabilidade concluídos.",null,"Lucas Almeida",false);
                if(status==OrderStatus.Delivered)o.Transition(OrderStatus.Delivered,"Equipamento conferido na retirada.",name,"Marina Costa",true);
            }
            if(status==OrderStatus.Cancelled)o.Transition(OrderStatus.Cancelled,"Cliente solicitou devolução antes do orçamento.",null,"Marina Costa",true);
            db.Orders.Add(o);index++;
        }
        await db.SaveChangesAsync();
    }
}
