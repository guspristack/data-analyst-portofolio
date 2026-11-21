import { z } from 'zod';

export const channelLabels = { organic: 'Organik', paid: 'Iklan berbayar', direct: 'Langsung', referral: 'Rujukan' } as const;
export const channels = ['organic', 'paid', 'direct', 'referral'] as const;
export const csvLimit = 1_048_576;
export const csvHeader = ['bulan', 'kanal', 'pendapatan_rupiah', 'kunjungan', 'pesanan'] as const;

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(256),
});
const title = z.string().trim().min(1).max(100);
const paragraph = z.string().trim().max(3000);
export const revision = z.number().int().positive().max(2147483647);
export const slugSchema = z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/, 'Gunakan format YYYY-MM.');
export const rowSchema = z.strictObject({
  month: monthSchema,
  channel: z.enum(channels),
  revenue: z.number().int().min(0).max(1_000_000_000_000),
  visits: z.number().int().min(0).max(100_000_000),
  orders: z.number().int().min(0).max(100_000_000),
}).refine((row) => row.orders <= row.visits, { message: 'Pesanan harus lebih kecil atau sama dengan kunjungan.' });
export const filterSchema = z.strictObject({
  from: monthSchema.optional(),
  to: monthSchema.optional(),
  channel: z.enum(channels).optional(),
}).refine(({ from, to }) => !from || !to || from <= to, { message: 'Bulan awal harus mendahului bulan akhir atau sama.' });
export const datasetSchema = z.strictObject({
  name: title,
  source: z.string().trim().min(1).max(500),
  simulation: z.boolean(),
});
export const studySchema = z.strictObject({
  title,
  category: title,
  summary: z.string().trim().min(1).max(500),
  question: paragraph,
  method: paragraph,
  findings: paragraph,
  action: paragraph,
  credit: z.string().trim().max(500),
  datasetId: z.number().int().positive().max(2147483647),
  published: z.boolean(),
});

export type Channel = typeof channels[number];
export type DatasetInput = z.infer<typeof datasetSchema>;
export type StudyInput = z.infer<typeof studySchema>;
export type DataRow = z.infer<typeof rowSchema>;
export type Filters = z.infer<typeof filterSchema>;
export type Totals = { revenue: number; visits: number; orders: number; conversion: number | null };
export type Month = Totals & { month: string };
export type Dashboard = { months: Month[]; totals: Totals; count: number };
export type Dataset = DatasetInput & { id: number; revision: number; rowCount: number; studyCount: number };
export type CaseStudy = StudyInput & { id: number; revision: number; slug: string };
export type PublicCase = Omit<CaseStudy, 'id' | 'datasetId' | 'published' | 'revision'> & {
  dataset: DatasetInput & { months: string[]; channels: Channel[] };
};
