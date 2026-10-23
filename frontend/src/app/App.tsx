import { useState } from 'react';
import type { ReactElement } from 'react';
import { NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, LogOut, ShieldCheck } from 'lucide-react';
import { Login, useSession } from '../features/session';
import type { Session } from '../features/session';
import { Profile, definitions } from '../features/profile';
import { commandHeaders, http, failure } from '../shared/api';
import { useUi } from '../shared/ui-store';

export function App(): ReactElement {
  const session = useSession();
  if (session.isPending) return <main className="empty" role="status">Preparando tu espacio de trabajo…</main>;
  if (session.isError) return <Login/>;
  return <Workspace session={session.data}/>;
}
function Workspace({ session }: { session: Session }): ReactElement {
  const companyId = useUi(state => state.companyId);
  const select = useUi(state => state.selectCompany);
  const [creating, setCreating] = useState<boolean>(false);
  const cache = useQueryClient();
  const company = session.companies.find(item => item.id === companyId) ?? session.companies[0];
  const selection = useMutation({ mutationFn: async (id: string) => {
    await http.post(`/v1/companies/${id}/select`, {}, { headers: commandHeaders(session.csrfToken) });
    await cache.cancelQueries({ queryKey: ['profile'] });
    cache.removeQueries({ queryKey: ['profile'] });
    select(id);
  } });

  return <div className="workspace"><a className="skip" href="#content">Ir al contenido</a><aside><div className="brand"><Building2 aria-hidden="true"/> TenderOps</div><p className="sidebar-label">EMPRESA ACTIVA</p>{company && <label className="company-selector"><span className="sr-only">Seleccionar empresa</span><select value={company.id} disabled={selection.isPending} onChange={event => selection.mutate(event.target.value)}>{session.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<button className="new-company" onClick={() => setCreating(true)}>+ Registrar empresa</button><p className="sidebar-label">MI EMPRESA</p><nav aria-label="Perfil empresarial">{definitions.filter(item => company?.permissions.includes(item.kind === 'financial' ? 'financial.read' : item.kind === 'membership' || item.kind === 'team' ? 'members.read' : 'profile.read')).map(item => <NavLink key={item.kind} to={'/profile/' + item.kind}>{item.title}</NavLink>)}</nav><div className="sidebar-foot"><ShieldCheck size={18} aria-hidden="true"/><p>Acceso limitado a tus empresas autorizadas.</p></div></aside><div className="work-area"><header className="topbar"><p>{company?.name ?? 'Sin empresa registrada'}</p><div><span>{session.name}</span><form method="post" action="/api/logout" onSubmit={() => { cache.clear(); select(''); }}><input type="hidden" name="__RequestVerificationToken" value={session.csrfToken}/><button type="submit"><LogOut size={16} aria-hidden="true"/> Salir</button></form></div></header><main id="content"><p className="environment">{session.mode}</p>{selection.isError && <p role="alert" className="error">{failure(selection.error)}</p>}{creating || !company ? <CreateCompany csrf={session.csrfToken} onClose={() => setCreating(false)}/> : <Routes><Route path="/profile/:kind" element={<ProfileRoute key={company.id} companyId={company.id} csrf={session.csrfToken} permissions={company.permissions}/>}/><Route path="*" element={<Navigate to="/profile/company" replace/>}/></Routes>}</main></div></div>;
}
function ProfileRoute(props: { companyId: string; csrf: string; permissions: string[] }): ReactElement {
  const { kind = 'company' } = useParams();
  const definition = definitions.find(item => item.kind === kind);
  const permission = kind === 'financial' ? 'financial.read' : kind === 'membership' || kind === 'team' ? 'members.read' : 'profile.read';
  if (!definition || !props.permissions.includes(permission)) return <section><h1>Acceso no disponible</h1><p>Selecciona una sección autorizada en el menú.</p></section>;
  return <Profile key={props.companyId + kind} {...props} kind={kind}/>;
}
function CreateCompany({ csrf, onClose }: { csrf: string; onClose: () => void }): ReactElement {
  const [error, setError] = useState<string>('');
  const cache = useQueryClient();
  const select = useUi(state => state.selectCompany);
  const mutation = useMutation({ mutationFn: async (data: Record<string, unknown>) => (await http.post<{ id: string }>('/v1/companies', data, { headers: commandHeaders(csrf) })).data, onSuccess: async data => { select(data.id); await cache.invalidateQueries({ queryKey: ['session'] }); onClose(); } });
  return <section><h1>Registrar empresa</h1><p>Quedarás como administrador de este espacio de trabajo.</p><form className="editor" noValidate onSubmit={event => { event.preventDefault(); const result = definitions[0].schema.safeParse(Object.fromEntries(new FormData(event.currentTarget))); if (!result.success) { setError(result.error.issues[0].message); return; } setError(''); mutation.mutate(result.data); }}>{definitions[0].fields.map(field => <div className="field" key={field.key}><label htmlFor={'create-' + field.key}>{field.label}</label><input name={field.key} id={'create-' + field.key} defaultValue={field.key === 'countryCode' ? 'CO' : ''}/></div>)}{error && <p role="alert">{error}</p>}{mutation.isError && <p role="alert">{failure(mutation.error)}</p>}<footer><button type="button" onClick={onClose}>Cancelar</button><button className="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Registrando…' : 'Registrar empresa'}</button></footer></form></section>;
}
