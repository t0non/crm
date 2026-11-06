import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ download: vi.fn(), lead: vi.fn(), mark: vi.fn() }));
vi.mock("./media", () => ({ downloadInstanceMedia: mocks.download }));
vi.mock("../contato-por-telefone", () => ({
  encontrarContatoPorTelefone: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/escalacao/numero-interno-de-aviso", () => ({
  ehNumeroInternoDeAviso: vi.fn().mockResolvedValue(false),
}));
vi.mock("../pos-entrada", () => ({ aplicarEfeitosPosEntrada: mocks.lead }));
vi.mock("../marcar-conversa", () => ({ marcarConversaComMensagem: mocks.mark }));
vi.mock("@/lib/lgpd/cascata", () => ({ MENSAGEM_REDIGIDA: "redacted" }));
import { ingestInstanceText } from "./ingest";
afterEach(() => vi.clearAllMocks());

function database(duplicate = false, stored = false) {
  const rows: unknown[] = [];
  const filters: unknown[] = [];
  const upload = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn();
  let mode = "read";
  const q = {
    insert: vi.fn((row) => {
      rows.push(row);
      mode = "insert";
      return q;
    }),
    update: vi.fn((row) => {
      update(row);
      mode = "update";
      return q;
    }),
    eq: vi.fn((...args) => {
      filters.push(args);
      return q;
    }),
    filter: vi.fn(() => q),
    select: vi.fn(() => {
      if (mode === "update") return Promise.resolve({ data: [{ id: "msg" }], error: null });
      return q;
    }),
    single: vi.fn(async () => {
      if (mode === "insert") {
        mode = "read";
        return duplicate
          ? { data: null, error: { code: "23505" } }
          : { data: { id: "msg" }, error: null };
      }
      return {
        data: { id: "msg", media_storage_path: stored ? "already-stored" : null, body: "" },
        error: null,
      };
    }),
  };
  const db = {
    from: vi.fn(() => q),
    rpc: vi
      .fn()
      .mockResolvedValueOnce({ data: "contact" })
      .mockResolvedValueOnce({ data: "conversation" }),
    storage: { from: vi.fn(() => ({ upload, remove: vi.fn() })) },
  };
  return { db, rows, filters, upload, update };
}
const event = {
  id: "owner:MEDIA",
  chatid: "5511999999999@s.whatsapp.net",
  fromMe: false,
  messageType: "ImageMessage",
  messageTimestamp: 1793145600000,
};
it.each([
  ["ImageMessage", "image", "image/jpeg"],
  ["AudioMessage", "audio", "audio/mpeg"],
])("persiste %s no Storage privado e cria lead manual", async (messageType, kind, mime) => {
  const { db, rows, upload, update, filters } = database();
  mocks.download.mockResolvedValue({ buffer: Buffer.from("bytes"), mime });
  await ingestInstanceText(
    db as never,
    { id: "session", organization_id: "org" },
    { ...event, messageType },
  );
  expect(rows[0]).toMatchObject({
    organization_id: "org",
    type: kind,
    external_id: "uazapi:MEDIA",
  });
  expect(db.storage.from).toHaveBeenCalledWith("whatsapp-media");
  expect(upload).toHaveBeenCalledOnce();
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ media_mime: mime, media_size_bytes: 5 }),
  );
  expect(filters).toContainEqual(["organization_id", "org"]);
  expect(mocks.lead).toHaveBeenCalledWith(
    db,
    expect.objectContaining({ somenteManual: true, organizationId: "org" }),
  );
});
it("reentrega não baixa novamente nem incrementa a conversa", async () => {
  const { db, upload } = database(true, true);
  await expect(
    ingestInstanceText(db as never, { id: "session", organization_id: "org" }, event),
  ).resolves.toMatchObject({ duplicate: true });
  expect(mocks.download).not.toHaveBeenCalled();
  expect(upload).not.toHaveBeenCalled();
  expect(mocks.mark).not.toHaveBeenCalled();
});
it("reentrega retoma download que falhou depois do INSERT", async () => {
  const { db, upload } = database(true, false);
  mocks.download.mockResolvedValue({ buffer: Buffer.from("bytes"), mime: "image/jpeg" });
  await ingestInstanceText(db as never, { id: "session", organization_id: "org" }, event);
  expect(upload).toHaveBeenCalledOnce();
});
