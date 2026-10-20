using FluxoOS.Application;
using FluxoOS.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
namespace FluxoOS.Infrastructure;

public class AppUser:IdentityUser {
    public string DisplayName {get;set;}="";
    public bool Disabled {get;set;}
}
public class FlowDb(DbContextOptions<FlowDb> options):IdentityDbContext<AppUser>(options),IFlowDb {
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Equipment> Equipment => Set<Equipment>();
    public DbSet<ServiceOrder> Orders => Set<ServiceOrder>();
    protected override void OnModelCreating(ModelBuilder b) {
        base.OnModelCreating(b);
        // Aggregate children receive application IDs before being tracked. They must
        // be inserted, not treated as pre-existing generated-key entities by EF.
        b.Entity<Customer>().Property(e=>e.Id).ValueGeneratedNever();
        b.Entity<Equipment>().Property(e=>e.Id).ValueGeneratedNever();
        b.Entity<ServiceOrder>().Property(e=>e.Id).ValueGeneratedNever();
        b.Entity<Quote>().Property(e=>e.Id).ValueGeneratedNever();
        b.Entity<QuoteItem>().Property(e=>e.Id).ValueGeneratedNever();
        b.Entity<OrderEvent>().Property(e=>e.Id).ValueGeneratedNever();
        b.Entity<Customer>().Property(c=>c.Name).HasMaxLength(160);
        b.Entity<Customer>().Property(c=>c.Phone).HasMaxLength(30);
        b.Entity<Customer>().Property(c=>c.Email).HasMaxLength(254);
        b.Entity<Customer>().Property(c=>c.Version).IsConcurrencyToken();
        b.Entity<Customer>().HasIndex(c=>c.Name);
        b.Entity<Equipment>().HasOne(e=>e.Customer).WithMany().HasForeignKey(e=>e.CustomerId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Equipment>().Property(e=>e.Version).IsConcurrencyToken();
        var o=b.Entity<ServiceOrder>();
        o.Property(e=>e.Number).UseIdentityAlwaysColumn();o.HasIndex(e=>e.Number).IsUnique();
        o.Property(e=>e.Version).IsConcurrencyToken();o.HasIndex(e=>new {e.Status,e.DueAt});o.HasIndex(e=>e.TechnicianId);
        o.HasOne(e=>e.Customer).WithMany().HasForeignKey(e=>e.CustomerId).OnDelete(DeleteBehavior.Restrict);
        o.HasOne(e=>e.Equipment).WithMany().HasForeignKey(e=>e.EquipmentId).OnDelete(DeleteBehavior.Restrict);
        o.HasOne<AppUser>().WithMany().HasForeignKey(e=>e.TechnicianId).OnDelete(DeleteBehavior.Restrict);
        o.Ignore(e=>e.Closed);o.Ignore(e=>e.CurrentQuote);
        o.HasMany(e=>e.Quotes).WithOne().HasForeignKey(e=>e.ServiceOrderId).OnDelete(DeleteBehavior.Restrict);
        o.HasMany(e=>e.Events).WithOne().HasForeignKey(e=>e.ServiceOrderId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Quote>().HasIndex(q=>new {q.ServiceOrderId,q.Revision}).IsUnique();
        b.Entity<Quote>().Ignore(q=>q.Total);
        b.Entity<Quote>().HasMany(q=>q.Items).WithOne().HasForeignKey(i=>i.QuoteId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<QuoteItem>().Property(i=>i.UnitPrice).HasPrecision(12,2);b.Entity<QuoteItem>().Ignore(i=>i.Total);
        b.Entity<OrderEvent>().HasIndex(e=>new {e.ServiceOrderId,e.At});
        b.Entity<AppUser>().Property(u=>u.DisplayName).HasMaxLength(160);
    }
}
