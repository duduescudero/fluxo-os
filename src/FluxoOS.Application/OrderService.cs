using FluxoOS.Domain;
using Microsoft.EntityFrameworkCore;

namespace FluxoOS.Application;

public class OrderService(IFlowDb db)
{
    public IQueryable<ServiceOrder> Visible(Actor actor) =>
        db.Orders.Where(o => actor.Admin || o.TechnicianId == actor.Id);

    public async Task<ServiceOrder> Load(Guid id, Actor actor, Guid? version = null)
    {
        var order =
            await Visible(actor)
                .Include(o => o.Customer)
                .Include(o => o.Equipment)
                .Include(o => o.Quotes)
                    .ThenInclude(q => q.Items)
                .Include(o => o.Events)
                .AsSplitQuery()
                .SingleOrDefaultAsync(o => o.Id == id)
            ?? throw new AppException(
                404,
                "Ordem não encontrada ou indisponível para este usuário."
            );
        if (version.HasValue && order.Version != version.Value)
            throw new AppException(
                409,
                "Esta ordem foi atualizada por outra pessoa. Atualize a página e tente novamente."
            );
        return order;
    }

    public async Task<OrderDto> Create(OrderInput input, Actor actor)
    {
        Admin(actor);
        var customer =
            await db.Customers.SingleOrDefaultAsync(c => c.Id == input.CustomerId && !c.Archived)
            ?? throw new AppException(400, "Escolha um cliente ativo.");
        var equipment =
            await db.Equipment.SingleOrDefaultAsync(e =>
                e.Id == input.EquipmentId && !e.Archived && e.CustomerId == customer.Id
            )
            ?? throw new AppException(
                400,
                "O equipamento precisa pertencer ao cliente selecionado."
            );
        if (
            input.DueAt < DateTimeOffset.UtcNow.AddMinutes(-1)
            || input.DueAt > DateTimeOffset.UtcNow.AddYears(1)
        )
            throw new AppException(400, "Escolha um prazo futuro de até um ano.");
        if (!Enum.IsDefined(input.Priority))
            throw new AppException(400, "Prioridade inválida.");
        var order = new ServiceOrder
        {
            Customer = customer,
            CustomerId = customer.Id,
            Equipment = equipment,
            EquipmentId = equipment.Id,
            Problem = ServiceOrder.Required(input.Problem, "Descreva o problema.", 4000),
            Condition = ServiceOrder.Required(
                input.Condition,
                "Descreva a condição de entrada.",
                2000
            ),
            Accessories = ServiceOrder.Required(
                input.Accessories,
                "Informe os acessórios ou nenhum.",
                1000
            ),
            Priority = input.Priority,
            DueAt = input.DueAt,
        };
        order.Record(actor.Name, "Ordem aberta", "Equipamento recebido para avaliação.");
        if (!string.IsNullOrWhiteSpace(input.TechnicianId))
            order.Assign(input.TechnicianId, actor.Name);
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return Map(order);
    }

    public async Task<OrderDto> Command(Guid id, string action, OrderCommand input, Actor actor)
    {
        var o = await Load(id, actor, input.Version);
        switch (action)
        {
            case "assign":
                Admin(actor);
                o.Assign(input.TechnicianId ?? "", actor.Name);
                break;
            case "diagnosis":
                o.Diagnose(input.Text ?? "", actor.Name);
                break;
            case "submit-quote":
                o.SubmitQuote(actor.Name);
                break;
            case "transition":
                if (input.Status is null || !Enum.IsDefined(input.Status.Value))
                    throw new AppException(400, "Escolha uma etapa válida.");
                o.Transition(
                    input.Status.Value,
                    input.Text ?? "",
                    input.Receiver,
                    actor.Name,
                    actor.Admin
                );
                break;
            case "note":
                o.AddNote(input.Text ?? "", actor.Name);
                break;
            default:
                throw new AppException(404, "Operação não encontrada.");
        }
        await db.SaveChangesAsync();
        return Map(o);
    }

    public async Task<OrderDto> Quote(Guid id, QuoteInput input, Actor actor)
    {
        var o = await Load(id, actor, input.Version);
        o.ReviseQuote(
            input.Items.Select(i => new QuoteItem
            {
                Description = i.Description,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
            }),
            input.ValidUntil,
            DateTimeOffset.UtcNow,
            actor.Name
        );
        await db.SaveChangesAsync();
        return Map(o);
    }

    public async Task<OrderDto> Decide(Guid id, DecisionInput input, Actor actor)
    {
        Admin(actor);
        var o = await Load(id, actor, input.Version);
        o.DecideQuote(input.Approved, input.Channel, input.Note, input.DecidedAt, actor.Name);
        await db.SaveChangesAsync();
        return Map(o);
    }

    public static void Admin(Actor actor)
    {
        if (!actor.Admin)
            throw new AppException(403, "Esta ação exige perfil de administrador.");
    }

    public static OrderDto Map(ServiceOrder o) =>
        new(
            o.Id,
            o.Number,
            o.CustomerId,
            o.Customer.Name,
            o.Customer.Phone,
            o.EquipmentId,
            $"{o.Equipment.Brand} {o.Equipment.Model}",
            o.TechnicianId,
            o.Problem,
            o.Condition,
            o.Accessories,
            o.Diagnosis,
            o.WorkPerformed,
            o.Receiver,
            o.Priority,
            o.Status,
            o.CreatedAt,
            o.DueAt,
            o.UpdatedAt,
            o.Version,
            o.Quotes.OrderByDescending(q => q.Revision)
                .Select(q => new QuoteDto(
                    q.Id,
                    q.Revision,
                    q.Status,
                    q.ValidUntil,
                    q.DecidedAt,
                    q.DecisionChannel,
                    q.DecisionNote,
                    q.Total,
                    q.Items.Select(i => new QuoteItemDto(
                            i.Description,
                            i.Quantity,
                            i.UnitPrice,
                            i.Total
                        ))
                        .ToList()
                ))
                .ToList(),
            o.Events.OrderByDescending(e => e.At)
                .ThenBy(e => e.Id)
                .Select(e => new EventDto(e.Id, e.Actor, e.Title, e.Detail, e.At))
                .ToList()
        );
}
