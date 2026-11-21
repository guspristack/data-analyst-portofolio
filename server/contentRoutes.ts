import { Router, text } from 'express';
import { z } from 'zod';
import type { DatasetRow } from './generated/prisma/client';
import { prisma } from './database';
import { contentId, HttpError, validate } from './http';
import { datasetCsv, parseDataset } from './csv';
import {
  csvLimit, datasetSchema, filterSchema, revision, slugSchema, studySchema,
  type Channel, type Dashboard, type DataRow, type Dataset, type Filters, type Totals,
} from '../shared/content';

const rowOrder = [{ month: 'asc' as const }, { channel: 'asc' as const }];
const count = { _count: { select: { rows: true, studies: true } } };
const version = z.strictObject({ revision });
const conflict = 'Perubahan lain sudah tersimpan. Muat ulang studio sebelum mencoba lagi.';

function serializeDataset({ _count, ...row }: Omit<Dataset, 'rowCount' | 'studyCount'> & { _count: { rows: number; studies: number } }): Dataset {
  return { ...row, rowCount: _count.rows, studyCount: _count.studies };
}
function serializeRow({ datasetId: _id, revenue, channel, ...fields }: DatasetRow): DataRow {
  return { ...fields, revenue: Number(revenue), channel: channel as Channel };
}

async function publishedRows(slug: string, filters: Filters) {
  const study = await prisma.caseStudy.findFirst({
    where: { slug, published: true },
    select: { dataset: { select: { rows: {
      where: { month: { gte: filters.from, lte: filters.to }, channel: filters.channel },
      orderBy: rowOrder,
    } } } },
    relationLoadStrategy: 'join',
  });
  if (!study) throw new HttpError(404, 'Studi kasus tidak tersedia.');
  return study.dataset.rows.map(serializeRow);
}

function summarize(rows: DataRow[]): Dashboard {
  type Counts = Omit<Totals, 'conversion'>;
  const months = new Map<string, Counts>();
  const totals: Counts = { revenue: 0, visits: 0, orders: 0 };
  for (const row of rows) {
    const month = months.get(row.month) ?? { revenue: 0, visits: 0, orders: 0 };
    for (const key of ['revenue', 'visits', 'orders'] as const) {
      month[key] += row[key];
      totals[key] += row[key];
    }
    months.set(row.month, month);
  }
  const convert = (row: Counts): Totals => ({ ...row, conversion: row.visits ? 100 * row.orders / row.visits : null });
  return {
    months: Array.from(months, ([month, row]) => ({ month, ...convert(row) })),
    totals: convert(totals),
    count: rows.length,
  };
}

export const publicRoutes = Router();
publicRoutes.get('/cases', async (_req, res) => {
  const cases = await prisma.caseStudy.findMany({
    where: { published: true },
    orderBy: { id: 'asc' },
    select: { slug: true, title: true, category: true, summary: true, question: true, method: true, findings: true, action: true, credit: true,
      dataset: { select: { name: true, source: true, simulation: true, rows: { orderBy: rowOrder, select: { month: true, channel: true } } } },
    },
    relationLoadStrategy: 'join',
  });
  res.json(cases.map(({ dataset: { rows, ...dataset }, ...study }) => ({
    ...study,
    dataset: { ...dataset, months: Array.from(new Set(rows.map((row) => row.month))), channels: Array.from(new Set(rows.map((row) => row.channel))) },
  })));
});
publicRoutes.get('/cases/:slug/dashboard', async (req, res) => {
  const slug = validate(slugSchema, req.params.slug);
  res.json(summarize(await publishedRows(slug, validate(filterSchema, req.query))));
});
publicRoutes.get('/cases/:slug/dataset.csv', async (req, res) => {
  const slug = validate(slugSchema, req.params.slug);
  const rows = await publishedRows(slug, validate(filterSchema, req.query));
  res.attachment(slug + '.csv').type('text/csv').send(datasetCsv(rows));
});

export const adminRoutes = Router();
adminRoutes.get('/datasets', async (_req, res) => {
  res.json((await prisma.dataset.findMany({ orderBy: { id: 'asc' }, include: count })).map(serializeDataset));
});
adminRoutes.get('/datasets/:id/rows', async (req, res) => {
  const dataset = await prisma.dataset.findUnique({ where: { id: contentId(req.params.id) }, select: { rows: { orderBy: rowOrder } } });
  if (!dataset) throw new HttpError(404, 'Dataset tidak tersedia.');
  res.json(dataset.rows.map(serializeRow));
});
adminRoutes.post('/datasets', async (req, res) => {
  const data = validate(datasetSchema, req.body);
  res.status(201).json(serializeDataset(await prisma.dataset.create({ data, include: count })));
});
adminRoutes.put('/datasets/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: current, ...data } = validate(datasetSchema.extend({ revision }), req.body);
  const updated = await prisma.$transaction(async (db) => {
    if (!(await db.dataset.updateMany({ where: { id, revision: current }, data: { ...data, revision: { increment: 1 } } })).count) {
      throw new HttpError(409, conflict);
    }
    return db.dataset.findUniqueOrThrow({ where: { id }, include: count });
  });
  res.json(serializeDataset(updated));
});
adminRoutes.put('/datasets/:id/rows', text({ type: 'text/csv', limit: csvLimit }), async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: current } = validate(z.strictObject({ revision: z.string().regex(/^[1-9]\d{0,9}$/).transform(Number).pipe(revision) }), req.query);
  const rows = parseDataset(req.body);
  const updated = await prisma.$transaction(async (db) => {
    if (!(await db.dataset.updateMany({ where: { id, revision: current }, data: { revision: { increment: 1 } } })).count) {
      throw new HttpError(409, conflict);
    }
    await db.datasetRow.deleteMany({ where: { datasetId: id } });
    await db.datasetRow.createMany({ data: rows.map((row) => ({ ...row, datasetId: id, revenue: BigInt(row.revenue) })) });
    return db.dataset.findUniqueOrThrow({ where: { id }, include: count });
  });
  res.json(serializeDataset(updated));
});
adminRoutes.delete('/datasets/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: current } = validate(version, req.body);
  const deleted = await prisma.dataset.deleteMany({ where: { id, revision: current, studies: { none: {} } } });
  if (!deleted.count) throw new HttpError(409, 'Lepaskan dataset dari studi terkait atau muat ulang studio.');
  res.sendStatus(204);
});

async function checkPublication(data: { datasetId: number; published: boolean; method: string; findings: string; credit: string }) {
  if (!data.published) return;
  if (!data.method || !data.findings || !data.credit) throw new HttpError(400, 'Lengkapi metode, temuan, dan kredit sebelum menerbitkan studi.');
  if (!(await prisma.datasetRow.findFirst({ where: { datasetId: data.datasetId }, select: { datasetId: true } }))) {
    throw new HttpError(400, 'Unggah data sebelum menerbitkan studi kasus.');
  }
}
adminRoutes.get('/studies', async (_req, res) => {
  res.json(await prisma.caseStudy.findMany({ orderBy: { id: 'asc' } }));
});
adminRoutes.post('/studies', async (req, res) => {
  const data = validate(studySchema.extend({ slug: slugSchema }), req.body);
  await checkPublication(data);
  res.status(201).json(await prisma.caseStudy.create({ data }));
});
adminRoutes.put('/studies/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: current, ...data } = validate(studySchema.extend({ revision }), req.body);
  await checkPublication(data);
  const updated = await prisma.$transaction(async (db) => {
    if (!(await db.caseStudy.updateMany({ where: { id, revision: current }, data: { ...data, revision: { increment: 1 } } })).count) {
      throw new HttpError(409, conflict);
    }
    return db.caseStudy.findUniqueOrThrow({ where: { id } });
  });
  res.json(updated);
});
adminRoutes.delete('/studies/:id', async (req, res) => {
  const id = contentId(req.params.id);
  const { revision: current } = validate(version, req.body);
  const deleted = await prisma.caseStudy.deleteMany({ where: { id, revision: current, published: false } });
  if (!deleted.count) throw new HttpError(409, 'Kembalikan studi ke draf atau muat ulang studio sebelum menghapusnya.');
  res.sendStatus(204);
});
