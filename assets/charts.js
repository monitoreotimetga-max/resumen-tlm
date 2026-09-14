/* charts.js - gestión de los 4 gráficos del dashboard */
const Charts = (() => {
  const store = {};
  const PALETA = ["#1f4e79","#2e86c1","#48c9b0","#f39c12","#e74c3c","#8e44ad","#16a085","#d35400"];

  function render(id, config){
    if (store[id]) store[id].destroy();
    const ctx = document.getElementById(id);
    if (!ctx) return;
    store[id] = new Chart(ctx, config);
  }

  const money = v => "$" + Number(v).toLocaleString("es-MX",{maximumFractionDigits:0});

  function updateAll(facturas){
    const porMes = {};
    const porConcepto = {};
    const fv = {};
    const porUnidad = {};

    facturas.forEach(f=>{
      const m = (f.fecha || "").slice(0,7);
      if (!m) return;
      const cli = f.cliente || f.razon_social || "SIN CLIENTE";

      porMes[m] = porMes[m] || {};
      porMes[m][cli] = (porMes[m][cli] || 0) + f.importe;

      porConcepto[f.concepto] = (porConcepto[f.concepto] || 0) + f.importe;

      fv[m] = fv[m] || { fijo:0, variable:0 };
      if (f.categoria === "COSTO FIJO") fv[m].fijo += f.importe;
      else if (f.categoria === "COSTO VARIABLE") fv[m].variable += f.importe;

      if (f.unidad) porUnidad[f.unidad] = (porUnidad[f.unidad] || 0) + f.importe;
    });

    const meses = Object.keys(porMes).sort();
    const clientes = [...new Set(meses.flatMap(m=>Object.keys(porMes[m])))];

    render("ch-mes", {
      type: "bar",
      data: {
        labels: meses,
        datasets: clientes.map((c,i)=>({
          label: c,
          data: meses.map(m=>porMes[m][c]||0),
          backgroundColor: PALETA[i % PALETA.length]
        }))
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:"bottom" }, tooltip:{ callbacks:{ label: c => c.dataset.label + ": " + money(c.parsed.y) } } },
        scales:{ y:{ ticks:{ callback: money } } }
      }
    });

    render("ch-concepto", {
      type: "doughnut",
      data: {
        labels: Object.keys(porConcepto),
        datasets: [{ data: Object.values(porConcepto), backgroundColor: PALETA }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:"bottom" } } }
    });

    render("ch-fv", {
      type: "line",
      data: {
        labels: meses,
        datasets: [
          { label:"Fijo",     data: meses.map(m=>fv[m].fijo),     borderColor:PALETA[0], backgroundColor:PALETA[0]+"33", fill:true, tension:.3 },
          { label:"Variable", data: meses.map(m=>fv[m].variable), borderColor:PALETA[3], backgroundColor:PALETA[3]+"33", fill:true, tension:.3 }
        ]
      },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:"bottom" }, tooltip:{ callbacks:{ label: c => c.dataset.label + ": " + money(c.parsed.y) } } },
        scales:{ y:{ ticks:{ callback: money } } } }
    });

    const top = Object.entries(porUnidad).sort((a,b)=>b[1]-a[1]).slice(0,10);
    render("ch-unidad", {
      type: "bar",
      data: {
        labels: top.map(t=>t[0]),
        datasets: [{ label:"Importe", data: top.map(t=>t[1]), backgroundColor: PALETA[1] }]
      },
      options:{ indexAxis:"y", responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: c => money(c.parsed.x) } } },
        scales:{ x:{ ticks:{ callback: money } } } }
    });
  }

  return { updateAll };
})();
