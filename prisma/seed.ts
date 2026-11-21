import { channels, type DataRow } from '../shared/content';
import { disconnectDatabase, prisma } from '../server/database';

const baselines = [
  [24_000_000, 7400, 205], [32_000_000, 8800, 268], [29_000_000, 8300, 251],
  [44_000_000, 10400, 374], [53_000_000, 12600, 492], [65_000_000, 14900, 612],
];
function split(value: number, weights: [number, number, number]) {
  const first = weights.map((weight) => Math.floor(value * weight / 100));
  return [...first, value - first.reduce((sum, item) => sum + item, 0)];
}
const rows: DataRow[] = baselines.flatMap(([revenue, visits, orders], index) => {
  const revenues = split(revenue, [36 + index, 33 - index, 19]);
  const traffic = split(visits, [40, 30 + index, 20 - index]);
  const purchases = split(orders, [35 + index, 38 - index, 17]);
  return channels.map((channel, i) => ({
    month: '2026-0' + (index + 1), channel, revenue: revenues[i], visits: traffic[i], orders: purchases[i],
  }));
});

try {
  await prisma.caseStudy.upsert({
    where: { slug: 'performa-toko-online' },
    update: {},
    create: {
      slug: 'performa-toko-online',
      title: 'Performa toko online',
      category: 'Studi kasus e-commerce',
      summary: 'Menelusuri pertumbuhan pendapatan, kunjungan, dan konversi.',
      question: 'Apakah kenaikan pendapatan selama April–Juni hanya mengikuti kenaikan kunjungan?',
      method: 'Kelompokkan data per bulan dan kanal. Bagi total pesanan dengan total kunjungan untuk menghitung konversi. Gunakan filter kanal untuk memeriksa metrik setiap kelompok.',
      findings: 'Pada simulasi Januari–Juni 2026, pendapatan meningkat dari Rp44 juta pada April menjadi Rp65 juta pada Juni. Pada periode yang sama, kunjungan naik dari 10.400 menjadi 14.900 dan konversi naik dari 3,60% menjadi 4,11%.',
      action: 'Bandingkan pola konversi setiap kanal dan komposisi kunjungan sebelum menyusun hipotesis perubahan anggaran.',
      credit: 'Dimas Pratama · Pemodelan metrik, visualisasi, dan interpretasi tren',
      published: true,
      dataset: { create: {
        name: 'Penjualan dan trafik toko online',
        source: 'Simulasi Ruang Karya. Total bulanan mengikuti studi awal dengan rincian kanal sintetis.',
        simulation: true,
        rows: { create: rows.map((row) => ({ ...row, revenue: BigInt(row.revenue) })) },
      } },
    },
  });
  console.log('Studi contoh Dimas tersedia.');
} finally {
  await disconnectDatabase();
}
