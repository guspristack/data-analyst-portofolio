import { portfolioMedia, type PortfolioMedia } from './portfolioMedia';

export type PortfolioProfile = {
  id: string;
  name: string;
  profession: string;
  location: string;
  bio: string;
  specialty: string;
  contactFor: string;
  media: PortfolioMedia;
  experience: ReadonlyArray<{ period: string; title: string; description: string }>;
};

export const profiles = {
  dimas: {
    id: 'dimas',
    media: portfolioMedia.dimas,
    name: 'Dimas Pratama',
    profession: 'Analis data',
    location: 'Jakarta, Indonesia',
    bio: 'Saya menerjemahkan pertanyaan bisnis menjadi metrik yang bisa diperiksa. Saya merancang dashboard untuk membantu pembaca melihat perubahan, memahami cara hitungnya, dan menentukan pertanyaan berikutnya.',
    specialty: 'Analisis e-commerce, definisi KPI, spreadsheet, dan visualisasi data',
    contactFor: 'Untuk proyek analisis e-commerce, pelaporan KPI, dan dashboard.',
    experience: [
      { period: 'Jan–Jun 2026', title: 'Studi performa toko online', description: 'Menyusun data simulasi, menghitung konversi tertimbang, dan membandingkan pola pendapatan serta kunjungan.' },
      { period: 'Agu–Des 2025', title: 'Latihan pelaporan bulanan', description: 'Merapikan tabel latihan, mendokumentasikan rumus, dan merangkum temuan untuk pembaca nonteknis.' },
    ],
  },
} satisfies Record<string, PortfolioProfile>;
