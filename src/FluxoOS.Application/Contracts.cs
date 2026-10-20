using FluxoOS.Domain;
using Microsoft.EntityFrameworkCore;
namespace FluxoOS.Application;

public interface IFlowDb {
    DbSet<Customer> Customers {get;}
    DbSet<Equipment> Equipment {get;}
    DbSet<ServiceOrder> Orders {get;}
    Task<int> SaveChangesAsync(CancellationToken token=default);
}
public sealed class AppException(int status,string message): Exception(message) { public int Status {get;}=status; }
public record Actor(string Id,string Name,bool Admin);
public record CustomerInput(string Name,string Phone,string? Email,bool Archived=false,Guid? Version=null);
public record EquipmentInput(Guid CustomerId,string Category,string Brand,string Model,string? Serial,string? Notes,bool Archived=false,Guid? Version=null);
public record OrderInput(Guid CustomerId,Guid EquipmentId,string Problem,string Condition,string Accessories,Priority Priority,DateTimeOffset DueAt,string? TechnicianId);
public record OrderCommand(Guid Version,string? Text=null,string? TechnicianId=null,OrderStatus? Status=null,string? Receiver=null);
public record ItemInput(string Description,int Quantity,decimal UnitPrice);
public record QuoteInput(Guid Version,DateTimeOffset ValidUntil,List<ItemInput> Items);
public record DecisionInput(Guid Version,bool Approved,string Channel,string Note,DateTimeOffset DecidedAt);
public record Page<T>(IReadOnlyList<T> Items,int Total,int PageNumber,int PageSize);
public record CustomerDto(Guid Id,string Name,string Phone,string? Email,bool Archived,Guid Version);
public record EquipmentDto(Guid Id,Guid CustomerId,string CustomerName,string Category,string Brand,string Model,string? Serial,string? Notes,bool Archived,Guid Version);
public record QuoteItemDto(string Description,int Quantity,decimal UnitPrice,decimal Total);
public record QuoteDto(Guid Id,int Revision,QuoteStatus Status,DateTimeOffset ValidUntil,DateTimeOffset? DecidedAt,string? DecisionChannel,string? DecisionNote,decimal Total,IReadOnlyList<QuoteItemDto> Items);
public record EventDto(Guid Id,string Actor,string Title,string Detail,DateTimeOffset At);
public record OrderDto(Guid Id,long Number,Guid CustomerId,string CustomerName,string Phone,Guid EquipmentId,string EquipmentName,string? TechnicianId,string Problem,string Condition,string Accessories,string Diagnosis,string WorkPerformed,string? Receiver,Priority Priority,OrderStatus Status,DateTimeOffset CreatedAt,DateTimeOffset DueAt,DateTimeOffset UpdatedAt,Guid Version,IReadOnlyList<QuoteDto> Quotes,IReadOnlyList<EventDto> Events);
