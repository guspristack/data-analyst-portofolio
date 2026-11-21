import { ArrowLeft, Database, FileText, LockKeyhole, LogOut, Plus } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ApiError, api, errorText, useResource } from '../api';
import { csvHeader, csvLimit, channelLabels, type CaseStudy, type DataRow, type Dataset, type DatasetInput, type StudyInput } from '../../shared/content';
import { CreditFooter } from '../components';
import { formatMetric, integer, monthLabel } from './TrendChart';
import styles from './Admin.module.css';

type Save = (task: () => Promise<unknown>, message: string, onSaved?: () => void) => Promise<void>;
type Editor = number | 'new' | null;
const input = (data: FormData, key: string) => String(data.get(key) ?? '');
const template = [csvHeader.join(','), '2026-01,organic,8640000,2960,71', '2026-01,paid,7920000,2220,77'].join('\r\n') + '\r\n';
const templateLink = 'data:text/csv;charset=utf-8,' + encodeURIComponent(template);

function Login({ onLogin }: { onLogin: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api('/admin/login', { method: 'POST', data: { email: input(values, 'email'), password: input(values, 'password') } });
      onLogin();
    } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); }
  }
  return <main className={styles.loginShell}>
    <Link className={styles.back} to="/"><ArrowLeft size={16} aria-hidden="true" /> Portofolio</Link>
    <section className={styles.login} aria-labelledby="login-title">
      <span className={styles.loginIcon}><LockKeyhole size={20} aria-hidden="true" /></span>
      <h1 id="login-title">Masuk ke studio</h1>
      <p>Kelola dataset dan studi kasus Dimas Pratama.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <form onSubmit={submit}>
        <fieldset className={styles.fields} disabled={busy}>
          <label>Email admin<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
          <label>Kata sandi<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
          <button className={styles.primary}>{busy ? 'Sedang masuk…' : 'Masuk'}</button>
        </fieldset>
      </form>
    </section>
    <CreditFooter className={styles.footer} />
  </main>;
}

function DatasetPreview({ dataset }: { dataset: Dataset }) {
  const { data, error, retry } = useResource<DataRow[]>('/admin/datasets/' + dataset.id + '/rows');
  if (error) return <div className={styles.error} role="alert">{error} <button type="button" onClick={retry}>Coba lagi</button></div>;
  if (!data) return <p role="status">Memuat pratinjau…</p>;
  if (!data.length) return <p className={styles.meta}>Belum ada baris. Unggah CSV untuk menambahkan data.</p>;
  const exportText = [csvHeader.join(','), ...data.map(({ month, channel, revenue, visits, orders }) => [month, channel, revenue, visits, orders].join(','))].join('\r\n') + '\r\n';
  return <>
    <div className={styles.actions}>
      <p className={styles.meta}>Menampilkan {Math.min(10, data.length)} dari {data.length} baris.</p>
      <a className={styles.secondary} download={'dataset-' + dataset.id + '.csv'} href={'data:text/csv;charset=utf-8,' + encodeURIComponent(exportText)}>Unduh dataset</a>
    </div>
    <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Pratinjau dataset">
      <table>
        <thead><tr><th scope="col">Bulan</th><th scope="col">Kanal</th><th scope="col">Pendapatan</th><th scope="col">Kunjungan</th><th scope="col">Pesanan</th></tr></thead>
        <tbody>{data.slice(0, 10).map((row) => <tr key={row.month + row.channel}>
          <th scope="row">{monthLabel(row.month)}</th><td>{channelLabels[row.channel]}</td><td>{formatMetric('revenue', row.revenue)}</td><td>{integer.format(row.visits)}</td><td>{integer.format(row.orders)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

function DatasetForm({ dataset, busy, save, open, close }: { dataset?: Dataset; busy: boolean; save: Save; open: (id: number) => void; close: () => void }) {
  const base = '/admin/datasets';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const data: DatasetInput = { name: input(values, 'name'), source: input(values, 'source'), simulation: values.has('simulation') };
    void save(async () => {
      if (dataset) await api(base + '/' + dataset.id, { method: 'PUT', data: { ...data, revision: dataset.revision } });
      else open((await api<Dataset>(base, { method: 'POST', data })).id);
    }, 'Dataset disimpan.');
  }
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dataset) return;
    const file = new FormData(event.currentTarget).get('csv');
    if (!(file instanceof File) || !file.size) return;
    void save(async () => {
      if (file.size > csvLimit) throw new ApiError(413, 'Ukuran CSV melebihi 1 MB.');
      await api(base + '/' + dataset.id + '/rows?revision=' + dataset.revision, { method: 'PUT', data: await file.text(), contentType: 'text/csv; charset=utf-8' });
    }, 'Data CSV berhasil disimpan.');
  }
  return <>
    <section className={styles.editor} aria-label="Informasi dataset">
      <form onSubmit={submit}>
        <fieldset className={styles.fields} disabled={busy}>
          <label>Nama dataset<input name="name" required maxLength={100} defaultValue={dataset?.name} /></label>
          <label>Sumber data<textarea name="source" required maxLength={500} rows={3} defaultValue={dataset?.source} /></label>
          <label className={styles.checkbox}><input type="checkbox" name="simulation" defaultChecked={dataset?.simulation ?? true} /> Tandai sebagai data simulasi</label>
          <div className={styles.actions}>
            <button className={styles.primary}>Simpan dataset</button>
            {dataset && <button className={styles.danger} type="button" disabled={dataset.studyCount > 0} onClick={() => {
              if (window.confirm('Hapus dataset dan seluruh barisnya?')) void save(() => api(base + '/' + dataset.id, { method: 'DELETE', data: { revision: dataset.revision } }), 'Dataset dihapus.', close);
            }}>Hapus dataset</button>}
          </div>
          {!!dataset?.studyCount && <p className={styles.meta}>Dataset dipakai oleh {dataset.studyCount} studi. Lepaskan dataset dari studi tersebut untuk menghapusnya.</p>}
        </fieldset>
      </form>
    </section>
    {dataset && <section className={styles.editor + ' ' + styles.block} aria-labelledby="import-title">
      <h2 id="import-title">Data CSV</h2>
      <p className={styles.meta}>Unggahan mengganti semua baris dataset, termasuk data pada studi yang sudah terbit. Gunakan format bulan YYYY-MM, nilai bulat, dan kanal organic, paid, direct, atau referral.</p>
      <form onSubmit={upload}>
        <fieldset className={styles.fields} disabled={busy}>
          <label>Berkas CSV<input name="csv" type="file" accept=".csv,text/csv" required /></label>
          <div className={styles.actions}><button className={styles.primary}>Impor CSV</button><a className={styles.secondary} href={templateLink} download="template-dataset-dimas.csv">Unduh template CSV</a></div>
        </fieldset>
      </form>
      <DatasetPreview key={dataset.revision} dataset={dataset} />
    </section>}
  </>;
}

const narrativeFields = [['question', 'Pertanyaan'], ['method', 'Metode'], ['findings', 'Temuan'], ['action', 'Langkah berikutnya']] as const;
function StudyForm({ study, datasets, busy, save, open, close }: { study?: CaseStudy; datasets: Dataset[]; busy: boolean; save: Save; open: (id: number) => void; close: () => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const control = (event.nativeEvent as SubmitEvent).submitter;
    const published = control instanceof HTMLButtonElement ? control.value === 'publish' : study?.published ?? false;
    const data: StudyInput = {
      title: input(values, 'title'), category: input(values, 'category'), summary: input(values, 'summary'),
      question: input(values, 'question'), method: input(values, 'method'), findings: input(values, 'findings'),
      action: input(values, 'action'), credit: input(values, 'credit'), datasetId: Number(values.get('datasetId')), published,
    };
    void save(async () => {
      if (study) await api('/admin/studies/' + study.id, { method: 'PUT', data: { ...data, revision: study.revision } });
      else open((await api<CaseStudy>('/admin/studies', { method: 'POST', data: { ...data, slug: input(values, 'slug') } })).id);
    }, published ? 'Studi kasus diterbitkan.' : 'Draf studi disimpan.');
  }
  return <section className={styles.editor} aria-label="Isi studi kasus"><form onSubmit={submit}>
    <fieldset className={styles.fields} disabled={busy}>
      <div className={styles.columns}>
        <label>Judul<input name="title" defaultValue={study?.title} required maxLength={100} /></label>
        <label>Kategori<input name="category" defaultValue={study?.category} required maxLength={100} /></label>
        <label>Alamat studi<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" minLength={2} maxLength={80} readOnly={!!study} required defaultValue={study?.slug} placeholder="performa-toko-online" /></label>
        <label>Dataset<select aria-label="Dataset" name="datasetId" defaultValue={study?.datasetId ?? ''} required>
          <option value="" disabled>Pilih dataset</option>{datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name} · {dataset.rowCount} baris</option>)}
        </select></label>
      </div>
      <label>Ringkasan<textarea name="summary" defaultValue={study?.summary} maxLength={500} rows={2} required /></label>
      {narrativeFields.map(([key, label]) => <label key={key}>{label}<textarea name={key} defaultValue={study?.[key]} rows={3} maxLength={3000} /></label>)}
      <label>Kredit dan peran<input name="credit" defaultValue={study?.credit} maxLength={500} /></label>
      <div className={styles.actions}>
        {study?.published && <button className={styles.primary} value="publish">Simpan perubahan</button>}
        <button className={study?.published ? styles.secondary : styles.primary} value="draft">{study?.published ? 'Jadikan draf' : 'Simpan draf'}</button>
        {!study?.published && <button className={styles.secondary} value="publish">Terbitkan studi</button>}
        {study?.published && <Link className={styles.secondary} to={'/?studi=' + study.slug}>Buka studi publik</Link>}
        {study && !study.published && <button className={styles.danger} type="button" onClick={() => {
          if (window.confirm('Hapus draf studi kasus ini?')) void save(() => api('/admin/studies/' + study.id, { method: 'DELETE', data: { revision: study.revision } }), 'Studi kasus dihapus.', close);
        }}>Hapus draf</button>}
      </div>
      <p className={styles.meta}>Penerbitan memerlukan dataset berisi data, metode, temuan, dan kredit.</p>
    </fieldset>
  </form></section>;
}

function Studio({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'datasets' | 'studies'>('datasets');
  const [editor, setEditor] = useState<Editor>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const datasets = useResource<Dataset[]>('/admin/datasets');
  const studies = useResource<CaseStudy[]>('/admin/studies');
  const currentDataset = datasets.data?.find(({ id }) => id === editor);
  const currentStudy = studies.data?.find(({ id }) => id === editor);

  function show(target: Editor) {
    setError('');
    setNotice('');
    setEditor(target);
  }
  const save: Save = async (task, message, onSaved) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      onSaved?.();
      datasets.retry();
      studies.retry();
      setNotice(message);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) onLogout();
      else setError(errorText(cause));
    } finally { setBusy(false); }
  };

  const isDataset = tab === 'datasets';
  const title = isDataset ? currentDataset?.name : currentStudy?.title;
  let content: ReactNode = null;
  if (!datasets.data || !studies.data) {
    content = datasets.error || studies.error
      ? <div className={styles.error} role="alert">{datasets.error || studies.error} <button type="button" onClick={() => { datasets.retry(); studies.retry(); }}>Coba lagi</button></div>
      : <p role="status">Memuat isi studio…</p>;
  } else if (editor === null) {
    const list = isDataset
      ? datasets.data.map((dataset) => ({ id: dataset.id, title: dataset.name, detail: dataset.rowCount + ' baris · ' + dataset.studyCount + ' studi terkait' }))
      : studies.data.map((study) => ({ id: study.id, title: study.title, detail: (study.published ? 'Terbit' : 'Draf') + ' · ' + study.category }));
    content = <>
      <button className={styles.primary} onClick={() => show('new')}><Plus size={17} aria-hidden="true" /> {isDataset ? 'Tambah dataset' : 'Tambah studi kasus'}</button>
      {list.length ? <ul className={styles.series}>{list.map((item) => <li key={item.id}>
        <div><h2>{item.title}</h2><p className={styles.meta}>{item.detail}</p></div>
        <button className={styles.secondary} aria-label={'Sunting ' + item.title} type="button" onClick={() => show(item.id)}>Sunting</button>
      </li>)}</ul> : <p className={styles.empty}>{isDataset ? 'Belum ada dataset.' : 'Belum ada studi kasus.'}</p>}
    </>;
  } else if (editor === 'new' || title) {
    content = isDataset
      ? <DatasetForm key={currentDataset?.revision ?? 'new'} dataset={currentDataset} busy={busy} save={save} open={setEditor} close={() => setEditor(null)} />
      : <StudyForm key={currentStudy?.revision ?? 'new'} study={currentStudy} datasets={datasets.data} busy={busy} save={save} open={setEditor} close={() => setEditor(null)} />;
  } else {
    content = <p role="status">Memuat perubahan…</p>;
  }

  return <>
    <header className={styles.topBar}><div className={styles.shell}>
      <p className={styles.wordmark}>Studio <span>Dimas</span></p>
      <div className={styles.actions}>
        <Link className={styles.back} to="/">Portofolio</Link>
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => void save(() => api('/admin/logout', { method: 'POST' }), '', onLogout)}><LogOut size={16} aria-hidden="true" /> Keluar</button>
      </div>
    </div></header>
    <main className={styles.shell + ' ' + styles.dashboard}>
      <div className={styles.tabs} role="group" aria-label="Bagian studio">
        <button type="button" aria-current={isDataset ? 'page' : undefined} disabled={busy} onClick={() => { setTab('datasets'); show(null); }}><Database size={17} aria-hidden="true" /> Dataset</button>
        <button type="button" aria-current={!isDataset ? 'page' : undefined} disabled={busy} onClick={() => { setTab('studies'); show(null); }}><FileText size={17} aria-hidden="true" /> Studi kasus</button>
      </div>
      {editor !== null && <button type="button" className={styles.back} disabled={busy} onClick={() => show(null)}><ArrowLeft size={16} aria-hidden="true" /> Kembali ke daftar</button>}
      <div className={styles.dashboardHead}><div>
        <h1>{title ?? (editor === 'new' ? (isDataset ? 'Dataset baru' : 'Studi kasus baru') : (isDataset ? 'Dataset' : 'Studi kasus'))}</h1>
        <p className={styles.meta}>{isDataset ? 'Atur sumber dan data bulanan per kanal.' : 'Susun narasi analisis, pilih dataset, dan atur status publikasi.'}</p>
      </div></div>
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {content}
    </main>
    <CreditFooter className={styles.shell + ' ' + styles.footer} />
  </>;
}

export default function Admin() {
  const [override, setOverride] = useState<boolean | null>(null);
  const { data, error, retry } = useResource<{ authenticated: true }>('/admin/session');
  if (override === true || (override === null && data)) return <div className={styles.page}><Studio onLogout={() => setOverride(false)} /></div>;
  if (override === false || error === 'Masuk sebagai admin untuk melanjutkan.') return <div className={styles.page}><Login onLogin={() => setOverride(true)} /></div>;
  return <div className={styles.page}><main className={styles.loginShell}>
    {error ? <p role="alert">{error} <button className={styles.secondary} onClick={retry}>Coba lagi</button></p> : <p role="status">Memeriksa sesi…</p>}
  </main></div>;
}
