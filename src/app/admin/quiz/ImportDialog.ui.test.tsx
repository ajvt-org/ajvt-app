import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportDialog from "./ImportDialog";

const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...args: unknown[]) => post(...args) },
  errorMessage: (e: unknown) => (e as Error).message,
}));

const valid = JSON.stringify([
  {
    text: "ما عاصمة موريتانيا؟",
    category: "جغرافيا",
    answers: [
      { text: "نواكشوط", isCorrect: true },
      { text: "نواذيبو", isCorrect: false },
    ],
  },
]);

function setup() {
  const onImported = vi.fn();
  const onClose = vi.fn();
  render(<ImportDialog onImported={onImported} onClose={onClose} />);
  return { onImported, onClose };
}

const field = () => screen.getByLabelText("الأسئلة بصيغة JSON");

beforeEach(() => {
  post.mockReset();
});

describe("ImportDialog", () => {
  it("cannot be checked while nothing has been pasted", () => {
    setup();

    expect(screen.getByRole("button", { name: /فحص الملف/ })).toHaveProperty("disabled", true);
  });

  it("refuses malformed json without asking the server", async () => {
    setup();

    await userEvent.type(field(), "{{ broken");
    await userEvent.click(screen.getByRole("button", { name: /فحص الملف/ }));

    await waitFor(() => expect(screen.getByText(/ليس بصيغة JSON صالحة/)).toBeDefined());
    expect(post).not.toHaveBeenCalled();
  });

  it("checks the file before offering to import it", async () => {
    post.mockResolvedValue({ accepted: 1, problems: [], preview: [{ text: "سؤال" }] });
    setup();

    await userEvent.click(field());
    await userEvent.paste(valid);
    await userEvent.click(screen.getByRole("button", { name: /فحص الملف/ }));

    await waitFor(() => expect(screen.getByText(/جاهز للاستيراد 1/)).toBeDefined());
    expect(post.mock.calls[0][1]).not.toHaveProperty("commit");
  });

  it("shows what is wrong with each row", async () => {
    post.mockResolvedValue({
      accepted: 0,
      problems: [{ index: 1, message: "التصنيف مطلوب" }],
      preview: [],
    });
    setup();

    await userEvent.click(field());
    await userEvent.paste(valid);
    await userEvent.click(screen.getByRole("button", { name: /فحص الملف/ }));

    await waitFor(() => expect(screen.getByText(/السؤال 2 التصنيف مطلوب/)).toBeDefined());
  });

  it("only writes once the import is confirmed", async () => {
    post.mockResolvedValueOnce({ accepted: 1, problems: [], preview: [{ text: "سؤال" }] });
    post.mockResolvedValueOnce({ imported: 1, skipped: 0, problems: [] });
    const { onImported } = setup();

    await userEvent.click(field());
    await userEvent.paste(valid);
    await userEvent.click(screen.getByRole("button", { name: /فحص الملف/ }));
    await waitFor(() => screen.getByRole("button", { name: /تأكيد إضافة 1/ }));
    await userEvent.click(screen.getByRole("button", { name: /تأكيد إضافة 1/ }));

    await waitFor(() => expect(screen.getByText(/تمت إضافة 1/)).toBeDefined());
    expect(post.mock.calls[1][1]).toMatchObject({ commit: true });
    expect(onImported).toHaveBeenCalled();
  });

  it("says how many were already in the bank", async () => {
    post.mockResolvedValueOnce({ accepted: 2, problems: [], preview: [] });
    post.mockResolvedValueOnce({ imported: 1, skipped: 1, problems: [] });
    setup();

    await userEvent.click(field());
    await userEvent.paste(valid);
    await userEvent.click(screen.getByRole("button", { name: /فحص الملف/ }));
    await waitFor(() => screen.getByRole("button", { name: /تأكيد إضافة 2/ }));
    await userEvent.click(screen.getByRole("button", { name: /تأكيد إضافة 2/ }));

    await waitFor(() => expect(screen.getByText(/تم تخطي 1 موجودة مسبقاً/)).toBeDefined());
  });

  it("goes back to checking when the text is edited after a review", async () => {
    post.mockResolvedValue({ accepted: 1, problems: [], preview: [] });
    setup();

    await userEvent.click(field());
    await userEvent.paste(valid);
    await userEvent.click(screen.getByRole("button", { name: /فحص الملف/ }));
    await waitFor(() => screen.getByRole("button", { name: /تأكيد إضافة 1/ }));

    await userEvent.type(field(), " ");

    expect(screen.getByRole("button", { name: /فحص الملف/ })).toBeDefined();
  });
});
