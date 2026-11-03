import { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, Bell, Check, ChevronDown, ChevronRight, Clock, Download,
  Eye, Grid2X2, Info, MapPin, PanelLeftClose, Search, Settings, Sparkles, Store, UserCheck, Users,
  type LucideIcon,
} from 'lucide-react';
import { datasets, formatNumber, periodLabels, scaledMetrics, storeCodes, storeLabels, type DatasetId, type PeriodId, type StoreId } from './data/overview';
import TrafficChart from './modules/overview/TrafficChart';
import LiveVisionModule from './modules/vision/LiveVisionModule';
import { videoSources } from './data/videos';

type Page = 'overview' | 'vision' | 'visitors' | 'stores' | 'insights' | 'reports' | 'settings';
type ChartMetric = 'visits' | 'unique';

const pageNames: Record<Page, string> = {
  overview: 'Store Overview',
  vision: 'Live Vision',
  visitors: 'Visitor Analytics',
  stores: 'Store Network',
  insights: 'AI Insights',
  reports: 'Reports',
  settings: 'Settings',
};
const navItems: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: Grid2X2 },
  { id: 'vision', label: 'Live Vision', icon: Eye },
  { id: 'visitors', label: 'Visitor Analytics', icon: Users },
  { id: 'stores', label: 'Store Network', icon: Store },
  { id: 'insights', label: 'AI Insights', icon: Sparkles },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const logoUrl = '/brand/lavish-app-icon.png';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [activeNav, setActiveNav] = useState<Page>('overview');
  const [datasetId, setDatasetId] = useState<DatasetId>('concept');
  const [store, setStore] = useState<StoreId>('ajman');
  const [period, setPeriod] = useState<PeriodId>('today');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('visits');
  const [liveOpen, setLiveOpen] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [toast, setToast] = useState('');
  const dataset = datasets[datasetId];
  const metrics = scaledMetrics(dataset, store, period);
  const composition = dataset.stores[store].composition;
  const other = 100 - composition[0] - composition[1];

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showPage = (id: Page) => {
    if (id === 'vision') {
      setPage('overview');
      setActiveNav('vision');
      setLiveOpen(true);
      return;
    }
    setLiveOpen(false);
    setPage(id);
    setActiveNav(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeLive = () => { setLiveOpen(false); setActiveNav('overview'); };
  const switchDataset = (id: DatasetId) => {
    setDatasetId(id);
    setToast(`Simulated dataset ${id === 'concept' ? 'A · Brand Concept' : 'B · Alternate Scenario'} loaded`);
  };
  const changeStore = (value: StoreId) => {
    setStore(value);
    setToast(`Store view updated · simulated data · ${storeLabels[value]}`);
  };
  const changePeriod = (value: PeriodId) => {
    setPeriod(value);
    setToast(`Period updated · ${periodLabels[value]} · simulated data`);
  };
  const searchStore = () => {
    const value = window.prompt('Find a demo store: Ajman, Dubai, or Al Ain');
    if (!value) return;
    const lower = value.toLowerCase();
    const found: StoreId | null = lower.includes('dubai') ? 'jadaf' : lower.includes('ain') ? 'yahar' : lower.includes('ajman') ? 'ajman' : null;
    if (!found) { setToast('No matching demo location'); return; }
    setStore(found);
    setPage('overview');
    setActiveNav('overview');
    setToast('Demo location selected');
  };
  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value', 'Source'],
      ['Store', storeLabels[store], 'Demo'],
      ['Dataset', dataset.label, 'Simulated'],
      ['Period', periodLabels[period], 'Simulated'],
      ['Footfall', String(metrics.footfall), 'Simulated'],
      ['Unique Visitors', String(metrics.uv), 'Simulated'],
      ['Unique Customers (UC)', String(metrics.uc), 'Simulated; staff excluded'],
      ['Repeat Rate', `${dataset.stores[store].repeat.toFixed(1)}%`, 'Simulated'],
      ['Service Coverage', `${dataset.stores[store].service.toFixed(1)}%`, 'Simulated; legacy metric pending confirmation'],
      ['Recognizable Face UV (recorded clip)', String(videoSources[datasetId].confirmedUv), 'Real-model analysis; not store UV'],
    ];
    const blob = new Blob([rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `Lavish_${dataset.id}_${store}_${period}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    setToast('Simulated KPI report exported');
  };

  const chartTotal = chartMetric === 'visits' ? metrics.footfall : metrics.uv;
  const title = pageNames[page];

  return <div className={`app ${collapsed ? 'collapsed' : ''}`}>
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand-area sidebar-header">
        <div className="brand-logo" aria-label="Lavish published App Store icon">
          {!logoBroken && <img src={logoUrl} alt="Lavish Perfumes published app icon" onError={() => setLogoBroken(true)} />}
          <div className="brand-fallback"><span lang="ar">لافيش</span>LAVISH<small>PERFUMES</small></div>
        </div>
        <div className="side-wordmark"><strong>RETAIL INTELLIGENCE</strong><span>by Lavish Perfumes</span></div>
      </div>
      <div className="sidebar-mid">
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="menu-label">WORKSPACE</p>
          {navItems.slice(0, 4).map(item => <NavButton key={item.id} item={item} active={activeNav === item.id} visionCount={videoSources[datasetId].confirmedUv} onClick={() => showPage(item.id)} />)}
          <p className="menu-label second">INTELLIGENCE</p>
          {navItems.slice(4, 6).map(item => <NavButton key={item.id} item={item} active={activeNav === item.id} visionCount={videoSources[datasetId].confirmedUv} onClick={() => showPage(item.id)} />)}
          <p className="menu-label second">SYSTEM</p>
          {navItems.slice(6).map(item => <NavButton key={item.id} item={item} active={activeNav === item.id} visionCount={videoSources[datasetId].confirmedUv} onClick={() => showPage(item.id)} />)}
        </nav>
      </div>
      <div className="sidebar-bottom sidebar-footer">
        <button id="sideCollapse" className="side-collapse" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><PanelLeftClose size={16} /><span className="sidebar-sub">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span></button>
        <div className="user-box"><div className="avatar">LI</div><div className="sidebar-footer-copy"><strong>Lavish Operations</strong><span>Administrator · Demo</span></div><span className="mini-arrow"><ChevronRight size={15} /></span></div>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumb"><span>LAVISH</span><span className="crumbslash">/</span><span>Retail Intelligence</span><span className="crumbslash">/</span><strong id="crumbCurrent">{title}</strong></div>
        <div className="top-right"><div className="top-caption">UAE NETWORK</div><div className="top-divider" /><button className="top-icon" id="searchButton" title="Search store" aria-label="Search store" onClick={searchStore}><Search size={18} /></button><button className="top-icon" id="bellButton" title="Notifications" aria-label="Notifications" onClick={() => setToast('Demo notifications · 0 critical incidents · 2 informational highlights')}><Bell size={18} /><span className="unread" /></button><div className="top-divider" /><div className="top-profile">LI</div></div>
      </header>

      <main className="content">
        <div className="titleline">
          <div>
            <div className="eyebrow-row">
              <div className="eyebrow">RETAIL INTELLIGENCE <span className="eyebrow-slash">/</span> 01</div>
              <div className={`dataset-note ${datasetId}`} title={`${dataset.badge} · ${dataset.note} · ${dataset.ucDefinition}`}><span>{dataset.badge}</span><span>{dataset.label}</span></div>
            </div>
            <h1 className="headline" id="mainTitle">{title}</h1>
            <p className="subtitle" id="mainSubtitle">{page === 'overview' ? 'A clearer view of every visit, interaction, and opportunity.' : 'A consistent Lavish-branded intelligence experience, across every workspace.'}</p>
          </div>
          <div className="title-actions">
            <label className="tool-select"><MapPin size={15} /><select id="storeSelect" aria-label="Choose store" value={store} onChange={event => changeStore(event.target.value as StoreId)}>{(Object.keys(storeLabels) as StoreId[]).map(id => <option key={id} value={id}>{storeLabels[id]}</option>)}</select><ChevronDown size={14} /></label>
            <label className="tool-select period-select" style={{ minWidth: 132 }}><Clock size={15} /><select id="periodSelect" aria-label="Choose date range" value={period} onChange={event => changePeriod(event.target.value as PeriodId)}>{(Object.keys(periodLabels) as PeriodId[]).map(id => <option key={id} value={id}>{periodLabels[id]}</option>)}</select><ChevronDown size={14} /></label>
            <div className="dataset-switch" role="group" aria-label="Choose simulated dataset">
              <span className="dataset-switch-label">DATA</span>
              <button className={datasetId === 'concept' ? 'on' : ''} aria-pressed={datasetId === 'concept'} onClick={() => switchDataset('concept')} title="Dataset A · Brand Concept">A</button>
              <button className={datasetId === 'alternate' ? 'on' : ''} aria-pressed={datasetId === 'alternate'} onClick={() => switchDataset('alternate')} title="Dataset B · Alternate Scenario">B</button>
            </div>
            <button className="tool-btn strong" id="exportButton" onClick={exportCsv}><Download size={16} />Export</button>
          </div>
        </div>

        {page === 'overview' ? <OverviewContent
          datasetId={datasetId} store={store} period={period} metrics={metrics} composition={composition} other={other}
          chartMetric={chartMetric} setChartMetric={setChartMetric} chartTotal={chartTotal}
          liveOpen={liveOpen} openLive={() => { setActiveNav('vision'); setLiveOpen(true); }} closeLive={closeLive}
          setToast={setToast} showPage={showPage}
        /> : <PlaceholderPage page={page} showPage={showPage} exportCsv={exportCsv} />}
      </main>
    </div>
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
  </div>;
}

function NavButton({ item, active, visionCount, onClick }: { item: { id: Page; label: string; icon: LucideIcon }; active: boolean; visionCount: number; onClick: () => void }) {
  const Icon = item.icon;
  return <button className={`nav-item ${active ? 'active' : ''}`} data-page={item.id} title={item.label} onClick={onClick} aria-current={active ? 'page' : undefined}>
    <Icon size={18} strokeWidth={1.65} /><span className="nav-name">{item.label}</span>
    {item.id === 'vision' && <span className="nav-count">{String(visionCount).padStart(2, '0')}</span>}
  </button>;
}

type OverviewProps = {
  datasetId: DatasetId;
  store: StoreId;
  period: PeriodId;
  metrics: ReturnType<typeof scaledMetrics>;
  composition: [number, number, number];
  other: number;
  chartMetric: ChartMetric;
  setChartMetric: (metric: ChartMetric) => void;
  chartTotal: number;
  liveOpen: boolean;
  openLive: () => void;
  closeLive: () => void;
  setToast: (message: string) => void;
  showPage: (page: Page) => void;
};

function OverviewContent({ datasetId, store, period, metrics, composition, other, chartMetric, setChartMetric, chartTotal, liveOpen, openLive, closeLive, setToast, showPage }: OverviewProps) {
  const dataset = datasets[datasetId];
  const record = dataset.stores[store];
  const pct = (value: number) => `${value > 0 ? '↗' : '↘'} ${Math.abs(value).toFixed(1)}%`;
  const pts = (value: number) => `${value > 0 ? '↗' : '↘'} ${Math.abs(value).toFixed(1)} pts`;
  return <>
    <section className="stats">
      <article className="stat"><div className="stat-head"><span className="stat-label">Total Footfall</span><span className="stat-icon"><Users size={17} /></span></div><div className="stat-val">{formatNumber(metrics.footfall)}</div><div className="stat-foot"><span className={`delta ${record.delta.footfall < 0 ? 'negative' : ''}`}>{pct(record.delta.footfall)}</span><span>vs. previous period</span></div></article>
      <article className="stat"><div className="stat-head"><span className="stat-label">Unique Visitors · UV</span><span className="stat-icon"><Eye size={17} /></span></div><div className="stat-val">{formatNumber(metrics.uv)}</div><div className="stat-foot"><span className={`delta ${record.delta.uv < 0 ? 'negative' : ''}`}>{pct(record.delta.uv)}</span><span>vs. previous period</span></div></article>
      <article className="stat" title={dataset.ucDefinition}><div className="stat-head"><span className="stat-label">Unique Customers · UC</span><span className="stat-icon"><UserCheck size={17} /></span></div><div className="stat-val">{formatNumber(metrics.uc)}</div><div className="stat-foot"><span className={`delta ${record.delta.uc < 0 ? 'negative' : ''}`}>{pct(record.delta.uc)}</span><span>vs. previous period</span></div></article>
      <article className="stat"><div className="stat-head"><span className="stat-label">Repeat Visitor Rate</span><span className="stat-icon"><RepeatIcon /></span></div><div className="stat-val">{record.repeat.toFixed(1)}<span className="unit">%</span></div><div className="stat-foot"><span className={`delta ${record.delta.repeat < 0 ? 'negative' : ''}`}>{pts(record.delta.repeat)}</span><span>vs. previous period</span></div></article>
    </section>

    <div className="main-grid">
      <div className="leftcol">
        <section className="card traffic-card" id="traffic"><div className="card-head"><div><h2>Footfall &amp; Visitor Trends</h2><div className="card-sub">Hourly visit distribution and customer patterns</div></div><div className="tab-pills" role="group" aria-label="Chart metric"><button className={chartMetric === 'visits' ? 'on' : ''} aria-pressed={chartMetric === 'visits'} onClick={() => setChartMetric('visits')}>Visits</button><button className={chartMetric === 'unique' ? 'on' : ''} aria-pressed={chartMetric === 'unique'} onClick={() => setChartMetric('unique')}>Unique</button></div></div>
          <div className="chart-summary"><div><span className="chart-big" id="chartTotal">{formatNumber(chartTotal)}</span><span className="chart-unit">{chartMetric === 'visits' ? 'visits' : 'unique visitors'}</span></div><div className="legend"><span><i />Current</span><span><i className="previous" />Previous</span></div></div>
          <TrafficChart datasetId={datasetId} store={store} period={period} metric={chartMetric} />
        </section>

        <section className="card breakdown-card" id="breakdown"><div className="card-head"><div><h2>Visitor Composition</h2><div className="card-sub">Understand who is coming through the door</div></div><button className="tiny-btn" id="detailsButton" onClick={() => setToast('Visitor composition metrics are simulated for this concept')}>Details <ArrowRight size={14} /></button></div>
          <div className="bar-content"><div className="channel-list">
            <div><div className="channel-row"><span>First-time visitors</span><strong>{composition[0]}%</strong></div><div className="progress"><i style={{ width: `${composition[0]}%` }} /></div></div>
            <div><div className="channel-row"><span>Returning visitors</span><strong>{composition[1]}%</strong></div><div className="progress secondary"><i style={{ width: `${composition[1]}%` }} /></div></div>
            <div><div className="channel-row"><span>Unclassified visits</span><strong>{other}%</strong></div><div className="progress third"><i style={{ width: `${other}%` }} /></div></div>
          </div><div className="ring-wrap"><div className="donut" style={{ background: `conic-gradient(#B69A67 0 ${composition[0]}%,#2E2C27 ${composition[0]}% ${composition[0] + composition[1]}%,#DDD9CF ${composition[0] + composition[1]}% 100%)` }}><div className="donut-center"><b>{composition[0]}%</b><small>First-time</small></div></div><div className="donut-labels"><span><i className="dot" />New</span><span><i className="dot dark" />Returning</span><span><i className="dot gray" />Other</span></div></div></div>
        </section>
      </div>

      <div className="rightcol">
        <LiveVisionModule expanded={liveOpen} datasetId={datasetId} onExpand={openLive} onClose={closeLive} />
        <section className="card insights-card" id="insights"><div className="card-head"><div><h2>Intelligence Highlights</h2><div className="card-sub">Signals that deserve your attention</div></div><span className="gold-icon"><Sparkles size={17} /></span></div><div className="insight-list"><div className="insight"><div className="ins-icon"><ActivityIcon /></div><div><b>Peak activity around 18:00–20:00</b><p>Evening traffic is showing the strongest concentration.</p></div></div><div className="insight"><div className="ins-icon positive"><Check size={16} /></div><div><b>Service coverage is improving</b><p>More visits are receiving an observed staff interaction.</p></div></div><div className="insight"><div className="ins-icon neutral"><Eye size={16} /></div><div><b>Review repeat-visitor segments</b><p>Compare returning traffic with recent store activity.</p></div></div></div><button className="insight-link" onClick={() => showPage('insights')}>Explore intelligence <span>→</span></button></section>
      </div>
    </div>

    <section className="card bottom-card"><div className="table-top"><div><h2>Network Snapshot</h2><span>Illustrative locations from the brand&apos;s published store references · simulated metrics</span></div><button className="tiny-btn" onClick={() => showPage('stores')}>All stores <ArrowRight size={14} /></button></div><div className="table-scroll"><table className="store-table"><thead><tr><th>Store</th><th>Footfall</th><th>Unique Visitors</th><th>Service Coverage</th><th>Vs. Prior Period</th><th>Status</th></tr></thead><tbody>
      {(Object.keys(storeLabels) as StoreId[]).map(id => <tr key={id}><td><span className="store-code">{storeCodes[id]}</span>{storeLabels[id]}</td><td>{formatNumber(dataset.stores[id].footfall)}</td><td>{formatNumber(dataset.stores[id].uv)}</td><td>{dataset.stores[id].service.toFixed(1)}%</td><td className={`trend ${dataset.stores[id].delta.footfall < 0 ? 'lower' : ''}`}>{pct(dataset.stores[id].delta.footfall)}</td><td><span className="state">Simulated online</span></td></tr>)}
    </tbody></table></div></section>
    <div className="demo-note"><Info size={14} /> CONCEPT DEMO · All operational metrics, monitoring visuals, visit identities, alerts, and camera statuses are simulated. Recorded Live Vision face UV is a real-model analysis of sample mall footage, not a Lavish store camera. App icon is referenced from the published App Store listing; reuse permission remains pending.</div>
  </>;
}

function PlaceholderPage({ page, showPage, exportCsv }: { page: Page; showPage: (page: Page) => void; exportCsv: () => void }) {
  const config = {
    overview: { icon: <Grid2X2 size={32} />, title: 'Store Overview', copy: 'The overview homepage is available from the Overview navigation item.', button: 'Back to overview', action: () => showPage('overview') },
    vision: { icon: <Eye size={32} />, title: 'Live Vision Control Center', copy: 'This module retains the camera-first workflow. Open the recorded analysis workspace from the overview camera card or the Live Vision navigation item.', button: 'Open recorded workspace', action: () => showPage('vision') },
    visitors: { icon: <Users size={32} />, title: 'Visitor Analytics', copy: 'Visitor counting, unique-visitor estimation, repeat visits, and classification insights use the shared Lavish tokens and component language. The current demonstration preserves the overview dataset.', button: 'View overview analytics', action: () => showPage('overview') },
    stores: { icon: <Store size={32} />, title: 'Store Network', copy: 'Multi-location management will use the same readable neutral dashboard surfaces. Locations shown in this concept are sourced from publicly mentioned branches; all figures remain fictional.', button: 'View network snapshot', action: () => showPage('overview') },
    insights: { icon: <Sparkles size={32} />, title: 'AI Intelligence', copy: 'Prioritize customer-flow anomalies, unattended visitors, and service opportunities. Gold is reserved for brand accents, while alerts use distinct semantic colors.', button: 'View current highlights', action: () => showPage('overview') },
    reports: { icon: <BarChart3 size={32} />, title: 'Reports & Exports', copy: 'Export the demonstration store KPIs in CSV format. This is sample data only, prepared to validate the visual reporting experience.', button: 'Download sample report', action: exportCsv },
    settings: { icon: <Settings size={32} />, title: 'Brand System & Preferences', copy: 'The interface uses the same brand-neutral components and accessible text sizes. Official brand artwork and exact color values must be confirmed by the brand owner before production.', button: 'Back to overview', action: () => showPage('overview') },
  }[page] ?? { icon: <Eye size={32} />, title: pageNames[page], copy: 'This module is a concept preview in the current recorded-video demo.', button: 'Back to overview', action: () => showPage('overview') };
  return <section className="module-view active"><div className="empty-module"><div className="shape">{config.icon}</div><h2>{config.title}</h2><p>{config.copy}</p><button className="tool-btn strong" onClick={config.action}>{config.button} <ArrowRight size={15} /></button></div></section>;
}

function RepeatIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-13a4 4 0 0 0-4 4v1m1-5 3-3 3 3m-6 10h13a4 4 0 0 0 4-4v-1m-1 5-3 3-3-3" /></svg>;
}
function ActivityIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16l4-4 3 3 6-7 5 5" /></svg>;
}
