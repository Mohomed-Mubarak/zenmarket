/* ============================================================
   ZENMARKET — ADMIN PRODUCT EDIT / CREATE  (fixed)
   ============================================================ */
import { requireAdmin }       from './admin-auth.js';
import { injectAdminLayout }  from './admin-layout.js';
import {
  getProducts, saveProduct, getCategories,
  generateProductId, generateSlug
} from '../store.js';
import { withLoader }  from '../loader.js';
import toast           from '../toast.js';

let product    = null;
let imageUrls  = [];   // array of URL strings or data: URIs
let variants   = [];

withLoader(async () => {
  if (!requireAdmin()) return;
  injectAdminLayout('Product Edit');

  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  populateCategories();

  if (id) {
    product = getProducts().find(p => p.id === id);
    if (product) {
      document.getElementById('edit-page-title').textContent = 'Edit Product';
      document.getElementById('product-id-display').textContent = `ID: ${product.id}`;
      fillForm(product);
    } else {
      toast.error('Not found', `Product ${id} not found`);
    }
  } else {
    // New product — auto-generate ID
    const newId = generateProductId();
    const idEl = document.getElementById('prod-id');
    if (idEl) idEl.value = newId;
  }

  bindNameToSlug();
  bindImageUpload();
  bindVariants();
  bindSaveButton();
  bindAIDescGenerator();
});

// ── Populate category dropdown ─────────────────────────────────
function populateCategories() {
  const sel  = document.getElementById('prod-category');
  if (!sel) return;
  const cats = getCategories();
  sel.innerHTML = `<option value="">Select Category</option>` +
    cats.map(c => `<option value="${c.name}" data-slug="${c.slug}">${c.name}</option>`).join('');
}

// ── Fill form fields from existing product ─────────────────────
function fillForm(p) {
  setVal('prod-id',      p.id);
  setVal('prod-name',    p.name);
  setVal('prod-slug',    p.slug);
  setVal('prod-desc',    p.description || '');
  setVal('prod-sku',     p.sku || '');
  setVal('prod-weight',  p.weight || '');
  setVal('prod-tags',    (p.tags || []).join(', '));
  setVal('prod-price',   p.price);
  setVal('prod-compare', p.comparePrice || '');
  setVal('prod-stock',   p.stock);

  const activeCb   = document.getElementById('prod-active');
  const featuredCb = document.getElementById('prod-featured');
  if (activeCb)   activeCb.checked   = p.active !== false;
  if (featuredCb) featuredCb.checked = !!p.featured;

  // Category
  const catSel = document.getElementById('prod-category');
  if (catSel) {
    Array.from(catSel.options).forEach(opt => {
      opt.selected = opt.value === p.category;
    });
  }

  // Images
  imageUrls = Array.isArray(p.images) ? [...p.images] : [];
  renderImagePreviews();

  // Variants
  variants = JSON.parse(JSON.stringify(p.variants || []));
  renderVariants();
}

// ── Auto-generate slug from name ──────────────────────────────
function bindNameToSlug() {
  const nameEl = document.getElementById('prod-name');
  const slugEl = document.getElementById('prod-slug');
  if (!nameEl || !slugEl) return;
  nameEl.addEventListener('input', () => {
    // Only auto-fill if slug is empty or was previously auto-generated
    if (!product || slugEl.value === generateSlug(nameEl.dataset.prev || '')) {
      slugEl.value = generateSlug(nameEl.value);
    }
    nameEl.dataset.prev = nameEl.value;
  });
}

// ── Image Upload (URL + File + Drag-and-drop) ─────────────────
function bindImageUpload() {
  const zone      = document.getElementById('upload-zone');
  const fileInput = document.getElementById('img-file-input');
  const urlInput  = document.getElementById('img-url-input');
  const addUrlBtn = document.getElementById('add-img-url-btn');

  // Click zone → open file picker
  zone?.addEventListener('click', e => {
    if (e.target !== urlInput && e.target !== addUrlBtn) {
      fileInput?.click();
    }
  });

  // Drag-over visual
  zone?.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone?.addEventListener('dragenter', e => e.preventDefault());

  // Drop files
  zone?.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  // File input change
  fileInput?.addEventListener('change', () => {
    if (fileInput.files.length) handleFiles(fileInput.files);
    fileInput.value = ''; // reset so same file can be re-added
  });

  // Add image by URL
  const doAddUrl = () => {
    const url = urlInput?.value.trim();
    if (!url) { toast.error('No URL', 'Please enter an image URL'); return; }
    if (!url.match(/^https?:\/\//i) && !url.startsWith('data:')) {
      toast.error('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    imageUrls.push(url);
    if (urlInput) urlInput.value = '';
    renderImagePreviews();
    toast.success('Added', 'Image URL added');
  };

  addUrlBtn?.addEventListener('click', doAddUrl);
  urlInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAddUrl(); } });
}

function handleFiles(files) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  Array.from(files).forEach(file => {
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file', `${file.name} is not a supported image type`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Too large', `${file.name} exceeds 5 MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      imageUrls.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const el = document.getElementById('image-previews');
  if (!el) return;
  if (!imageUrls.length) {
    el.innerHTML = `<p style="color:var(--clr-text-3);font-size:.8125rem;padding:.5rem 0">No images yet. Add via URL or upload files above.</p>`;
    return;
  }
  el.innerHTML = imageUrls.map((url, i) => `
    <div class="img-preview-item" style="position:relative">
      <img src="${url}" alt="Image ${i + 1}"
           onerror="this.style.opacity='.3';this.nextElementSibling.style.opacity='1'">
      <button type="button" class="img-preview-remove" onclick="window._removeImg(${i})"
              title="Remove image">×</button>
      ${i === 0 ? `<span style="position:absolute;bottom:4px;left:4px;background:var(--clr-gold);color:#000;font-size:.6rem;padding:1px 4px;border-radius:3px;font-weight:700">MAIN</span>` : ''}
    </div>`).join('');
}

window._removeImg = i => {
  imageUrls.splice(i, 1);
  renderImagePreviews();
};

// ── Variants ──────────────────────────────────────────────────
function bindVariants() {
  document.getElementById('add-variant-btn')?.addEventListener('click', () => {
    variants.push({ name: '', options: [] });
    renderVariants();
    // Focus the new name input
    const inputs = document.querySelectorAll('.variant-name-input');
    inputs[inputs.length - 1]?.focus();
  });
}

function renderVariants() {
  const el = document.getElementById('variants-list');
  if (!el) return;

  if (!variants.length) {
    el.innerHTML = `<p style="color:var(--clr-text-3);font-size:.875rem;padding:.25rem 0">
      No variants. Add colour, size, or other options above.
    </p>`;
    return;
  }

  el.innerHTML = variants.map((v, i) => `
    <div style="padding:1rem;background:var(--clr-bg-2);border:1px solid var(--clr-border);border-radius:var(--r-md);margin-bottom:.75rem">
      <div style="display:flex;gap:.75rem;margin-bottom:.75rem;align-items:center">
        <input class="form-control variant-name-input" type="text"
               placeholder="Variant name (e.g. Color)"
               value="${escHtml(v.name)}"
               oninput="window._updateVariantName(${i}, this.value)"
               style="max-width:200px">
        <button type="button" class="btn btn-ghost btn-sm" onclick="window._removeVariant(${i})"
                style="color:var(--clr-error);flex-shrink:0">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </div>
      <input class="form-control" type="text"
             placeholder="Options — comma separated (e.g. Red, Blue, Green)"
             value="${escHtml(v.options.join(', '))}"
             oninput="window._updateVariantOptions(${i}, this.value)">
    </div>`).join('');
}

window._updateVariantName    = (i, v) => { variants[i].name = v; };
window._updateVariantOptions = (i, v) => { variants[i].options = v.split(',').map(s => s.trim()).filter(Boolean); };
window._removeVariant        = i      => { variants.splice(i, 1); renderVariants(); };

// ── Save button ───────────────────────────────────────────────
function bindSaveButton() {
  const btn = document.getElementById('save-product-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const name  = getVal('prod-name').trim();
    const price = parseFloat(getVal('prod-price'));
    const stock = parseInt(getVal('prod-stock'), 10);
    const catEl = document.getElementById('prod-category');

    // Validation
    const errors = [];
    if (!name)           errors.push('Product name is required');
    if (isNaN(price) || price < 0) errors.push('Valid price is required');
    if (isNaN(stock) || stock < 0) errors.push('Valid stock quantity is required');
    if (!catEl?.value)   errors.push('Category is required');

    if (errors.length) {
      toast.error('Validation Error', errors.join(' · '));
      return;
    }

    const catOpt   = catEl.options[catEl.selectedIndex];
    const catSlug  = catOpt?.getAttribute('data-slug') || generateSlug(catEl.value);
    const prodId   = getVal('prod-id') || generateProductId();
    const slug     = getVal('prod-slug').trim() || generateSlug(name);
    const compare  = parseFloat(getVal('prod-compare')) || null;
    const tags     = getVal('prod-tags').split(',').map(s => s.trim()).filter(Boolean);

    const updated = {
      ...(product || {}),
      id:           prodId,
      name,
      slug,
      description:  getVal('prod-desc').trim(),
      sku:          getVal('prod-sku').trim() || `SKU-${prodId}`,
      weight:       getVal('prod-weight').trim(),
      tags,
      price,
      comparePrice: compare,
      stock:        isNaN(stock) ? 0 : stock,
      category:     catEl.value,
      categorySlug: catSlug,
      active:       document.getElementById('prod-active')?.checked !== false,
      featured:     !!document.getElementById('prod-featured')?.checked,
      images:       imageUrls.length
                      ? imageUrls
                      : ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80'],
      variants:     variants.filter(v => v.name),   // discard unnamed variants
      rating:       product?.rating      ?? 4.5,
      reviewCount:  product?.reviewCount ?? 0,
      createdAt:    product?.createdAt   ?? new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    };

    saveProduct(updated);
    toast.success('Saved!', `"${name}" has been saved successfully`);

    // Redirect after short delay
    setTimeout(() => { window.location.href = 'products.html'; }, 900);
  });
}

// ── AI Description Generator ──────────────────────────────────
function bindAIDescGenerator() {
  const btn    = document.getElementById('ai-desc-btn');
  const status = document.getElementById('ai-desc-status');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const name     = getVal('prod-name').trim();
    const tags     = getVal('prod-tags').trim();
    const category = document.getElementById('prod-category')?.value?.trim() || '';
    const price    = getVal('prod-price').trim();

    if (!name) {
      toast.error('Missing info', 'Please enter a product name first.');
      return;
    }

    const features = [tags, category].filter(Boolean).join(', ');
    const prompt = [
      `You are an SEO copywriter for ZenMarket, a Sri Lankan e-commerce store.`,
      `Write a compelling, SEO-optimized product description for the following product:`,
      ``,
      `Product: ${name}`,
      features ? `Features / Tags: ${features}` : '',
      category ? `Category: ${category}` : '',
      price    ? `Price: Rs. ${price} (LKR)` : '',
      ``,
      `Requirements:`,
      `- 3-4 sentences, around 80-120 words`,
      `- Naturally include keywords a Sri Lankan shopper would search for`,
      `- Highlight key benefits and quality`,
      `- End with a subtle call-to-action`,
      `- Do NOT use markdown, bullet points, or headers — plain text only`,
    ].filter(Boolean).join('\n');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';
    if (status) { status.style.display = ''; status.textContent = '✨ AI is writing your description…'; }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data?.content?.[0]?.text?.trim();
      if (text) {
        const descEl = document.getElementById('prod-desc');
        if (descEl) descEl.value = text;
        if (status) status.textContent = '✅ Description generated! Review and edit as needed.';
        toast.success('AI Generated', 'Description written — review before saving.');
      } else {
        throw new Error('Empty response');
      }
    } catch (err) {
      console.error('[AI Desc]', err);
      if (status) status.textContent = '⚠️ Generation failed. Try again.';
      toast.error('AI Error', 'Could not generate description. Check your connection.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="color:var(--clr-gold)"></i> Generate with AI';
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? '';
}
function getVal(id) {
  return document.getElementById(id)?.value ?? '';
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
