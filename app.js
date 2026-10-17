(() => {
"use strict";

const $ = (id) => document.getElementById(id);
let ingredients = [];
let recipes = [];
let stock = {};
let made = {};

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem("skyrim_nordique_state") || "{}");
    stock = s.stock && typeof s.stock === "object" ? s.stock : {};
    made = s.made && typeof s.made === "object" ? s.made : {};
  } catch (_) { stock = {}; made = {}; }
}
function saveState() {
  localStorage.setItem("skyrim_nordique_state", JSON.stringify({stock, made}));
}
function esc(v) {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function show(id) {
  document.querySelectorAll(".screen").forEach(x => x.classList.toggle("active", x.id === id));
  document.querySelectorAll(".nav button").forEach(x => x.classList.toggle("active", x.dataset.open === id));
  window.scrollTo(0,0);
}
function fillAlchemy() {
  ["a1","a2","a3"].forEach(id => {
    const el = $(id);
    el.innerHTML = id === "a3" ? '<option value="">Aucun</option>' : "";
    ingredients.forEach((x,i) => {
      const o = document.createElement("option");
      o.value = String(i); o.textContent = x.nom; el.appendChild(o);
    });
  });
}
function renderIngredients() {
  const q = $("ingredientSearch").value.trim().toLowerCase();
  const source = $("ingredientSource").value;
  const list = ingredients.map((x,i)=>({x,i})).filter(({x}) =>
    (!q || (x.nom+" "+x.effets.join(" ")).toLowerCase().includes(q)) &&
    (!source || x.source === source)
  );
  $("ingredientList").innerHTML = list.map(({x,i}) => {
    const n = Number(stock[i] || 0);
    return `<article class="item">
      <div class="item-top"><h3>${esc(x.nom)}</h3><span class="badge">${esc(x.source)}</span></div>
      <div class="effects">${x.effets.map(e=>`<span class="pill">${esc(e)}</span>`).join("")}</div>
      <div class="counter">
        <button type="button" class="qty" data-action="minus" data-id="${i}">−</button>
        <b class="number">${n}</b>
        <button type="button" class="qty" data-action="plus" data-id="${i}">+</button>
        <span class="muted">possédé</span>
      </div>
    </article>`;
  }).join("") || '<div class="result">Aucun ingrédient trouvé.</div>';
}
function renderRecipes() {
  const q = $("recipeSearch").value.trim().toLowerCase();
  const station = $("recipeStation").value;
  const source = $("recipeSource").value;
  const list = recipes.map((x,i)=>({x,i})).filter(({x}) =>
    (!q || (x.nom+" "+x.ingredients.join(" ")+" "+x.effet).toLowerCase().includes(q)) &&
    (!station || x.station === station) &&
    (!source || x.source === source)
  );
  $("recipeList").innerHTML = list.map(({x,i}) => {
    const done = !!made[i];
    return `<article class="item">
      <div class="item-top"><h3>${esc(x.nom)}</h3><span class="badge">${esc(x.station)}</span></div>
      <p class="muted">${esc(x.ingredients.join(" • "))}</p>
      <p class="muted">${esc(x.effet)}</p>
      <button type="button" class="gold-btn recipe-btn" data-recipe="${i}">${done ? "☑ Fabriquée — cliquer pour retirer" : "☐ Marquer comme fabriquée"}</button>
    </article>`;
  }).join("") || '<div class="result">Aucune recette trouvée.</div>';
}
function renderEffects() {
  const q = $("effectSearch").value.trim().toLowerCase();
  const effects = [...new Set(ingredients.flatMap(x=>x.effets))]
    .filter(x => !q || x.toLowerCase().includes(q)).sort();
  $("effects").innerHTML = effects.map(e=>`<button type="button" data-effect="${esc(e)}">${esc(e)}</button>`).join("");
}
function renderCollection() {
  const ingDone = ingredients.filter((x,i)=>Number(stock[i]||0)>0).length;
  const foodDone = recipes.filter((x,i)=>!!made[i]).length;
  const total = ingredients.length + recipes.length;
  const done = ingDone + foodDone;
  const p = total ? Math.round(done/total*100) : 0;
  $("percent").textContent = p+"%";
  $("progressTitle").textContent = done+" élément"+(done>1?"s":"");
  $("collectionInfo").innerHTML = `<div><b>${ingDone}/${ingredients.length}</b><small>ingrédients avec du stock</small></div>
  <div><b>${foodDone}/${recipes.length}</b><small>recettes fabriquées</small></div>`;
  document.querySelector(".circle").style.background = `conic-gradient(#c7aa6b ${p*3.6}deg,#26323a 0deg)`;
  $("homeIng").textContent = ingredients.reduce((s,x,i)=>s+Number(stock[i]||0),0);
  $("homeFood").textContent = foodDone;
}
function renderAll() { renderIngredients(); renderRecipes(); renderEffects(); renderCollection(); }

document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) { show(open.dataset.open); return; }

  const qty = e.target.closest(".qty");
  if (qty) {
    const id = Number(qty.dataset.id);
    const current = Number(stock[id] || 0);
    stock[id] = qty.dataset.action === "plus" ? current + 1 : Math.max(0, current - 1);
    saveState();
    renderAll();
    return;
  }

  const rb = e.target.closest(".recipe-btn");
  if (rb) {
    const id = Number(rb.dataset.recipe);
    made[id] = !made[id];
    saveState();
    renderAll();
    return;
  }

  const ef = e.target.closest("[data-effect]");
  if (ef) {
    $("effectSearch").value = ef.dataset.effect;
    show("alchemy");
    renderEffects();
  }
});

$("ingredientSearch").addEventListener("input", renderIngredients);
$("ingredientSource").addEventListener("change", renderIngredients);
$("recipeSearch").addEventListener("input", renderRecipes);
$("recipeStation").addEventListener("change", renderRecipes);
$("recipeSource").addEventListener("change", renderRecipes);
$("effectSearch").addEventListener("input", renderEffects);

$("mix").addEventListener("click", () => {
  const ids = ["a1","a2","a3"].map(id=>$(id).value).filter(v=>v!=="").map(Number);
  const chosen = ids.map(i=>ingredients[i]).filter(Boolean);
  if (chosen.length < 2) { $("mixResult").textContent = "Sélectionne au moins 2 ingrédients."; return; }
  let common = new Set(chosen[0].effets);
  chosen.slice(1).forEach(x => common = new Set([...common].filter(e=>x.effets.includes(e))));
  $("mixResult").innerHTML = `<b>${chosen.map(x=>esc(x.nom)).join(" + ")}</b><br><br>` +
    (common.size ? "Effets communs : "+[...common].map(e=>`<span class="pill">${esc(e)}</span>`).join(" ") : "Aucun effet commun.");
});

$("reset").addEventListener("click", () => {
  if (confirm("Réinitialiser tout ton inventaire et tes recettes ?")) {
    stock = {}; made = {}; saveState(); renderAll();
  }
});

async function start() {
  loadState();
  try {
    const [a,b] = await Promise.all([
      fetch("data/ingredients_fr.json").then(r=>r.json()),
      fetch("data/recipes_cuisine_fr.json").then(r=>r.json())
    ]);
    ingredients = a; recipes = b;
    fillAlchemy();
    renderAll();
  } catch (e) {
    document.querySelector("main").innerHTML = '<div class="panel"><h2>Données introuvables</h2><p class="muted">Vérifie que le dossier data est bien présent dans le dépôt GitHub.</p></div>';
  }
}
start();
})();