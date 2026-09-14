/* app.js - orquestador: carga de datos, tabs, filtros, tablas */
const App = (() => {
  let facturas = [];
  let catalogo = {};
  let manifest = { archivos: [] };

  const money = v => "$" + Number(v||0).toLocaleString("es-MX",{minimumFractionDigits:2, maximumFractionDigits:2});
  const uniq = a => [...new Set(a.filter(Boolean))].sort();

  async function cargar(){
    try {
      const m = await fetch("data/manifest.json").then(r=>r.json());
      manifest = m;
      catalogo = await fetch("data/catalogo-unidades.json").then(r=>r.json());
      const paquetes = await Promise.all(
        manifest.archivos.map(u=>fetch(u).then(r=>r.json()))
      );
      facturas = paquetes.flatMap(p => p.facturas || []);
      // normalizar por si el JSON viene crudo
      facturas = facturas.map(f => Parser.normalizarFactura({
        "Fecha": f.fecha, "Fecha Val. SAT": f.fecha_val_sat,
        "Lista Negra": f.lista_negra, "Sucursal": f.sucursal,
        "Socio": f.razon_social, "Régimen Emisor": f.regimen_emisor,
        "Régimen Receptor": f.regimen_receptor, "Factura": f.factura,
        "Descripción": f.descripcion, "Importe": f.importe,
        "Captura": f.captura, "Vencimiento": f.vencimiento,
        "Programación": f.programacion, "Recibida": f.recibida,
        "Estatus": f.estatus, "Usuario": f.usuario, "UUID": f.uuid,
        "Método Pago": f.metodo_pago
      }, catalogo));
      poblarFiltros();
      refrescar();
    } catch(e){
      console.error(e);
      alert("No se pudieron cargar los datos. Revisa data/manifest.json");
    }
  }

  function poblarFiltros(){
    const razones   = uniq(facturas.map(f=>f.razon_social));
    const clientes  = uniq(facturas.map(f=>f.cliente));
    const unidades  = uniq(facturas.map(f=>f.unidad));
    const conceptos = uniq(facturas.map(f=>f.concepto));
    const estatus   = uniq(facturas.map(f=>f.estatus));
    const meses     = uniq(facturas.map(f=>(f.fecha||"").slice(0,7))).sort();

    fillSelect("f-razon",   ["TODAS", ...razones],  "TODAS");
    fillSelect("f-cliente", ["TODOS", ...clientes], "TODOS");
    fillSelect("f-unidad",  ["TODAS", ...unidades], "TODAS");
    fillSelect("f-concepto",["TODOS", ...conceptos],"TODOS");
    fillSelect("r-estatus", ["TODOS", ...estatus],  "TODOS");
    fillSelect("r-mes",     ["TODOS", ...meses],    "TODOS");
    fillSelect("s-cliente", ["TODOS", ...clientes], "TODOS");
    fillSelect("s-mes",     ["TODOS", ...meses],    "TODOS");
    document.getElementById("f-desde").value = meses[0] || "";
    document.getElementById("f-hasta").value = meses.at(-1) || "";
  }

  function fillSelect(id, values, def){
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = values.map(v=>`<option ${v===def?"selected":""}>${v}</option>`).join("");
  }

  function filtradas(){
    const razon   = val("f-razon");
    const cliente = val("f-cliente");
    const unidad  = val("f-unidad");
    const concepto= val("f-concepto");
    const desde   = document.getElementById("f-desde").value;
    const hasta   = document.getElementById("f-hasta").value;
    return facturas.filter(f=>{
      const mes = (f.fecha||"").slice(0,7);
      if (razon!=="TODAS" && f.razon_social!==razon) return false;
      if (cliente!=="TODOS" && f.cliente!==cliente) return false;
      if (unidad!=="TODAS" && f.unidad!==unidad) return false;
      if (concepto!=="TODOS" && f.concepto!==concepto) return false;
      if (desde && mes < desde) return false;
      if (hasta && mes > hasta) return false;
      return true;
    });
  }
  const val = id => document.getElementById(id).value;

  function refrescar(){
    const data = filtradas();
    renderKPIs(data);
    Charts.updateAll(data);
    renderRegistro();
    renderResumen();
  }

  function renderKPIs(data){
    const total = data.reduce((s,f)=>s+f.importe,0);
    const fijo  = data.filter(f=>f.categoria==="COSTO FIJO").reduce((s,f)=>s+f.importe,0);
    const vari  = data.filter(f=>f.categoria==="COSTO VARIABLE").reduce((s,f)=>s+f.importe,0);
    set("kpi-total", money(total));
    set("kpi-fijo",  money(fijo));
    set("kpi-var",   money(vari));
    set("kpi-avg",   money(data.length? total/data.length : 0));
    set("kpi-n",     data.length + " facturas");
  }
  const set = (id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };

  /* ------- Registro ------- */
  function renderRegistro(){
    const q = (document.getElementById("r-q").value||"").toUpperCase();
    const est = val("r-estatus");
    const mes = val("r-mes");
    const rows = facturas.filter(f=>{
      if (est!=="TODOS" && f.estatus!==est) return false;
      if (mes!=="TODOS" && (f.fecha||"").slice(0,7)!==mes) return false;
      if (q){
        const blob = `${f.factura} ${f.uuid} ${f.descripcion} ${f.unidad} ${f.concepto}`.toUpperCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    const tbody = document.querySelector("#tabla-registro tbody");
    tbody.innerHTML = rows.map(f=>`
      <tr>
        <td>${f.factura}</td>
        <td>${f.fecha}</td>
        <td>${f.descripcion}</td>
        <td>${f.unidad||"—"}</td>
        <td>${f.concepto}</td>
        <td>${f.cliente||"—"}</td>
        <td class="num">${money(f.importe)}</td>
        <td><span class="badge ${f.estatus==="PAGADA"?"pagada":f.estatus.startsWith("AUTORIZADA")?"autorizada":"otro"}">${f.estatus}</span></td>
        <td style="font-size:10px;color:#888">${f.uuid.slice(0,8)}…</td>
      </tr>`).join("");
    const tot = rows.reduce((s,f)=>s+f.importe,0);
    document.getElementById("reg-total").textContent =
      `Mostrando ${rows.length} facturas · Total: ${money(tot)}`;
  }

  /* ------- Resumen formato presentación ------- */
  function renderResumen(){
    const cli = val("s-cliente");
    const mes = val("s-mes");
    const data = facturas.filter(f=>{
      if (cli!=="TODOS" && f.cliente!==cli) return false;
      if (mes!=="TODOS" && (f.fecha||"").slice(0,7)!==mes) return false;
      return true;
    });

    // agrupar por categoria -> concepto -> tipo_unidad
    const agg = {};
    data.forEach(f=>{
      const cat  = f.categoria || "SIN CLASIFICAR";
      const con  = f.concepto  || "SIN CLASIFICAR";
      const tipo = f.tipo_unidad || "SIN TIPO";
      agg[cat] = agg[cat] || {};
      agg[cat][con] = agg[cat][con] || {};
      agg[cat][con][tipo] = agg[cat][con][tipo] || { n:0, total:0 };
      agg[cat][con][tipo].n += 1;
      agg[cat][con][tipo].total += f.importe;
    });

    let html = "";
    let granTotal = 0;

    for (const cat of Object.keys(agg).sort()){
      html += `<h3 style="color:#1f4e79;margin:16px 0 6px">${cat}</h3>`;
      html += `<table><thead><tr>
        <th>Concepto</th><th>Tipo</th><th class="num">Facturas</th>
        <th class="num">Importe</th></tr></thead><tbody>`;
      let catTotal = 0;
      for (const con of Object.keys(agg[cat]).sort()){
        const filas = Object.entries(agg[cat][con]).sort();
        filas.forEach(([tipo,v], i)=>{
          html += `<tr class="${cat==="COSTO FIJO"?"cf":"cv"}">
            <td class="cat">${i===0?con:""}</td>
            <td>${tipo}</td>
            <td class="num">${v.n}</td>
            <td class="num">${money(v.total)}</td>
          </tr>`;
          catTotal += v.total;
        });
      }
      html += `<tr class="subtotal"><td colspan="3">Subtotal ${cat}</td>
               <td class="num">${money(catTotal)}</td></tr>`;
      granTotal += catTotal;
      html += `</tbody></table>`;
    }
    html += `<table style="margin-top:18px"><tbody>
      <tr class="total"><td>TOTAL GENERAL</td><td class="num" style="width:180px">${money(granTotal)}</td></tr>
    </tbody></table>`;

    document.getElementById("resumen-body").innerHTML = html;
  }

  /* ------- Tabs ------- */
  function initTabs(){
    document.querySelectorAll("nav.tabs button").forEach(b=>{
      b.onclick = ()=>{
        document.querySelectorAll("nav.tabs button").forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        ["dashboard","registro","resumen","admin"].forEach(t=>{
          const s = document.getElementById("tab-"+t);
          if (s) s.hidden = (t !== b.dataset.tab);
        });
      };
    });
  }

  function initFiltros(){
    ["f-razon","f-cliente","f-unidad","f-concepto","f-desde","f-hasta"].forEach(id=>{
      const el = document.getElementById(id); if (el) el.onchange = refrescar;
    });
    ["r-q","r-estatus","r-mes"].forEach(id=>{
      const el = document.getElementById(id); if (el) el.oninput = el.onchange = renderRegistro;
    });
    ["s-cliente","s-mes"].forEach(id=>{
      const el = document.getElementById(id); if (el) el.onchange = renderResumen;
    });
    document.getElementById("btn-reset").onclick = ()=>{
      ["f-razon","f-cliente","f-unidad","f-concepto"].forEach(id=>document.getElementById(id).selectedIndex=0);
      document.getElementById("f-desde").value = "";
      document.getElementById("f-hasta").value = "";
      refrescar();
    };
    document.getElementById("s-print").onclick = ()=>window.print();
  }

  return {
    async init(){
      initTabs(); initFiltros();
      await cargar();
    },
    get facturas(){ return facturas; },
    get catalogo(){ return catalogo; }
  };
})();

document.addEventListener("DOMContentLoaded", ()=>App.init());
