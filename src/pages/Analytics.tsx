import { ArrowUpRight, BarChart3, BriefcaseBusiness, ChevronDown, CircleHelp, Download, LayoutGrid, Lightbulb, LockKeyhole, Mail, Table2, UserRound } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { type Dashboard, type PublicCase, channelLabels } from '../../shared/content';
import { useResource } from '../api';
import { scrollToSection } from '../components';
import { ProfileAvatar } from '../PortfolioIdentity';
import { PortfolioDetails, PortfolioTop, WorkCredits } from '../PortfolioProfile';
import { profiles } from '../portfolioProfiles';
import { TrendChart, formatMetric, integer, metricKeys, metrics, monthLabel, type Metric } from './TrendChart';
import styles from './Analytics.module.css';

const navigation = [
  { id: 'ringkasan', label: 'Ringkasan', icon: LayoutGrid },
  { id: 'temuan', label: 'Temuan', icon: Lightbulb },
  { id: 'detail-data', label: 'Data bulanan', icon: Table2 },
  { id: 'dimas-profil', label: 'Profil', icon: UserRound },
  { id: 'dimas-pengalaman', label: 'Pengalaman', icon: BriefcaseBusiness },
  { id: 'dimas-kontak', label: 'Kontak', icon: Mail },
];

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  const id = useId();
  return <div className={styles.filter}><label htmlFor={id}>{label}</label>
    <span className={styles.selectWrap}><select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select><ChevronDown size={15} aria-hidden="true" /></span>
  </div>;
}

function DashboardContent({ endpoint, range, sourceLabel, metric, setMetric }: { endpoint: string; range: string; sourceLabel: string; metric: Metric; setMetric: (value: Metric) => void }) {
  const { data, error, retry } = useResource<Dashboard>(endpoint);
  const { hash } = useLocation();
  useEffect(() => {
    if (!data || hash !== '#detail-data') return;
    const frame = requestAnimationFrame(() => scrollToSection('detail-data'));
    return () => cancelAnimationFrame(frame);
  }, [data, hash]);
  if (error) return <div className={styles.message} role="alert">{error} <button type="button" onClick={retry}>Coba lagi</button></div>;
  if (!data) return <p className={styles.message} role="status">Memuat metrik untuk filter ini…</p>;
  const { months, totals, count } = data;
  return (
    <>
      <div aria-label={'Ringkasan ' + range} className={styles.metrics}>
        {metricKeys.map((key) => {
          const { label, icon: Icon } = metrics[key];
          return <article className={styles.metric} key={key}>
            <p>{label}<span className={styles[key]}><Icon size={18} aria-hidden="true" /></span></p>
            <strong title={count ? formatMetric(key, totals[key]) : undefined}>{count ? formatMetric(key, totals[key], true) : '—'}</strong>
            <small>{range}</small>
          </article>;
        })}
      </div>
      <section className={styles.chartPanel} aria-labelledby="tren">
        <div className={styles.chartHead}>
          <div><h2 id="tren">Tren bulanan</h2><p>{range} · {sourceLabel}</p></div>
          <div role="group" aria-label="Metrik grafik" className={styles.switcher}>
            {metricKeys.map((key) => <button key={key} type="button" aria-pressed={key === metric} onClick={() => setMetric(key)}>{metrics[key].label}</button>)}
          </div>
        </div>
        <TrendChart rows={months} metric={metric} />
      </section>
      <section className={styles.tablePanel} aria-labelledby="detail-data">
        <div className={styles.insightHeading}><Table2 size={20} aria-hidden="true" /><h2 id="detail-data" tabIndex={-1}>Data bulanan</h2></div>
        {count > 0 && <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Tabel data bulanan">
          <table>
            <caption className={styles.srOnly}>Metrik bulanan, {range}</caption>
            <thead><tr><th scope="col">Bulan</th><th scope="col">Pendapatan</th><th scope="col">Kunjungan</th><th scope="col">Pesanan</th><th scope="col">Konversi</th></tr></thead>
            <tbody>{months.map((row) => <tr key={row.month}><th scope="row">{monthLabel(row.month)}</th><td>{formatMetric('revenue', row.revenue)}</td><td>{integer.format(row.visits)}</td><td>{integer.format(row.orders)}</td><td>{formatMetric('conversion', row.conversion)}</td></tr>)}</tbody>
          </table>
        </div>}
        {!count && <p>Tidak ada baris yang cocok dengan filter.</p>}
        <p className={styles.dataNote}><CircleHelp size={16} aria-hidden="true" /> Konversi memakai total pesanan dibagi total kunjungan. Tanda — muncul saat kunjungan nol.</p>
      </section>
    </>
  );
}

function StudyDashboard({ study, cases }: { study: PublicCase; cases: PublicCase[] }) {
  const [search, setSearch] = useSearchParams();
  const [metric, setMetric] = useState<Metric>('revenue');
  const { months, channels, simulation, source, name } = study.dataset;
  const readMonth = (key: string) => months.find((month) => month === search.get(key));
  const before = readMonth('from');
  const to = readMonth('to') ?? months.at(-1)!;
  const from = before && before <= to ? before : months.filter((month) => month <= to).at(-6) ?? months[0];
  const channel = channels.find((item) => item === search.get('channel'));
  const query = new URLSearchParams({ from, to, ...(channel ? { channel } : {}) });
  const root = '/cases/' + study.slug;
  const endpoint = root + '/dashboard?' + query;
  const range = from === to ? monthLabel(from) : monthLabel(from) + ' – ' + monthLabel(to);
  const sourceLabel = simulation ? 'Data simulasi' : name;

  function update(key: string, value: string) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearch(next, { replace: true, preventScrollReset: true });
  }

  return (
    <>
      <header className={styles.heading}>
        <div>
          <p className={styles.kicker}><BarChart3 size={17} aria-hidden="true" /> {study.category}</p>
          <h1 id="ringkasan" tabIndex={-1}>{study.title}</h1>
          <p>{study.summary}</p>
        </div>
        <span className={styles.dataFlag}>{simulation ? 'Data simulasi' : 'Studi kasus'}</span>
      </header>
      <div className={styles.filters} role="group" aria-label="Filter dashboard">
        {cases.length > 1 && <Filter label="Studi kasus" value={study.slug} onChange={(value) => setSearch({ studi: value }, { replace: true })}>{cases.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</Filter>}
        <Filter label="Dari bulan" value={from} onChange={(value) => update('from', value)}>
          {months.filter((month) => month <= to).map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
        </Filter>
        <Filter label="Sampai bulan" value={to} onChange={(value) => update('to', value)}>
          {months.filter((month) => month >= from).map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
        </Filter>
        <Filter label="Kanal" value={channel ?? ''} onChange={(value) => update('channel', value)}>
          <option value="">Semua kanal</option>{channels.map((item) => <option key={item} value={item}>{channelLabels[item]}</option>)}
        </Filter>
        <button className={styles.reset} type="button" disabled={!['from', 'to', 'channel'].some((key) => search.has(key))} onClick={() => setSearch(search.has('studi') ? { studi: study.slug } : {}, { replace: true })}>Reset filter</button>
      </div>
      <DashboardContent key={endpoint} endpoint={endpoint} range={range} sourceLabel={sourceLabel} metric={metric} setMetric={setMetric} />
      <div className={styles.downloadRow}><a href={'/api' + root + '/dataset.csv?' + query} download><Download size={17} aria-hidden="true" /> Unduh CSV hasil filter</a></div>
      <section className={styles.insights} aria-labelledby="temuan">
        <div className={styles.insightHeading}><Lightbulb size={21} aria-hidden="true" /><h2 id="temuan" tabIndex={-1}>Catatan studi</h2></div>
        <div className={styles.insightGrid}>
          {([['Pertanyaan', study.question], ['Metode', study.method], ['Temuan', study.findings], ['Langkah berikutnya', study.action]] as const).filter(([, value]) => value).map(([label, value]) =>
            <article key={label}><h3>{label}</h3><p>{value}</p></article>)}
        </div>
        <WorkCredits entries={[[ 'Kredit & peran', study.credit ], [ 'Dataset', name ], [ 'Sumber data', source ]]} />
      </section>
    </>
  );
}

export function Analytics() {
  const { data, error, retry } = useResource<PublicCase[]>('/cases');
  const [params] = useSearchParams();
  const [section, setSection] = useState('ringkasan');
  const { hash } = useLocation();
  const study = data?.find((item) => item.slug === params.get('studi')) ?? data?.[0];

  useEffect(() => {
    if (!hash || !data) return;
    const id = hash.slice(1);
    const frame = requestAnimationFrame(() => scrollToSection(id));
    return () => cancelAnimationFrame(frame);
  }, [data, hash]);

  return (
    <div className={styles.page}>
      <aside className={styles.rail} id="dimas-awal" tabIndex={-1}>
        <div className={styles.railInner}>
          <div className={styles.profile}>
            <ProfileAvatar portrait={profiles.dimas.media.portrait} />
            <div><strong>Dimas Pratama</strong><p>Analis Data</p></div>
          </div>
          <nav aria-label="Navigasi portofolio Dimas Pratama">
            {navigation.filter(({ id }) => study || id.startsWith('dimas-')).map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-current={section === id ? 'location' : undefined} onClick={() => { setSection(id); scrollToSection(id); }}>
                <Icon size={17} aria-hidden="true" /> {label}
              </button>
            ))}
          </nav>
          <Link to="/admin" className={styles.back}><LockKeyhole size={16} aria-hidden="true" /> Studio admin</Link>
          <p className={styles.railNote}>Portofolio analis fiktif</p>
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.container}>
          {error && <div className={styles.message} role="alert">{error} <button type="button" onClick={retry}>Coba lagi</button></div>}
          {!data && !error && <p className={styles.message} role="status">Memuat studi kasus…</p>}
          {data && !study && <div className={styles.heading}><div><h1>Dimas Pratama</h1><p>Belum ada studi kasus yang diterbitkan.</p></div></div>}
          {study && <StudyDashboard key={study.slug} study={study} cases={data!} />}
          <PortfolioDetails profile={profiles.dimas} className={styles.profileDetails} />
          <footer className={styles.profileFooter}><span>Pengembangan <a href="https://github.com/guspriaman">guspriaman</a> · <a href="https://github.com/guspristack">guspriStack <ArrowUpRight size={13} aria-hidden="true" /></a></span><PortfolioTop profile={profiles.dimas} /></footer>
        </div>
      </main>
    </div>
  );
}
