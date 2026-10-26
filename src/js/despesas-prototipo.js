import { DespesasPessoaisService } from "./DespesasPessoaisService.js";
import { sincronizacaoRelacionalController } from "./SincronizacaoRelacionalController.js";
import { iniciarGoogleSyncAutomatica } from "./GoogleAutoSync.js";

const service = new DespesasPessoaisService();
const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};
const categoryNames = {
  casa: "Moradia", alimentacao: "Alimentação", transporte: "Transporte",
  estudos: "Outros", lazer: "Outros", comunicacao: "Serviços", outros: "Outros",
  moradia: "Moradia", saude: "Saúde", producao: "Produção", servicos: "Serviços"
};
const categoryKeys = {
  "Moradia":"casa", "Alimentação":"alimentacao", "Transporte":"transporte",
  "Saúde":"outros", "Produção":"outros", "Serviços":"comunicacao", "Outros":"outros"
};
const icons = {Moradia:"⌂", Alimentação:"♧", Transporte:"↗", Saúde:"✚", Produção:"⚒", Serviços:"⌁", Outros:"•"};
let activeFilter = "todas";
let deletingId = null;

function normalize(item) {
  const category = categoryNames[String(item.categoria || "outros").toLowerCase()] ||
    categoryNames[item.categoria] || "Outros";
  return {
    ...item,
    id: String(item.id),
    description: item.descricao || item.description || "Despesa sem descrição",
    value: Number(item.valor ?? item.value ?? 0),
    dueDate: item.data || item.dueDate || "",
    category,
    frequency: item.frequency || (item.tipo === "fixa" ? "mensal" : "unica"),
    status: item.status === "paga" ? "paga" : "pendente"
  };
}
function allExpenses() { return service.obterTodas().map(normalize); }
function persist(list) {
  const anteriores = service.obterTodas();
  service.salvar(list);
  const atuais = new Map(list.map(item => [String(item.id), item]));
  for (const antigo of anteriores) {
    if (!atuais.has(String(antigo.id))) {
      sincronizacaoRelacionalController.enfileirar('excluir-despesa', { id: antigo.id });
    }
  }
  for (const item of list) {
    const anterior = anteriores.find(old => String(old.id) === String(item.id));
    if (!anterior || JSON.stringify(anterior) !== JSON.stringify(item)) {
      sincronizacaoRelacionalController.enfileirar('despesa', item);
    }
  }
  void sincronizacaoRelacionalController.executarPendencias().then(resultado => {
    if (resultado?.pendentes === 0) window.dispatchEvent(new Event('anotei:despesas-remotas-atualizadas'));
  });
}
function monthExpenses(list) {
  const month = todayISO().slice(0,7);
  return list.filter(item => item.frequency === "mensal" || item.dueDate.startsWith(month));
}
function renderSummary() {
  const list = allExpenses(), month = monthExpenses(list);
  const paid = month.filter(x => x.status === "paga");
  const pending = month.filter(x => x.status !== "paga");
  document.getElementById("total-month").textContent = money(month.reduce((s,x)=>s+x.value,0));
  document.getElementById("total-paid").textContent = money(paid.reduce((s,x)=>s+x.value,0));
  document.getElementById("total-pending").textContent = money(pending.reduce((s,x)=>s+x.value,0));
  document.getElementById("paid-count").textContent = `${paid.length} ${paid.length===1?"despesa paga":"despesas pagas"}`;
  document.getElementById("pending-count").textContent = `${pending.length} ${pending.length===1?"despesa pendente":"despesas pendentes"}`;
  document.getElementById("count-all").textContent = list.length;
  document.getElementById("count-paid").textContent = list.filter(x=>x.status==="paga").length;
  document.getElementById("count-pending").textContent = list.filter(x=>x.status!=="paga").length;
}
function actionButton(symbol,label,action,item) {
  const b=document.createElement("button");
  b.type="button"; b.className=`small-action ${action==="delete"?"delete":""}`;
  b.setAttribute("aria-label",`${label}: ${item.description}`); b.title=label;
  const span=document.createElement("span"); span.setAttribute("aria-hidden","true"); span.textContent=symbol;
  const text=document.createElement("span"); text.className="action-label"; text.textContent=label;
  b.append(span,text);
  b.addEventListener("click",()=> {
    if(action==="edit") openForm(item.id);
    if(action==="toggle") togglePaid(item.id);
    if(action==="delete") askDelete(item.id);
  });
  return b;
}
function renderList() {
  const list=allExpenses();
  const query=document.getElementById("search").value.trim().toLocaleLowerCase("pt-BR");
  const filtered=list.filter(item=>{
    const filterOK=activeFilter==="todas" || item.status===activeFilter;
    return filterOK && `${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query);
  }).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
  const container=document.getElementById("expense-list"); container.replaceChildren();
  document.getElementById("empty-state").hidden=filtered.length!==0;
  filtered.forEach(item=>{
    const row=document.createElement("article"); row.className="expense-row";
    const main=document.createElement("div"); main.className="expense-main";
    const ico=document.createElement("span"); ico.className="category-icon"; ico.textContent=icons[item.category]||"•";
    const info=document.createElement("div"); info.className="expense-info";
    const title=document.createElement("h3"); title.textContent=item.description;
    const detail=document.createElement("p");
    let dateLabel="Sem vencimento";
    if(item.dueDate){ const [y,m,d]=item.dueDate.split("-"); dateLabel=`Vence em ${d}/${m}/${y}`; }
    detail.textContent=`${item.category} · ${item.frequency==="mensal"?"Todo mês":"Uma vez"} · ${dateLabel}`;
    info.append(title,detail); main.append(ico,info);
    const amount=document.createElement("div"); amount.className="expense-amount";
    const val=document.createElement("strong"); val.textContent=money(item.value);
    const badge=document.createElement("span"); badge.className=item.status==="paga"?"status-paid":"status-pending"; badge.textContent=item.status==="paga"?"Paga":"Pendente";
    amount.append(val,badge);
    const actions=document.createElement("div"); actions.className="row-actions";
    actions.append(actionButton("✎","Editar","edit",item),actionButton(item.status==="paga"?"↶":"✓",item.status==="paga"?"Marcar pendente":"Marcar como paga","toggle",item),actionButton("⌫","Excluir","delete",item));
    row.append(main,amount,actions); container.append(row);
  });
  renderSummary();
}
function writeBack(changed) {
  // Mantém os campos antigos (semanaReferencia, observacao e quaisquer metadados) e usa a mesma chave de armazenamento.
  persist(changed.map(item=>{
    const old=service.obterTodas().find(x=>String(x.id)===String(item.id)) || {};
    return {...old, id: old.id ?? item.id, descricao:item.description, categoria:categoryKeys[item.category] || "outros",
      valor:Number(item.value), data:item.dueDate, tipo:item.frequency==="mensal"?"fixa":"variavel",
      status:item.status, frequency:item.frequency};
  }));
  document.dispatchEvent(new CustomEvent("anotei:despesas-alteradas"));
}
function openForm(id=null) {
  const form=document.getElementById("expense-form"); form.reset();
  document.getElementById("expense-id").value="";
  document.getElementById("modal-title").textContent=id?"Editar despesa":"Nova despesa";
  if(id!==null) {
    const item=allExpenses().find(x=>String(x.id)===String(id)); if(!item)return;
    document.getElementById("expense-id").value=item.id;
    document.getElementById("description").value=item.description;
    document.getElementById("value").value=item.value;
    document.getElementById("due-date").value=item.dueDate;
    document.getElementById("category").value=item.category;
    document.getElementById("frequency").value=item.frequency;
    document.getElementById("status").value=item.status;
  } else {
    document.getElementById("due-date").value=todayISO();
  }
  document.getElementById("expense-modal").hidden=false;
  document.getElementById("description").focus();
}
function closeForm(){document.getElementById("expense-modal").hidden=true;}
function askDelete(id) {
  const item=allExpenses().find(x=>String(x.id)===String(id)); if(!item)return;
  deletingId=String(id);
  document.getElementById("delete-message").textContent=`A despesa “${item.description}” (${money(item.value)}) será removida. Essa ação não pode ser desfeita.`;
  document.getElementById("delete-modal").hidden=false;
  document.getElementById("confirm-delete").focus();
}
function closeDelete(){deletingId=null;document.getElementById("delete-modal").hidden=true;}
function togglePaid(id) {
  const list=allExpenses().map(x=>String(x.id)===String(id)?{...x,status:x.status==="paga"?"pendente":"paga"}:x);
  writeBack(list); renderList();
}
document.getElementById("expense-form").addEventListener("submit",event=>{
  event.preventDefault();
  const oldList=allExpenses(), id=document.getElementById("expense-id").value;
  const item={id:id||`despesa-${Date.now()}`,description:document.getElementById("description").value.trim(),
    value:Number(document.getElementById("value").value),dueDate:document.getElementById("due-date").value,
    category:document.getElementById("category").value,frequency:document.getElementById("frequency").value,
    status:document.getElementById("status").value};
  if(!item.description||!Number.isFinite(item.value)||item.value<=0||!item.dueDate)return;
  const list=id?oldList.map(x=>String(x.id)===String(id)?{...x,...item}:x):[item,...oldList];
  writeBack(list); closeForm(); renderList();
});
document.getElementById("confirm-delete").addEventListener("click",()=>{
  if(deletingId===null)return;
  writeBack(allExpenses().filter(x=>String(x.id)!==deletingId)); closeDelete(); renderList();
});
document.getElementById("keep-expense").addEventListener("click",closeDelete);
document.getElementById("close-modal").addEventListener("click",closeForm);
document.getElementById("cancel-modal").addEventListener("click",closeForm);
document.getElementById("new-expense-btn").addEventListener("click",()=>openForm());
document.getElementById("empty-new-btn").addEventListener("click",()=>openForm());
document.getElementById("search").addEventListener("input",renderList);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>{
  activeFilter=button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===button));
  renderList();
}));
document.getElementById("expense-modal").addEventListener("click",e=>{if(e.target.id==="expense-modal")closeForm();});
document.getElementById("delete-modal").addEventListener("click",e=>{if(e.target.id==="delete-modal")closeDelete();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeForm();closeDelete();}});
const now=new Date();
document.querySelector(".topbar-label").textContent="Despesas";
renderList();

// A página de despesas também precisa manter o monitoramento Google ativo.
void iniciarGoogleSyncAutomatica();
