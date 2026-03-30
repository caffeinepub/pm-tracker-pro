declare module "xlsx" {
  export function utils_book_new(): WorkBook;
  const utils: {
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    json_to_sheet<T>(data: T[], opts?: unknown): WorkSheet;
    aoa_to_sheet(data: unknown[][], opts?: unknown): WorkSheet;
    sheet_to_json<T>(ws: WorkSheet, opts?: unknown): T[];
  };
  interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }
  interface WorkSheet {
    [key: string]: unknown;
  }
  function read(data: unknown, opts?: unknown): WorkBook;
  function readFile(filename: string, opts?: unknown): WorkBook;
  function writeFile(wb: WorkBook, filename: string, opts?: unknown): void;
  function write(wb: WorkBook, opts?: unknown): unknown;
}
