import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastContainer from '../dashboard/ToastContainer';

export default function Layout({ children, data, connected, toasts }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar data={data} />
      <div className="layout-content">
        <Topbar connected={connected} data={data} />
        <main className="page-content">
          {children}
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
