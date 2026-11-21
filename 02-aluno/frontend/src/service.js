// Único ponto de comunicação com o backend. Não há dados simulados aqui.
export const isDemo = false;
const origin = (window.CAMPUS_API_URL || '').trim().replace(/\/$/, '');
const BASE = origin + '/api';
async function request(path, options = {}) {
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), 80000);
 try {
   const response = await fetch(BASE + path, {
     ...options, signal: controller.signal,
     headers: {...(options.body ? {'Content-Type':'application/json'} : {}), ...options.headers}
   });
   const type = response.headers.get('content-type') || '';
   if (!type.includes('application/json')) throw new Error('A API não retornou JSON. Confira a rota e se o servidor está ativo.');
   const data = await response.json();
   if (!response.ok) throw new Error(data.message || `Falha HTTP ${response.status}`);
   return data;
 } catch (error) {
   if(error.name === 'AbortError') throw new Error('A API demorou para responder. Aguarde a inicialização do serviço e tente novamente.');
   throw error;
 } finally {clearTimeout(timeout);}
}
export const api = {
 list: filters => request('/tickets?' + new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==''))),
 summary: () => request('/summary'),
 get: id => request(`/tickets/${id}`),
 create: data => request('/tickets', {method:'POST',body:JSON.stringify(data)}),
 update: (id,data) => request(`/tickets/${id}`, {method:'PUT',body:JSON.stringify(data)}),
 remove: id => request(`/tickets/${id}`, {method:'DELETE'})
};
