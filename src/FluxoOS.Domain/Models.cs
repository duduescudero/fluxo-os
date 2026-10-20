namespace FluxoOS.Domain;

public enum OrderStatus
{
    Received,
    Diagnosing,
    AwaitingApproval,
    Approved,
    Repairing,
    Ready,
    Delivered,
    Declined,
    Cancelled,
}

public enum QuoteStatus
{
    Draft,
    Pending,
    Approved,
    Declined,
    Superseded,
}

public enum Priority
{
    Normal,
    High,
    Urgent,
}

public sealed class RuleException(string message) : Exception(message);

public class Customer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public bool Archived { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}

public class Equipment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public string Category { get; set; } = "Notebook";
    public string Brand { get; set; } = "";
    public string Model { get; set; } = "";
    public string? Serial { get; set; }
    public string? Notes { get; set; }
    public bool Archived { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}

public class ServiceOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public long Number { get; set; }
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
    public string? TechnicianId { get; set; }
    public string Problem { get; set; } = "";
    public string Condition { get; set; } = "";
    public string Accessories { get; set; } = "";
    public string Diagnosis { get; set; } = "";
    public string WorkPerformed { get; set; } = "";
    public string? Receiver { get; set; }
    public Priority Priority { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Received;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset DueAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid Version { get; set; } = Guid.NewGuid();
    public List<Quote> Quotes { get; set; } = [];
    public List<OrderEvent> Events { get; set; } = [];
    public bool Closed => Status is OrderStatus.Delivered or OrderStatus.Cancelled;
    public Quote? CurrentQuote => Quotes.OrderByDescending(x => x.Revision).FirstOrDefault();

    public void Assign(string technicianId, string actor)
    {
        EnsureOpen();
        if (string.IsNullOrWhiteSpace(technicianId))
            throw new RuleException("Escolha um técnico responsável.");
        TechnicianId = technicianId;
        Record(actor, "Responsável atualizado", "Atendimento atribuído a um técnico.");
    }

    public void Diagnose(string text, string actor)
    {
        if (Status != OrderStatus.Diagnosing)
            throw new RuleException("O diagnóstico só pode ser editado durante o diagnóstico.");
        Diagnosis = Required(text, "Informe o diagnóstico.", 4000);
        Record(actor, "Diagnóstico registrado", Diagnosis);
    }

    public void ReviseQuote(
        IEnumerable<QuoteItem> items,
        DateTimeOffset validUntil,
        DateTimeOffset now,
        string actor
    )
    {
        if (
            Status
            is not (
                OrderStatus.Diagnosing
                or OrderStatus.AwaitingApproval
                or OrderStatus.Approved
                or OrderStatus.Declined
            )
        )
            throw new RuleException("Não é possível revisar o orçamento nesta etapa.");
        if (string.IsNullOrWhiteSpace(Diagnosis))
            throw new RuleException("Registre o diagnóstico antes do orçamento.");
        if (validUntil <= now || validUntil > now.AddDays(90))
            throw new RuleException("A validade deve estar entre agora e 90 dias.");
        var entries = items.ToList();
        if (entries.Count is < 1 or > 30)
            throw new RuleException("O orçamento deve ter entre 1 e 30 itens.");
        foreach (var item in entries)
            item.Validate();
        var total = entries.Sum(i => i.Total);
        if (total <= 0 || total > 1_000_000m)
            throw new RuleException(
                "O total deve ser positivo e não pode ultrapassar R$ 1.000.000."
            );
        var revision = (CurrentQuote?.Revision ?? 0) + 1;
        if (CurrentQuote is { } previous)
            previous.Status = QuoteStatus.Superseded;
        Quotes.Add(
            new Quote
            {
                Revision = revision,
                ValidUntil = validUntil,
                Items = entries,
            }
        );
        Status = OrderStatus.Diagnosing;
        Record(
            actor,
            "Orçamento criado",
            $"Versão {revision}. Total: {total:F2} BRL. Aprovações anteriores não autorizam esta versão."
        );
    }

    public void SubmitQuote(string actor)
    {
        if (
            Status != OrderStatus.Diagnosing
            || CurrentQuote is not { Status: QuoteStatus.Draft } quote
        )
            throw new RuleException("Prepare um orçamento antes de enviar para aprovação.");
        if (quote.ValidUntil <= DateTimeOffset.UtcNow)
            throw new RuleException("O orçamento venceu. Crie uma nova versão.");
        quote.Status = QuoteStatus.Pending;
        Status = OrderStatus.AwaitingApproval;
        Record(
            actor,
            "Aguardando aprovação",
            $"Orçamento versão {quote.Revision} enviado para decisão."
        );
    }

    public void DecideQuote(
        bool approved,
        string channel,
        string note,
        DateTimeOffset decidedAt,
        string actor
    )
    {
        if (
            Status != OrderStatus.AwaitingApproval
            || CurrentQuote is not { Status: QuoteStatus.Pending } quote
        )
            throw new RuleException("Esta ordem não está aguardando uma decisão.");
        if (decidedAt > DateTimeOffset.UtcNow.AddMinutes(1) || decidedAt < CreatedAt)
            throw new RuleException("A data da decisão deve estar entre a abertura e agora.");
        if (approved && quote.ValidUntil < DateTimeOffset.UtcNow)
            throw new RuleException("O orçamento venceu. É necessária uma nova versão.");
        quote.DecisionChannel = Required(channel, "Informe o canal da decisão.", 100);
        quote.DecisionNote = Required(note, "Registre como a decisão foi recebida.", 1000);
        quote.DecidedAt = decidedAt;
        quote.Status = approved ? QuoteStatus.Approved : QuoteStatus.Declined;
        Status = approved ? OrderStatus.Approved : OrderStatus.Declined;
        Record(
            actor,
            approved ? "Orçamento aprovado" : "Orçamento recusado",
            $"Versão {quote.Revision}. Registro interno por {channel}: {note}"
        );
    }

    public void Transition(
        OrderStatus next,
        string note,
        string? receiver,
        string actor,
        bool isAdmin
    )
    {
        EnsureOpen();
        if (next == OrderStatus.Cancelled)
        {
            if (!isAdmin)
                throw new RuleException("Somente o administrador pode cancelar.");
            note = Required(note, "Justifique o cancelamento.", 2000);
        }
        else
        {
            bool allowed = (Status, next) switch
            {
                (OrderStatus.Received, OrderStatus.Diagnosing) => !string.IsNullOrWhiteSpace(
                    TechnicianId
                ),
                (OrderStatus.Approved, OrderStatus.Repairing) => CurrentQuote?.Status
                    == QuoteStatus.Approved,
                (OrderStatus.Repairing, OrderStatus.Ready) => true,
                (OrderStatus.Ready, OrderStatus.Delivered) => isAdmin,
                (OrderStatus.Declined, OrderStatus.Delivered) => isAdmin,
                _ => false,
            };
            if (!allowed)
                throw new RuleException(
                    "Essa mudança de etapa não é permitida. Confira o responsável e a aprovação."
                );
            if (next == OrderStatus.Ready)
                WorkPerformed = Required(note, "Descreva o serviço realizado.", 4000);
            if (next == OrderStatus.Delivered)
                Receiver = Required(receiver, "Informe quem retirou o equipamento.", 200);
        }
        var previous = Status;
        Status = next;
        Record(
            actor,
            "Etapa atualizada",
            $"{previous} → {next}. {note}" + (Receiver is null ? "" : $" Recebido por: {Receiver}.")
        );
    }

    public void AddNote(string text, string actor) =>
        Record(actor, "Observação interna", Required(text, "Escreva uma observação.", 2000));

    public void Record(string actor, string title, string detail)
    {
        if (string.IsNullOrWhiteSpace(actor))
            throw new RuleException("Identifique o autor da operação.");
        UpdatedAt = DateTimeOffset.UtcNow;
        Version = Guid.NewGuid();
        Events.Add(
            new OrderEvent
            {
                Actor = actor,
                Title = title,
                Detail = detail,
                At = UpdatedAt,
            }
        );
    }

    private void EnsureOpen()
    {
        if (Closed)
            throw new RuleException("A ordem está encerrada. O histórico foi preservado.");
    }

    public static string Required(string? value, string message, int max)
    {
        var text = value?.Trim();
        if (string.IsNullOrEmpty(text) || text.Length > max)
            throw new RuleException(message + $" Limite: {max} caracteres.");
        return text;
    }
}

public class Quote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public int Revision { get; set; }
    public QuoteStatus Status { get; set; }
    public DateTimeOffset ValidUntil { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public string? DecisionChannel { get; set; }
    public string? DecisionNote { get; set; }
    public List<QuoteItem> Items { get; set; } = [];
    public decimal Total => Items.Sum(i => i.Total);
}

public class QuoteItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuoteId { get; set; }
    public string Description { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total => decimal.Round(Quantity * UnitPrice, 2, MidpointRounding.AwayFromZero);

    public void Validate()
    {
        Description = ServiceOrder.Required(Description, "Descreva o item.", 200);
        if (
            Quantity is < 1 or > 1000
            || UnitPrice < 0
            || UnitPrice > 100_000
            || decimal.Round(UnitPrice, 2) != UnitPrice
        )
            throw new RuleException(
                "Use quantidade inteira de 1 a 1.000 e valor com até duas casas decimais."
            );
    }
}

public class OrderEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public string Actor { get; set; } = "";
    public string Title { get; set; } = "";
    public string Detail { get; set; } = "";
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
}
