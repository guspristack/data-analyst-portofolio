import { parse } from 'csv-parse/sync';
import { csvHeader, rowSchema, type DataRow } from '../shared/content';
import { HttpError } from './http';

const integer = /^(0|[1-9]\d*)$/;

export function parseDataset(input: unknown): DataRow[] {
  if (typeof input !== 'string') throw new HttpError(400, 'Kirim berkas dengan format text/csv.');
  let records: string[][];
  try {
    records = parse(input, { bom: true, skip_empty_lines: true, trim: true, max_record_size: 1000 });
  } catch {
    throw new HttpError(400, 'Format CSV tidak valid. Gunakan pemisah koma dan lima kolom sesuai template.');
  }
  const [header, ...entries] = records;
  if (header?.join(',') !== csvHeader.join(',')) {
    throw new HttpError(400, 'Header CSV harus berisi bulan,kanal,pendapatan_rupiah,kunjungan,pesanan.');
  }
  if (entries.length < 1 || entries.length > 1000) throw new HttpError(400, 'CSV harus berisi 1 sampai 1.000 baris data.');
  const keys = new Set<string>();
  return entries.map(([month, channel, revenue, visits, orders], index) => {
    const line = index + 1;
    if (![revenue, visits, orders].every((value) => integer.test(value))) {
      throw new HttpError(400, 'Baris data ' + line + ' harus memakai angka bulat tanpa pemisah ribuan.');
    }
    const result = rowSchema.safeParse({ month, channel, revenue: Number(revenue), visits: Number(visits), orders: Number(orders) });
    if (!result.success) {
      throw new HttpError(400, 'Baris data ' + line + ' tidak valid. Periksa bulan, kanal, batas angka, dan pastikan pesanan tidak melebihi kunjungan.');
    }
    const key = month + '/' + channel;
    if (keys.has(key)) throw new HttpError(400, 'Kombinasi bulan dan kanal ganda pada baris data ' + line + '.');
    keys.add(key);
    return result.data;
  });
}

export function datasetCsv(rows: DataRow[]) {
  return [csvHeader.join(','), ...rows.map(({ month, channel, revenue, visits, orders }) =>
    [month, channel, revenue, visits, orders].join(','))].join('\r\n') + '\r\n';
}
